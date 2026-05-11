import { createClient } from "@/lib/supabase/server";

export async function getScoringConfig() {
  const supabase = createClient();
  return supabase.from("priority_config").select("*").eq("id", 1).single();
}
