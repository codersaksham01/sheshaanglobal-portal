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
  status text not null default 'Approved' check (status in ('Pending', 'Approved', 'Rejected')),
  requested_role text not null default 'Sales' check (requested_role in ('Admin', 'Sales', 'Accounts', 'Operations')),
  phone text not null default '',
  title text not null default '',
  approved_by text not null default '',
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.app_users add column if not exists status text not null default 'Approved';
alter table public.app_users add column if not exists requested_role text not null default 'Sales';
alter table public.app_users add column if not exists phone text not null default '';
alter table public.app_users add column if not exists title text not null default '';
alter table public.app_users add column if not exists approved_by text not null default '';
alter table public.app_users add column if not exists approved_at timestamptz;

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
  incoterm text not null default 'CIF (Cost, Insurance & Freight)',
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
  cost_breakdown_notes jsonb,
  show_cif_breakdown boolean not null default true,
  show_details_page boolean not null default true,
  show_cif_port_in_total boolean not null default false,
  show_signature_block boolean not null default true,
  show_origin_charges boolean not null default true,
  show_ocean_freight boolean not null default true,
  show_insurance_charge boolean not null default true,
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
  pricing_basis text not null default 'kg' check (pricing_basis in ('kg', 'package')),
  package_quantity numeric(14,3) not null default 0 check (package_quantity >= 0),
  package_unit_price numeric(14,2) not null default 0 check (package_unit_price >= 0),
  package_cost_price numeric(14,2) not null default 0 check (package_cost_price >= 0),
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

create table if not exists public.inquiries (
  id text primary key default gen_random_uuid()::text,
  inquiry_number text not null unique,
  inquiry_date date not null default current_date,
  lead_source text not null default 'Other' check (lead_source in ('Titan Email', 'WhatsApp', 'Embassy', 'Website', 'Referral', 'Other')),
  client_id text references public.clients(id) on delete set null,
  lead_id text references public.leads(id) on delete set null,
  buyer_company text not null,
  contact_person text not null default '',
  contact_email text not null default '',
  whatsapp_number text not null default '',
  country text not null,
  salesperson text not null,
  priority text not null default 'Warm' check (priority in ('Hot', 'Warm', 'Cold')),
  stage text not null default 'New Inquiry' check (stage in ('New Inquiry', 'Qualified', 'Reachout', 'Quotation Sent', 'Follow-up', 'Negotiation', 'Won', 'Lost', 'On Hold')),
  product_name text not null,
  product_category text not null default '',
  quantity numeric(16,3) not null check (quantity > 0),
  quantity_unit text not null default 'MT' check (quantity_unit in ('MT', 'KG', 'Tons', 'Containers', 'Bags', 'Pieces', 'Other')),
  target_price numeric(16,2) not null default 0 check (target_price >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'INR', 'AED', 'EUR', 'Other')),
  destination_country text not null default '',
  destination_port text not null default '',
  required_delivery_date date,
  incoterm text not null default '',
  packaging_requirement text not null default '',
  quality_specification text not null default '',
  payment_terms text not null default '',
  additional_requirements text not null default '',
  original_message text not null default '',
  last_contact_date date,
  next_follow_up_date date,
  next_action text not null default '',
  follow_up_status text not null default 'Upcoming' check (follow_up_status in ('Upcoming', 'Due Today', 'Overdue', 'Completed', 'Cancelled')),
  estimated_value numeric(16,2) not null default 0 check (estimated_value >= 0),
  order_value numeric(16,2) not null default 0 check (order_value >= 0),
  final_quantity numeric(16,3) not null default 0 check (final_quantity >= 0),
  final_price numeric(16,2) not null default 0 check (final_price >= 0),
  order_date date,
  shipment_information text not null default '',
  lost_reason text not null default '',
  notes text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.inquiry_quotations (
  id text primary key default gen_random_uuid()::text,
  quotation_number text not null,
  inquiry_id text not null references public.inquiries(id) on delete cascade,
  quote_id text references public.quotes(id) on delete set null,
  client_id text references public.clients(id) on delete set null,
  buyer_company text not null default '',
  quotation_date date not null default current_date,
  product_name text not null,
  quantity numeric(16,3) not null check (quantity > 0),
  quantity_unit text not null default 'MT',
  unit_price numeric(16,2) not null default 0 check (unit_price >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'INR', 'AED', 'EUR', 'Other')),
  incoterm text not null default '',
  destination_port text not null default '',
  payment_terms text not null default '',
  validity_date date,
  packaging text not null default '',
  quality text not null default '',
  freight numeric(16,2) not null default 0 check (freight >= 0),
  total_amount numeric(16,2) not null default 0 check (total_amount >= 0),
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Under Review', 'Negotiation', 'Accepted', 'Rejected', 'Expired')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (inquiry_id, quotation_number)
);

create table if not exists public.inquiry_follow_ups (
  id text primary key default gen_random_uuid()::text,
  inquiry_id text not null references public.inquiries(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  lead_id text references public.leads(id) on delete set null,
  follow_up_date date not null,
  last_contact_date date,
  action text not null,
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Due Today', 'Overdue', 'Completed', 'Cancelled')),
  owner text not null,
  result text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.inquiry_attachments (
  id text primary key default gen_random_uuid()::text,
  inquiry_id text not null references public.inquiries(id) on delete cascade,
  file_name text not null,
  file_type text not null default '',
  file_url text not null,
  notes text not null default '',
  uploaded_by text not null default '',
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
  inquiry_id text references public.inquiries(id) on delete set null,
  quote_id text references public.quotes(id) on delete set null,
  type text not null check (type in ('Call', 'Email', 'Meeting', 'Quote', 'Invoice', 'Shipment', 'Note', 'Status')),
  title text not null,
  details text not null default '',
  activity_date timestamptz not null default timezone('utc'::text, now()),
  owner text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.activities add column if not exists inquiry_id text references public.inquiries(id) on delete set null;

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

create table if not exists public.blogs (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  slug text not null unique,
  content text not null default '',
  cover_image_url text not null default '',
  author text not null default 'Sheshaan Global',
  status text not null default 'Draft' check (status in ('Draft', 'Published')),
  seo_keywords text not null default '',
  published_at timestamptz,
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

create table if not exists public.activity_logs (
  id text primary key default gen_random_uuid()::text,
  actor_email text not null default '',
  actor_name text not null default '',
  action text not null check (action in ('Created', 'Updated', 'Deleted', 'Approved', 'Rejected', 'Login Request')),
  table_name text not null,
  record_id text not null default '',
  record_label text not null default '',
  details text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.team_messages (
  id text primary key default gen_random_uuid()::text,
  sender_email text not null default '',
  sender_name text not null default '',
  body text not null default '',
  link_url text not null default '',
  link_label text not null default '',
  tag_type text not null default 'Quote' check (tag_type in ('Quote', 'Task', 'Buyer', 'Lead', 'Invoice', 'Shipment')),
  tag_id text not null default '',
  tag_label text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists leads_next_follow_up_idx on public.leads(next_follow_up) where next_follow_up is not null;
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists tasks_due_status_idx on public.tasks(due_date, status);
create index if not exists invoices_due_status_idx on public.invoices(due_date, payment_status);
create index if not exists shipments_eta_status_idx on public.shipments(eta, status);
create index if not exists activities_lead_date_idx on public.activities(lead_id, activity_date desc);
create index if not exists inquiries_stage_followup_idx on public.inquiries(stage, next_follow_up_date);
create index if not exists inquiries_source_idx on public.inquiries(lead_source);
create index if not exists inquiries_client_idx on public.inquiries(client_id);
create index if not exists inquiries_product_country_idx on public.inquiries(product_name, country);
create index if not exists inquiry_follow_ups_date_status_idx on public.inquiry_follow_ups(follow_up_date, status);
create index if not exists inquiry_quotations_inquiry_status_idx on public.inquiry_quotations(inquiry_id, status);
create index if not exists activities_inquiry_date_idx on public.activities(inquiry_id, activity_date desc);
create index if not exists quotes_client_status_idx on public.quotes(client_id, status);
create index if not exists leads_outreach_status_idx on public.leads(outreach_status);
create index if not exists leads_smart_score_idx on public.leads(smart_score desc);
create index if not exists blogs_status_published_idx on public.blogs(status, published_at desc);
create index if not exists blogs_slug_idx on public.blogs(slug);

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

  if coalesce(trim(lead_email), '') = '' then
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

create or replace function public.next_inquiry_number()
returns text
language plpgsql
volatile
as $$
declare
  seq_no integer;
begin
  select coalesce(max(nullif(regexp_replace(inquiry_number, '^SG-[0-9]{4}-', ''), '')::integer), 0) + 1
  into seq_no
  from public.inquiries
  where inquiry_number like 'SG-' || extract(year from current_date)::int || '-%';

  return 'SG-' || extract(year from current_date)::int || '-' || lpad(seq_no::text, 5, '0');
end;
$$;

create or replace function public.normalize_inquiry_operating_state()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.inquiry_number, '') = '' then
    new.inquiry_number = public.next_inquiry_number();
  end if;

  if new.stage in ('Won', 'Lost') then
    new.follow_up_status = 'Completed';
  elsif new.next_follow_up_date is null then
    new.follow_up_status = 'Upcoming';
  elsif new.next_follow_up_date < current_date then
    new.follow_up_status = 'Overdue';
  elsif new.next_follow_up_date = current_date then
    new.follow_up_status = 'Due Today';
  else
    new.follow_up_status = 'Upcoming';
  end if;

  if new.stage = 'Won' and coalesce(new.order_value, 0) <= 0 then
    raise exception 'Order value is required before marking an inquiry Won.';
  end if;

  if new.stage = 'Lost' and coalesce(trim(new.lost_reason), '') = '' then
    raise exception 'Lost reason is required before marking an inquiry Lost.';
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_inquiry_operating_state on public.inquiries;
create trigger normalize_inquiry_operating_state
before insert or update on public.inquiries
for each row execute function public.normalize_inquiry_operating_state();

create or replace function public.log_inquiry_stage_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activities (client_id, lead_id, inquiry_id, type, title, details, owner)
    values (new.client_id, new.lead_id, new.id, 'Status', 'Inquiry created', 'Stage: ' || new.stage || '. Source: ' || new.lead_source || '.', new.salesperson);
  elsif old.stage is distinct from new.stage then
    insert into public.activities (client_id, lead_id, inquiry_id, type, title, details, owner)
    values (new.client_id, new.lead_id, new.id, 'Status', 'Inquiry stage changed', 'Moved from ' || old.stage || ' to ' || new.stage || '.', new.salesperson);
  end if;
  return new;
end;
$$;

drop trigger if exists log_inquiry_stage_change on public.inquiries;
create trigger log_inquiry_stage_change
after insert or update of stage on public.inquiries
for each row execute function public.log_inquiry_stage_change();

create or replace function public.log_inquiry_quotation_created()
returns trigger
language plpgsql
as $$
begin
  insert into public.activities (client_id, inquiry_id, quote_id, type, title, details, owner)
  values (new.client_id, new.inquiry_id, new.quote_id, 'Quote', 'Quotation connected', new.quotation_number || ' for ' || new.product_name || ' marked ' || new.status || '.', '');
  update public.inquiries
  set stage = case when stage in ('New Inquiry', 'Qualified', 'Reachout') then 'Quotation Sent' else stage end,
      updated_at = timezone('utc'::text, now())
  where id = new.inquiry_id;
  return new;
end;
$$;

drop trigger if exists log_inquiry_quotation_created on public.inquiry_quotations;
create trigger log_inquiry_quotation_created
after insert on public.inquiry_quotations
for each row execute function public.log_inquiry_quotation_created();

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
    'leads', 'inquiries', 'inquiry_quotations', 'inquiry_follow_ups', 'inquiry_attachments',
    'invoices', 'shipments', 'activities', 'tasks', 'message_templates', 'blogs',
    'freight_rate_history', 'document_checklists', 'activity_logs', 'team_messages'
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
    'inquiries', 'inquiry_quotations', 'inquiry_follow_ups', 'inquiry_attachments',
    'invoices', 'shipments', 'activities', 'tasks', 'message_templates', 'blogs',
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
drop policy if exists sales_write on public.inquiries;
create policy sales_write on public.inquiries for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.inquiry_quotations;
create policy sales_write on public.inquiry_quotations for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.inquiry_follow_ups;
create policy sales_write on public.inquiry_follow_ups for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.inquiry_attachments;
create policy sales_write on public.inquiry_attachments for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.quotes;
create policy sales_write on public.quotes for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.quote_items;
create policy sales_write on public.quote_items for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.activities;
create policy sales_write on public.activities for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.message_templates;
create policy sales_write on public.message_templates for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists sales_write on public.blogs;
create policy sales_write on public.blogs for all to authenticated using (public.has_portal_role(array['Admin','Sales'])) with check (public.has_portal_role(array['Admin','Sales']));
drop policy if exists public_published_read on public.blogs;
create policy public_published_read on public.blogs for select to anon using (status = 'Published');

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

alter table public.activity_logs enable row level security;
drop policy if exists admin_log_read on public.activity_logs;
create policy admin_log_read on public.activity_logs for select to authenticated using (public.has_portal_role(array['Admin']));
drop policy if exists portal_log_insert on public.activity_logs;
create policy portal_log_insert on public.activity_logs for insert to authenticated with check (public.has_portal_role(array['Admin','Sales','Accounts','Operations']));

alter table public.team_messages enable row level security;
drop policy if exists portal_chat_read on public.team_messages;
create policy portal_chat_read on public.team_messages for select to authenticated using (public.has_portal_role(array['Admin','Sales','Accounts','Operations']));
drop policy if exists portal_chat_insert on public.team_messages;
create policy portal_chat_insert on public.team_messages for insert to authenticated with check (public.has_portal_role(array['Admin','Sales','Accounts','Operations']));

-- Bootstrap the first administrator after creating them in Supabase Auth:
-- insert into public.app_users (auth_user_id, name, email, role)
-- select id, 'Portal Administrator', email, 'Admin'
-- from auth.users where email = 'your-admin@company.com';
