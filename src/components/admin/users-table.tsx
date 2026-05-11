import { UserRoleToggle } from "@/components/admin/user-role-toggle";
import type { Role } from "@/lib/supabase/types";

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
};

export function UsersTable({
  users,
  currentAdminId,
}: {
  users: UserRow[];
  currentAdminId: string;
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-600">
          No users yet — invite teammates to sign in once.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200">
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
          {users.map((u) => {
            const isSelf = u.id === currentAdminId;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
