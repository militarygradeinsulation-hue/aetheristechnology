
CREATE TABLE public.rep_code_scan_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  prospect_name text,
  prospect_email text NOT NULL,
  prospect_phone text,
  company text,
  website_url text NOT NULL,
  score integer,
  grade text,
  gap_count integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  teaser jsonb NOT NULL DEFAULT '{}'::jsonb,
  scan_id uuid REFERENCES public.website_scans(id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rep_code_scan_leads_rep_code ON public.rep_code_scan_leads(rep_code);
CREATE INDEX idx_rep_code_scan_leads_created_at ON public.rep_code_scan_leads(created_at DESC);
CREATE INDEX idx_rep_code_scan_leads_email ON public.rep_code_scan_leads(lower(prospect_email));

ALTER TABLE public.rep_code_scan_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert scan leads"
  ON public.rep_code_scan_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view scan leads"
  ON public.rep_code_scan_leads
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
