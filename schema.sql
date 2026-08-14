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
  sequence_enrolled text not null default '',
  data_source text not null default 'Custom Researched Data' check (data_source in ('Embassy Data', 'Custom Researched Data', 'Uncategorized')),
  outreach_status text not null default 'Need Reach Out' check (outreach_status in ('Need Reach Out', 'Follow-up Due', 'Next Follow-up', 'Waiting Reply', 'Responded / Qualify', 'Needs Email Fix', 'Review', 'Closed')),
  smart_score integer not null default 30 check (smart_score between 0 and 100),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.leads add column if not exists sequence_enrolled text not null default '';
alter table public.leads add column if not exists data_source text not null default 'Custom Researched Data';
alter table public.leads add column if not exists outreach_status text not null default 'Need Reach Out';
alter table public.leads add column if not exists smart_score integer not null default 30;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_data_source_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads add constraint leads_data_source_check check (data_source in ('Embassy Data', 'Custom Researched Data', 'Uncategorized'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_outreach_status_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads add constraint leads_outreach_status_check check (outreach_status in ('Need Reach Out', 'Follow-up Due', 'Next Follow-up', 'Waiting Reply', 'Responded / Qualify', 'Needs Email Fix', 'Review', 'Closed'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_smart_score_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads add constraint leads_smart_score_check check (smart_score between 0 and 100);
  end if;
end;
$$;

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
create index if not exists leads_outreach_status_idx on public.leads(outreach_status);
create index if not exists leads_smart_score_idx on public.leads(smart_score desc);

create or replace function public.calculate_lead_outreach_status(
  lead_stage text,
  lead_email text,
  lead_next_follow_up date,
  lead_notes text
)
returns text
language plpgsql
stable
as $$
declare
  note_text text := lower(coalesce(lead_notes, ''));
begin
  if lead_stage in ('Won', 'Lost') then
    return 'Closed';
  end if;

  if coalesce(lead_email, '') = '' or note_text like '%invalid email%' or note_text like '%verify email%' then
    return 'Needs Email Fix';
  end if;

  if note_text like '%response received: yes%' or note_text like '%responded%' then
    return 'Responded / Qualify';
  end if;

  if lead_next_follow_up is not null and lead_next_follow_up <= current_date then
    return 'Follow-up Due';
  end if;

  if lead_next_follow_up is not null and lead_next_follow_up > current_date then
    return 'Next Follow-up';
  end if;

  if note_text like '%email sent%' or note_text like '%whatsapp sent%' or note_text like '%contacted%' then
    return 'Waiting Reply';
  end if;

  return 'Need Reach Out';
end;
$$;

create or replace function public.calculate_lead_smart_score(
  lead_email text,
  lead_phone text,
  lead_country text,
  lead_product text,
  lead_estimated_value numeric,
  lead_stage text,
  lead_next_follow_up date
)
returns integer
language plpgsql
stable
as $$
declare
  score integer := 30;
begin
  if coalesce(lead_email, '') <> '' then score := score + 18; end if;
  if coalesce(lead_phone, '') <> '' then score := score + 16; end if;
  if coalesce(lead_country, '') <> '' then score := score + 10; end if;
  if coalesce(lead_product, '') <> '' then score := score + 12; end if;
  if coalesce(lead_estimated_value, 0) >= 10000 then score := score + 12; end if;
  if lead_stage in ('Quoted', 'Negotiation') then score := score + 14; end if;
  if lead_stage = 'Won' then score := score + 20; end if;
  if lead_next_follow_up is not null and lead_next_follow_up <= current_date then score := score + 8; end if;
  return least(100, greatest(0, score));
end;
$$;

create or replace function public.normalize_lead_operating_state()
returns trigger
language plpgsql
as $$
begin
  new.data_source = case
    when lower(coalesce(new.notes, '')) like '%data source: embassy%' then 'Embassy Data'
    when lower(coalesce(new.notes, '')) like '%data source: custom%' then 'Custom Researched Data'
    when coalesce(new.data_source, '') = '' then 'Custom Researched Data'
    else new.data_source
  end;

  new.outreach_status = public.calculate_lead_outreach_status(new.stage, new.contact_email, new.next_follow_up, new.notes);
  new.smart_score = public.calculate_lead_smart_score(new.contact_email, new.phone, new.country, new.product_interest, new.estimated_value, new.stage, new.next_follow_up);

  return new;
end;
$$;

drop trigger if exists normalize_lead_operating_state on public.leads;
create trigger normalize_lead_operating_state
before insert or update on public.leads
for each row execute function public.normalize_lead_operating_state();

create or replace view public.smart_trade_action_queue
with (security_invoker = true) as
select
  'lead-' || id as id,
  case
    when outreach_status in ('Follow-up Due', 'Needs Email Fix') then 'warning'
    when outreach_status = 'Need Reach Out' then 'opportunity'
    else 'healthy'
  end as tone,
  outreach_status as title,
  company_name as subject,
  coalesce(country, 'Uncategorized') as market,
  smart_score,
  next_follow_up,
  'crm' as target
from public.leads
where outreach_status <> 'Closed'
union all
select
  'invoice-' || id,
  case when payment_status = 'Overdue' or (payment_status <> 'Paid' and due_date < current_date) then 'critical' else 'warning' end,
  'Receivable Follow-up',
  invoice_number,
  currency,
  100,
  due_date,
  'accounts'
from public.invoices
where payment_status <> 'Paid'
union all
select
  'shipment-' || id,
  'warning',
  'Shipment Control Gap',
  coalesce(nullif(booking_number, ''), nullif(vessel_name, ''), 'Shipment'),
  status,
  75,
  eta,
  'shipments'
from public.shipments
where status not in ('Arrived', 'Delivered')
  and (booking_number = '' or container_number = '' or bl_number = '' or (eta is not null and eta <= current_date + interval '7 days'));

revoke all on public.smart_trade_action_queue from public;
grant select on public.smart_trade_action_queue to authenticated;

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
