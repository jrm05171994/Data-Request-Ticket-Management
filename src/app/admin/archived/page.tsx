import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listArchivedTicketsForAdmin } from "@/lib/tickets/queries";
import { AppHeader } from "@/components/app-header";
import { RestoreTicketButton } from "@/components/admin/restore-ticket-button";
import { REQUEST_TYPE_LABELS, STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";

export default async function AdminArchivedPage() {
  await requireAdmin();
  const { data: tickets, error } = await listArchivedTicketsForAdmin();

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Archived Requests</h1>
          <p className="mt-1 text-sm text-slate-600">
            Audit trail of every archived request. Restore brings the request back into
            the active queue at its computed priority rank.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-koda-coral-50 p-6 text-sm text-koda-coral-700">
            Could not load archived requests: {error.message}
          </div>
        ) : null}

        {(tickets ?? []).length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm text-slate-600">No archived requests.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Request Name</Th>
                    <Th className="w-40">Requester</Th>
                    <Th className="w-44">Type</Th>
                    <Th className="w-32">Stage at archive</Th>
                    <Th className="w-44">Archived</Th>
                    <Th className="w-40">Archived by</Th>
                    <Th className="w-32 text-right">Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(tickets ?? []).map((t) => (
                    <tr key={t.id} className="align-middle">
                      <Td>
                        <Link
                          href={`/requests/${t.id}`}
                          className="block font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {t.request_name}
                        </Link>
                      </Td>
                      <Td>
                        <span className="text-sm text-slate-700">
                          {t.requester?.full_name ?? t.requester?.email ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-700">
                          {REQUEST_TYPE_LABELS[t.request_type]}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STAGE_COLORS[t.stage]}`}
                        >
                          {STAGE_LABELS[t.stage]}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm text-slate-700">
                          {t.deleted_at ? formatDateTime(t.deleted_at) : "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm text-slate-700">
                          {t.deleter?.full_name ?? t.deleter?.email ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex justify-end">
                          <RestoreTicketButton ticketId={t.id} variant="primary" />
                        </div>
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
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
