"use client";

import { useState, useTransition } from "react";
import { deleteTicket } from "@/app/actions/tickets";

export function DeleteTicketButton({
  ticketId,
  label = "Archive",
}: {
  ticketId: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (pending) return;
    const ok = window.confirm(
      "Archive this request? It'll move to the Archived list. Admins can restore it later.",
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteTicket(ticketId);
      if (!result.ok) {
        setError(result.error);
      }
      // On success, the action redirects to /?tab=status
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Archiving…" : label}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
