
-- Per-route SEO overrides applied at render time
CREATE TABLE public.seo_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  keywords TEXT,
  faqs JSONB DEFAULT '[]'::jsonb,
  tldr TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_overrides_path ON public.seo_overrides(path);

ALTER TABLE public.seo_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SEO overrides are publicly readable"
  ON public.seo_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage SEO overrides"
  ON public.seo_overrides FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Service role can manage SEO overrides"
  ON public.seo_overrides FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- History / audit log of optimization runs
CREATE TABLE public.seo_optimization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  before JSONB DEFAULT '{}'::jsonb,
  after JSONB DEFAULT '{}'::jsonb,
  trends_used JSONB DEFAULT '[]'::jsonb,
  ai_reasoning TEXT,
  score_before INTEGER,
  score_after INTEGER,
  run_type TEXT NOT NULL DEFAULT 'weekly',
  status TEXT NOT NULL DEFAULT 'applied',
  run_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_log_route ON public.seo_optimization_log(route);
CREATE INDEX idx_seo_log_run_at ON public.seo_optimization_log(run_at DESC);

ALTER TABLE public.seo_optimization_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read SEO log"
  ON public.seo_optimization_log FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage SEO log"
  ON public.seo_optimization_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Cached trend discovery results (7 day TTL handled in code)
CREATE TABLE public.seo_trend_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  trends JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_trend_topic ON public.seo_trend_cache(topic, fetched_at DESC);

ALTER TABLE public.seo_trend_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read trend cache"
  ON public.seo_trend_cache FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage trend cache"
  ON public.seo_trend_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
