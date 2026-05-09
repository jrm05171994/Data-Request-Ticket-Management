// Simple horizontal bar chart row, no library — just a styled div.

export function BarRow({
  label,
  value,
  max,
  hint,
  colorClass = "bg-indigo-500",
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
  colorClass?: string;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-40 truncate text-sm text-slate-700">{label}</div>
      <div className="relative flex-1">
        <div className="h-5 rounded bg-slate-100">
          <div
            className={`h-5 rounded ${colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="w-24 text-right text-sm tabular-nums text-slate-700">
        <span className="font-medium">{value}</span>
        {hint ? <span className="ml-1 text-xs text-slate-400">{hint}</span> : null}
      </div>
    </div>
  );
}
