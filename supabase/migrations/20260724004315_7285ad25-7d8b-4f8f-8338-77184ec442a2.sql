
-- Team-shared rep CRM. Portal is rep-code gated (not auth.uid), so we allow
-- anon full CRUD and enforce rep_code presence via app + edge functions.

CREATE TABLE public.rep_crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_code TEXT NOT NULL,
  owner_name TEXT,
  company TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  stage TEXT NOT NULL DEFAULT 'new', -- new | contacted | quoted | won | lost
  source TEXT, -- rep_leads | scan | manual | golden
  source_id TEXT,
  value_cents INTEGER DEFAULT 0,
  next_action TEXT,
  next_action_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rep_crm_leads_stage ON public.rep_crm_leads(stage);
CREATE INDEX idx_rep_crm_leads_rep ON public.rep_crm_leads(rep_code);
CREATE INDEX idx_rep_crm_leads_email ON public.rep_crm_leads(lower(contact_email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_crm_leads TO anon, authenticated;
GRANT ALL ON public.rep_crm_leads TO service_role;
ALTER TABLE public.rep_crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team shared crm leads" ON public.rep_crm_leads FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.rep_crm_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.rep_crm_leads(id) ON DELETE SET NULL,
  rep_code TEXT NOT NULL,
  rep_name TEXT,
  quote_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_email TEXT,
  customer_company TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | sent | viewed | accepted | declined | expired
  currency TEXT NOT NULL DEFAULT 'usd',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{stripe_price_id, name, price_cents, qty, interval}]
  notes TEXT,
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rep_crm_quotes_lead ON public.rep_crm_quotes(lead_id);
CREATE INDEX idx_rep_crm_quotes_rep ON public.rep_crm_quotes(rep_code);
CREATE INDEX idx_rep_crm_quotes_status ON public.rep_crm_quotes(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_crm_quotes TO anon, authenticated;
GRANT ALL ON public.rep_crm_quotes TO service_role;
ALTER TABLE public.rep_crm_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team shared crm quotes" ON public.rep_crm_quotes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.rep_crm_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.rep_crm_leads(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.rep_crm_quotes(id) ON DELETE SET NULL,
  rep_code TEXT,
  kind TEXT NOT NULL, -- note | call | email | meeting | quote_sent | quote_viewed | quote_accepted | stage_change | import
  title TEXT,
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rep_crm_activity_lead ON public.rep_crm_activity(lead_id, occurred_at DESC);
CREATE INDEX idx_rep_crm_activity_rep ON public.rep_crm_activity(rep_code, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_crm_activity TO anon, authenticated;
GRANT ALL ON public.rep_crm_activity TO service_role;
ALTER TABLE public.rep_crm_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team shared crm activity" ON public.rep_crm_activity FOR ALL USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER trg_rep_crm_leads_updated
  BEFORE UPDATE ON public.rep_crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rep_crm_quotes_updated
  BEFORE UPDATE ON public.rep_crm_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-log stage changes and quote status changes
CREATE OR REPLACE FUNCTION public.log_rep_crm_lead_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.rep_crm_activity (lead_id, rep_code, kind, title, body)
    VALUES (NEW.id, NEW.rep_code, 'stage_change',
            'Stage: ' || COALESCE(OLD.stage,'?') || ' → ' || NEW.stage,
            NULL);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rep_crm_lead_stage_change
  AFTER UPDATE ON public.rep_crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.log_rep_crm_lead_stage_change();
