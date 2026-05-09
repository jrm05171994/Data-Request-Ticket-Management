import type { RequestType, Stage, ViewType } from "./supabase/types";

export const REQUEST_TYPE_OPTIONS: { value: RequestType; label: string }[] = [
  { value: "new_visual", label: "New Visual – Standalone" },
  { value: "new_dashboard", label: "New Dashboard" },
  { value: "new_analysis", label: "New Analysis" },
  { value: "update_existing", label: "Update to Existing Work" },
  { value: "risk_scoring", label: "New Client Data – Risk Scoring" },
  { value: "other", label: "Other" },
];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = Object.fromEntries(
  REQUEST_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<RequestType, string>;

export const VIEW_TYPE_OPTIONS: { value: ViewType; label: string; helper: string }[] = [
  {
    value: "aggregated",
    label: "Aggregated Data",
    helper: "Counts, rates, totals — no patient identifiers.",
  },
  {
    value: "patient_level",
    label: "Patient Level",
    helper: "Row-per-patient data. Includes PHI.",
  },
];

export const VIEW_TYPE_LABELS: Record<ViewType, string> = Object.fromEntries(
  VIEW_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ViewType, string>;

export const PRIORITY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1 – Low" },
  { value: 2, label: "2" },
  { value: 3, label: "3 – Medium" },
  { value: 4, label: "4" },
  { value: 5, label: "5 – High" },
];

export const STAGE_LABELS: Record<Stage, string> = {
  submitted: "Submitted",
  received: "Received",
  in_progress: "In Progress",
  completed: "Completed",
};

export const STAGE_COLORS: Record<Stage, string> = {
  submitted: "bg-slate-100 text-slate-700",
  received: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-700",
};
