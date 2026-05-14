"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notifyTicketComment } from "@/lib/slack/notifications";

export type AddCommentResult =
  | { ok: true; commentId: string }
  | { ok: false; error: string };

const MAX_BODY_LENGTH = 4000;

export async function addTicketComment(
  ticketId: string,
  body: string,
): Promise<AddCommentResult> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Comment is empty." };
  }
  if (trimmed.length > MAX_BODY_LENGTH) {
    return { ok: false, error: `Comment is too long (max ${MAX_BODY_LENGTH} chars).` };
  }

  const user = await requireUser();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("ticket_comments")
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      body: trimmed,
    })
    .select("id")
    .single();

  if (error) {
    // RLS rejection (archived ticket, or not requester/admin) lands here.
    return { ok: false, error: error.message };
  }

  // Fire Slack DM via the appropriate recipient set. Awaited (so the
  // serverless function doesn't exit before Slack finishes) but wrapped
  // so a Slack outage doesn't fail the comment save.
  let notifiedAt: string | null = null;
  let notificationRecipient: string | null = null;
  try {
    const result = await notifyTicketComment({
      ticketId,
      commentBody: trimmed,
      author: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
    if (result.ok && result.recipientEmail) {
      notifiedAt = new Date().toISOString();
      notificationRecipient = result.recipientEmail;
    }
  } catch (err) {
    console.error("notifyTicketComment threw", err);
  }

  // Stamp the audit fields with service role (the user's session is rate-
  // limited and we just want the timestamp on the row we own).
  if (notifiedAt && notificationRecipient) {
    try {
      const svc = createServiceRoleClient();
      await svc
        .from("ticket_comments")
        .update({
          notified_at: notifiedAt,
          notification_recipient: notificationRecipient,
        })
        .eq("id", data.id);
    } catch (err) {
      console.error("comment audit stamp failed", err);
    }
  }

  revalidatePath(`/requests/${ticketId}`);
  return { ok: true, commentId: data.id };
}
