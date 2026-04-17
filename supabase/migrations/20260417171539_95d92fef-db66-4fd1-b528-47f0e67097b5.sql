-- campaign_settings: singleton config for the email campaign system
CREATE TABLE public.campaign_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_active BOOLEAN NOT NULL DEFAULT false,
  daily_limit INTEGER NOT NULL DEFAULT 100,
  from_name TEXT NOT NULL DEFAULT 'Joseph Toney',
  from_email TEXT NOT NULL DEFAULT 'joseph@aetheris.technology',
  signature_html TEXT NOT NULL DEFAULT '<p>Joseph Toney<br><a href="https://aetheris.technology/">aetheris.technology</a></p>',
  default_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaign settings"
ON public.campaign_settings FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update campaign settings"
ON public.campaign_settings FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role can manage campaign settings"
ON public.campaign_settings FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_campaign_settings_updated_at
BEFORE UPDATE ON public.campaign_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton row with default CTAs
INSERT INTO public.campaign_settings (id, default_links) VALUES (
  1,
  '[
    {"label":"Free Website Scan","url":"https://aetheris.technology/scan"},
    {"label":"Business Diagnostic Quiz","url":"https://aetheris.technology/diagnostic"},
    {"label":"Book a Strategy Call","url":"https://aetheris.technology/contact"},
    {"label":"Playbooks Library","url":"https://aetheris.technology/resources"},
    {"label":"Industries We Serve","url":"https://aetheris.technology/industries"}
  ]'::jsonb
);

-- campaign_assets: reusable images, playbooks, links for the composer
CREATE TABLE public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('image','playbook','link')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_attached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_assets_type ON public.campaign_assets(type);
CREATE INDEX idx_campaign_assets_attached ON public.campaign_assets(is_attached) WHERE is_attached = true;

ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaign assets"
ON public.campaign_assets FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert campaign assets"
ON public.campaign_assets FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update campaign assets"
ON public.campaign_assets FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete campaign assets"
ON public.campaign_assets FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role can manage campaign assets"
ON public.campaign_assets FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');