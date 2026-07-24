
CREATE TABLE public.golden_report_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid,
  company_name text,
  target_url text,
  event_type text NOT NULL CHECK (event_type IN ('scan_completed','page_view','email_open','link_click','pdf_download')),
  recipient_email text,
  ip text,
  country text,
  region text,
  city text,
  user_agent text,
  referrer text,
  is_internal boolean NOT NULL DEFAULT false,
  rep_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gre_scan_created ON public.golden_report_events (scan_id, created_at DESC);
CREATE INDEX idx_gre_created ON public.golden_report_events (created_at DESC);
CREATE INDEX idx_gre_type_created ON public.golden_report_events (event_type, created_at DESC);

GRANT SELECT ON public.golden_report_events TO authenticated;
GRANT ALL ON public.golden_report_events TO service_role;

ALTER TABLE public.golden_report_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read golden report events"
  ON public.golden_report_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.golden_report_events;

-- Seed empty internal IP list in admin_kv (writable by admins via existing policies)
INSERT INTO public.admin_kv (key, value)
VALUES ('golden_report_internal_ips', '{"ips": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.admin_kv (key, value)
VALUES ('golden_report_notify_email', '{"email": "joseph@aetheris.technology"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
