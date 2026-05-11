"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Role } from "@/lib/supabase/types";

export type RoleUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

const VALID_ROLES: ReadonlyArray<Role> = ["admin", "requester"];

export async function setUserRole(
  userId: string,
  role: Role,
): Promise<RoleUpdateResult> {
  if (!VALID_ROLES.includes(role)) {
    return { ok: false, error: "Invalid role." };
  }

  await requireAdmin();
  const supabase = createClient();

  // Safety: don't allow the last admin to be demoted. Without this an
  // admin could accidentally lock the org out of admin tools.
  if (role === "requester") {
    const { count, error: countErr } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countErr) return { ok: false, error: countErr.message };

    const adminCount = count ?? 0;

    // Check the target user is currently an admin. If they are and there's
    // only one admin left, refuse.
    const { data: target, error: targetErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetErr) return { ok: false, error: targetErr.message };

    if (target?.role === "admin" && adminCount <= 1) {
      return {
        ok: false,
        error:
          "Cannot demote the last admin — promote someone else first, then try again.",
      };
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
