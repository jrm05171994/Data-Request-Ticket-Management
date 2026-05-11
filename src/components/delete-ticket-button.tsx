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
        className="btn-danger"
      >
        {pending ? "Archiving…" : label}
      </button>
      {error ? <p className="text-xs text-koda-coral-700">{error}</p> : null}
    </div>
  );
}
