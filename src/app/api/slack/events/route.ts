import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack/verify";
import { slack } from "@/lib/slack/client";
import { resolveSlackUserToAppUser } from "@/lib/slack/user-mapping";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { STAGE_LABELS } from "@/lib/constants";

export const runtime = "nodejs";

type EventCallback = {
  type: "event_callback";
  event_id: string;
  event: SlackMessageEvent;
};

type SlackMessageEvent = {
  type: "message";
  user?: string;
  bot_id?: string;
  channel: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  subtype?: string;
};

type SlackEventBody =
  | { type: "url_verification"; challenge: string }
  | EventCallback
  | { type: string };

const INBOX_PATTERN = /\/inbox/i;
const NAME_PREVIEW_LEN = 80;

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

  let body: SlackEventBody;
  try {
    body = JSON.parse(rawBody) as SlackEventBody;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // 1) URL verification handshake — happens once when Slack first hits the URL
  if (body.type === "url_verification") {
    const challenge = (body as { challenge: string }).challenge;
    return NextResponse.json({ challenge });
  }

  if (body.type !== "event_callback") {
    return new NextResponse("", { status: 200 });
  }

  const envelope = body as EventCallback;
  const event = envelope.event;

  // 2) Only top-level new messages on the target channel
  if (!event || event.type !== "message") return new NextResponse("", { status: 200 });

  const targetChannel = process.env.SLACK_ALERTS_CHANNEL_ID;
  if (!targetChannel) {
    console.warn("SLACK_ALERTS_CHANNEL_ID not set — ignoring all message events");
    return new NextResponse("", { status: 200 });
  }
  if (event.channel !== targetChannel) return new NextResponse("", { status: 200 });

  if (event.subtype) return new NextResponse("", { status: 200 }); // edits, joins, deletes, etc.
  if (event.bot_id) return new NextResponse("", { status: 200 }); // never react to a bot post
  if (event.thread_ts && event.thread_ts !== event.ts) {
    return new NextResponse("", { status: 200 }); // reply in a thread, not a top-level message
  }

  const text = (event.text ?? "").toString();
  if (!INBOX_PATTERN.test(text)) {
    return new NextResponse("", { status: 200 });
  }

  // 3) Idempotency — Slack retries up to 3x if we don't return 200 within 3s.
  // Skip if we've already processed this event_id.
  const supabase = createServiceRoleClient();
  const { data: dup } = await supabase
    .from("slack_notifications")
    .select("id")
    .eq("notification_type", "auto_ticket")
    .eq("payload->>event_id", envelope.event_id)
    .maybeSingle();
  if (dup) return new NextResponse("", { status: 200 });

  // 4) Resolve sender to an app user
  if (!event.user) return new NextResponse("", { status: 200 });
  const appUser = await resolveSlackUserToAppUser(event.user);
  if (!appUser) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    try {
      await slack().chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: appUrl
          ? `Couldn't auto-create a ticket — sign in once at ${appUrl}/login, then re-post to retry.`
          : "Couldn't auto-create a ticket — sign in to the web app first, then re-post to retry.",
      });
    } catch (err) {
      console.error("unmapped-user thread reply failed", err);
    }
    return new NextResponse("", { status: 200 });
  }

  // 5) Build ticket fields per spec
  const preview = text.slice(0, NAME_PREVIEW_LEN).replace(/\s+/g, " ").trim();
  const requestName = `Risk Scoring — ${preview}${
    text.length > NAME_PREVIEW_LEN ? "…" : ""
  }`;

  let permalink: string | null = null;
  try {
    const { permalink: link } = await slack().chat.getPermalink({
      channel: event.channel,
      message_ts: event.ts,
    });
    permalink = link ?? null;
  } catch (err) {
    console.warn("getPermalink failed", err);
  }
  const description = permalink ? `${text}\n\nSlack source: ${permalink}` : text;

  const { data: ticket, error: insertError } = await supabase
    .from("tickets")
    .insert({
      request_name: requestName,
      description,
      requester_id: appUser.id,
      stakeholder_type: "external",
      has_hard_deadline: false,
      deadline_date: null,
      request_type: "risk_scoring",
      view_type: "patient_level",
      requester_priority: 3,
      additional_info: null,
      stakeholders_internal: null,
      stakeholders_external: null,
    })
    .select("id, priority_rank, stage")
    .single();

  if (insertError || !ticket) {
    console.error("auto-ticket insert failed", insertError);
    return new NextResponse("", { status: 200 });
  }

  // 6) Audit log (also the idempotency anchor for subsequent retries)
  try {
    await supabase.from("slack_notifications").insert({
      ticket_id: ticket.id,
      slack_user_id: event.user,
      notification_type: "auto_ticket",
      payload: {
        event_id: envelope.event_id,
        channel: event.channel,
        message_ts: event.ts,
        text,
      },
    });
  } catch (logErr) {
    console.error("auto-ticket audit log failed", logErr);
  }

  // 7) Thread reply confirming the ticket
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const ticketUrl = appUrl ? `${appUrl}/requests/${ticket.id}` : null;

  const lines: string[] = [
    `Created risk-scoring ticket — *${STAGE_LABELS[ticket.stage]}*${
      ticket.priority_rank ? ` · rank ${ticket.priority_rank}` : ""
    }`,
  ];
  if (ticketUrl) lines.push(ticketUrl);

  try {
    await slack().chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: lines.join("\n"),
    });
  } catch (err) {
    console.error("confirmation thread reply failed", err);
  }

  return new NextResponse("", { status: 200 });
}
