import { createClient } from "@/lib/supabase/server";
import type { RequestType } from "@/lib/supabase/types";

export type DateRange = {
  from: string | null; // ISO timestamp
  to: string | null;   // ISO timestamp
};

export type AnalyticsFilters = DateRange & {
  requestTypes: RequestType[] | null; // null/empty → all types
};

function rpcArgs(filters: AnalyticsFilters) {
  const types = filters.requestTypes && filters.requestTypes.length > 0
    ? filters.requestTypes
    : null;
  return {
    date_from: filters.from,
    date_to: filters.to,
    request_types: types,
  };
}

export async function getKpis(filters: AnalyticsFilters) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("analytics_kpis", rpcArgs(filters));
  if (error) return { data: null, error };
  return { data: data?.[0] ?? null, error: null };
}

export async function getStageCounts(filters: AnalyticsFilters) {
  const supabase = createClient();
  return supabase.rpc("analytics_stage_counts", rpcArgs(filters));
}

export async function getRequestTypeCounts(filters: AnalyticsFilters) {
  const supabase = createClient();
  return supabase.rpc("analytics_request_type_counts", rpcArgs(filters));
}

export async function getTopRequesters(filters: AnalyticsFilters, limit = 10) {
  const supabase = createClient();
  return supabase.rpc("analytics_top_requesters", {
    ...rpcArgs(filters),
    limit_to: limit,
  });
}

export async function getAvgTimePerStage(filters: AnalyticsFilters) {
  const supabase = createClient();
  return supabase.rpc("analytics_avg_time_per_stage", rpcArgs(filters));
}

export async function getLateTickets(filters: AnalyticsFilters) {
  const supabase = createClient();
  return supabase.rpc("analytics_late_tickets", rpcArgs(filters));
}

// ---------- formatting helpers --------------------------------------------

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  if (days < 30) return `${days.toFixed(1)}d`;
  const months = days / 30;
  return `${months.toFixed(1)}mo`;
}
