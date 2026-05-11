"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { notifyStageChange } from "@/lib/slack/notifications";
import type { Database, Stage } from "@/lib/supabase/types";

type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];

const VALID_STAGES: ReadonlyArray<Stage> = [
  "submitted",
  "received",
  "in_progress",
  "completed",
];

export type AdminUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

async function applyTicketUpdate(
  ticketId: string,
  patch: TicketUpdate,
): Promise<AdminUpdateResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error, data } = await supabase
    .from("tickets")
    .update(patch)
    .eq("id", ticketId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Ticket not found." };

  revalidatePath("/admin/queue");
  revalidatePath("/");
  revalidatePath(`/requests/${ticketId}`);
  return { ok: true };
}

export async function setTicketOwner(
  ticketId: string,
  ownerId: string | null,
): Promise<AdminUpdateResult> {
  return applyTicketUpdate(ticketId, { owner_id: ownerId });
}

export async function setTicketStage(
  ticketId: string,
  stage: Stage,
): Promise<AdminUpdateResult> {
  if (!VALID_STAGES.includes(stage)) {
    return { ok: false, error: "Invalid stage." };
  }

  const admin = await requireAdmin();
  const supabase = createClient();

  // Read the prior stage and requester so we can:
  //   - skip the update if it's a no-op,
  //   - fire the DM only on real transitions,
  //   - skip the DM if the admin themselves is the requester (no self-DMs).
  const { data: before, error: readErr } = await supabase
    .from("tickets")
    .select("stage, requester_id")
    .eq("id", ticketId)
    .single();
  if (readErr) return { ok: false, error: readErr.message };
  if (!before) return { ok: false, error: "Ticket not found." };

  if (before.stage === stage) {
    return { ok: true };
  }

  const result = await applyTicketUpdate(ticketId, { stage });
  if (!result.ok) return result;

  // Notify the requester. Awaited so the function isn't killed by the
  // serverless runtime before the DM fires, but wrapped in try/catch so
  // a Slack outage never blocks the stage update itself.
  if (before.requester_id !== admin.id) {
    try {
      await notifyStageChange({
        ticketId,
        fromStage: before.stage,
        toStage: stage,
      });
    } catch (err) {
      console.error("notifyStageChange threw", err);
    }
  }

  return { ok: true };
}

export async function setTicketEta(
  ticketId: string,
  date: string | null,
): Promise<AdminUpdateResult> {
  const value = date && date.length > 0 ? date : null;
  return applyTicketUpdate(ticketId, { expected_completion_date: value });
}
