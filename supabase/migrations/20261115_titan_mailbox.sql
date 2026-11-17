-- Shared Titan mailbox headers and notes. Mailbox credentials remain only in
-- the server environment; this table never stores them.
create table if not exists public.mailbox_messages (
  id text primary key default gen_random_uuid()::text,
  external_id text not null unique,
  folder text not null default 'INBOX',
  sender_name text not null default '',
  sender_email text not null default '',
  recipient_emails jsonb not null default '[]'::jsonb,
  subject text not null default '(No subject)',
  preview text not null default '',
  body_text text not null default '',
  received_at timestamptz not null default timezone('utc'::text, now()),
  is_read boolean not null default false,
  has_attachments boolean not null default false,
  assigned_to text not null default '',
  client_id text references public.clients(id) on delete set null,
  lead_id text references public.leads(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists mailbox_messages_received_at_idx on public.mailbox_messages(received_at desc);
create index if not exists mailbox_messages_sender_email_idx on public.mailbox_messages(sender_email);

alter table public.mailbox_messages enable row level security;
drop policy if exists portal_mail_read on public.mailbox_messages;
create policy portal_mail_read on public.mailbox_messages
  for select to authenticated
  using (public.has_portal_role(array['Admin', 'Sales', 'Accounts', 'Operations']));
drop policy if exists portal_mail_write on public.mailbox_messages;
create policy portal_mail_write on public.mailbox_messages
  for all to authenticated
  using (public.has_portal_role(array['Admin', 'Sales', 'Accounts', 'Operations']))
  with check (public.has_portal_role(array['Admin', 'Sales', 'Accounts', 'Operations']));

drop trigger if exists set_mailbox_messages_updated_at on public.mailbox_messages;
create trigger set_mailbox_messages_updated_at
  before update on public.mailbox_messages
  for each row execute function public.set_updated_at();
