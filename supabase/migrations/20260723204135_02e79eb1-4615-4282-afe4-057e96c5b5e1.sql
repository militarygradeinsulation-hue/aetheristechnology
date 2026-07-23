ALTER TABLE public.rep_calendar_events
  ADD COLUMN IF NOT EXISTS company_event_id uuid REFERENCES public.company_calendar(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_rep_calendar_events_company_event_id
  ON public.rep_calendar_events(company_event_id);