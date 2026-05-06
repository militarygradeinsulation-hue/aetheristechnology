CREATE TABLE IF NOT EXISTS public.company_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  kind text NOT NULL DEFAULT 'goal',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  color text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_calendar_date_idx ON public.company_calendar(date DESC);

ALTER TABLE public.company_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages company_calendar"
  ON public.company_calendar
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER company_calendar_updated_at
  BEFORE UPDATE ON public.company_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.company_calendar;