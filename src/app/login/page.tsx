import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "./actions";

type SearchParams = { error?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-koda-navy p-6">
      {/* Decorative background accents */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-koda-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-koda-teal/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-koda-teal-light">
            Koda Health
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">Data Requests</h1>
          <p className="mt-1.5 text-sm text-koda-teal-light/80">
            Internal ticketing for the data team.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-koda-navy-100">
          <h2 className="text-lg font-semibold text-koda-navy">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use your Koda Health Google account to continue.
          </p>

          {searchParams.error ? (
            <p className="mt-4 rounded-lg bg-koda-coral-50 p-3 text-sm text-koda-coral-700">
              {searchParams.error}
            </p>
          ) : null}

          <form action={signInWithGoogle} className="mt-6">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-koda-teal hover:bg-koda-teal-50"
            >
              <GoogleLogo />
              Continue with Google
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-500">
            Access is restricted to <span className="font-medium">@kodahealthcare.com</span>{" "}
            accounts.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-koda-teal-light/60">
          © {new Date().getFullYear()} Koda Health
        </p>
      </div>
    </main>
  );
}

function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
