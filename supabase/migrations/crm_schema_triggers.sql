-- SUPABASE SQL MIGRATION — CRM & LEAD INTELLIGENCE TRIGGERS
-- Re-engineers cascading transitions, dynamic indexes, and timezone calculation states.

-- ── 1. COMPOUND RETRIEVAL INDEXES ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS leads_stage_velocity_idx ON public.leads(stage, outreach_status);
CREATE INDEX IF NOT EXISTS leads_smart_score_desc_idx ON public.leads(smart_score DESC);
CREATE INDEX IF NOT EXISTS leads_timezone_outreach_idx ON public.leads(country, outreach_status);

-- ── 2. DYNAMIC WORKFLOW STATE MACHINE CASCADE ──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_cascade_crm_lead_transitions()
RETURNS TRIGGER AS $$
BEGIN
    -- Transition 1: Lead Won -> Check client profile and create if missing
    IF (OLD.stage IS DISTINCT FROM 'Won' AND NEW.stage = 'Won') THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.clients 
            WHERE LOWER(company_name) = LOWER(NEW.company_name)
        ) THEN
            INSERT INTO public.clients (company_name, contact_name, contact_email, phone, destination_port)
            VALUES (
                NEW.company_name,
                COALESCE(NEW.contact_name, ''),
                COALESCE(NEW.contact_email, ''),
                COALESCE(NEW.phone, ''),
                ''
            );
        END IF;

        -- Create onboarding checklist task
        INSERT INTO public.tasks (title, status, priority, due_date, lead_id, notes)
        VALUES (
            'CRM onboarding checklist: ' || NEW.company_name,
            'Open',
            'High',
            (CURRENT_DATE + 3),
            NEW.id,
            '[AUTOMATION] Setup client profile, verify payment schedules, and finalize onboarding documents.'
        );
    END IF;

    -- Transition 2: Lead Lost -> Close any existing open tasks
    IF (OLD.stage IS DISTINCT FROM 'Lost' AND NEW.stage = 'Lost') THEN
        UPDATE public.tasks
        SET status = 'Done', notes = notes || ' [CLOSED AUTO due to Lead Lost]'
        WHERE lead_id = NEW.id AND status != 'Done';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind CRM Stage Cascades Trigger
DROP TRIGGER IF EXISTS tr_crm_stage_cascades ON public.leads;
CREATE TRIGGER tr_crm_stage_cascades
AFTER UPDATE OF stage ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.fn_cascade_crm_lead_transitions();

-- ── 3. AUTOMATIC ACTIVITY LOGGING TRIGGER ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_log_crm_stage_change_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.stage IS DISTINCT FROM NEW.stage) THEN
        INSERT INTO public.activities (lead_id, type, title, details, owner)
        VALUES (
            NEW.id,
            'Status',
            'Pipeline Stage Shifted',
            'Moved from ' || OLD.stage || ' to ' || NEW.stage || '.',
            COALESCE(NEW.owner, 'System')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Stage Change Logger Trigger
DROP TRIGGER IF EXISTS tr_log_crm_stage_changes ON public.leads;
CREATE TRIGGER tr_log_crm_stage_changes
AFTER UPDATE OF stage ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_crm_stage_change_activity();
