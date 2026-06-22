
CREATE TABLE IF NOT EXISTS public.forensic_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by TEXT,
  requester_kind TEXT NOT NULL DEFAULT 'admin',
  rep_code TEXT,
  target_url TEXT NOT NULL,
  company_name TEXT,
  hubspot_account_id UUID,
  status TEXT NOT NULL DEFAULT 'queued',
  stage_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_findings JSONB NOT NULL DEFAULT '{}'::jsonb,
  report JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS forensic_scans_created_idx ON public.forensic_scans (created_at DESC);
CREATE INDEX IF NOT EXISTS forensic_scans_rep_idx ON public.forensic_scans (rep_code, created_at DESC);

GRANT SELECT ON public.forensic_scans TO anon;
GRANT SELECT, INSERT, UPDATE ON public.forensic_scans TO authenticated;
GRANT ALL ON public.forensic_scans TO service_role;

ALTER TABLE public.forensic_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forensic_scans public read by id"
  ON public.forensic_scans FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER trg_forensic_scans_updated
  BEFORE UPDATE ON public.forensic_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
