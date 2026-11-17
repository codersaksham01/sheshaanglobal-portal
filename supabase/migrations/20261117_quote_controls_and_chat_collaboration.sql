-- Commercial governance: immutable quote revisions and approval decisions.
create table if not exists public.quote_versions (
  id text primary key default gen_random_uuid()::text,
  quote_id text not null references public.quotes(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_by_email text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (quote_id, version_number)
);

create table if not exists public.quote_approvals (
  id text primary key default gen_random_uuid()::text,
  quote_id text not null references public.quotes(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by_email text not null default '',
  reviewer_email text not null default '',
  request_note text not null default '',
  decision_note text not null default '',
  requested_at timestamptz not null default timezone('utc'::text, now()),
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists quote_versions_quote_created_idx on public.quote_versions(quote_id, created_at desc);
create index if not exists quote_approvals_quote_status_idx on public.quote_approvals(quote_id, status);

-- Collaboration metadata is optional, so existing messages remain valid.
alter table public.team_messages
  add column if not exists reply_to_id text references public.team_messages(id) on delete set null,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by text not null default '',
  add column if not exists mentions text[] not null default '{}';

alter table public.quote_versions enable row level security;
alter table public.quote_approvals enable row level security;

drop policy if exists quote_versions_read on public.quote_versions;
create policy quote_versions_read on public.quote_versions for select to authenticated using (public.has_portal_role(array['Admin','Executive','Sales','Accounts','Operations']));
drop policy if exists quote_versions_write on public.quote_versions;
create policy quote_versions_write on public.quote_versions for insert to authenticated with check (public.has_portal_role(array['Admin','Executive','Sales','Accounts','Operations']));

drop policy if exists quote_approvals_read on public.quote_approvals;
create policy quote_approvals_read on public.quote_approvals for select to authenticated using (public.has_portal_role(array['Admin','Executive','Sales','Accounts','Operations']));
drop policy if exists quote_approvals_insert on public.quote_approvals;
create policy quote_approvals_insert on public.quote_approvals for insert to authenticated with check (public.has_portal_role(array['Admin','Executive','Sales','Accounts','Operations']));
drop policy if exists quote_approvals_decide on public.quote_approvals;
create policy quote_approvals_decide on public.quote_approvals for update to authenticated using (public.has_portal_role(array['Admin'])) with check (public.has_portal_role(array['Admin']));
