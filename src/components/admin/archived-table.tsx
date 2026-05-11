import Link from "next/link";
import { REQUEST_TYPE_LABELS, STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";
import { RestoreTicketButton } from "@/components/admin/restore-ticket-button";
import type { TicketListed } from "@/lib/tickets/queries";

export function ArchivedTable({ tickets }: { tickets: TicketListed[] }) {
  if (tickets.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm text-slate-500">No archived requests.</p>
      </div>
    );
  }

  return (
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
          {tickets.map((t) => (
            <tr key={t.id} className="align-middle">
              <Td>
                <Link
                  href={`/requests/${t.id}`}
                  className="block font-medium text-slate-900 hover:text-koda-navy"
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
