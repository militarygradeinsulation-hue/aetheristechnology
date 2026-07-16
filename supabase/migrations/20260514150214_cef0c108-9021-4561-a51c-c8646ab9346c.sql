
-- Credits per buyer email (anonymous flow)
CREATE TABLE public.resume_scan_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  credits_remaining integer NOT NULL DEFAULT 0,
  credits_purchased integer NOT NULL DEFAULT 0,
  last_purchase_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_resume_scan_credits_email ON public.resume_scan_credits (lower(email));
ALTER TABLE public.resume_scan_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages credits" ON public.resume_scan_credits
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "admins read credits" ON public.resume_scan_credits
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_resume_credits_updated_at
  BEFORE UPDATE ON public.resume_scan_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scans
CREATE TABLE public.resume_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_url text,
  role_title text,
  role_notes text,
  resume_storage_path text,
  resume_filename text,
  scan_result jsonb DEFAULT '{}'::jsonb,
  fit_score integer,
  recommendation text,
  pdf_storage_path text,
  status text NOT NULL DEFAULT 'pending', -- pending | complete | failed
  error_message text,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_resume_scans_email ON public.resume_scans (lower(email));
CREATE INDEX idx_resume_scans_created ON public.resume_scans (created_at DESC);
ALTER TABLE public.resume_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages scans" ON public.resume_scans
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "admins read scans" ON public.resume_scans
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_resume_scans_updated_at
  BEFORE UPDATE ON public.resume_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cached company briefs
CREATE TABLE public.company_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_url text NOT NULL UNIQUE,
  brief jsonb NOT NULL,
  source_pages jsonb DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_briefs_url ON public.company_briefs (lower(company_url));
ALTER TABLE public.company_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages briefs" ON public.company_briefs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Storage bucket for uploaded resumes + generated PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('resume-scans', 'resume-scans', false)
ON CONFLICT (id) DO NOTHING;

-- Atomic credit consumption
CREATE OR REPLACE FUNCTION public.consume_resume_credit(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ok boolean := false;
BEGIN
  UPDATE public.resume_scan_credits
     SET credits_remaining = credits_remaining - 1,
         updated_at = now()
   WHERE lower(email) = lower(_email)
     AND credits_remaining > 0
  RETURNING true INTO _ok;
  RETURN COALESCE(_ok, false);
END;
$$;

-- Refund a credit (on scan failure)
CREATE OR REPLACE FUNCTION public.refund_resume_credit(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.resume_scan_credits
     SET credits_remaining = credits_remaining + 1,
         updated_at = now()
   WHERE lower(email) = lower(_email);
END;
$$;

-- Grant credits after purchase
CREATE OR REPLACE FUNCTION public.grant_resume_credits(_email text, _credits integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.resume_scan_credits (email, credits_remaining, credits_purchased, last_purchase_at)
  VALUES (lower(_email), _credits, _credits, now())
  ON CONFLICT (email) DO UPDATE SET
    credits_remaining = public.resume_scan_credits.credits_remaining + EXCLUDED.credits_remaining,
    credits_purchased = public.resume_scan_credits.credits_purchased + EXCLUDED.credits_purchased,
    last_purchase_at = now(),
    updated_at = now();
END;
$$;
