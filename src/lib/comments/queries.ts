import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";

export type TicketComment = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    email: string;
    full_name: string | null;
    role: Role;
  } | null;
};

/**
 * Comments for a ticket, oldest first (chronological thread).
 */
export async function listTicketComments(ticketId: string): Promise<{
  data: TicketComment[] | null;
  error: PostgrestError | null;
}> {
  const supabase = createClient();
  const result = await supabase
    .from("ticket_comments")
    .select(
      `id, ticket_id, author_id, body, created_at,
       author:author_id ( id, email, full_name, role )`,
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return {
    data: (result.data as unknown as TicketComment[] | null) ?? null,
    error: result.error,
  };
}
