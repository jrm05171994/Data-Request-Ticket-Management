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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
        {/* Brand --------------------------------------------------- */}
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

        {/* Nav + actions ------------------------------------------- */}
        {profile ? (
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            {isAdmin ? (
              <div className="flex items-center rounded-xl bg-koda-teal-light/50 p-1 ring-1 ring-koda-teal/20">
                <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-koda-navy/60">
                  Admin
                </span>
                <AdminNavLink href="/admin/queue">Queue</AdminNavLink>
                <AdminNavLink href="/admin/analytics">Analytics</AdminNavLink>
                <AdminNavLink href="/admin/settings">Admin</AdminNavLink>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Link
                href="/?tab=status"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:text-koda-navy"
              >
                My Requests
              </Link>
              <Link
                href="/?tab=new"
                className="inline-flex items-center gap-1 rounded-lg bg-koda-teal px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-koda-teal-600 focus:outline-none focus:ring-2 focus:ring-koda-teal/40"
              >
                <PlusIcon />
                New Request
              </Link>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
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
          </div>
        ) : null}
      </div>
    </header>
  );
}

function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1 text-sm font-medium text-koda-navy/80 transition hover:bg-white hover:text-koda-navy"
    >
      {children}
    </Link>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 3.75a.75.75 0 01.75.75v4.75h4.75a.75.75 0 010 1.5h-4.75v4.75a.75.75 0 01-1.5 0v-4.75H4.5a.75.75 0 010-1.5h4.75V4.5a.75.75 0 01.75-.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function KodaMark() {
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center">
      <span className="absolute left-0 top-1 h-6 w-6 rounded-full bg-koda-navy" />
      <span className="absolute right-0 bottom-1 h-6 w-6 rounded-full bg-koda-teal mix-blend-multiply" />
    </span>
  );
}
