import Link from "next/link";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";
import type { Stage } from "@/lib/supabase/types";

type ListedTicket = {
  id: string;
  request_name: string;
  stage: Stage;
  priority_rank: number | null;
  expected_completion_date: string | null;
  created_at: string;
  owner: { full_name: string | null; email: string } | null;
};

export function RequestStatusList({
  tickets,
  totalOpen,
  highlightId,
}: {
  tickets: ListedTicket[];
  totalOpen: number;
  highlightId?: string;
}) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-600">
          You haven&apos;t submitted any requests yet.
        </p>
        <Link
          href="/?tab=new"
          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          Start a new request →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {highlightId ? (
        <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-sm text-emerald-800">
          Request submitted. You&apos;ll see status updates here.
        </div>
      ) : null}
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <Th className="w-24">Rank</Th>
            <Th>Request Name</Th>
            <Th className="w-44">Task Owner</Th>
            <Th className="w-36">Stage</Th>
            <Th className="w-44">Expected Completion</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {tickets.map((t) => (
            <tr
              key={t.id}
              className={`cursor-pointer transition hover:bg-slate-50 ${
                t.id === highlightId ? "bg-emerald-50/60" : ""
              }`}
            >
              <Td>
                <Link href={`/requests/${t.id}`} className="block w-full">
                  {t.priority_rank ? (
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">{t.priority_rank}</span>
                      <span className="text-slate-400"> of {totalOpen}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </Link>
              </Td>
              <Td>
                <Link
                  href={`/requests/${t.id}`}
                  className="block w-full font-medium text-slate-900 hover:text-indigo-600"
                >
                  {t.request_name}
                </Link>
              </Td>
              <Td>
                <Link href={`/requests/${t.id}`} className="block w-full text-sm text-slate-600">
                  {t.owner?.full_name ?? t.owner?.email ?? (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </Link>
              </Td>
              <Td>
                <Link href={`/requests/${t.id}`} className="block w-full">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_COLORS[t.stage]}`}
                  >
                    {STAGE_LABELS[t.stage]}
                  </span>
                </Link>
              </Td>
              <Td>
                <Link href={`/requests/${t.id}`} className="block w-full text-sm text-slate-600">
                  {t.expected_completion_date ? (
                    formatDate(t.expected_completion_date)
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-3 align-middle">{children}</td>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
