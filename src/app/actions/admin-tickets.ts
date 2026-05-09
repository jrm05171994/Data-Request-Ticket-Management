"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
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
  return applyTicketUpdate(ticketId, { stage });
}

export async function setTicketEta(
  ticketId: string,
  date: string | null,
): Promise<AdminUpdateResult> {
  // Empty string from form input → null
  const value = date && date.length > 0 ? date : null;
  return applyTicketUpdate(ticketId, { expected_completion_date: value });
}
