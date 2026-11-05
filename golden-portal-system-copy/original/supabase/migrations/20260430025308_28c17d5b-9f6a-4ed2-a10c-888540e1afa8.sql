-- 1) Extend rep_leads
ALTER TABLE public.rep_leads
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS assigned_to_code text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS lifecycle_stage text,
  ADD COLUMN IF NOT EXISTS lead_status text;

CREATE UNIQUE INDEX IF NOT EXISTS rep_leads_external_id_uq
  ON public.rep_leads (external_id) WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rep_leads_assigned_to_code_idx
  ON public.rep_leads (assigned_to_code) WHERE assigned_to_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS rep_leads_pool_idx
  ON public.rep_leads (claimed_by_code, assigned_to_code, score DESC)
  WHERE claimed_by_code IS NULL;

-- 2) Settings singleton
CREATE TABLE IF NOT EXISTS public.lead_drip_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_per_rep int NOT NULL DEFAULT 10,
  enabled boolean NOT NULL DEFAULT true,
  require_email boolean NOT NULL DEFAULT true,
  indianapolis_only boolean NOT NULL DEFAULT true,
  excluded_lifecycle_stages text[] NOT NULL DEFAULT ARRAY['customer','opportunity'],
  scraper_enabled boolean NOT NULL DEFAULT true,
  scraper_frequency text NOT NULL DEFAULT 'daily',
  scraper_target_per_run int NOT NULL DEFAULT 50,
  hold_hours int NOT NULL DEFAULT 24,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_drip_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service role full access drip settings"
    ON public.lead_drip_settings FOR ALL
    TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.lead_drip_settings (daily_per_rep) 
SELECT 10 WHERE NOT EXISTS (SELECT 1 FROM public.lead_drip_settings);
