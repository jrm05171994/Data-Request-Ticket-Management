"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTicketComment } from "@/app/actions/comments";
import type { TicketComment } from "@/lib/comments/queries";

export function TicketComments({
  ticketId,
  comments,
  canPost,
  postingDisabledReason,
  currentUserId,
}: {
  ticketId: string;
  comments: TicketComment[];
  canPost: boolean;
  postingDisabledReason?: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await addTicketComment(ticketId, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Comments
      </h2>

      {comments.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No comments yet. {canPost ? "Add one below." : ""}
        </p>
      ) : (
        <ol className="mt-4 space-y-4">
          {comments.map((c) => {
            const isAdminComment = c.author?.role === "admin";
            const isOwn = c.author_id === currentUserId;
            return (
              <li
                key={c.id}
                className={`rounded-xl p-4 ring-1 ${
                  isAdminComment
                    ? "bg-koda-teal-light/40 ring-koda-teal/20"
                    : "bg-slate-50 ring-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-koda-navy">
                      {c.author?.full_name ?? c.author?.email ?? "—"}
                    </span>
                    {isAdminComment ? (
                      <span className="inline-flex rounded-full bg-koda-navy px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        admin
                      </span>
                    ) : null}
                    {isOwn ? (
                      <span className="inline-flex rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        you
                      </span>
                    ) : null}
                  </div>
                  <time className="text-xs text-slate-500" dateTime={c.created_at}>
                    {formatDateTime(c.created_at)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {canPost ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-2">
          <label htmlFor="comment-body" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add a comment or question…"
            disabled={pending}
            className="form-input"
            maxLength={4000}
          />
          {error ? (
            <p className="rounded-lg bg-koda-coral-50 p-2 text-sm text-koda-coral-700">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Saved on the request · the other side gets a Slack DM.
            </p>
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className="btn-primary"
            >
              {pending ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      ) : postingDisabledReason ? (
        <p className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {postingDisabledReason}
        </p>
      ) : null}
    </section>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
