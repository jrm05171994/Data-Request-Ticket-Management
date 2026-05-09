import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";

export type AuthedUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

/**
 * Get the current signed-in user with their profile.
 * Redirects to /login if not signed in.
 */
export async function requireUser(): Promise<AuthedUser> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Profile row should exist via the on_auth_user_created trigger.
    // If we got here without one, something is genuinely wrong — bail.
    redirect("/login");
  }

  return profile;
}

/**
 * Require admin role; redirect non-admins to /.
 */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
