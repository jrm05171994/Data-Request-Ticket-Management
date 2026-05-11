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
  received: "bg-koda-teal-light text-koda-navy",
  in_progress: "bg-koda-coral-50 text-koda-coral-700",
  completed: "bg-koda-green-100 text-koda-green-700",
};

// Per-type pill colors for the queue + archived list, so admins can
// pattern-match on type at a glance. Distinct from STAGE_COLORS so the
// two columns don't fight each other.
export const REQUEST_TYPE_PILL_CLASSES: Record<RequestType, string> = {
  risk_scoring: "bg-koda-coral-50 text-koda-coral-700 ring-1 ring-koda-coral-100",
  new_dashboard: "bg-koda-teal-light text-koda-navy ring-1 ring-koda-teal/30",
  new_visual: "bg-violet-100 text-violet-700 ring-1 ring-violet-200",
  new_analysis: "bg-koda-navy-50 text-koda-navy ring-1 ring-koda-navy-100",
  update_existing: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  other: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};
