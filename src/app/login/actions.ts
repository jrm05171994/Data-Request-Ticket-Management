"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = createClient();
  const origin = headers().get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback/google`,
      queryParams: {
        // Restrict to Koda Workspace; final gate is also enforced by
        // Internal-only OAuth consent screen on the Google side.
        hd: "kodahealthcare.com",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect("/login?error=unknown");
}
