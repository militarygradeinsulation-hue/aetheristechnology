
-- Operator headshots library
CREATE TABLE public.operator_headshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  tag TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_headshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view headshots"
  ON public.operator_headshots FOR SELECT
  USING (true);

CREATE POLICY "Admins manage headshots"
  ON public.operator_headshots FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Service role manages headshots"
  ON public.operator_headshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_operator_headshots_updated_at
  BEFORE UPDATE ON public.operator_headshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Thumbnail-related columns on content_engine_posts
ALTER TABLE public.content_engine_posts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_reference_id UUID,
  ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS thumbnail_status TEXT NOT NULL DEFAULT 'none';

-- Singleton settings table
CREATE TABLE public.thumbnail_settings (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  daily_cap INTEGER NOT NULL DEFAULT 50,
  default_quality TEXT NOT NULL DEFAULT 'medium',
  auto_generate_formats TEXT[] NOT NULL DEFAULT ARRAY['auditRoast','patternReveal'],
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT thumbnail_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.thumbnail_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage thumbnail settings"
  ON public.thumbnail_settings FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Service role manages thumbnail settings"
  ON public.thumbnail_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.thumbnail_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Daily generation log for cap enforcement
CREATE TABLE public.thumbnail_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_thumbnail_generations_created ON public.thumbnail_generations(created_at);

ALTER TABLE public.thumbnail_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view thumbnail generations"
  ON public.thumbnail_generations FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role manages thumbnail generations"
  ON public.thumbnail_generations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
