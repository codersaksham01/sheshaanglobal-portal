-- Sheshaan Global Lead Management normalized inquiry layer.
-- Keeps existing embassy/buyer data in clients and links genuine inquiries separately.

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

alter table public.activities add column if not exists inquiry_id text references public.inquiries(id) on delete set null;

create index if not exists inquiries_stage_followup_idx on public.inquiries(stage, next_follow_up_date);
create index if not exists inquiries_source_idx on public.inquiries(lead_source);
create index if not exists inquiries_client_idx on public.inquiries(client_id);
create index if not exists inquiries_product_country_idx on public.inquiries(product_name, country);
create index if not exists inquiry_follow_ups_date_status_idx on public.inquiry_follow_ups(follow_up_date, status);
create index if not exists inquiry_quotations_inquiry_status_idx on public.inquiry_quotations(inquiry_id, status);
create index if not exists activities_inquiry_date_idx on public.activities(inquiry_id, activity_date desc);
