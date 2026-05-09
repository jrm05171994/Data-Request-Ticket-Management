import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { NewRequestForm } from "@/components/new-request-form";
import { RequestStatusList } from "@/components/request-status-list";
import { listMyTickets, getTotalOpenTicketCount } from "@/lib/tickets/queries";

type SearchParams = { tab?: string; created?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tab = searchParams.tab === "new" ? "new" : "status";

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-5xl px-6 py-6">
        <Tabs current={tab} />

        <div className="mt-6">
          {tab === "new" ? (
            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">New Request</h2>
              <p className="mt-1 text-sm text-slate-600">
                Tell the data team what you need. The more context, the faster the turnaround.
              </p>
              <div className="mt-6">
                <NewRequestForm />
              </div>
            </div>
          ) : (
            <StatusTab highlightId={searchParams.created} />
          )}
        </div>
      </div>
    </main>
  );
}

async function StatusTab({ highlightId }: { highlightId?: string }) {
  const [{ data: tickets, error }, totalOpen] = await Promise.all([
    listMyTickets(),
    getTotalOpenTicketCount(),
  ]);

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-800">
        Could not load tickets: {error.message}
      </div>
    );
  }

  return (
    <RequestStatusList
      tickets={tickets ?? []}
      totalOpen={totalOpen}
      highlightId={highlightId}
    />
  );
}

function Tabs({ current }: { current: "new" | "status" }) {
  return (
    <nav className="flex gap-2 border-b border-slate-200">
      <TabLink href="/?tab=status" active={current === "status"}>
        Request Status
      </TabLink>
      <TabLink href="/?tab=new" active={current === "new"}>
        New Request
      </TabLink>
    </nav>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-indigo-600 text-indigo-700"
          : "border-transparent text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}
