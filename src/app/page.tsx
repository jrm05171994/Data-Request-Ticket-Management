import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("email, full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Koda Data Requests</h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as {profile?.full_name ?? user.email}
            </p>
          </div>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Account
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-1 font-medium text-slate-900">{profile?.email ?? user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {profile?.full_name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="mt-1">
                <span
                  className={
                    profile?.role === "admin"
                      ? "inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"
                      : "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                  }
                >
                  {profile?.role ?? "—"}
                </span>
              </dd>
            </div>
          </dl>
          {profileError ? (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Could not load profile: {profileError.message}
            </p>
          ) : null}
        </section>

        <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Next up
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Phase 3 will add the New Request form and Request Status tab. Phase 4 adds the Admin
            Queue.
          </p>
        </section>
      </div>
    </main>
  );
}
