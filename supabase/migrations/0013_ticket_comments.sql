-- 0013_ticket_comments.sql
-- Comments thread on each ticket. Admins can ask questions; the ticket
-- requester can answer or add context. Each new comment fires a Slack DM
-- to the other side (admin -> requester, requester -> NEW_REQUEST_NOTIFY_EMAILS
-- recipients) via the app, so notifications stay in lockstep with this table.

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  -- Audit fields set by the server action once the Slack DM lands.
  notified_at timestamptz,
  notification_recipient text
);

create index ticket_comments_ticket_id_idx
  on public.ticket_comments (ticket_id, created_at);

alter table public.ticket_comments enable row level security;

-- Read: requester of the ticket OR any admin
create policy ticket_comments_select
  on public.ticket_comments for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.requester_id = auth.uid()
    )
  );

-- Insert: must be author = self, and on a non-archived ticket the user
-- can either see (requester) or admin. Archived tickets are read-only.
create policy ticket_comments_insert
  on public.ticket_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.deleted_at is null
        and (
          public.is_admin()
          or t.requester_id = auth.uid()
        )
    )
  );

-- Delete: admin only (no edit; rewrite history if you must).
create policy ticket_comments_delete
  on public.ticket_comments for delete
  to authenticated
  using (public.is_admin());
