import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack/verify";
import { slack } from "@/lib/slack/client";
import { buildSubmitRequestView } from "@/lib/slack/modal";

export const runtime = "nodejs";

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
  const command = params.get("command");
  const triggerId = params.get("trigger_id");

  // Accept either spec name or the more natural "/submit-data-request".
  const KNOWN_COMMANDS = new Set(["/submit-request", "/submit-data-request"]);
  if (!command || !KNOWN_COMMANDS.has(command)) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Unknown command: ${command}`,
    });
  }
  if (!triggerId) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Missing trigger_id from Slack.",
    });
  }

  try {
    await slack().views.open({
      trigger_id: triggerId,
      view: buildSubmitRequestView(),
    });
  } catch (err) {
    console.error("views.open failed", err);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Couldn't open the request form. Try again, or use the web app.",
    });
  }

  // 200 with empty body acknowledges the slash command — the modal already opened.
  return new NextResponse("", { status: 200 });
}
