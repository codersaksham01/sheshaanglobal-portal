-- Task assignment and in-portal notification support.
create table if not exists public.portal_notifications (
  id text primary key default gen_random_uuid()::text,
  target_email text not null,
  title text not null,
  message text not null default '',
  kind text not null default 'system' check (kind in ('task', 'message', 'system')),
  href text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists portal_notifications_target_created_idx
  on public.portal_notifications(target_email, created_at desc);

alter table public.portal_notifications enable row level security;
drop policy if exists portal_notification_read on public.portal_notifications;
create policy portal_notification_read on public.portal_notifications for select to authenticated using (
  lower(target_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.has_portal_role(array['Admin'])
);
drop policy if exists portal_notification_insert on public.portal_notifications;
create policy portal_notification_insert on public.portal_notifications for insert to authenticated with check (
  public.has_portal_role(array['Admin','Executive','Sales','Accounts','Operations'])
);
drop policy if exists portal_notification_update on public.portal_notifications;
create policy portal_notification_update on public.portal_notifications for update to authenticated using (
  lower(target_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.has_portal_role(array['Admin'])
) with check (
  lower(target_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.has_portal_role(array['Admin'])
);

drop trigger if exists set_portal_notifications_updated_at on public.portal_notifications;
create trigger set_portal_notifications_updated_at
  before update on public.portal_notifications
  for each row execute function public.set_updated_at();
