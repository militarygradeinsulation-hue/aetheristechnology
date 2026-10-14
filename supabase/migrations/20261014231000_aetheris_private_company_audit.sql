-- Private company intake: stable baseline keyed by verified URL host, not by AI output.
-- No browser read grants. Golden Report is created by service-role worker only.
ALTER TABLE public.forensic_scans
  ADD COLUMN IF NOT EXISTS private_intake boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.aetheris_company_audit_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE CHECK (length(domain) BETWEEN 4 AND 240),
  website_url text NOT NULL,
  company_name text NOT NULL,
  revenue_band text NOT NULL,
  baseline_answers jsonb NOT NULL,
  recommendations jsonb NOT NULL,
  engine_version text NOT NULL,
  scan_status text NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending','dispatching','queued','reused','limited','failed')),
  private_scan_id uuid REFERENCES public.forensic_scans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aetheris_company_audit_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.aetheris_company_audit_cases(id) ON DELETE CASCADE,
  contact_name text,
  contact_email text NOT NULL CHECK (length(contact_email) < 256),
  submission_answers jsonb NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aetheris_audit_submissions_case_idx
  ON public.aetheris_company_audit_submissions(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aetheris_audit_submissions_ip_idx
  ON public.aetheris_company_audit_submissions(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS aetheris_audit_scan_status_idx
  ON public.aetheris_company_audit_cases(scan_status, created_at DESC);

ALTER TABLE public.aetheris_company_audit_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aetheris_company_audit_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aetheris_company_audit_cases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.aetheris_company_audit_submissions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.aetheris_company_audit_cases TO service_role;
GRANT ALL ON public.aetheris_company_audit_submissions TO service_role;

-- Atomic global throttle: at most 3 new automated full Golden Reports per UTC
-- day, one per domain. No visitor or repeated test can force a rescan.
CREATE OR REPLACE FUNCTION public.claim_private_company_golden(p_case_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(88347103);
  IF (SELECT count(*) FROM public.aetheris_company_audit_cases
      WHERE scan_status IN ('dispatching','queued','reused')
      AND updated_at >= date_trunc('day', now())) >= 3 THEN
    UPDATE public.aetheris_company_audit_cases SET scan_status = 'limited', updated_at = now()
      WHERE id = p_case_id AND scan_status = 'pending';
    RETURN false;
  END IF;
  UPDATE public.aetheris_company_audit_cases
    SET scan_status = 'dispatching', updated_at = now()
    WHERE id = p_case_id AND scan_status = 'pending'
    RETURNING id INTO changed;
  RETURN changed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.claim_private_company_golden(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_private_company_golden(uuid) TO service_role;

COMMENT ON TABLE public.aetheris_company_audit_cases IS
 'First completed assessment defines a stable recommendation baseline by company domain. Private report id is never served to visitors.';
