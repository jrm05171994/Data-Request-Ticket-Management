import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type UserMini = { id: string; email: string; full_name: string | null };

export type TicketListed = Pick<
  TicketRow,
  | "id"
  | "request_name"
  | "stage"
  | "priority_rank"
  | "priority_score"
  | "expected_completion_date"
  | "created_at"
  | "owner_id"
  | "requester_id"
> & {
  owner: UserMini | null;
  requester: UserMini | null;
};

export type TicketDetail = TicketRow & {
  owner: UserMini | null;
  requester: UserMini | null;
};

const LIST_SELECT = `
  id, request_name, stage, priority_rank, priority_score,
  expected_completion_date, created_at, owner_id, requester_id,
  owner:owner_id ( id, email, full_name ),
  requester:requester_id ( id, email, full_name )
`;

const DETAIL_SELECT = `
  *,
  owner:owner_id ( id, email, full_name ),
  requester:requester_id ( id, email, full_name )
`;

/**
 * Count of all non-completed tickets across the system.
 * Used for the "Rank X of Y" display on requester views.
 *
 * Service role bypasses RLS — requesters can't see other people's tickets,
 * but they can know how big the open queue is.
 */
export async function getTotalOpenTicketCount(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .neq("stage", "completed");

  if (error) {
    console.error("getTotalOpenTicketCount", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Tickets visible to the current user (RLS-filtered).
 * For requesters: their own tickets.
 * For admins: every ticket.
 */
export async function listMyTickets() {
  const supabase = createClient();
  return supabase
    .from("tickets")
    .select(LIST_SELECT)
    .order("priority_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<TicketListed[]>();
}

export async function getTicketById(id: string) {
  const supabase = createClient();
  return supabase
    .from("tickets")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .single<TicketDetail>();
}
