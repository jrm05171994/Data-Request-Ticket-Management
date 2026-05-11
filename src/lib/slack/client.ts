import { WebClient } from "@slack/web-api";

let cached: WebClient | null = null;

export function slack(): WebClient {
  if (cached) return cached;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not set");
  }
  cached = new WebClient(token);
  return cached;
}
