-- 0014_add_anthony_admin.sql
-- Add anthony@kodahealthcare.com to the admin auto-promotion list so he
-- becomes an admin on his next sign-in. Also promote his existing public.users
-- row if he's already signed in once.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role public.role;
begin
  if new.email in (
    'ryan@kodahealthcare.com',
    'jr@kodahealthcare.com',
    'anthony@kodahealthcare.com'
  ) then
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

-- If Anthony has already signed in, promote him now.
update public.users
set role = 'admin'
where email = 'anthony@kodahealthcare.com';
