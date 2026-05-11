"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type ScoringConfigResult =
  | { ok: true }
  | { ok: false; error: string };

const NUMERIC_FIELDS = [
  "weight_stakeholder",
  "weight_deadline_bonus",
  "weight_requester_priority",
  "weight_request_type",
  "deadline_tier_7d",
  "deadline_tier_14d",
  "deadline_tier_30d",
  "deadline_tier_30d_plus",
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number];

function getNumber(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function updateScoringConfig(
  formData: FormData,
): Promise<ScoringConfigResult> {
  const admin = await requireAdmin();
  const supabase = createClient();

  const patch: Partial<Record<NumericField, number>> & {
    updated_at: string;
    updated_by: string;
  } = {
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  };

  for (const field of NUMERIC_FIELDS) {
    const n = getNumber(formData, field);
    if (n == null) {
      return {
        ok: false,
        error: `${field.replace(/_/g, " ")} must be a non-negative number.`,
      };
    }
    patch[field] = n;
  }

  const { error } = await supabase
    .from("priority_config")
    .update(patch)
    .eq("id", 1);

  // The priority_config_rescore_all_trigger handles rescoring + rank
  // recompute automatically; nothing else to do here.

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/scoring");
  revalidatePath("/admin/queue");
  revalidatePath("/admin/analytics");
  revalidatePath("/");
  return { ok: true };
}
