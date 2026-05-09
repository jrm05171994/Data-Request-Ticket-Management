"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  RequestType,
  StakeholderType,
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

type ParsedFields = {
  request_name: string;
  description: string;
  request_type: RequestType;
  view_type: ViewType;
  requester_priority: number;
  additional_info: string | null;
  stakeholders_internal: string[] | null;
  stakeholders_external: string[] | null;
  stakeholder_type: StakeholderType;
  has_hard_deadline: boolean;
  deadline_date: string | null;
};

function parseFields(formData: FormData): ParsedFields | { error: string } {
  const request_name = getString(formData, "request_name");
  const description = getString(formData, "description");
  const request_type = getString(formData, "request_type") as RequestType;
  const view_type = getString(formData, "view_type") as ViewType;
  const requester_priority_raw = getString(formData, "requester_priority");
  const additional_info_raw = getString(formData, "additional_info");
  const stakeholders_internal = parseStakeholders(formData.get("stakeholders_internal"));
  const stakeholders_external = parseStakeholders(formData.get("stakeholders_external"));
  const has_hard_deadline_raw = getString(formData, "has_hard_deadline");
  const deadline_date_raw = getString(formData, "deadline_date");

  if (!request_name) return { error: "Request Name is required." };
  if (!description) return { error: "Description is required." };
  if (!REQUEST_TYPES.includes(request_type)) return { error: "Choose a Request Type." };
  if (!VIEW_TYPES.includes(view_type)) return { error: "Choose a View Type." };

  const requester_priority = Number(requester_priority_raw);
  if (!Number.isInteger(requester_priority) || requester_priority < 1 || requester_priority > 5) {
    return { error: "Priority must be 1–5." };
  }

  const stakeholder_type: StakeholderType =
    stakeholders_external && stakeholders_external.length > 0 ? "external" : "internal";

  const has_hard_deadline =
    stakeholder_type === "external" && has_hard_deadline_raw === "yes";
  const deadline_date = has_hard_deadline && deadline_date_raw ? deadline_date_raw : null;

  if (has_hard_deadline && !deadline_date) {
    return { error: "Pick a deadline date or set 'Has hard deadline' to no." };
  }

  return {
    request_name,
    description,
    request_type,
    view_type,
    requester_priority,
    additional_info: additional_info_raw || null,
    stakeholders_internal,
    stakeholders_external,
    stakeholder_type,
    has_hard_deadline,
    deadline_date,
  };
}

export type TicketActionResult =
  | { ok: true; ticketId?: string }
  | { ok: false; error: string };

// CREATE -------------------------------------------------------------------

export async function createTicket(formData: FormData): Promise<TicketActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = parseFields(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      ...parsed,
      requester_id: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create request." };
  }

  revalidatePath("/");
  redirect(`/?tab=status&created=${data.id}`);
}

// UPDATE -------------------------------------------------------------------

export async function updateTicket(
  ticketId: string,
  formData: FormData,
): Promise<TicketActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = parseFields(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { data, error } = await supabase
    .from("tickets")
    .update(parsed)
    .eq("id", ticketId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    // RLS denied or row gone — most likely the ticket has moved past 'submitted'.
    return {
      ok: false,
      error:
        "Cannot update this request — it may have moved out of the Submitted stage. Refresh and try again.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/requests/${ticketId}`);
  redirect(`/requests/${ticketId}`);
}

// DELETE -------------------------------------------------------------------

export async function deleteTicket(ticketId: string): Promise<TicketActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("tickets")
    .delete()
    .eq("id", ticketId)
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "Cannot delete this request — it may have moved out of the Submitted stage, or you don't have permission.",
    };
  }

  revalidatePath("/");
  redirect("/?tab=status");
}
