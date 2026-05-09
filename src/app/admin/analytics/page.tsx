import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  formatDuration,
  getAvgTimePerStage,
  getKpis,
  getLateTickets,
  getRequestTypeCounts,
  getStageCounts,
  getTopRequesters,
  type AnalyticsFilters,
} from "@/lib/analytics/queries";
import {
  REQUEST_TYPE_LABELS,
  STAGE_COLORS,
  STAGE_LABELS,
} from "@/lib/constants";
import { AppHeader } from "@/components/app-header";
import { BarRow } from "@/components/admin/analytics/bar-row";
import { DateRangeFilter } from "@/components/admin/analytics/date-range-filter";
import { RequestTypeFilter } from "@/components/admin/analytics/request-type-filter";
import type { RequestType, Stage } from "@/lib/supabase/types";

type SearchParams = { from?: string; to?: string; types?: string };

const VALID_REQUEST_TYPES: ReadonlyArray<RequestType> = [
  "risk_scoring",
  "new_dashboard",
  "new_visual",
  "new_analysis",
  "update_existing",
  "other",
];

function parseFilters(searchParams: SearchParams): AnalyticsFilters {
  const from =
    searchParams.from && searchParams.from.length === 10
      ? `${searchParams.from}T00:00:00Z`
      : null;
  let to: string | null = null;
  if (searchParams.to && searchParams.to.length === 10) {
    const d = new Date(`${searchParams.to}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    to = d.toISOString();
  }

  const requestTypes = searchParams.types
    ? (searchParams.types
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is RequestType =>
          VALID_REQUEST_TYPES.includes(s as RequestType),
        ) as RequestType[])
    : null;

  return { from, to, requestTypes };
}

/** Build a /admin/queue URL preserving any analytics filters as queue filters. */
function queueHref(
  base: { stages?: Stage[]; types?: RequestType[]; requesterId?: string; late?: boolean },
  carry: AnalyticsFilters,
): string {
  const params = new URLSearchParams();
  if (base.stages?.length) params.set("stages", base.stages.join(","));

  // Combine analytics-level type filter with any explicit drill-down type
  const types = base.types?.length
    ? base.types
    : carry.requestTypes && carry.requestTypes.length > 0
      ? carry.requestTypes
      : [];
  if (types.length > 0) params.set("types", types.join(","));

  if (base.requesterId) params.set("requester", base.requesterId);
  if (base.late) params.set("late", "true");

  const qs = params.toString();
  return qs ? `/admin/queue?${qs}` : "/admin/queue";
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const filters = parseFilters(searchParams);

  const [
    { data: kpis, error: kpisError },
    { data: stageCounts, error: stageErr },
    { data: typeCounts, error: typeErr },
    { data: requesters, error: reqErr },
    { data: avgPerStage, error: avgErr },
    { data: lateList, error: lateErr },
  ] = await Promise.all([
    getKpis(filters),
    getStageCounts(filters),
    getRequestTypeCounts(filters),
    getTopRequesters(filters, 10),
    getAvgTimePerStage(filters),
    getLateTickets(filters),
  ]);

  const anyError =
    kpisError || stageErr || typeErr || reqErr || avgErr || lateErr;

  const stageMap = new Map<Stage, number>(
    (stageCounts ?? []).map((r) => [r.stage, Number(r.ticket_count)]),
  );
  const stageOrder: Stage[] = ["submitted", "received", "in_progress", "completed"];
  const stageMax = Math.max(1, ...Array.from(stageMap.values()));

  const typeMax = Math.max(1, ...(typeCounts ?? []).map((r) => Number(r.ticket_count)));
  const requesterMax = Math.max(
    1,
    ...(requesters ?? []).map((r) => Number(r.ticket_count)),
  );

  const avgStageMap = new Map<
    Stage,
    { avg: number | null; samples: number }
  >(
    (avgPerStage ?? []).map((r) => [
      r.stage,
      {
        avg: r.avg_seconds == null ? null : Number(r.avg_seconds),
        samples: Number(r.sample_count),
      },
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-end justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
            <p className="mt-1 text-sm text-slate-600">
              Operational view of request volume, completion rate, and bottlenecks. Click any
              metric to drill into the ticket queue.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <DateRangeFilter
            from={searchParams.from ?? null}
            to={searchParams.to ?? null}
            types={searchParams.types ?? null}
          />
          <RequestTypeFilter
            selected={filters.requestTypes ?? []}
            from={searchParams.from ?? null}
            to={searchParams.to ?? null}
          />
        </div>

        {anyError ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            Some analytics failed to load: {anyError.message}
          </div>
        ) : null}

        {/* KPI cards (clickable) ---------------------------------------- */}
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi
            label="Total"
            value={kpis?.total_tickets ?? 0}
            href={queueHref({}, filters)}
          />
          <Kpi
            label="Open"
            value={kpis?.open_tickets ?? 0}
            href={queueHref(
              { stages: ["submitted", "received", "in_progress"] },
              filters,
            )}
          />
          <Kpi
            label="Completed"
            value={kpis?.completed_tickets ?? 0}
            href={queueHref({ stages: ["completed"] }, filters)}
          />
          <Kpi
            label="Late"
            value={kpis?.late_tickets ?? 0}
            tone={kpis && kpis.late_tickets > 0 ? "warn" : "neutral"}
            href={queueHref({ late: true }, filters)}
          />
          <Kpi
            label="Avg time to complete"
            valueText={formatDuration(kpis?.avg_completion_seconds ?? null)}
          />
        </section>

        {/* By stage + by type ------------------------------------------- */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card title="Tickets by Stage">
            {stageOrder.map((s) => (
              <BarRow
                key={s}
                label={STAGE_LABELS[s]}
                value={stageMap.get(s) ?? 0}
                max={stageMax}
                colorClass={stageBarColor(s)}
                href={
                  (stageMap.get(s) ?? 0) > 0
                    ? queueHref({ stages: [s] }, filters)
                    : undefined
                }
              />
            ))}
          </Card>

          <Card title="Tickets by Request Type">
            {(typeCounts ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No tickets in this range.</p>
            ) : (
              (typeCounts ?? []).map((row) => (
                <BarRow
                  key={row.request_type}
                  label={REQUEST_TYPE_LABELS[row.request_type]}
                  value={Number(row.ticket_count)}
                  max={typeMax}
                  colorClass="bg-indigo-500"
                  href={queueHref({ types: [row.request_type] }, filters)}
                />
              ))
            )}
          </Card>
        </section>

        {/* Avg time per stage + top requesters -------------------------- */}
        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Average Time at Each Stage">
            {stageOrder.map((s) => {
              const entry = avgStageMap.get(s);
              return (
                <div
                  key={s}
                  className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STAGE_COLORS[s]}`}
                    >
                      {STAGE_LABELS[s]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {entry?.samples ?? 0} sample
                      {entry?.samples === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-slate-800">
                    {formatDuration(entry?.avg ?? null)}
                  </span>
                </div>
              );
            })}
            <p className="mt-3 text-xs text-slate-400">
              Includes time tickets are still spending in their current stage.
            </p>
          </Card>

          <Card title="Top Requesters">
            {(requesters ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No tickets in this range.</p>
            ) : (
              (requesters ?? []).map((r) => (
                <BarRow
                  key={r.requester_id}
                  label={r.full_name ?? r.email}
                  value={Number(r.ticket_count)}
                  max={requesterMax}
                  colorClass="bg-emerald-500"
                  href={queueHref({ requesterId: r.requester_id }, filters)}
                />
              ))
            )}
          </Card>
        </section>

        {/* Late tickets list -------------------------------------------- */}
        <section className="mt-4">
          <Card title={`Late Tickets (${(lateList ?? []).length})`}>
            {(lateList ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">
                Nothing past its expected completion date. Nice.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Request</Th>
                      <Th>Requester</Th>
                      <Th>Stage</Th>
                      <Th className="text-right">ETA</Th>
                      <Th className="text-right">Days late</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(lateList ?? []).map((row) => (
                      <tr key={row.id}>
                        <Td>
                          <Link
                            href={`/requests/${row.id}`}
                            className="font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {row.request_name}
                          </Link>
                        </Td>
                        <Td>
                          <span className="text-sm text-slate-700">
                            {row.requester_full_name ?? row.requester_email}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STAGE_COLORS[row.stage]}`}
                          >
                            {STAGE_LABELS[row.stage]}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span className="text-sm text-slate-700">
                            {formatDate(row.expected_completion_date)}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <span className="text-sm font-semibold text-red-700">
                            {row.days_late}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  valueText,
  tone = "neutral",
  href,
}: {
  label: string;
  value?: number;
  valueText?: string;
  tone?: "neutral" | "warn";
  href?: string;
}) {
  const inner = (
    <div
      className={`rounded-2xl p-4 shadow-sm ring-1 transition ${
        tone === "warn"
          ? "bg-red-50 ring-red-100 hover:ring-red-200"
          : "bg-white ring-slate-200 hover:ring-slate-300"
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "warn" ? "text-red-700" : "text-slate-900"
        }`}
      >
        {valueText ?? value?.toLocaleString() ?? 0}
      </div>
    </div>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-2 align-middle ${className ?? ""}`}>{children}</td>
  );
}

function stageBarColor(s: Stage): string {
  switch (s) {
    case "submitted":
      return "bg-slate-400";
    case "received":
      return "bg-blue-500";
    case "in_progress":
      return "bg-amber-500";
    case "completed":
      return "bg-emerald-500";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
