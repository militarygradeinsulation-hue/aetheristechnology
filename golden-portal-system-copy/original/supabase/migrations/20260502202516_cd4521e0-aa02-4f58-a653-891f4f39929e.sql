
-- Time tracking for reps (clock in / clock out)
CREATE TABLE public.rep_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_code TEXT NOT NULL,
  clock_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE WHEN clock_out_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (clock_out_at - clock_in_at))::INTEGER
         ELSE NULL END
  ) STORED,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'portal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only one open (clocked-in) entry per rep at a time.
CREATE UNIQUE INDEX rep_time_entries_open_unique
  ON public.rep_time_entries (rep_code)
  WHERE clock_out_at IS NULL;

CREATE INDEX rep_time_entries_rep_clock_in_idx
  ON public.rep_time_entries (rep_code, clock_in_at DESC);

ALTER TABLE public.rep_time_entries ENABLE ROW LEVEL SECURITY;

-- Service role manages everything (edge functions handle the portal HMAC token gating).
CREATE POLICY "Service role manages time entries"
  ON public.rep_time_entries
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admins can read/edit through the admin dashboard if needed.
CREATE POLICY "Admins manage time entries"
  ON public.rep_time_entries
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_rep_time_entries_updated
  BEFORE UPDATE ON public.rep_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
