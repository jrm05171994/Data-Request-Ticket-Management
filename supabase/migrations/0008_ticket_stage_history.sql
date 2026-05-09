-- 0008_ticket_stage_history.sql
-- Audit log of every stage transition. Powers "average time at each stage"
-- and similar analytics. RLS-restricted to admins.
--
-- Without this, the only signal we have for stage timing is tickets.updated_at,
-- which gets bumped on any field change, not just stage transitions.

create table public.ticket_stage_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  from_stage public.stage,
  to_stage public.stage not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.users(id)
);

create index ticket_stage_history_ticket_id_idx on public.ticket_stage_history (ticket_id);
create index ticket_stage_history_changed_at_idx on public.ticket_stage_history (changed_at);
create index ticket_stage_history_to_stage_idx on public.ticket_stage_history (to_stage);

alter table public.ticket_stage_history enable row level security;

create policy ticket_stage_history_admin_only
  on public.ticket_stage_history for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Trigger: log every INSERT (initial stage) and stage UPDATE.
create or replace function public.log_ticket_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_stage_history (ticket_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, auth.uid());
  elsif tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    insert into public.ticket_stage_history (ticket_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
  end if;
  return new;
end;
$$;

create trigger tickets_log_stage_change
  after insert or update of stage on public.tickets
  for each row execute function public.log_ticket_stage_change();

-- Backfill: every existing ticket gets at least an "initial" history entry.
-- We don't have intermediate transitions for past tickets, so for any ticket
-- that's already past 'submitted', synthesise a single transition from
-- 'submitted' to its current stage at updated_at.
insert into public.ticket_stage_history (ticket_id, from_stage, to_stage, changed_at)
select id, null, 'submitted'::public.stage, created_at
from public.tickets;

insert into public.ticket_stage_history (ticket_id, from_stage, to_stage, changed_at)
select id, 'submitted'::public.stage, stage, updated_at
from public.tickets
where stage <> 'submitted';
