-- 0006_recompute_ranks_on_delete.sql
-- Bug: deleting a ticket did not trigger priority_rank recompute, so
-- remaining tickets kept their stale ranks (e.g. "Rank 2 of 1" after
-- the #1 ticket was deleted). Add an AFTER DELETE statement-level
-- trigger that calls the existing recompute_priority_ranks() function.

create trigger tickets_recompute_ranks_after_delete
  after delete on public.tickets
  for each statement execute function public.tickets_recompute_ranks();
