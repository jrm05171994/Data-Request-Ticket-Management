import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function AppHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string | null; email: string; role: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("full_name, email, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const isAdmin = profile?.role === "admin";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href={isAdmin ? "/admin/queue" : "/"}
            className="flex items-center gap-3"
          >
            <KodaMark />
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold tracking-tight text-koda-navy">
                Data Requests
              </span>
              {isAdmin ? (
                <span className="inline-flex rounded-full bg-koda-teal-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-koda-navy">
                  admin
                </span>
              ) : null}
            </div>
          </Link>

          {profile ? (
            <nav className="flex items-center gap-0.5">
              {isAdmin ? (
                <>
                  <NavLink href="/admin/queue">Queue</NavLink>
                  <NavLink href="/admin/analytics">Analytics</NavLink>
                  <NavLink href="/admin/archived">Archived</NavLink>
                  <NavLink href="/admin/users">Users</NavLink>
                  <NavLink href="/admin/scoring">Scoring</NavLink>
                </>
              ) : null}
              <NavLink href="/?tab=status">My Requests</NavLink>
              <NavLink href="/?tab=new">New Request</NavLink>
            </nav>
          ) : null}
        </div>

        {profile ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <div className="font-medium text-slate-800">
                {profile.full_name ?? profile.email}
              </div>
              <div className="text-xs text-slate-500">{profile.email}</div>
            </div>
            <form action="/logout" method="post">
              <button type="submit" className="btn-secondary">
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-koda-teal-50 hover:text-koda-navy"
    >
      {children}
    </Link>
  );
}

function KodaMark() {
  // Simple geometric mark — two interlocking circles in Koda navy + teal,
  // evoking the "connection" feel of the brand without needing the official
  // logo asset.
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center">
      <span className="absolute left-0 top-1 h-6 w-6 rounded-full bg-koda-navy" />
      <span className="absolute right-0 bottom-1 h-6 w-6 rounded-full bg-koda-teal mix-blend-multiply" />
    </span>
  );
}
