-- 0007_completed_at_trigger.sql
-- Auto-manage tickets.completed_at based on stage:
--   - When stage transitions to 'completed' (and was something else), set completed_at = now()
--   - When stage moves away from 'completed' (e.g. admin reverts), clear completed_at
-- The DB owns this so it stays consistent regardless of where the update came
-- from (admin UI, API, future Slack flows).

create or replace function public.tickets_handle_completed_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.stage = 'completed' and new.completed_at is null then
      new.completed_at := now();
    end if;
  elsif tg_op = 'UPDATE' then
    if new.stage = 'completed' and old.stage is distinct from 'completed'::public.stage then
      new.completed_at := now();
    elsif new.stage <> 'completed' then
      new.completed_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger tickets_handle_completed_at_trigger
  before insert or update of stage on public.tickets
  for each row execute function public.tickets_handle_completed_at();
