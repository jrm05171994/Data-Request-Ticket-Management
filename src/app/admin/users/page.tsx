import { requireAdmin } from "@/lib/auth";
import { listAllUsers } from "@/lib/users/queries";
import { AppHeader } from "@/components/app-header";
import { UserRoleToggle } from "@/components/admin/user-role-toggle";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const { data: users, error } = await listAllUsers();

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-600">
            Anyone who&apos;s signed in at least once appears here. Toggle role to grant or
            revoke admin access.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            Could not load users: {error.message}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th className="w-44">Role</Th>
                <Th className="w-44">First sign-in</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(users ?? []).map((u) => {
                const isSelf = u.id === admin.id;
                return (
                  <tr key={u.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {u.full_name ?? "—"}
                        </span>
                        {isSelf ? (
                          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                            you
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-sm text-slate-700">{u.email}</span>
                    </Td>
                    <Td>
                      <UserRoleToggle userId={u.id} currentRole={u.role} />
                    </Td>
                    <Td>
                      <span className="text-sm text-slate-600">
                        {formatDate(u.created_at)}
                      </span>
                    </Td>
                  </tr>
                );
              })}
              {(users ?? []).length === 0 ? (
                <tr>
                  <Td>
                    <span className="text-sm text-slate-500">No users yet.</span>
                  </Td>
                  <Td>{null}</Td>
                  <Td>{null}</Td>
                  <Td>{null}</Td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          The last admin cannot be demoted — promote someone else first, then change roles.
        </p>
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
