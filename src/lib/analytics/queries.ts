import { createClient } from "@/lib/supabase/server";

export type DateRange = {
  from: string | null; // ISO timestamp
  to: string | null;   // ISO timestamp
};

function rangeArgs(range: DateRange) {
  return { date_from: range.from, date_to: range.to };
}

export async function getKpis(range: DateRange) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("analytics_kpis", rangeArgs(range));
  if (error) return { data: null, error };
  return { data: data?.[0] ?? null, error: null };
}

export async function getStageCounts(range: DateRange) {
  const supabase = createClient();
  return supabase.rpc("analytics_stage_counts", rangeArgs(range));
}

export async function getRequestTypeCounts(range: DateRange) {
  const supabase = createClient();
  return supabase.rpc("analytics_request_type_counts", rangeArgs(range));
}

export async function getTopRequesters(range: DateRange, limit = 10) {
  const supabase = createClient();
  return supabase.rpc("analytics_top_requesters", {
    ...rangeArgs(range),
    limit_to: limit,
  });
}

export async function getAvgTimePerStage(range: DateRange) {
  const supabase = createClient();
  return supabase.rpc("analytics_avg_time_per_stage", rangeArgs(range));
}

export async function getLateTickets(range: DateRange) {
  const supabase = createClient();
  return supabase.rpc("analytics_late_tickets", rangeArgs(range));
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
