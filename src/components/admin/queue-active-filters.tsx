import Link from "next/link";
import {
  REQUEST_TYPE_LABELS,
  STAGE_LABELS,
} from "@/lib/constants";
import type { RequestType, Stage } from "@/lib/supabase/types";

type ActiveFilters = {
  stages: Stage[];
  types: RequestType[];
  requesterId: string | null;
  requesterLabel: string | null;
  late: boolean;
};

function buildHref(removed: Partial<ActiveFilters>, current: ActiveFilters): string {
  const stages = removed.stages !== undefined ? removed.stages : current.stages;
  const types = removed.types !== undefined ? removed.types : current.types;
  const requesterId =
    "requesterId" in removed ? removed.requesterId : current.requesterId;
  const late = removed.late !== undefined ? removed.late : current.late;

  const params = new URLSearchParams();
  if (stages.length > 0) params.set("stages", stages.join(","));
  if (types.length > 0) params.set("types", types.join(","));
  if (requesterId) params.set("requester", requesterId);
  if (late) params.set("late", "true");
  const qs = params.toString();
  return qs ? `/admin/queue?${qs}` : "/admin/queue";
}

export function QueueActiveFilters({ filters }: { filters: ActiveFilters }) {
  const hasAny =
    filters.stages.length > 0 ||
    filters.types.length > 0 ||
    filters.requesterId ||
    filters.late;

  if (!hasAny) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Filters
      </span>

      {filters.stages.map((s) => (
        <Pill
          key={`stage-${s}`}
          label={`Stage: ${STAGE_LABELS[s]}`}
          href={buildHref({ stages: filters.stages.filter((x) => x !== s) }, filters)}
        />
      ))}

      {filters.types.map((t) => (
        <Pill
          key={`type-${t}`}
          label={`Type: ${REQUEST_TYPE_LABELS[t]}`}
          href={buildHref({ types: filters.types.filter((x) => x !== t) }, filters)}
        />
      ))}

      {filters.requesterId ? (
        <Pill
          label={`Requester: ${filters.requesterLabel ?? "—"}`}
          href={buildHref({ requesterId: null }, filters)}
        />
      ) : null}

      {filters.late ? (
        <Pill label="Late only" href={buildHref({ late: false }, filters)} />
      ) : null}

      <Link
        href="/admin/queue"
        className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}

function Pill({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
    >
      {label}
      <span aria-hidden className="text-indigo-400">×</span>
    </Link>
  );
}
