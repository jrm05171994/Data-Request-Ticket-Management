"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreTicket } from "@/app/actions/tickets";

export function RestoreTicketButton({
  ticketId,
  label = "Restore",
  variant = "secondary",
}: {
  ticketId: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (pending) return;
    const ok = window.confirm(
      "Restore this request? It will be unarchived and re-enter the active queue.",
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await restoreTicket(ticketId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const cls =
    variant === "primary"
      ? "rounded-lg bg-koda-green px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-koda-green-700 disabled:opacity-60"
      : "rounded-lg border border-koda-green-100 bg-white px-3 py-1.5 text-sm font-medium text-koda-green-700 shadow-sm transition hover:bg-koda-green-50 disabled:opacity-60";

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={onClick} disabled={pending} className={cls}>
        {pending ? "Restoring…" : label}
      </button>
      {error ? <p className="text-xs text-koda-coral-700">{error}</p> : null}
    </div>
  );
}
