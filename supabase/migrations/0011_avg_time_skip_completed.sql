-- 0011_avg_time_skip_completed.sql
-- Bug fix: analytics_avg_time_per_stage was showing "time spent in completed"
-- which is just "time since the ticket finished" — meaningless because completed
-- is a terminal stage. Exclude it. The headline "Avg time to complete" KPI
-- (created_at -> completed_at) is the right end-to-end metric.

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
