import { slack } from "./client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { STAGE_LABELS } from "@/lib/constants";
import type { Stage } from "@/lib/supabase/types";

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

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
