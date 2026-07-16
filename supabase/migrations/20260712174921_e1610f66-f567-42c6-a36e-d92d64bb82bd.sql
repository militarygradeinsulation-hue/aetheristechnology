ALTER TABLE public.forensic_scans
  ADD COLUMN IF NOT EXISTS brand_kit jsonb,
  ADD COLUMN IF NOT EXISTS brand_kit_status jsonb;