-- Identified visitors from RB2B-style webhook
CREATE TABLE public.identified_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT,
  company_domain TEXT,
  person_name TEXT,
  person_email TEXT,
  person_linkedin_url TEXT,
  title TEXT,
  location TEXT,
  pages_viewed JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  added_to_crm BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_identified_visitors_last_seen ON public.identified_visitors(last_seen_at DESC);
CREATE INDEX idx_identified_visitors_company ON public.identified_visitors(company_domain);

ALTER TABLE public.identified_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view identified visitors"
  ON public.identified_visitors FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update identified visitors"
  ON public.identified_visitors FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete identified visitors"
  ON public.identified_visitors FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage identified visitors"
  ON public.identified_visitors FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_identified_visitors_updated_at
  BEFORE UPDATE ON public.identified_visitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Retargeting settings (single row)
CREATE TABLE public.retargeting_settings (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  linkedin_partner_id TEXT,
  meta_pixel_id TEXT,
  google_ads_id TEXT,
  rb2b_script_id TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT retargeting_settings_singleton CHECK (id = 1)
);

INSERT INTO public.retargeting_settings (id) VALUES (1);

ALTER TABLE public.retargeting_settings ENABLE ROW LEVEL SECURITY;

-- Pixel IDs need to be readable publicly so the frontend can load tags
CREATE POLICY "Retargeting settings are publicly readable"
  ON public.retargeting_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update retargeting settings"
  ON public.retargeting_settings FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Service role can manage retargeting settings"
  ON public.retargeting_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');