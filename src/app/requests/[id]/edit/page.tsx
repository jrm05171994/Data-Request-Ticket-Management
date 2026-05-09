import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTicketById } from "@/lib/tickets/queries";
import { AppHeader } from "@/components/app-header";
import { RequestForm } from "@/components/request-form";
import { updateTicket } from "@/app/actions/tickets";

export default async function EditTicketPage({
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

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isOwnerSubmitted =
    ticket.requester_id === user.id && ticket.stage === "submitted";

  if (!isAdmin && !isOwnerSubmitted) {
    return (
      <main className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="mx-auto max-w-2xl px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Cannot edit this request</h1>
          <p className="mt-2 text-sm text-slate-600">
            Once a request moves out of the Submitted stage, only an admin can edit it.
          </p>
          <Link
            href={`/requests/${ticket.id}`}
            className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back to request
          </Link>
        </div>
      </main>
    );
  }

  const action = updateTicket.bind(null, ticket.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-3xl px-6 py-6">
        <Link
          href={`/requests/${ticket.id}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to request
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-lg font-semibold text-slate-900">Edit request</h1>
          <p className="mt-1 text-sm text-slate-600">
            Changes that affect priority (request type, priority, stakeholders, deadline) will
            re-score and re-rank automatically.
          </p>

          <div className="mt-6">
            <RequestForm
              action={action}
              defaults={{
                request_name: ticket.request_name,
                description: ticket.description ?? "",
                stakeholders_internal: ticket.stakeholders_internal?.join(", ") ?? "",
                stakeholders_external: ticket.stakeholders_external?.join(", ") ?? "",
                has_hard_deadline: ticket.has_hard_deadline,
                deadline_date: ticket.deadline_date,
                request_type: ticket.request_type,
                view_type: ticket.view_type,
                requester_priority: ticket.requester_priority,
                additional_info: ticket.additional_info ?? "",
              }}
              submitLabel="Save changes"
              pendingLabel="Saving…"
              cancelHref={`/requests/${ticket.id}`}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
