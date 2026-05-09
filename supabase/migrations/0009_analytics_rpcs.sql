-- 0009_analytics_rpcs.sql
-- Aggregation RPCs for the admin analytics dashboard.
-- All security definer + restricted to is_admin(); they read across the
-- whole tickets table.

-- Counts by stage, optionally bounded by submission date range -------------

create or replace function public.analytics_stage_counts(
  date_from timestamptz default null,
  date_to timestamptz default null
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
    and public.is_admin()
  group by t.stage
  order by t.stage;
$$;

-- Counts by request type --------------------------------------------------

create or replace function public.analytics_request_type_counts(
  date_from timestamptz default null,
  date_to timestamptz default null
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
    and public.is_admin()
  group by t.request_type
  order by count(*) desc;
$$;

-- Top requesters ----------------------------------------------------------

create or replace function public.analytics_top_requesters(
  date_from timestamptz default null,
  date_to timestamptz default null,
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
    and public.is_admin()
  group by u.id, u.email, u.full_name
  order by ticket_count desc, u.email asc
  limit limit_to;
$$;

-- Headline KPIs: open / completed / late / avg complete time --------------

create or replace function public.analytics_kpis(
  date_from timestamptz default null,
  date_to timestamptz default null
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

-- Average time at each stage (uses ticket_stage_history) ------------------
-- For a stage entry, duration = next entry's changed_at - this entry's changed_at,
-- or now() if it's the latest entry (i.e., the ticket is currently in that stage).

create or replace function public.analytics_avg_time_per_stage(
  date_from timestamptz default null,
  date_to timestamptz default null
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
  )
  select
    stage,
    avg(extract(epoch from duration)) as avg_seconds,
    count(*)::bigint as sample_count
  from durations
  group by stage;
$$;

-- Late tickets list (open + past expected completion date) ----------------

create or replace function public.analytics_late_tickets(
  date_from timestamptz default null,
  date_to timestamptz default null
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
    and public.is_admin()
  order by t.expected_completion_date asc;
$$;
