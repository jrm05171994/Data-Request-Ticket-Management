import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the Slack-signed request.
 * Spec: https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * Returns true if the signature is valid and the timestamp is fresh
 * (< 5 minutes old, to limit replay attacks).
 */
export function verifySlackSignature({
  rawBody,
  timestamp,
  signature,
  signingSecret,
  now = Date.now(),
}: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  signingSecret: string;
  now?: number;
}): boolean {
  if (!timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(now / 1000 - ts) > 300) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" + createHmac("sha256", signingSecret).update(base).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
