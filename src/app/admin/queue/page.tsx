import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAllTicketsForAdmin } from "@/lib/tickets/queries";
import { listAssignableUsers } from "@/lib/users/queries";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { EtaCell, OwnerCell, StageCell } from "@/components/admin/inline-cells";
import { QueueActiveFilters } from "@/components/admin/queue-active-filters";
import type { RequestType, Stage } from "@/lib/supabase/types";
import { REQUEST_TYPE_LABELS } from "@/lib/constants";

type SearchParams = {
  stages?: string;
  types?: string;
  requester?: string;
  late?: string;
};

const VALID_STAGES: ReadonlyArray<Stage> = [
  "submitted",
  "received",
  "in_progress",
  "completed",
];
const VALID_TYPES: ReadonlyArray<RequestType> = [
  "risk_scoring",
  "new_dashboard",
  "new_visual",
  "new_analysis",
  "update_existing",
  "other",
];

function parseFilters(searchParams: SearchParams) {
  const stages = (searchParams.stages
    ? searchParams.stages
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is Stage => VALID_STAGES.includes(s as Stage))
    : []) as Stage[];

  const types = (searchParams.types
    ? searchParams.types
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is RequestType => VALID_TYPES.includes(s as RequestType))
    : []) as RequestType[];

  const requesterId = searchParams.requester || null;
  const late = searchParams.late === "true";

  return { stages, types, requesterId, late };
}

export default async function AdminQueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const filters = parseFilters(searchParams);

  const supabase = createClient();
  const [{ data: tickets, error: ticketsError }, { data: users, error: usersError }, requesterRow] =
    await Promise.all([
      listAllTicketsForAdmin({
        stages: filters.stages.length ? filters.stages : null,
        types: filters.types.length ? filters.types : null,
        requesterId: filters.requesterId,
        late: filters.late,
      }),
      listAssignableUsers(),
      filters.requesterId
        ? supabase
            .from("users")
            .select("id, email, full_name")
            .eq("id", filters.requesterId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (ticketsError) {
    return (
      <main className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="rounded-2xl bg-koda-coral-50 p-6 text-sm text-koda-coral-700">
            Could not load tickets: {ticketsError.message}
          </div>
        </div>
      </main>
    );
  }

  const allTickets = tickets ?? [];
  const openCount = allTickets.filter((t) => t.stage !== "completed").length;
  const requesterRecord =
    requesterRow && "data" in requesterRow ? requesterRow.data : null;

  const requesterLabel = requesterRecord
    ? requesterRecord.full_name ?? requesterRecord.email
    : null;

  const totalLine = describeFilters(filters, allTickets.length, openCount);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-end justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admin Queue</h1>
            <p className="mt-1 text-sm text-slate-600">{totalLine}</p>
          </div>
          <Link
            href="/?tab=new"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            + New request
          </Link>
        </div>

        <QueueActiveFilters
          filters={{
            stages: filters.stages,
            types: filters.types,
            requesterId: filters.requesterId,
            requesterLabel,
            late: filters.late,
          }}
        />

        {usersError ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Owner dropdown limited: {usersError.message}
          </p>
        ) : null}

        {allTickets.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm text-slate-600">
              No requests match these filters.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <Th className="w-16">Rank</Th>
                    <Th>Request Name</Th>
                    <Th className="w-44">Type</Th>
                    <Th className="w-40">Requester</Th>
                    <Th className="w-32">Submitted</Th>
                    <Th className="w-56">Task Owner</Th>
                    <Th className="w-44">Stage</Th>
                    <Th className="w-44">Expected Completion</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {allTickets.map((t) => (
                    <tr key={t.id} className="align-middle">
                      <Td>
                        {t.priority_rank ? (
                          <span className="text-sm font-medium text-slate-900">
                            {t.priority_rank}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </Td>
                      <Td>
                        <Link
                          href={`/requests/${t.id}`}
                          className="block font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {t.request_name}
                        </Link>
                        <div className="text-xs text-slate-500">
                          score {Number(t.priority_score).toFixed(2)}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-700">
                          {REQUEST_TYPE_LABELS[t.request_type]}
                        </span>
                      </Td>
                      <Td>
                        <div className="text-sm text-slate-700">
                          {t.requester?.full_name ?? t.requester?.email ?? "—"}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-sm text-slate-600">
                          {formatDate(t.created_at)}
                        </span>
                      </Td>
                      <Td>
                        <OwnerCell
                          ticketId={t.id}
                          currentOwnerId={t.owner_id}
                          users={users ?? []}
                        />
                      </Td>
                      <Td>
                        <StageCell ticketId={t.id} currentStage={t.stage} />
                      </Td>
                      <Td>
                        <EtaCell
                          ticketId={t.id}
                          currentDate={t.expected_completion_date}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function describeFilters(
  filters: ReturnType<typeof parseFilters>,
  shown: number,
  openCount: number,
): string {
  const hasFilter =
    filters.stages.length || filters.types.length || filters.requesterId || filters.late;
  if (hasFilter) {
    return `${shown} ticket${shown === 1 ? "" : "s"} match — clear filters to see the full queue.`;
  }
  return `${openCount} open · ${shown} total · ranked by priority score.`;
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
