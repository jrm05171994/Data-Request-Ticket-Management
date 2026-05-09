"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  RequestType,
  ViewType,
} from "@/lib/supabase/types";

const REQUEST_TYPES: ReadonlyArray<RequestType> = [
  "risk_scoring",
  "new_dashboard",
  "new_visual",
  "new_analysis",
  "update_existing",
  "other",
];

const VIEW_TYPES: ReadonlyArray<ViewType> = ["aggregated", "patient_level"];

function parseStakeholders(raw: FormDataEntryValue | null): string[] | null {
  if (typeof raw !== "string") return null;
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export type CreateTicketResult =
  | { ok: true; ticketId: string }
  | { ok: false; error: string };

export async function createTicket(formData: FormData): Promise<CreateTicketResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const requestName = getString(formData, "request_name");
  const description = getString(formData, "description");
  const requestType = getString(formData, "request_type") as RequestType;
  const viewType = getString(formData, "view_type") as ViewType;
  const requesterPriorityRaw = getString(formData, "requester_priority");
  const additionalInfo = getString(formData, "additional_info");
  const stakeholdersInternal = parseStakeholders(formData.get("stakeholders_internal"));
  const stakeholdersExternal = parseStakeholders(formData.get("stakeholders_external"));
  const hasHardDeadlineRaw = getString(formData, "has_hard_deadline");
  const deadlineDateRaw = getString(formData, "deadline_date");

  // Validation
  if (!requestName) return { ok: false, error: "Request Name is required." };
  if (!description) return { ok: false, error: "Description is required." };
  if (!REQUEST_TYPES.includes(requestType)) {
    return { ok: false, error: "Choose a Request Type." };
  }
  if (!VIEW_TYPES.includes(viewType)) {
    return { ok: false, error: "Choose a View Type." };
  }
  const requesterPriority = Number(requesterPriorityRaw);
  if (!Number.isInteger(requesterPriority) || requesterPriority < 1 || requesterPriority > 5) {
    return { ok: false, error: "Priority must be 1–5." };
  }

  // Derive stakeholder_type from external stakeholders presence (per spec).
  const stakeholderType = stakeholdersExternal && stakeholdersExternal.length > 0
    ? "external"
    : "internal";

  // Deadline only meaningful for external requests with a real date.
  const hasHardDeadline = stakeholderType === "external" && hasHardDeadlineRaw === "yes";
  const deadlineDate = hasHardDeadline && deadlineDateRaw ? deadlineDateRaw : null;

  if (hasHardDeadline && !deadlineDate) {
    return { ok: false, error: "Pick a deadline date or set 'Has hard deadline' to no." };
  }

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      request_name: requestName,
      description,
      requester_id: user.id,
      stakeholder_type: stakeholderType,
      has_hard_deadline: hasHardDeadline,
      deadline_date: deadlineDate,
      request_type: requestType,
      view_type: viewType,
      requester_priority: requesterPriority,
      additional_info: additionalInfo || null,
      stakeholders_internal: stakeholdersInternal,
      stakeholders_external: stakeholdersExternal,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create request." };
  }

  revalidatePath("/");
  redirect(`/?tab=status&created=${data.id}`);
}
