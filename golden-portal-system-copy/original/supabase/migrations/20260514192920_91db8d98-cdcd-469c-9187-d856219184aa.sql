
CREATE TABLE IF NOT EXISTS public.rep_company_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.company_calendar(id) ON DELETE CASCADE,
  task_index int NOT NULL,
  for_date date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_code, entry_id, task_index)
);

CREATE INDEX IF NOT EXISTS rep_company_task_completions_rep_date_idx
  ON public.rep_company_task_completions (rep_code, for_date DESC);
CREATE INDEX IF NOT EXISTS rep_company_task_completions_entry_idx
  ON public.rep_company_task_completions (entry_id);

ALTER TABLE public.rep_company_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rep_company_task_completions"
  ON public.rep_company_task_completions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE public.rep_company_task_completions;
