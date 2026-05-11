import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTicketById, getTotalOpenTicketCount } from "@/lib/tickets/queries";
import {
  REQUEST_TYPE_LABELS,
  STAGE_COLORS,
  STAGE_LABELS,
  VIEW_TYPE_LABELS,
} from "@/lib/constants";
import { AppHeader } from "@/components/app-header";
import { DeleteTicketButton } from "@/components/delete-ticket-button";
import { RestoreTicketButton } from "@/components/admin/restore-ticket-button";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ticket, error } = await getTicketById(params.id);
  if (error || !ticket) {
    notFound();
  }

  const [{ data: profile }, totalOpen] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    getTotalOpenTicketCount(),
  ]);

  const isAdmin = profile?.role === "admin";
  const isArchived = ticket.deleted_at != null;
  const isOwnerSubmitted =
    ticket.requester_id === user.id && ticket.stage === "submitted";
  const canEdit = !isArchived && (isAdmin || isOwnerSubmitted);
  const canArchive = !isArchived && (isAdmin || isOwnerSubmitted);
  const canRestore = isArchived && isAdmin;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-4xl px-6 py-6">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Back to my requests
        </Link>

        {isArchived ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Archived</span>
              {ticket.deleted_at
                ? ` on ${formatDateTime(ticket.deleted_at)}`
                : ""}
              {ticket.deleter
                ? ` by ${ticket.deleter.full_name ?? ticket.deleter.email}`
                : ""}
              . Not counted in the active queue, ranks, or analytics.
            </p>
            {canRestore ? <RestoreTicketButton ticketId={ticket.id} variant="primary" /> : null}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {ticket.request_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Submitted {formatDateTime(ticket.created_at)} by{" "}
                {ticket.requester?.full_name ?? ticket.requester?.email}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <Link
                    href={`/requests/${ticket.id}/edit`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                ) : null}
                {canArchive ? <DeleteTicketButton ticketId={ticket.id} label="Archive" /> : null}
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_COLORS[ticket.stage]}`}
              >
                {STAGE_LABELS[ticket.stage]}
              </span>
              {ticket.priority_rank ? (
                <span className="text-xs text-slate-500">
                  Rank{" "}
                  <span className="font-semibold text-slate-700">
                    {ticket.priority_rank}
                  </span>{" "}
                  of {totalOpen} open
                </span>
              ) : null}
            </div>
          </div>

          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Detail label="Task Owner">
              {ticket.owner?.full_name ?? ticket.owner?.email ?? (
                <span className="text-slate-400">Unassigned</span>
              )}
            </Detail>

            <Detail label="Expected Completion">
              {ticket.expected_completion_date ? (
                formatDate(ticket.expected_completion_date)
              ) : (
                <span className="text-slate-400">Not set</span>
              )}
            </Detail>

            <Detail label="Request Type">
              {REQUEST_TYPE_LABELS[ticket.request_type]}
            </Detail>

            <Detail label="View Type">
              {VIEW_TYPE_LABELS[ticket.view_type]}
            </Detail>

            <Detail label="Requester Priority">
              {ticket.requester_priority} / 5
            </Detail>

            <Detail label="Stakeholder Type">
              <span className="capitalize">{ticket.stakeholder_type}</span>
              {ticket.stakeholder_type === "external" && ticket.has_hard_deadline ? (
                <span className="ml-2 text-xs text-slate-500">
                  · hard deadline {ticket.deadline_date ? formatDate(ticket.deadline_date) : ""}
                </span>
              ) : null}
            </Detail>

            <Detail label="Internal Stakeholders" full>
              {ticket.stakeholders_internal && ticket.stakeholders_internal.length ? (
                ticket.stakeholders_internal.join(", ")
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </Detail>

            <Detail label="External Stakeholders" full>
              {ticket.stakeholders_external && ticket.stakeholders_external.length ? (
                ticket.stakeholders_external.join(", ")
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </Detail>

            <Detail label="Description" full>
              <p className="whitespace-pre-wrap text-slate-700">{ticket.description}</p>
            </Detail>

            {ticket.additional_info ? (
              <Detail label="Additional Information" full>
                <p className="whitespace-pre-wrap text-slate-700">{ticket.additional_info}</p>
              </Detail>
            ) : null}

            <Detail label="Priority Score">
              <span className="font-mono text-slate-700">
                {Number(ticket.priority_score).toFixed(2)} / 100
              </span>
            </Detail>

            {ticket.completed_at ? (
              <Detail label="Completed">{formatDateTime(ticket.completed_at)}</Detail>
            ) : null}
          </dl>
        </div>
      </div>
    </main>
  );
}

function Detail({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
