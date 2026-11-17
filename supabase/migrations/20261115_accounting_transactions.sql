-- Adds the financial-operations table used by the portal and secures it for
-- accounts staff and administrators. Safe to run after schema.sql.

create table if not exists public.accounting_transactions (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('expense', 'income')),
  title text not null,
  description text not null default '',
  category text not null default '',
  amount numeric(14,2) not null default 0 check (amount >= 0),
  currency text not null default 'INR' check (currency in ('INR', 'USD')),
  payment_method text not null default '',
  reference_number text not null default '',
  transaction_date date not null,
  paid_to_or_from text not null default '',
  vendor_id text references public.vendors(id) on delete set null,
  client_id text references public.clients(id) on delete set null,
  logged_by_name text not null default '',
  logged_by_email text not null default '',
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected')),
  approved_by_name text not null default '',
  approved_by_email text not null default '',
  approval_date timestamptz,
  approval_notes text not null default '',
  requires_otp boolean not null default false,
  otp_verified boolean not null default false,
  otp_verified_at timestamptz,
  receipt_url text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

drop trigger if exists set_accounting_transactions_updated_at on public.accounting_transactions;
create trigger set_accounting_transactions_updated_at
before update on public.accounting_transactions
for each row execute function public.set_updated_at();

alter table public.accounting_transactions enable row level security;
drop policy if exists accounts_transaction_read on public.accounting_transactions;
create policy accounts_transaction_read on public.accounting_transactions
for select to authenticated
using (public.has_portal_role(array['Admin', 'Accounts']));

drop policy if exists accounts_transaction_write on public.accounting_transactions;
create policy accounts_transaction_write on public.accounting_transactions
for all to authenticated
using (public.has_portal_role(array['Admin', 'Accounts']))
with check (public.has_portal_role(array['Admin', 'Accounts']));
