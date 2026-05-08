-- 0003_rls_policies.sql
-- RLS: requesters see/edit their own tickets; admins see/edit everything.

-- Helper: is the current auth user an admin? -------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Enable RLS ---------------------------------------------------------------

alter table public.users               enable row level security;
alter table public.tickets             enable row level security;
alter table public.priority_config     enable row level security;
alter table public.slack_notifications enable row level security;

-- users --------------------------------------------------------------------
-- Anyone signed in can read users (needed for owner dropdown, displaying names).
-- Only admins can update roles. Self can update own full_name.

create policy users_select_authenticated
  on public.users for select
  to authenticated
  using (true);

create policy users_update_self
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()));

create policy users_update_admin
  on public.users for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- tickets ------------------------------------------------------------------

create policy tickets_select_own_or_admin
  on public.tickets for select
  to authenticated
  using (requester_id = auth.uid() or public.is_admin());

create policy tickets_insert_self
  on public.tickets for insert
  to authenticated
  with check (requester_id = auth.uid() or public.is_admin());

-- Requester can edit their own ticket only while it's still 'submitted'
-- (no admin has touched it yet). Admins can edit anything anytime.
create policy tickets_update_admin
  on public.tickets for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy tickets_update_own_submitted
  on public.tickets for update
  to authenticated
  using (requester_id = auth.uid() and stage = 'submitted')
  with check (requester_id = auth.uid() and stage = 'submitted');

create policy tickets_delete_admin
  on public.tickets for delete
  to authenticated
  using (public.is_admin());

-- priority_config ----------------------------------------------------------

create policy priority_config_select_authenticated
  on public.priority_config for select
  to authenticated
  using (true);

create policy priority_config_modify_admin
  on public.priority_config for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- slack_notifications ------------------------------------------------------
-- Admins only — this is an internal audit log.

create policy slack_notifications_admin_only
  on public.slack_notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
