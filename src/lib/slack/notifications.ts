import { slack } from "./client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { REQUEST_TYPE_LABELS, STAGE_LABELS } from "@/lib/constants";
import type { RequestType, Stage } from "@/lib/supabase/types";

const DEFAULT_NEW_REQUEST_RECIPIENTS = ["ryan@kodahealthcare.com"];

function getNewRequestRecipients(): string[] {
  const raw = process.env.NEW_REQUEST_NOTIFY_EMAILS;
  if (raw === undefined) return DEFAULT_NEW_REQUEST_RECIPIENTS;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type NotifyResult =
  | { ok: true; skipped?: string }
  | { ok: false; error: string };

type RequesterMini = { email: string; full_name: string | null } | null;

type TicketForNotification = {
  request_name: string;
  expected_completion_date: string | null;
  requester: RequesterMini;
};

/**
 * DM the ticket's requester that the stage just changed.
 *
 * Never throws — caller should always succeed at the underlying stage update
 * regardless of Slack reachability. Skipped gracefully when:
 *   - the requester has no email
 *   - the requester isn't in the Slack workspace (users.lookupByEmail miss)
 *   - the bot lacks permission to DM them
 *
 * Every successful send is recorded in slack_notifications.
 */
export async function notifyStageChange({
  ticketId,
  fromStage,
  toStage,
}: {
  ticketId: string;
  fromStage: Stage;
  toStage: Stage;
}): Promise<NotifyResult> {
  const supabase = createServiceRoleClient();

  // Pull ticket + requester profile via service role (no RLS concerns).
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `request_name, expected_completion_date,
       requester:requester_id ( email, full_name )`,
    )
    .eq("id", ticketId)
    .single();

  if (error) return { ok: false, error: error.message };
  const ticket = data as unknown as TicketForNotification | null;
  if (!ticket?.requester?.email) {
    return { ok: true, skipped: "no requester email" };
  }

  const email = ticket.requester.email;

  // Email -> Slack user ID. Misses are expected (user not in workspace) and silent.
  let slackUserId: string | null = null;
  try {
    const lookup = await slack().users.lookupByEmail({ email });
    slackUserId = lookup.user?.id ?? null;
  } catch (err) {
    console.warn("lookupByEmail miss for", email, errMessage(err));
    return { ok: true, skipped: "no matching slack user" };
  }
  if (!slackUserId) return { ok: true, skipped: "no matching slack user" };

  // Build message
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const ticketUrl = appUrl ? `${appUrl}/requests/${ticketId}` : null;

  const etaLine = ticket.expected_completion_date
    ? `Expected Completion Date is *${formatDate(ticket.expected_completion_date)}*.`
    : "Expected Completion Date is not set yet.";

  const lines: string[] = [
    `Update on *${escapeText(ticket.request_name)}*: status is now *${STAGE_LABELS[toStage]}*.`,
    etaLine,
  ];
  if (ticketUrl) {
    lines.push(ticketUrl);
  }
  const text = lines.join("\n");

  try {
    await slack().chat.postMessage({ channel: slackUserId, text });
  } catch (err) {
    console.error("chat.postMessage failed", errMessage(err));
    return { ok: false, error: "Could not send DM" };
  }

  // Audit log
  try {
    await supabase.from("slack_notifications").insert({
      ticket_id: ticketId,
      slack_user_id: slackUserId,
      notification_type: "stage_change",
      payload: { from: fromStage, to: toStage, text },
    });
  } catch (err) {
    console.error("slack_notifications insert failed", errMessage(err));
    // Don't fail the operation if logging fails.
  }

  return { ok: true };
}

function escapeText(s: string): string {
  return s.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
}

function formatDate(iso: string): string {
  // Tickets store deadline_date / expected_completion_date as a Postgres DATE
  // (YYYY-MM-DD). Parse as UTC to avoid timezone drift, then format like
  // "May 25, 2026" to match the web app.
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---------- New request notifications -------------------------------------

type NewRequestTicket = {
  request_name: string;
  request_type: RequestType;
  requester_priority: number;
  stakeholder_type: "internal" | "external";
  has_hard_deadline: boolean;
  deadline_date: string | null;
  requester: { email: string; full_name: string | null } | null;
};

/**
 * DM the configured recipients (default: ryan@kodahealthcare.com) whenever a
 * new ticket is created, regardless of where it came from — web form, Slack
 * slash command, or #alerts-client-data auto-ticket. Skips DMing the
 * submitter themselves and silently skips recipients without a Slack account
 * in the workspace.
 *
 * Configure via NEW_REQUEST_NOTIFY_EMAILS=email1,email2 (comma-separated).
 * Set to an empty string to disable.
 */
export async function notifyNewRequest({
  ticketId,
}: {
  ticketId: string;
}): Promise<NotifyResult> {
  const recipients = getNewRequestRecipients();
  if (recipients.length === 0) {
    return { ok: true, skipped: "no recipients configured" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `request_name, request_type, requester_priority,
       stakeholder_type, has_hard_deadline, deadline_date,
       requester:requester_id ( email, full_name )`,
    )
    .eq("id", ticketId)
    .single();

  if (error) return { ok: false, error: error.message };
  const ticket = data as unknown as NewRequestTicket | null;
  if (!ticket) return { ok: false, error: "ticket not found" };

  const submitterEmail = ticket.requester?.email?.toLowerCase() ?? null;
  const submitterName =
    ticket.requester?.full_name ?? ticket.requester?.email ?? "someone";

  // Build message body — same for every recipient
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const ticketUrl = appUrl ? `${appUrl}/requests/${ticketId}` : null;

  const deadlineSuffix =
    ticket.stakeholder_type === "external" &&
    ticket.has_hard_deadline &&
    ticket.deadline_date
      ? ` · hard deadline ${formatDate(ticket.deadline_date)}`
      : "";

  const lines: string[] = [
    `*New request:* "${escapeText(ticket.request_name)}"`,
    `Submitted by *${escapeText(submitterName)}*.`,
    `Type: ${REQUEST_TYPE_LABELS[ticket.request_type]} · Priority ${ticket.requester_priority}/5 · ${ticket.stakeholder_type}${deadlineSuffix}`,
  ];
  if (ticketUrl) lines.push(ticketUrl);
  const text = lines.join("\n");

  let anySent = false;

  for (const email of recipients) {
    // Don't DM the submitter themselves
    if (submitterEmail && email === submitterEmail) continue;

    let slackUserId: string | null = null;
    try {
      const lookup = await slack().users.lookupByEmail({ email });
      slackUserId = lookup.user?.id ?? null;
    } catch (err) {
      console.warn("new-request lookupByEmail miss", email, errMessage(err));
      continue;
    }
    if (!slackUserId) continue;

    try {
      await slack().chat.postMessage({ channel: slackUserId, text });
      anySent = true;
    } catch (err) {
      console.error("new-request DM failed", email, errMessage(err));
      continue;
    }

    try {
      await supabase.from("slack_notifications").insert({
        ticket_id: ticketId,
        slack_user_id: slackUserId,
        notification_type: "new_request",
        payload: { recipient_email: email, text },
      });
    } catch (logErr) {
      console.error("new-request audit log failed", errMessage(logErr));
    }
  }

  return anySent ? { ok: true } : { ok: true, skipped: "no recipients reached" };
}

// ---------- Comment notifications ----------------------------------------

type CommentTicket = {
  id: string;
  request_name: string;
  requester_id: string;
  requester: { email: string; full_name: string | null } | null;
};

type CommentAuthor = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "requester";
};

/**
 * DM the appropriate party about a new comment on a ticket.
 *   - Admin commented  → DM the ticket's requester
 *   - Requester commented → DM the NEW_REQUEST_NOTIFY_EMAILS recipients
 *
 * Never throws. Returns `{ ok: true, skipped }` for soft-fail cases
 * (recipient not in Slack workspace, requester == admin, etc.). The
 * caller stamps `ticket_comments.notified_at` based on this result.
 */
export async function notifyTicketComment({
  ticketId,
  commentBody,
  author,
}: {
  ticketId: string;
  commentBody: string;
  author: CommentAuthor;
}): Promise<NotifyResult & { recipientEmail?: string }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("tickets")
    .select(
      `id, request_name, requester_id,
       requester:requester_id ( email, full_name )`,
    )
    .eq("id", ticketId)
    .single();

  if (error) return { ok: false, error: error.message };
  const ticket = data as unknown as CommentTicket | null;
  if (!ticket) return { ok: false, error: "ticket not found" };

  // Who do we DM?
  let recipientEmails: string[] = [];
  if (author.role === "admin") {
    // Admin asked a question → notify the requester.
    if (ticket.requester?.email) {
      recipientEmails = [ticket.requester.email];
    }
  } else {
    // Requester replied → notify the new-request recipients (Ryan by default).
    recipientEmails = getNewRequestRecipients();
  }

  if (recipientEmails.length === 0) {
    return { ok: true, skipped: "no recipients configured" };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const ticketUrl = appUrl ? `${appUrl}/requests/${ticketId}` : null;

  const authorLabel = author.full_name ?? author.email;
  const text = [
    `*New comment on "${escapeText(ticket.request_name)}"*`,
    `From *${escapeText(authorLabel)}*${author.role === "admin" ? " (admin)" : ""}:`,
    `> ${escapeText(commentBody).split("\n").join("\n> ")}`,
    ticketUrl ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  let anySent = false;
  let firstRecipient: string | undefined;

  for (const email of recipientEmails) {
    // Don't DM the comment's author themselves
    if (email.toLowerCase() === author.email.toLowerCase()) continue;

    let slackUserId: string | null = null;
    try {
      const lookup = await slack().users.lookupByEmail({ email });
      slackUserId = lookup.user?.id ?? null;
    } catch (err) {
      console.warn("comment lookupByEmail miss", email, errMessage(err));
      continue;
    }
    if (!slackUserId) continue;

    try {
      await slack().chat.postMessage({ channel: slackUserId, text });
      anySent = true;
      if (!firstRecipient) firstRecipient = email;
    } catch (err) {
      console.error("comment DM failed", email, errMessage(err));
      continue;
    }

    try {
      await supabase.from("slack_notifications").insert({
        ticket_id: ticketId,
        slack_user_id: slackUserId,
        notification_type: "comment",
        payload: { recipient_email: email, body: commentBody, author_role: author.role },
      });
    } catch (logErr) {
      console.error("comment audit log failed", errMessage(logErr));
    }
  }

  if (!anySent) return { ok: true, skipped: "no recipients reached" };
  return { ok: true, recipientEmail: firstRecipient };
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
