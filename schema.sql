-- Sheshaan Global production schema for Supabase.
-- Run in a new Supabase project, then create the first Auth user and matching
-- app_users row as described at the bottom of this file.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.app_users (
  id text primary key default gen_random_uuid()::text,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'Sales' check (role in ('Admin', 'Sales', 'Accounts', 'Operations')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

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
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.has_portal_role(text[]) from public;
grant execute on function public.has_portal_role(text[]) to authenticated;

create table if not exists public.clients (
  id text primary key default gen_random_uuid()::text,
  company_name text not null,
  address text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  destination_port text not null default '',
  products_dealing text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  sku text not null unique,
  description text not null default '',
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  weight numeric(14,3) not null default 0 check (weight >= 0),
  dimensions text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.vendors (
  id text primary key default gen_random_uuid()::text,
  company_name text not null,
  contact_name text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  city text not null default '',
  country text not null default '',
  product_categories text not null default '',
  payment_terms text not null default '',
  rating integer not null default 3 check (rating between 1 and 5),
  status text not null default 'Active' check (status in ('Active', 'Preferred', 'On Hold')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.freight_presets (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  loading_port text not null,
  destination_port text not null,
  shipment_mode text not null,
  freight_cost numeric(14,2) not null default 0 check (freight_cost >= 0),
  insurance_cost numeric(14,2) not null default 0 check (insurance_cost >= 0),
  shipment_window text not null default '',
  transit_time text not null default '',
  partial_shipment text not null default '',
  container_type text not null default '',
  storage_condition text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.quotes (
  id text primary key default gen_random_uuid()::text,
  quote_number text not null unique,
  client_id text references public.clients(id) on delete set null,
  currency text not null default 'USD' check (currency in ('USD', 'INR')),
  origin_country text not null default 'India',
  loading_port text not null default 'Mundra Port, India',
  shipment_mode text not null default 'Sea Freight (1x20ft FCL)',
  payment_terms text not null default '50% Advance, 50% vs Shipping Bill',
  validity_days integer not null default 15 check (validity_days > 0),
  packaging_cost numeric(14,2) not null default 0 check (packaging_cost >= 0),
  inland_haulage_cost numeric(14,2) not null default 0 check (inland_haulage_cost >= 0),
  customs_clearance_cost numeric(14,2) not null default 0 check (customs_clearance_cost >= 0),
  freight_cost numeric(14,2) not null default 0 check (freight_cost >= 0),
  insurance_cost numeric(14,2) not null default 0 check (insurance_cost >= 0),
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Negotiation', 'Approved', 'Invoice Raised', 'Shipped', 'Closed', 'Lost', 'Declined')),
  margin_per_kg numeric(14,2) not null default 0 check (margin_per_kg >= 0),
  internal_notes text not null default '',
  shipper_details jsonb,
  bank_details jsonb,
  commercial_note text not null default '',
  included_responsibilities text[] not null default '{}',
  excluded_responsibilities text[] not null default '{}',
  included_docs text[] not null default '{}',
  logistics_specs jsonb,
  commercial_terms text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.quote_items (
  id text primary key default gen_random_uuid()::text,
  quote_id text not null references public.quotes(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  sku text not null,
  description text not null default '',
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  weight numeric(14,3) not null default 0 check (weight >= 0),
  hs_code text not null default '',
  packing_container text not null default '',
  basis_of_calculation text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.leads (
  id text primary key default gen_random_uuid()::text,
  company_name text not null,
  contact_name text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  country text not null default '',
  product_interest text not null default '',
  estimated_value numeric(16,2) not null default 0 check (estimated_value >= 0),
  stage text not null default 'New Lead' check (stage in ('New Lead', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  owner text not null default '',
  next_follow_up date,
  notes text not null default '',
  client_id text references public.clients(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.invoices (
  id text primary key default gen_random_uuid()::text,
  quote_id text references public.quotes(id) on delete set null,
  invoice_number text not null unique,
  invoice_type text not null default 'Proforma' check (invoice_type in ('Proforma', 'Tax')),
  client_id text references public.clients(id) on delete set null,
  amount numeric(16,2) not null default 0 check (amount >= 0),
  currency text not null default 'INR' check (currency in ('INR', 'USD')),
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Part Paid', 'Paid', 'Overdue')),
  advance_amount numeric(16,2) not null default 0 check (advance_amount >= 0),
  balance_amount numeric(16,2) not null default 0 check (balance_amount >= 0),
  due_date date,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.shipments (
  id text primary key default gen_random_uuid()::text,
  quote_id text references public.quotes(id) on delete set null,
  invoice_id text references public.invoices(id) on delete set null,
  client_id text references public.clients(id) on delete set null,
  booking_number text not null default '',
  vessel_name text not null default '',
  container_number text not null default '',
  seal_number text not null default '',
  bl_number text not null default '',
  etd date,
  eta date,
  status text not null default 'Planning' check (status in ('Planning', 'Booked', 'Stuffed', 'Sailed', 'Arrived', 'Delivered')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.activities (
  id text primary key default gen_random_uuid()::text,
  client_id text references public.clients(id) on delete set null,
  lead_id text references public.leads(id) on delete set null,
  quote_id text references public.quotes(id) on delete set null,
  type text not null check (type in ('Call', 'Email', 'Meeting', 'Quote', 'Invoice', 'Shipment', 'Note', 'Status')),
  title text not null,
  details text not null default '',
  activity_date timestamptz not null default timezone('utc'::text, now()),
  owner text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Done')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  due_date date,
  owner text not null default '',
  client_id text references public.clients(id) on delete set null,
  lead_id text references public.leads(id) on delete set null,
  quote_id text references public.quotes(id) on delete set null,
  invoice_id text references public.invoices(id) on delete set null,
  shipment_id text references public.shipments(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.message_templates (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  channel text not null default 'Email' check (channel in ('Email', 'WhatsApp', 'SMS')),
  category text not null default 'General' check (category in ('Introduction', 'Quote Follow-up', 'Payment Reminder', 'Shipment Update', 'Document Sharing', 'General')),
  subject text not null default '',
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.freight_rate_history (
  id text primary key default gen_random_uuid()::text,
  loading_port text not null,
  destination_port text not null,
  shipment_mode text not null,
  forwarder text not null default '',
  freight_cost numeric(14,2) not null default 0 check (freight_cost >= 0),
  insurance_cost numeric(14,2) not null default 0 check (insurance_cost >= 0),
  currency text not null default 'INR' check (currency in ('INR', 'USD')),
  effective_date date not null,
  validity_date date,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.document_checklists (
  id text primary key default gen_random_uuid()::text,
  quote_id text references public.quotes(id) on delete set null,
  shipment_id text references public.shipments(id) on delete set null,
  commercial_invoice boolean not null default false,
  packing_list boolean not null default false,
  certificate_origin boolean not null default false,
  phytosanitary boolean not null default false,
  insurance boolean not null default false,
  bill_of_lading boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists leads_next_follow_up_idx on public.leads(next_follow_up) where next_follow_up is not null;
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists tasks_due_status_idx on public.tasks(due_date, status);
create index if not exists invoices_due_status_idx on public.invoices(due_date, payment_status);
create index if not exists shipments_eta_status_idx on public.shipments(eta, status);
create index if not exists activities_lead_date_idx on public.activities(lead_id, activity_date desc);
create index if not exists quotes_client_status_idx on public.quotes(client_id, status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_users', 'clients', 'products', 'vendors', 'freight_presets', 'quotes', 'quote_items',
    'leads', 'invoices', 'shipments', 'activities', 'tasks', 'message_templates',
    'freight_rate_history', 'document_checklists'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- Remove legacy anonymous policies from earlier demo versions.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname like 'Allow public%'
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end;
$$;

-- All active portal users can read shared operational records. Writes are
-- restricted by department and enforced in the database, not only in the UI.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients', 'products', 'vendors', 'freight_presets', 'quotes', 'quote_items', 'leads',
    'invoices', 'shipments', 'activities', 'tasks', 'message_templates',
    'freight_rate_history', 'document_checklists'
  ] loop
    execute format('drop policy if exists portal_read on public.%I', table_name);
    execute format('create policy portal_read on public.%I for select to authenticated using (public.has_portal_role(array[''Admin'', ''Sales'', ''Accounts'', ''Operations'']))', table_name);
  end loop;
end;
$$;

drop policy if exists sales_write on public.clients;
create policy sales_write on public.clients for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.leads;
create policy sales_write on public.leads for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.quotes;
create policy sales_write on public.quotes for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.quote_items;
create policy sales_write on public.quote_items for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.activities;
create policy sales_write on public.activities for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.message_templates;
create policy sales_write on public.message_templates for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));

drop policy if exists shared_task_write on public.tasks;
create policy shared_task_write on public.tasks for all to authenticated using (public.has_portal_role(array['Admin','Sales','Accounts','Operations'])) with check (public.has_portal_role(array['Admin','Sales','Accounts','Operations']));
drop policy if exists shared_product_write on public.products;
create policy shared_product_write on public.products for all to authenticated using (public.has_portal_role(array['Admin','Sales','Operations'])) with check (public.has_portal_role(array['Admin','Sales','Operations']));

drop policy if exists accounts_write on public.invoices;
create policy accounts_write on public.invoices for all to authenticated using (public.has_portal_role(array['Admin','Accounts'])) with check (public.has_portal_role(array['Admin','Accounts']));

drop policy if exists operations_write on public.shipments;
create policy operations_write on public.shipments for all to authenticated using (public.has_portal_role(array['Admin','Operations'])) with check (public.has_portal_role(array['Admin','Operations']));
drop policy if exists operations_write on public.document_checklists;
create policy operations_write on public.document_checklists for all to authenticated using (public.has_portal_role(array['Admin','Operations'])) with check (public.has_portal_role(array['Admin','Operations']));
drop policy if exists operations_write on public.vendors;
create policy operations_write on public.vendors for all to authenticated using (public.has_portal_role(array['Admin','Operations'])) with check (public.has_portal_role(array['Admin','Operations']));
drop policy if exists operations_write on public.freight_presets;
create policy operations_write on public.freight_presets for all to authenticated using (public.has_portal_role(array['Admin','Operations'])) with check (public.has_portal_role(array['Admin','Operations']));
drop policy if exists operations_write on public.freight_rate_history;
create policy operations_write on public.freight_rate_history for all to authenticated using (public.has_portal_role(array['Admin','Operations'])) with check (public.has_portal_role(array['Admin','Operations']));

alter table public.app_users enable row level security;
drop policy if exists user_directory_read on public.app_users;
create policy user_directory_read on public.app_users for select to authenticated using (auth_user_id = auth.uid() or public.has_portal_role(array['Admin']));
drop policy if exists admin_user_write on public.app_users;
create policy admin_user_write on public.app_users for all to authenticated using (public.has_portal_role(array['Admin'])) with check (public.has_portal_role(array['Admin']));

-- Bootstrap the first administrator after creating them in Supabase Auth:
-- insert into public.app_users (auth_user_id, name, email, role)
-- select id, 'Portal Administrator', email, 'Admin'
-- from auth.users where email = 'your-admin@company.com';
