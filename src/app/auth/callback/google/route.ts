import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    const error = searchParams.get("error_description") ?? searchParams.get("error") ?? "missing_code";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Verify the resulting user is from kodahealthcare.com. The Internal OAuth
  // consent screen should already enforce this, but belt-and-suspenders.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email?.endsWith("@kodahealthcare.com")) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Only @kodahealthcare.com accounts may sign in.")}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
