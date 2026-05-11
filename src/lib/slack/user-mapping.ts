import { slack } from "./client";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type ResolvedAppUser = {
  id: string;
  email: string;
  full_name: string | null;
};

/**
 * Map a Slack user (by Slack user ID) to a public.users row by email match.
 * Returns null if the Slack user has no profile email or there's no matching
 * app user — caller should surface a "sign in to the app first" message.
 *
 * Service-role lookup so we don't need an authed session for the read.
 */
export async function resolveSlackUserToAppUser(
  slackUserId: string,
): Promise<ResolvedAppUser | null> {
  const info = await slack().users.info({ user: slackUserId });
  const profile = info.user?.profile;
  const email = profile?.email;
  if (!email) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
