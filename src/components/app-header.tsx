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
          <Link href={isAdmin ? "/admin/queue" : "/"} className="flex items-baseline gap-3">
            <span className="text-lg font-semibold text-slate-900">Koda Data Requests</span>
            {isAdmin ? (
              <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                admin
              </span>
            ) : null}
          </Link>

          {profile ? (
            <nav className="flex items-center gap-1">
              {isAdmin ? (
                <>
                  <NavLink href="/admin/queue">Queue</NavLink>
                  <NavLink href="/admin/analytics">Analytics</NavLink>
                </>
              ) : null}
              <NavLink href="/?tab=status">My Requests</NavLink>
              <NavLink href="/?tab=new">New Request</NavLink>
            </nav>
          ) : null}
        </div>

        {profile ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {profile.full_name ?? profile.email}
            </span>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
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
      className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      {children}
    </Link>
  );
}
