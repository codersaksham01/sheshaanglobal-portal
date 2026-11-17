-- Run after all four users are visible in Supabase Authentication > Users.
-- This is safe to run again: it creates or refreshes the leadership directory.

with leadership_profiles (email, name, title, role) as (
  values
    ('info@sheshaanglobal.com', 'Sheshaan Global Admin', 'Portal Administrator', 'Admin'),
    ('sakshamsingh@sheshaanglobal.com', 'Saksham Singh', 'Managing Director', 'Executive'),
    ('junedbarade@sheshaanglobal.com', 'Juned Barade', 'Chief Operating Officer', 'Executive'),
    ('sanazeba@sheshaanglobal.com', 'Sana Zeba Bakshi', 'Chief Executive Officer', 'Executive')
)
insert into public.app_users (
  id, auth_user_id, name, email, title, role, requested_role,
  active, status, approved_by, approved_at
)
select
  auth_user.id::text,
  auth_user.id,
  profile.name,
  profile.email,
  profile.title,
  profile.role,
  profile.role,
  true,
  'Approved',
  'Supabase migration',
  timezone('utc'::text, now())
from leadership_profiles profile
join auth.users auth_user on lower(auth_user.email) = profile.email
on conflict (email) do update set
  auth_user_id = excluded.auth_user_id,
  name = excluded.name,
  title = excluded.title,
  role = excluded.role,
  requested_role = excluded.requested_role,
  active = true,
  status = 'Approved',
  approved_by = 'Supabase migration',
  approved_at = timezone('utc'::text, now()),
  updated_at = timezone('utc'::text, now());
