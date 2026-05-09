import Link from "next/link";
import { REQUEST_TYPE_OPTIONS } from "@/lib/constants";
import type { RequestType } from "@/lib/supabase/types";

function buildHref(
  basePath: string,
  selected: RequestType[],
  carry: { from: string | null; to: string | null },
): string {
  const params = new URLSearchParams();
  if (carry.from) params.set("from", carry.from);
  if (carry.to) params.set("to", carry.to);
  if (selected.length > 0) params.set("types", selected.join(","));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function RequestTypeFilter({
  selected,
  from,
  to,
  basePath = "/admin/analytics",
}: {
  selected: RequestType[];
  from: string | null;
  to: string | null;
  basePath?: string;
}) {
  const allActive = selected.length === 0;
  const carry = { from, to };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Request type
      </span>

      <Link
        href={buildHref(basePath, [], carry)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
          allActive
            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        All
      </Link>

      {REQUEST_TYPE_OPTIONS.map((opt) => {
        const isOn = selected.includes(opt.value);
        const next = isOn
          ? selected.filter((t) => t !== opt.value)
          : [...selected, opt.value];
        return (
          <Link
            key={opt.value}
            href={buildHref(basePath, next, carry)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isOn
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
