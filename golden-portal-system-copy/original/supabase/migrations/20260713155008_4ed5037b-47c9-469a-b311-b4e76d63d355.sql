
CREATE TABLE IF NOT EXISTS public.rep_engagement_weekly (
  code text NOT NULL,
  rep_name text,
  week_start date NOT NULL,
  seconds_online integer NOT NULL DEFAULT 0,
  golden_report_uses integer NOT NULL DEFAULT 0,
  heartbeats integer NOT NULL DEFAULT 0,
  last_heartbeat_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, week_start)
);

GRANT ALL ON public.rep_engagement_weekly TO service_role;
ALTER TABLE public.rep_engagement_weekly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages engagement"
  ON public.rep_engagement_weekly FOR ALL
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_rep_engagement_weekly_week ON public.rep_engagement_weekly(week_start DESC);
