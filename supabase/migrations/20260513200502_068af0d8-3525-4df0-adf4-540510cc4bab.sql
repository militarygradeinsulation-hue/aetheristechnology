CREATE INDEX IF NOT EXISTS idx_site_events_created_at ON public.site_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rep_leads_pool_score ON public.rep_leads (score DESC NULLS LAST, created_at DESC) WHERE claimed_by_code IS NULL AND assigned_to_code IS NULL;
ANALYZE public.site_events;
ANALYZE public.rep_leads;