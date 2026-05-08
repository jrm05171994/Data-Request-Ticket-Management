-- 0001_initial_schema.sql
-- Tables, enums, updated_at trigger. No RLS, no scoring yet.

-- Enums --------------------------------------------------------------------

create type public.role as enum ('admin', 'requester');
create type public.stakeholder_type as enum ('internal', 'external');
create type public.request_type as enum (
  'risk_scoring',
  'new_dashboard',
  'new_visual',
  'new_analysis',
  'update_existing',
  'other'
);
create type public.view_type as enum ('aggregated', 'patient_level');
create type public.stage as enum ('submitted', 'received', 'in_progress', 'completed');

-- updated_at helper --------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- users --------------------------------------------------------------------
-- Mirrors auth.users; row created automatically by trigger on first sign-in.
-- ryan@kodahealthcare.com and jr@kodahealthcare.com are auto-promoted to admin.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role public.role not null default 'requester',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role public.role;
begin
  if new.email in ('ryan@kodahealthcare.com', 'jr@kodahealthcare.com') then
    resolved_role := 'admin';
  else
    resolved_role := 'requester';
  end if;

  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    resolved_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- priority_config ----------------------------------------------------------

create table public.priority_config (
  id int primary key,
  weight_stakeholder numeric not null default 40,
  weight_deadline_bonus numeric not null default 10,
  weight_requester_priority numeric not null default 25,
  weight_request_type numeric not null default 25,
  deadline_tier_7d numeric not null default 10,
  deadline_tier_14d numeric not null default 8,
  deadline_tier_30d numeric not null default 5,
  deadline_tier_30d_plus numeric not null default 2,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id),
  constraint priority_config_singleton check (id = 1)
);

create trigger priority_config_set_updated_at
  before update on public.priority_config
  for each row execute function public.set_updated_at();

-- tickets ------------------------------------------------------------------

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_name text not null,
  description text,
  requester_id uuid not null references public.users(id),
  owner_id uuid references public.users(id),
  stakeholder_type public.stakeholder_type not null,
  has_hard_deadline boolean not null default false,
  deadline_date date,
  request_type public.request_type not null,
  view_type public.view_type not null,
  requester_priority int not null check (requester_priority between 1 and 5),
  additional_info text,
  priority_score numeric(5,2) not null default 0,
  priority_rank int,
  stage public.stage not null default 'submitted',
  expected_completion_date date,
  completed_at timestamptz,
  stakeholders_internal text[],
  stakeholders_external text[]
);

create index tickets_requester_id_idx on public.tickets (requester_id);
create index tickets_owner_id_idx on public.tickets (owner_id);
create index tickets_stage_idx on public.tickets (stage);
create index tickets_priority_rank_idx on public.tickets (priority_rank);

create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- slack_notifications ------------------------------------------------------

create table public.slack_notifications (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  slack_user_id text,
  notification_type text not null,
  sent_at timestamptz not null default now(),
  payload jsonb
);

create index slack_notifications_ticket_id_idx on public.slack_notifications (ticket_id);
