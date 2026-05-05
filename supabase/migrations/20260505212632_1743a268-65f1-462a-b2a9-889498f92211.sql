ALTER TABLE public.rep_leads
  ADD COLUMN IF NOT EXISTS enrichment jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_rep_leads_enriched_at ON public.rep_leads(enriched_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_rep_leads_assigned_to ON public.rep_leads(assigned_to_code) WHERE assigned_to_code IS NOT NULL;