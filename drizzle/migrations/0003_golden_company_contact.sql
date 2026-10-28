ALTER TABLE public.golden_report_companies
  ADD COLUMN IF NOT EXISTS poc_name text,
  ADD COLUMN IF NOT EXISTS poc_title text,
  ADD COLUMN IF NOT EXISTS poc_email text,
  ADD COLUMN IF NOT EXISTS poc_phone text,
  ADD COLUMN IF NOT EXISTS poc_source text,
  ADD COLUMN IF NOT EXISTS poc_found_at timestamptz;