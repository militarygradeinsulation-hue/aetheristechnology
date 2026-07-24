
-- Lock down rep CRM tables: no anon/authenticated access, service_role only.
-- All portal + public-quote reads/writes now flow through edge functions (rep-crm, quote-view).

DROP POLICY IF EXISTS "team shared crm leads" ON public.rep_crm_leads;
DROP POLICY IF EXISTS "team shared crm quotes" ON public.rep_crm_quotes;
DROP POLICY IF EXISTS "team shared crm activity" ON public.rep_crm_activity;

REVOKE ALL ON public.rep_crm_leads FROM anon, authenticated;
REVOKE ALL ON public.rep_crm_quotes FROM anon, authenticated;
REVOKE ALL ON public.rep_crm_activity FROM anon, authenticated;

GRANT ALL ON public.rep_crm_leads TO service_role;
GRANT ALL ON public.rep_crm_quotes TO service_role;
GRANT ALL ON public.rep_crm_activity TO service_role;

ALTER TABLE public.rep_crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_crm_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_crm_activity ENABLE ROW LEVEL SECURITY;

-- RLS enabled with no policies = deny all for anon/authenticated; service_role bypasses RLS.
