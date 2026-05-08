-- 0004_seed.sql
-- Seed the singleton priority_config row with spec defaults.
-- Admin user rows are created by the on_auth_user_created trigger
-- when ryan@kodahealthcare.com or jr@kodahealthcare.com first sign in.

insert into public.priority_config (
  id,
  weight_stakeholder,
  weight_deadline_bonus,
  weight_requester_priority,
  weight_request_type,
  deadline_tier_7d,
  deadline_tier_14d,
  deadline_tier_30d,
  deadline_tier_30d_plus
) values (
  1, 40, 10, 25, 25, 10, 8, 5, 2
) on conflict (id) do nothing;
