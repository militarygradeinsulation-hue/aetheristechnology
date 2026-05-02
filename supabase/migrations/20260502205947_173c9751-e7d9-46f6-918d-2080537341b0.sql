
-- Daily checklist tracking per rep
CREATE TABLE public.rep_daily_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  for_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Indiana/Indianapolis')::date,
  notifications_reposted boolean NOT NULL DEFAULT false,
  connections_added integer NOT NULL DEFAULT 0,
  blog_posted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_code, for_date)
);

ALTER TABLE public.rep_daily_checklist ENABLE ROW LEVEL SECURITY;

-- Service-role only (edge function will mediate using portal token)
CREATE POLICY "service role full access checklist"
ON public.rep_daily_checklist
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_rep_daily_checklist_updated_at
BEFORE UPDATE ON public.rep_daily_checklist
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rep_daily_checklist_lookup ON public.rep_daily_checklist (rep_code, for_date DESC);
