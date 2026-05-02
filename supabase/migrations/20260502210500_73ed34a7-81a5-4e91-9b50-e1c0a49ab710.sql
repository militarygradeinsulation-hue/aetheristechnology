
CREATE TABLE public.rep_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  kind text NOT NULL DEFAULT 'event' CHECK (kind IN ('event','reminder','note','follow_up','call','meeting','task')),
  title text NOT NULL,
  body text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  lead_id uuid REFERENCES public.rep_leads(id) ON DELETE SET NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  rep_notes text,
  admin_notes text,
  created_by text NOT NULL DEFAULT 'rep' CHECK (created_by IN ('rep','admin','system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rep_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages rep_calendar_events"
ON public.rep_calendar_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins view rep_calendar_events"
ON public.rep_calendar_events
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE INDEX idx_rep_calendar_rep_start ON public.rep_calendar_events (rep_code, start_at DESC);
CREATE INDEX idx_rep_calendar_lead ON public.rep_calendar_events (lead_id) WHERE lead_id IS NOT NULL;

CREATE TRIGGER update_rep_calendar_events_updated_at
BEFORE UPDATE ON public.rep_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
