
-- ============ rep_activity ============
CREATE TABLE public.rep_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  rep_name text,
  event text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rep_activity_code_time ON public.rep_activity (rep_code, created_at DESC);
CREATE INDEX idx_rep_activity_event_time ON public.rep_activity (event, created_at DESC);

ALTER TABLE public.rep_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_rep_activity" ON public.rep_activity
  AS PERMISSIVE FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_view_rep_activity" ON public.rep_activity
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ rep_leads ============
CREATE TABLE public.rep_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text,
  contact_name text,
  email text,
  phone text,
  website text,
  industry text,
  location text,
  notes text,
  source text NOT NULL DEFAULT 'admin_manual',
  score int,
  why_fit text,
  claimed_by_code text,
  claimed_at timestamptz,
  status text NOT NULL DEFAULT 'new',
  last_touched_at timestamptz,
  touch_count int NOT NULL DEFAULT 0,
  created_by_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_leads_status_chk CHECK (status IN ('new','outreach','touched','replied','meeting','won','lost','dead')),
  CONSTRAINT rep_leads_source_chk CHECK (source IN ('admin_scrape','rep_upload','admin_manual'))
);

CREATE INDEX idx_rep_leads_pool ON public.rep_leads (status, created_at DESC) WHERE claimed_by_code IS NULL;
CREATE INDEX idx_rep_leads_owner ON public.rep_leads (claimed_by_code, status);
CREATE INDEX idx_rep_leads_created ON public.rep_leads (created_at DESC);

ALTER TABLE public.rep_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_rep_leads" ON public.rep_leads
  AS PERMISSIVE FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_view_rep_leads" ON public.rep_leads
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_rep_leads_updated_at
  BEFORE UPDATE ON public.rep_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
