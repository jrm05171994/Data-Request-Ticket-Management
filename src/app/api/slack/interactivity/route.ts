import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack/verify";
import { slack } from "@/lib/slack/client";
import {
  getDate,
  getRadio,
  getSelect,
  getStateValues,
  getText,
} from "@/lib/slack/extract";
import { resolveSlackUserToAppUser } from "@/lib/slack/user-mapping";
import { SUBMIT_REQUEST_CALLBACK_ID } from "@/lib/slack/modal";
import { notifyNewRequest } from "@/lib/slack/notifications";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { STAGE_LABELS } from "@/lib/constants";
import type {
  RequestType,
  StakeholderType,
  ViewType,
} from "@/lib/supabase/types";

export const runtime = "nodejs";

const REQUEST_TYPES: ReadonlyArray<RequestType> = [
  "risk_scoring",
  "new_dashboard",
  "new_visual",
  "new_analysis",
  "update_existing",
  "other",
];
const VIEW_TYPES: ReadonlyArray<ViewType> = ["aggregated", "patient_level"];

function parseStakeholders(raw: string): string[] | null {
  const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return new NextResponse("Server not configured", { status: 500 });
  }

  const valid = verifySlackSignature({
    rawBody,
    timestamp: request.headers.get("x-slack-request-timestamp"),
    signature: request.headers.get("x-slack-signature"),
    signingSecret,
  });
  if (!valid) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) return new NextResponse("Missing payload", { status: 400 });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadStr) as Record<string, unknown>;
  } catch {
    return new NextResponse("Invalid payload JSON", { status: 400 });
  }

  if (payload.type !== "view_submission") {
    // For now we only handle modal submissions. Acknowledge other types.
    return new NextResponse("", { status: 200 });
  }

  const view = payload.view as { callback_id?: string } | undefined;
  if (!view || view.callback_id !== SUBMIT_REQUEST_CALLBACK_ID) {
    return new NextResponse("", { status: 200 });
  }

  const user = payload.user as { id?: string } | undefined;
  const slackUserId = user?.id;
  if (!slackUserId) {
    return NextResponse.json(viewError({ request_name: "Missing Slack user." }));
  }

  // Resolve to an app user by email
  const appUser = await resolveSlackUserToAppUser(slackUserId);
  if (!appUser) {
    return NextResponse.json(
      viewError({
        request_name:
          "You're not registered in the app yet. Sign in once at the Koda Data Requests web app, then re-run /submit-request.",
      }),
    );
  }

  // Extract form values
  const values = getStateValues(view);
  const requestName = getText(values, "request_name");
  const description = getText(values, "description");
  const stakeholdersInternal = parseStakeholders(getText(values, "stakeholders_internal"));
  const stakeholdersExternal = parseStakeholders(getText(values, "stakeholders_external"));
  const hasHardDeadlineRaw = getRadio(values, "has_hard_deadline");
  const deadlineDate = getDate(values, "deadline_date");
  const requestType = getSelect(values, "request_type");
  const viewType = getRadio(values, "view_type");
  const requesterPriorityRaw = getSelect(values, "requester_priority");
  const additionalInfo = getText(values, "additional_info");

  // Validation surfaced back into the modal as per-block errors
  const errors: Record<string, string> = {};
  if (!requestName) errors.request_name = "Required.";
  if (!description) errors.description = "Required.";
  if (!requestType || !REQUEST_TYPES.includes(requestType as RequestType)) {
    errors.request_type = "Pick a request type.";
  }
  if (!viewType || !VIEW_TYPES.includes(viewType as ViewType)) {
    errors.view_type = "Pick a view type.";
  }
  const requesterPriority = Number(requesterPriorityRaw);
  if (!Number.isInteger(requesterPriority) || requesterPriority < 1 || requesterPriority > 5) {
    errors.requester_priority = "Pick 1–5.";
  }

  const stakeholderType: StakeholderType =
    stakeholdersExternal && stakeholdersExternal.length > 0 ? "external" : "internal";
  const hasHardDeadline =
    stakeholderType === "external" && hasHardDeadlineRaw === "yes";

  if (hasHardDeadline && !deadlineDate) {
    errors.deadline_date = "Pick a date, or set the deadline question to No.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(viewError(errors));
  }

  // Insert ticket (service role; we set requester_id from the resolved app user)
  const supabase = createServiceRoleClient();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      request_name: requestName,
      description,
      requester_id: appUser.id,
      stakeholder_type: stakeholderType,
      has_hard_deadline: hasHardDeadline,
      deadline_date: hasHardDeadline ? deadlineDate : null,
      request_type: requestType as RequestType,
      view_type: viewType as ViewType,
      requester_priority: requesterPriority,
      additional_info: additionalInfo || null,
      stakeholders_internal: stakeholdersInternal,
      stakeholders_external: stakeholdersExternal,
    })
    .select("id, priority_rank, stage")
    .single();

  if (error || !ticket) {
    console.error("Slack insert ticket failed", error);
    return NextResponse.json(
      viewError({ request_name: error?.message ?? "Could not save your request." }),
    );
  }

  // Log + send DM confirmation (fire and await — keep modal closed only on success)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const ticketUrl = appUrl ? `${appUrl}/requests/${ticket.id}` : null;

  try {
    await supabase.from("slack_notifications").insert({
      ticket_id: ticket.id,
      slack_user_id: slackUserId,
      notification_type: "submitted_confirmation",
      payload: { rank: ticket.priority_rank, stage: ticket.stage },
    });
  } catch (logErr) {
    console.error("slack_notifications log failed", logErr);
  }

  try {
    await slack().chat.postMessage({
      channel: slackUserId,
      text: `Got your request "*${escapeText(requestName)}*" — ${
        STAGE_LABELS[ticket.stage]
      }${ticket.priority_rank ? ` · rank ${ticket.priority_rank}` : ""}${
        ticketUrl ? `\n${ticketUrl}` : ""
      }`,
    });
  } catch (dmErr) {
    console.error("DM confirmation failed", dmErr);
    // Don't block the modal close — the ticket is created either way.
  }

  // DM new-request notification recipients (Ryan by default).
  try {
    await notifyNewRequest({ ticketId: ticket.id });
  } catch (err) {
    console.error("notifyNewRequest (slack modal) threw", err);
  }

  // Empty 200 closes the modal.
  return new NextResponse("", { status: 200 });
}

function viewError(errors: Record<string, string>) {
  return {
    response_action: "errors" as const,
    errors,
  };
}

function escapeText(s: string): string {
  return s.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
}
