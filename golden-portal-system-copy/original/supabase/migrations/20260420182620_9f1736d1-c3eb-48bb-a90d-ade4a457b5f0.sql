CREATE TABLE public.prerender_cache (
  route TEXT PRIMARY KEY,
  html TEXT NOT NULL,
  etag TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prerender_cache_generated_at ON public.prerender_cache(generated_at DESC);

ALTER TABLE public.prerender_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages prerender cache"
ON public.prerender_cache
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');