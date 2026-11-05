
ALTER TABLE public.rep_codes
  ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.rep_blueprint_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  task_id TEXT NOT NULL,
  done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rep_code, day_index, task_id)
);

GRANT ALL ON public.rep_blueprint_progress TO service_role;

ALTER TABLE public.rep_blueprint_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access blueprint progress"
  ON public.rep_blueprint_progress
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE INDEX IF NOT EXISTS idx_blueprint_progress_lookup
  ON public.rep_blueprint_progress (rep_code, day_index);

DROP TRIGGER IF EXISTS update_rep_blueprint_progress_updated_at ON public.rep_blueprint_progress;
CREATE TRIGGER update_rep_blueprint_progress_updated_at
  BEFORE UPDATE ON public.rep_blueprint_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
