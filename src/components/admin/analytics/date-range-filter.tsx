// URL-driven date range filter. Server-rendered.
// Uses a plain GET form so the page reloads with new searchParams.

import Link from "next/link";

const PRESETS: { label: string; days: number | null }[] = [
  { label: "All time", days: null },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function DateRangeFilter({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}) {
  const today = todayIso();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <form
        method="get"
        action="/admin/analytics"
        className="flex flex-wrap items-end gap-3"
      >
        <label className="text-sm">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            From
          </span>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            max={today}
            className="form-input mt-1 w-44"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            To
          </span>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            max={today}
            className="form-input mt-1 w-44"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Apply
        </button>
      </form>

      <div className="ml-auto flex flex-wrap items-center gap-1.5 text-xs">
        {PRESETS.map((p) => (
          <Link
            key={p.label}
            href={
              p.days == null
                ? "/admin/analytics"
                : `/admin/analytics?from=${isoNDaysAgo(p.days)}&to=${today}`
            }
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50"
          >
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
