-- Apply after schema.sql when migrating an existing project.
-- It adds the leadership Executive role and grants it the same data access as Admin.

alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users
  add constraint app_users_role_check
  check (role in ('Admin', 'Executive', 'Sales', 'Accounts', 'Operations'));

alter table public.app_users drop constraint if exists app_users_requested_role_check;
alter table public.app_users
  add constraint app_users_requested_role_check
  check (requested_role in ('Admin', 'Executive', 'Sales', 'Accounts', 'Operations'));

create or replace function public.has_portal_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where auth_user_id = auth.uid()
      and active = true
      and (
        role = any(allowed_roles)
        or (role = 'Executive' and 'Admin' = any(allowed_roles))
      )
  );
$$;

revoke all on function public.has_portal_role(text[]) from public;
grant execute on function public.has_portal_role(text[]) to authenticated;
