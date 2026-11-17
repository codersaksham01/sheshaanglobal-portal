-- Six focused internal-chat channels for the Sheshaan Global portal.
-- Safe to run in the Supabase SQL editor on an existing database.

alter table public.team_messages
  add column if not exists channel text not null default 'daily-operations';

alter table public.team_messages
  drop constraint if exists team_messages_channel_check;

alter table public.team_messages
  add constraint team_messages_channel_check
  check (channel in (
    'company-announcements',
    'daily-operations',
    'sales-and-volza',
    'sourcing-and-logistics',
    'finance-and-approvals',
    'portal-development'
  ));

-- Existing records remain available in Daily Operations rather than being lost.
update public.team_messages
set channel = 'daily-operations'
where channel is null or channel = '' or channel not in (
  'company-announcements',
  'daily-operations',
  'sales-and-volza',
  'sourcing-and-logistics',
  'finance-and-approvals',
  'portal-development'
);

alter table public.team_messages enable row level security;

drop policy if exists portal_chat_read on public.team_messages;
create policy portal_chat_read on public.team_messages
  for select to authenticated
  using (public.has_portal_role(array['Admin','Executive','Sales','Accounts','Operations']));

drop policy if exists portal_chat_insert on public.team_messages;
create policy portal_chat_insert on public.team_messages
  for insert to authenticated
  with check (
    public.has_portal_role(array['Admin','Executive','Sales','Accounts','Operations'])
    and (channel <> 'company-announcements' or public.has_portal_role(array['Admin']))
  );
