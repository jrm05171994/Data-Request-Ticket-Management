import { createClient } from "@/lib/supabase/server";

export async function listAssignableUsers() {
  const supabase = createClient();
  return supabase
    .from("users")
    .select("id, email, full_name, role")
    .order("role", { ascending: true })  // admins first
    .order("full_name", { ascending: true, nullsFirst: false });
}
