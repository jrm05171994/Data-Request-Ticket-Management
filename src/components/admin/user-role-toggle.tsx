"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "@/app/actions/users";
import type { Role } from "@/lib/supabase/types";

export function UserRoleToggle({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<Role>(currentRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending || disabled}
        onChange={(e) => {
          const next = e.target.value as Role;
          const previous = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await setUserRole(userId, next);
            if (!result.ok) {
              setValue(previous);
              setError(result.error);
            }
          });
        }}
        className={`rounded-md border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 ${
          value === "admin" ? "text-indigo-700" : "text-slate-700"
        }`}
      >
        <option value="admin">Admin</option>
        <option value="requester">Requester</option>
      </select>
      {pending ? (
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      ) : null}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
