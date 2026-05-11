import type { PostgrestError } from "@supabase/supabase-js";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Database, RequestType, Stage } from "@/lib/supabase/types";

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
  | "request_type"
  | "deleted_at"
  | "deleted_by"
> & {
  owner: UserMini | null;
  requester: UserMini | null;
  deleter: UserMini | null;
};

export type TicketDetail = TicketRow & {
  owner: UserMini | null;
  requester: UserMini | null;
  deleter: UserMini | null;
};

export type AdminQueueFilters = {
  stages: Stage[] | null;
  types: RequestType[] | null;
  requesterId: string | null;
  late: boolean;
};

const LIST_SELECT = `
  id, request_name, stage, priority_rank, priority_score,
  expected_completion_date, created_at, owner_id, requester_id, request_type,
  deleted_at, deleted_by,
  owner:owner_id ( id, email, full_name ),
  requester:requester_id ( id, email, full_name ),
  deleter:deleted_by ( id, email, full_name )
`;

const DETAIL_SELECT = `
  *,
  owner:owner_id ( id, email, full_name ),
  requester:requester_id ( id, email, full_name ),
  deleter:deleted_by ( id, email, full_name )
`;

/**
 * Count of all non-completed, non-deleted tickets across the system.
 * Used for the "Rank X of Y" display on requester views.
 */
export async function getTotalOpenTicketCount(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .neq("stage", "completed")
    .is("deleted_at", null);

  if (error) {
    console.error("getTotalOpenTicketCount", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Tickets the user submitted themselves (Request Status tab).
 * Excludes archived; admins can see archived via /admin/archived.
 */
export async function listMyTickets(userId: string) {
  const supabase = createClient();
  return supabase
    .from("tickets")
    .select(LIST_SELECT)
    .eq("requester_id", userId)
    .is("deleted_at", null)
    .order("priority_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<TicketListed[]>();
}

/**
 * Admin queue: active tickets only. Filters compose.
 */
export async function listAllTicketsForAdmin(filters?: Partial<AdminQueueFilters>) {
  const supabase = createClient();
  let query = supabase
    .from("tickets")
    .select(LIST_SELECT)
    .is("deleted_at", null);

  if (filters?.stages && filters.stages.length > 0) {
    query = query.in("stage", filters.stages);
  }
  if (filters?.types && filters.types.length > 0) {
    query = query.in("request_type", filters.types);
  }
  if (filters?.requesterId) {
    query = query.eq("requester_id", filters.requesterId);
  }
  if (filters?.late) {
    query = query
      .neq("stage", "completed")
      .not("expected_completion_date", "is", null)
      .lt("expected_completion_date", new Date().toISOString().slice(0, 10));
  }

  return query
    .order("priority_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<TicketListed[]>();
}

/**
 * Archived tickets for admin /admin/archived page.
 * Most-recently-archived first.
 *
 * Typed explicitly because `.not("col", "is", null)` confuses the
 * Supabase TS inference enough to collapse to `never`.
 */
export async function listArchivedTicketsForAdmin(): Promise<{
  data: TicketListed[] | null;
  error: PostgrestError | null;
}> {
  const supabase = createClient();
  const result = await supabase
    .from("tickets")
    .select(LIST_SELECT)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  return {
    data: (result.data as TicketListed[] | null) ?? null,
    error: result.error,
  };
}

export async function getTicketById(id: string) {
  const supabase = createClient();
  return supabase
    .from("tickets")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .single<TicketDetail>();
}
