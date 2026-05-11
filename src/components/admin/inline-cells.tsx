"use client";

import { useState, useTransition } from "react";
import {
  setTicketEta,
  setTicketOwner,
  setTicketStage,
  type AdminUpdateResult,
} from "@/app/actions/admin-tickets";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";
import type { Stage } from "@/lib/supabase/types";

type AssignableUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "requester";
};

const baseSelect =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20";

function PendingDot({ pending, error }: { pending: boolean; error: string | null }) {
  if (error) {
    return (
      <span title={error} className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-koda-coral" />
    );
  }
  if (pending) {
    return (
      <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
    );
  }
  return null;
}

function withTransition(
  startTransition: React.TransitionStartFunction,
  setError: (e: string | null) => void,
  setOk: (ok: boolean) => void,
  fn: () => Promise<AdminUpdateResult>,
) {
  startTransition(async () => {
    setError(null);
    setOk(false);
    const result = await fn();
    if (!result.ok) setError(result.error);
    else setOk(true);
  });
}

export function OwnerCell({
  ticketId,
  currentOwnerId,
  users,
}: {
  ticketId: string;
  currentOwnerId: string | null;
  users: AssignableUser[];
}) {
  const [value, setValue] = useState<string>(currentOwnerId ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [, setOk] = useState(false);

  return (
    <div className="flex items-center">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const previous = value;
          setValue(next);
          withTransition(startTransition, setError, setOk, async () => {
            const result = await setTicketOwner(ticketId, next || null);
            if (!result.ok) setValue(previous);
            return result;
          });
        }}
        className={baseSelect}
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {(u.full_name ?? u.email) + (u.role === "admin" ? " (admin)" : "")}
          </option>
        ))}
      </select>
      <PendingDot pending={pending} error={error} />
    </div>
  );
}

export function StageCell({
  ticketId,
  currentStage,
}: {
  ticketId: string;
  currentStage: Stage;
}) {
  const [value, setValue] = useState<Stage>(currentStage);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [, setOk] = useState(false);

  return (
    <div className="flex items-center">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Stage;
          const previous = value;
          setValue(next);
          withTransition(startTransition, setError, setOk, async () => {
            const result = await setTicketStage(ticketId, next);
            if (!result.ok) setValue(previous);
            return result;
          });
        }}
        className={`${baseSelect} font-medium ${STAGE_COLORS[value]}`}
      >
        {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
      <PendingDot pending={pending} error={error} />
    </div>
  );
}

export function EtaCell({
  ticketId,
  currentDate,
}: {
  ticketId: string;
  currentDate: string | null;
}) {
  const [value, setValue] = useState<string>(currentDate ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [, setOk] = useState(false);

  return (
    <div className="flex items-center">
      <input
        type="date"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const previous = value;
          setValue(next);
          withTransition(startTransition, setError, setOk, async () => {
            const result = await setTicketEta(ticketId, next || null);
            if (!result.ok) setValue(previous);
            return result;
          });
        }}
        className={baseSelect}
      />
      <PendingDot pending={pending} error={error} />
    </div>
  );
}
