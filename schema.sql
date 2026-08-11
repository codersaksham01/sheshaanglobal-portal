-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Clients Table
create table if not exists clients (
    id uuid default gen_random_uuid() primary key,
    company_name text not null,
    address text,
    contact_name text,
    contact_email text,
    destination_port text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Products Table
create table if not exists products (
    id uuid default gen_random_uuid() primary key,
    sku text unique not null,
    description text,
    unit_price numeric(12, 2) not null check (unit_price >= 0),
    cost_price numeric(12, 2) default 0.00 check (cost_price >= 0),
    weight numeric(10, 2) check (weight >= 0), -- in kg
    dimensions text, -- e.g. "50x30x20 cm"
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Freight & Insurance Presets Table
create table if not exists freight_presets (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    loading_port text not null,
    destination_port text not null,
    shipment_mode text not null,
    freight_cost numeric(12, 2) default 0.00 not null check (freight_cost >= 0),
    insurance_cost numeric(12, 2) default 0.00 not null check (insurance_cost >= 0),
    shipment_window text,
    transit_time text,
    partial_shipment text,
    container_type text,
    storage_condition text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Quotes Table (Supports transparent CIF cost structure)
create table if not exists quotes (
    id uuid default gen_random_uuid() primary key,
    quote_number text unique not null,
    client_id uuid references clients(id) on delete set null,
    
    -- Currency
    currency text default 'USD'::text not null check (currency in ('USD', 'INR')),
    
    -- CIF Logistics parameters
    origin_country text default 'India'::text not null,
    loading_port text default 'Mundra Port, India'::text not null,
    shipment_mode text default 'Sea Freight (1x20ft FCL)'::text not null,
    payment_terms text default '50% Advance, 50% vs Shipping Bill'::text not null,
    validity_days integer default 15 not null,
    
    -- Detailed breakdown values
    packaging_cost numeric(12, 2) default 0.00 not null check (packaging_cost >= 0),
    inland_haulage_cost numeric(12, 2) default 0.00 not null check (inland_haulage_cost >= 0),
    customs_clearance_cost numeric(12, 2) default 0.00 not null check (customs_clearance_cost >= 0),
    freight_cost numeric(12, 2) default 0.00 not null check (freight_cost >= 0),
    insurance_cost numeric(12, 2) default 0.00 not null check (insurance_cost >= 0),
    
    status text default 'Draft'::text not null check (status in ('Draft', 'Sent', 'Negotiation', 'Approved', 'Invoice Raised', 'Shipped', 'Closed', 'Lost', 'Declined')),
    margin_per_kg numeric(12, 2) default 0.00 check (margin_per_kg >= 0),
    internal_notes text,
    shipper_details jsonb, -- Exporter details snapshot
    bank_details jsonb,    -- Invoice banking instructions snapshot
    commercial_note text,  -- Note on commercial structure
    
    -- Page 2 responsibilities & documentation configuration
    included_responsibilities text[],
    excluded_responsibilities text[],
    included_docs text[],
    logistics_specs jsonb, -- Shipment window, transit time, container type, storage conditions
    commercial_terms text[],
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Quote Items Table (Saves historical snapshot of products inside quotes)
create table if not exists quote_items (
    id uuid default gen_random_uuid() primary key,
    quote_id uuid references quotes(id) on delete cascade not null,
    product_id uuid references products(id) on delete set null,
    sku text not null,
    description text,
    quantity integer not null check (quantity > 0),
    unit_price numeric(12, 2) not null check (unit_price >= 0),
    cost_price numeric(12, 2) default 0.00 check (cost_price >= 0),
    weight numeric(10, 2) check (weight >= 0), -- unit weight in kg
    
    -- Specific item offer parameters
    hs_code text,
    packing_container text, -- e.g. "325 Jute Bags (40 kg Net / Bag)"
    basis_of_calculation text -- e.g. "Per kg (13,000 kg)" or "Lump Sum"
);

-- Create simple row level security (optional policies can be added later)
alter table clients enable row level security;
alter table products enable row level security;
alter table freight_presets enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;

-- For demo/Replit/Netlify convenience, allow anonymous select, insert, update, delete.
create policy "Allow public read access to clients" on clients for select using (true);
create policy "Allow public write access to clients" on clients for all using (true);

create policy "Allow public read access to products" on products for select using (true);
create policy "Allow public write access to products" on products for all using (true);

create policy "Allow public read access to freight_presets" on freight_presets for select using (true);
create policy "Allow public write access to freight_presets" on freight_presets for all using (true);

create policy "Allow public read access to quotes" on quotes for select using (true);
create policy "Allow public write access to quotes" on quotes for all using (true);

create policy "Allow public read access to quote_items" on quote_items for select using (true);
create policy "Allow public write access to quote_items" on quote_items for all using (true);
