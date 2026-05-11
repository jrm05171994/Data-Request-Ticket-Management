"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyNewRequest } from "@/lib/slack/notifications";
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

  // DM new-request notification recipients (Ryan by default). Awaited so
  // the serverless function doesn't exit early, try/catch so Slack issues
  // can't block the user's redirect.
  try {
    await notifyNewRequest({ ticketId: data.id });
  } catch (err) {
    console.error("notifyNewRequest threw", err);
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

// ARCHIVE (soft delete) ---------------------------------------------------
// Renamed conceptually to "archive" but kept as deleteTicket() to avoid
// touching every caller. Records who archived and when so admins can audit
// and restore from /admin/archived.

export async function deleteTicket(ticketId: string): Promise<TicketActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("tickets")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", ticketId)
    .is("deleted_at", null)  // don't double-archive
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      error:
        "Cannot archive this request — it may already be archived, or it has moved out of the Submitted stage and you don't have admin rights.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin/queue");
  revalidatePath("/admin/archived");
  redirect("/?tab=status");
}

// RESTORE -----------------------------------------------------------------

export async function restoreTicket(ticketId: string): Promise<TicketActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Confirm caller is admin (restore is admin-only).
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Only admins can restore archived requests." };
  }

  const { data, error } = await supabase
    .from("tickets")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", ticketId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      error: "Cannot restore — request was not archived (or no longer exists).",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin/queue");
  revalidatePath("/admin/archived");
  revalidatePath(`/requests/${ticketId}`);
  return { ok: true };
}
