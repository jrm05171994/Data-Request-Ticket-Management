-- 0012_soft_delete_tickets.sql
-- Switch "delete a ticket" from a hard delete to a soft delete:
--   - new columns tickets.deleted_at, tickets.deleted_by
--   - every place we "scope to active tickets" now also filters out soft-deleted
--   - the rank recompute fires on changes to deleted_at as well, so archive
--     and restore both renumber the queue automatically
--   - all six analytics RPCs and the priority-rank computation exclude soft-deleted

-- Columns -------------------------------------------------------------------

alter table public.tickets
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id);

create index if not exists tickets_deleted_at_idx on public.tickets (deleted_at);

-- Rank trigger: also fire when deleted_at changes -------------------------

drop trigger if exists tickets_recompute_ranks_after_change on public.tickets;
create trigger tickets_recompute_ranks_after_change
  after insert or update of priority_score, stage, deleted_at on public.tickets
  for each statement execute function public.tickets_recompute_ranks();

-- Rank function: exclude soft-deleted -------------------------------------

create or replace function public.recompute_priority_ranks()
returns void
language plpgsql
as $$
begin
  with ranked as (
    select id,
           row_number() over (order by priority_score desc, created_at asc) as new_rank
    from public.tickets
    where stage <> 'completed' and deleted_at is null
  )
  update public.tickets t
     set priority_rank = ranked.new_rank
    from ranked
   where t.id = ranked.id
     and t.priority_rank is distinct from ranked.new_rank;

  -- Completed OR soft-deleted tickets carry no rank
  update public.tickets
     set priority_rank = null
   where (stage = 'completed' or deleted_at is not null)
     and priority_rank is not null;
end;
$$;

-- One-off: refresh ranks so any rows currently mis-ranked snap into place.
select public.recompute_priority_ranks();

-- Analytics RPCs: exclude soft-deleted ------------------------------------
-- All same signatures, just rewritten where clauses. Use CREATE OR REPLACE.

create or replace function public.analytics_kpis(
  date_from timestamptz default null,
  date_to timestamptz default null,
  request_types text[] default null
)
returns table (
  total_tickets bigint,
  open_tickets bigint,
  completed_tickets bigint,
  late_tickets bigint,
  avg_completion_seconds numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select * from public.tickets t
    where (date_from is null or t.created_at >= date_from)
      and (date_to   is null or t.created_at <  date_to)
      and (request_types is null or array_length(request_types, 1) is null
           or t.request_type::text = any (request_types))
      and t.deleted_at is null
      and public.is_admin()
  )
  select
    count(*)::bigint as total_tickets,
    count(*) filter (where stage <> 'completed')::bigint as open_tickets,
    count(*) filter (where stage =  'completed')::bigint as completed_tickets,
    count(*) filter (
      where stage <> 'completed'
        and expected_completion_date is not null
        and expected_completion_date < current_date
    )::bigint as late_tickets,
    avg(extract(epoch from (completed_at - created_at)))
      filter (where stage = 'completed' and completed_at is not null) as avg_completion_seconds
  from scoped;
$$;

create or replace function public.analytics_stage_counts(
  date_from timestamptz default null,
  date_to timestamptz default null,
  request_types text[] default null
)
returns table (stage public.stage, ticket_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.stage, count(*) as ticket_count
  from public.tickets t
  where (date_from is null or t.created_at >= date_from)
    and (date_to   is null or t.created_at <  date_to)
    and (request_types is null or array_length(request_types, 1) is null
         or t.request_type::text = any (request_types))
    and t.deleted_at is null
    and public.is_admin()
  group by t.stage
  order by t.stage;
$$;

create or replace function public.analytics_request_type_counts(
  date_from timestamptz default null,
  date_to timestamptz default null,
  request_types text[] default null
)
returns table (request_type public.request_type, ticket_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.request_type, count(*) as ticket_count
  from public.tickets t
  where (date_from is null or t.created_at >= date_from)
    and (date_to   is null or t.created_at <  date_to)
    and (request_types is null or array_length(request_types, 1) is null
         or t.request_type::text = any (request_types))
    and t.deleted_at is null
    and public.is_admin()
  group by t.request_type
  order by count(*) desc;
$$;

create or replace function public.analytics_top_requesters(
  date_from timestamptz default null,
  date_to timestamptz default null,
  request_types text[] default null,
  limit_to int default 10
)
returns table (
  requester_id uuid,
  email text,
  full_name text,
  ticket_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email, u.full_name, count(*) as ticket_count
  from public.tickets t
  join public.users u on u.id = t.requester_id
  where (date_from is null or t.created_at >= date_from)
    and (date_to   is null or t.created_at <  date_to)
    and (request_types is null or array_length(request_types, 1) is null
         or t.request_type::text = any (request_types))
    and t.deleted_at is null
    and public.is_admin()
  group by u.id, u.email, u.full_name
  order by ticket_count desc, u.email asc
  limit limit_to;
$$;

create or replace function public.analytics_avg_time_per_stage(
  date_from timestamptz default null,
  date_to timestamptz default null,
  request_types text[] default null
)
returns table (
  stage public.stage,
  avg_seconds numeric,
  sample_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with scoped_tickets as (
    select id from public.tickets t
    where (date_from is null or t.created_at >= date_from)
      and (date_to   is null or t.created_at <  date_to)
      and (request_types is null or array_length(request_types, 1) is null
           or t.request_type::text = any (request_types))
      and t.deleted_at is null
      and public.is_admin()
  ),
  durations as (
    select
      h.to_stage as stage,
      coalesce(
        lead(h.changed_at) over (partition by h.ticket_id order by h.changed_at),
        now()
      ) - h.changed_at as duration
    from public.ticket_stage_history h
    join scoped_tickets st on st.id = h.ticket_id
    where h.to_stage <> 'completed'
  )
  select
    stage,
    avg(extract(epoch from duration)) as avg_seconds,
    count(*)::bigint as sample_count
  from durations
  group by stage;
$$;

create or replace function public.analytics_late_tickets(
  date_from timestamptz default null,
  date_to timestamptz default null,
  request_types text[] default null
)
returns table (
  id uuid,
  request_name text,
  stage public.stage,
  expected_completion_date date,
  days_late int,
  requester_email text,
  requester_full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.request_name,
    t.stage,
    t.expected_completion_date,
    (current_date - t.expected_completion_date)::int as days_late,
    u.email as requester_email,
    u.full_name as requester_full_name
  from public.tickets t
  join public.users u on u.id = t.requester_id
  where t.stage <> 'completed'
    and t.expected_completion_date is not null
    and t.expected_completion_date < current_date
    and (date_from is null or t.created_at >= date_from)
    and (date_to   is null or t.created_at <  date_to)
    and (request_types is null or array_length(request_types, 1) is null
         or t.request_type::text = any (request_types))
    and t.deleted_at is null
    and public.is_admin()
  order by t.expected_completion_date asc;
$$;
