CREATE TABLE IF NOT EXISTS public.rep_studio_usage (
  rep_code text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  action text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rep_code, day, action)
);
GRANT ALL ON public.rep_studio_usage TO service_role;
ALTER TABLE public.rep_studio_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages rep studio usage"
  ON public.rep_studio_usage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS rep_studio_usage_day_idx ON public.rep_studio_usage(day DESC);