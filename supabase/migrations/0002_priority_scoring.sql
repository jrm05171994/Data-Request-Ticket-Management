-- 0002_priority_scoring.sql
-- Priority scoring engine: per-ticket score function, rank recompute, trigger.
-- Spec: docs Section 2 + spec Section "Priority Scoring Engine".

-- Per-ticket score from priority_config row + ticket fields ----------------
-- Stakeholder component: external = weight_stakeholder, internal = 0
-- Deadline bonus: external + has_hard_deadline + deadline_date → tiered
-- Requester priority: 1→20%, 2→44%, 3→68%, 4→88%, 5→100% of weight
-- Request type:       risk_scoring→100%, new_dashboard→84%, new_visual→68%,
--                     new_analysis→52%, update_existing→32%, other→16%

create or replace function public.calculate_priority_score(t public.tickets)
returns numeric
language plpgsql
stable
as $$
declare
  cfg public.priority_config%rowtype;
  stakeholder_pts numeric := 0;
  deadline_pts numeric := 0;
  requester_pts numeric := 0;
  type_pts numeric := 0;
  days_until int;
begin
  select * into cfg from public.priority_config where id = 1;
  if cfg is null then
    return 0;
  end if;

  -- Stakeholder
  if t.stakeholder_type = 'external' then
    stakeholder_pts := cfg.weight_stakeholder;
  end if;

  -- Deadline bonus (external only, deadline must be set)
  if t.stakeholder_type = 'external' and t.has_hard_deadline and t.deadline_date is not null then
    days_until := (t.deadline_date - current_date);
    if days_until <= 7 then
      deadline_pts := cfg.deadline_tier_7d;
    elsif days_until <= 14 then
      deadline_pts := cfg.deadline_tier_14d;
    elsif days_until <= 30 then
      deadline_pts := cfg.deadline_tier_30d;
    else
      deadline_pts := cfg.deadline_tier_30d_plus;
    end if;
  end if;

  -- Requester priority (1-5 → percentage of weight)
  requester_pts := cfg.weight_requester_priority * (
    case t.requester_priority
      when 1 then 0.20
      when 2 then 0.44
      when 3 then 0.68
      when 4 then 0.88
      when 5 then 1.00
      else 0
    end
  );

  -- Request type
  type_pts := cfg.weight_request_type * (
    case t.request_type
      when 'risk_scoring'    then 1.00
      when 'new_dashboard'   then 0.84
      when 'new_visual'      then 0.68
      when 'new_analysis'    then 0.52
      when 'update_existing' then 0.32
      when 'other'           then 0.16
      else 0
    end
  );

  return round(stakeholder_pts + deadline_pts + requester_pts + type_pts, 2);
end;
$$;

-- Recompute ranks across ALL open (non-completed) tickets ------------------

create or replace function public.recompute_priority_ranks()
returns void
language plpgsql
as $$
begin
  with ranked as (
    select id,
           row_number() over (order by priority_score desc, created_at asc) as new_rank
    from public.tickets
    where stage <> 'completed'
  )
  update public.tickets t
     set priority_rank = ranked.new_rank
    from ranked
   where t.id = ranked.id
     and t.priority_rank is distinct from ranked.new_rank;

  -- Completed tickets always have null rank
  update public.tickets
     set priority_rank = null
   where stage = 'completed' and priority_rank is not null;
end;
$$;

-- Score-on-write trigger ---------------------------------------------------

create or replace function public.tickets_apply_score()
returns trigger
language plpgsql
as $$
begin
  new.priority_score := public.calculate_priority_score(new);
  return new;
end;
$$;

create trigger tickets_apply_score_on_insert
  before insert on public.tickets
  for each row execute function public.tickets_apply_score();

-- On update, only recompute the score when relevant inputs change.
create trigger tickets_apply_score_on_update
  before update on public.tickets
  for each row
  when (
    old.stakeholder_type   is distinct from new.stakeholder_type
    or old.has_hard_deadline is distinct from new.has_hard_deadline
    or old.deadline_date    is distinct from new.deadline_date
    or old.requester_priority is distinct from new.requester_priority
    or old.request_type     is distinct from new.request_type
  )
  execute function public.tickets_apply_score();

-- Rank-recompute trigger (after the row's own score has been written) ------

create or replace function public.tickets_recompute_ranks()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_priority_ranks();
  return null;
end;
$$;

create trigger tickets_recompute_ranks_after_change
  after insert or update of priority_score, stage on public.tickets
  for each statement execute function public.tickets_recompute_ranks();

-- When priority_config changes, rescore every open ticket ------------------

create or replace function public.priority_config_rescore_all()
returns trigger
language plpgsql
as $$
begin
  update public.tickets t
     set priority_score = public.calculate_priority_score(t)
   where t.stage <> 'completed';
  perform public.recompute_priority_ranks();
  return null;
end;
$$;

create trigger priority_config_rescore_all_trigger
  after update on public.priority_config
  for each statement execute function public.priority_config_rescore_all();
