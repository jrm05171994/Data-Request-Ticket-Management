-- 0005_delete_own_submitted.sql
-- Requesters can delete their own ticket only while stage = 'submitted'
-- (i.e., before any admin work has started). After that, only admins
-- can delete (covered by tickets_delete_admin in 0003).

create policy tickets_delete_own_submitted
  on public.tickets for delete
  to authenticated
  using (requester_id = auth.uid() and stage = 'submitted');
