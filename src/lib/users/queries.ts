import { createClient } from "@/lib/supabase/server";

export async function listAssignableUsers() {
  const supabase = createClient();
  return supabase
    .from("users")
    .select("id, email, full_name, role")
    .order("role", { ascending: true })  // admins first
    .order("full_name", { ascending: true, nullsFirst: false });
}

/**
 * Same shape as listAssignableUsers; kept as a separate function for clarity
 * on the admin Users panel page in case the policy diverges later (e.g. show
 * disabled / inactive users, last login timestamp).
 */
export async function listAllUsers() {
  const supabase = createClient();
  return supabase
    .from("users")
    .select("id, email, full_name, role, created_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true, nullsFirst: false });
}
