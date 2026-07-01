ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS latest_forensic_scan_id uuid,
  ADD COLUMN IF NOT EXISTS latest_forensic_report jsonb,
  ADD COLUMN IF NOT EXISTS latest_forensic_at timestamptz;

CREATE INDEX IF NOT EXISTS crm_companies_website_lower_idx
  ON public.crm_companies (lower(website));