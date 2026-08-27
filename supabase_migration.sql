-- SHESHAAN GLOBAL TRADE OS — SUPABASE SQL MIGRATION
-- Core Relational Schema + Row-Level Security (RLS) + Automated State Machine Triggers

-- ── 1. CASCADING APPROVAL TRIGGER ────────────────────────────────────────────
-- When a Quote status is changed to 'Approved', automatically:
-- a) Generate a Proforma Invoice with calculated total value.
-- b) Create a compliance task to compile the shipping dossier.

CREATE OR REPLACE FUNCTION public.fn_cascade_quote_approval()
RETURNS TRIGGER AS $$
DECLARE
    calculated_amount DECIMAL(12,2) := 0.00;
    invoice_num VARCHAR(100);
BEGIN
    -- Only run when status transitions to 'Approved'
    IF (OLD.status IS DISTINCT FROM 'Approved' AND NEW.status = 'Approved') THEN
        
        -- 1. Calculate invoice total from quote items and freight/insurance costs
        SELECT COALESCE(SUM((val->>'unit_price')::decimal * (val->>'quantity')::decimal), 0)
        INTO calculated_amount
        FROM jsonb_array_elements(NEW.items) AS val;

        calculated_amount := calculated_amount + 
                             NEW.freight_cost + 
                             NEW.insurance_cost + 
                             NEW.packaging_cost + 
                             NEW.inland_haulage_cost + 
                             NEW.customs_clearance_cost;

        -- 2. Establish unique invoice number
        invoice_num := 'PI-' || REPLACE(NEW.quote_number, 'Q-', '');

        -- 3. Create Proforma Invoice if not already present
        INSERT INTO public.invoices (
            quote_id,
            client_id,
            invoice_number,
            invoice_type,
            amount,
            balance_amount,
            currency,
            payment_status,
            due_date,
            notes
        )
        VALUES (
            NEW.id,
            NEW.client_id,
            invoice_num,
            'Proforma',
            calculated_amount,
            calculated_amount,
            NEW.currency,
            'Pending',
            (CURRENT_DATE + 30),
            'Auto-generated from approved Quote: ' || NEW.quote_number
        )
        ON CONFLICT (invoice_number) DO NOTHING;

        -- 4. Create Compliance / Packing Task
        INSERT INTO public.tasks (
            client_id,
            title,
            priority,
            status,
            due_date,
            notes,
            quote_id
        )
        VALUES (
            NEW.client_id,
            'Compile Cargo Dossier for ' || NEW.quote_number,
            'High',
            'Open',
            (CURRENT_DATE + 2),
            '[AUTOMATION] Compile commercial invoice, packing list, certificate of origin, and phytosanitary certificate.',
            NEW.id
        );

        -- 5. Create Document Checklist
        INSERT INTO public.document_checklists (
            quote_id,
            commercial_invoice,
            packing_list,
            certificate_origin,
            phytosanitary,
            insurance,
            bill_of_lading,
            notes
        )
        VALUES (
            NEW.id,
            true,   -- Commercial Invoice required
            true,   -- Packing List required
            true,   -- Certificate of Origin required
            false,  -- Phytosanitary (conditional)
            false,  -- Insurance (conditional)
            false,  -- Bill of Lading (conditional)
            'Auto-initialized checklist for approved Quote ' || NEW.quote_number
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Quote Trigger
DROP TRIGGER IF EXISTS tr_quote_approved_cascade ON public.quotes;
CREATE TRIGGER tr_quote_approved_cascade
AFTER UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.fn_cascade_quote_approval();


-- ── 2. SHIPMENT ALERT DETECTOR TRIGGER ───────────────────────────────────────
-- When a shipment's ETA is updated or status is shifted, check for demurrage risk:
-- If status is 'Sailed' and ETA is within 3 days, automatically raise a High task warning.

CREATE OR REPLACE FUNCTION public.fn_shipment_eta_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Sailed' AND NEW.eta IS NOT NULL AND NEW.eta <= (CURRENT_DATE + 3)) THEN
        -- Insert a warning task for port clearance
        INSERT INTO public.tasks (
            client_id,
            title,
            priority,
            status,
            due_date,
            notes,
            shipment_id
        )
        VALUES (
            NEW.client_id,
            'Urgent Port Demurrage Risk: ' || COALESCE(NEW.bl_number, NEW.booking_number, 'Shipment'),
            'High',
            'Open',
            NEW.eta,
            '[AUTOMATION] Shipment is arriving within 3 days. Initiate customs clearance immediately to prevent demurrage charges.',
            NEW.id
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Shipment Trigger
DROP TRIGGER IF EXISTS tr_shipment_eta_alert ON public.shipments;
CREATE TRIGGER tr_shipment_eta_alert
AFTER INSERT OR UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.fn_shipment_eta_alert();


-- ── 3. PERFORMANCE INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS quotes_status_created_idx ON public.quotes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_payment_status_idx ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON public.shipments(status);
CREATE INDEX IF NOT EXISTS tasks_quote_invoice_idx ON public.tasks(quote_id, invoice_id);

-- Dynamic blog engine table + public read policy
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS show_cif_breakdown BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS pricing_basis TEXT NOT NULL DEFAULT 'kg';
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS package_quantity NUMERIC(14,3) NOT NULL DEFAULT 0;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS package_unit_price NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS package_cost_price NUMERIC(14,2) NOT NULL DEFAULT 0;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quote_items_pricing_basis_check'
    ) THEN
        ALTER TABLE public.quote_items
        ADD CONSTRAINT quote_items_pricing_basis_check CHECK (pricing_basis IN ('kg', 'package'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.blogs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    cover_image_url TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT 'Sheshaan Global',
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published')),
    seo_keywords TEXT NOT NULL DEFAULT '',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS blogs_status_published_idx ON public.blogs(status, published_at DESC);
CREATE INDEX IF NOT EXISTS blogs_slug_idx ON public.blogs(slug);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blog_admin_write ON public.blogs;
CREATE POLICY blog_admin_write ON public.blogs
FOR ALL TO authenticated
USING (public.has_portal_role(ARRAY['Admin','Sales']))
WITH CHECK (public.has_portal_role(ARRAY['Admin','Sales']));

DROP POLICY IF EXISTS public_published_blog_read ON public.blogs;
CREATE POLICY public_published_blog_read ON public.blogs
FOR SELECT TO anon
USING (status = 'Published');


-- ── 4. VERIFICATION QUERY ────────────────────────────────────────────────────
-- Execute to verify the active triggers in the database:
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public';
