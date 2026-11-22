-- Clear the CRM pipeline in one database transaction while preserving portal data.
-- This intentionally excludes clients, quotes, invoices, products, templates,
-- shipments, users, inquiries, and all other non-CRM records.
create or replace function public.reset_crm_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.app_users
    where auth_user_id = auth.uid()
      and active = true
      and role = 'Admin'
  ) then
    raise exception 'Only portal administrators can reset CRM data';
  end if;

  delete from public.activities where lead_id is not null;
  delete from public.tasks where lead_id is not null;
  delete from public.leads;
end;
$$;

revoke all on function public.reset_crm_data() from public;
grant execute on function public.reset_crm_data() to authenticated;
