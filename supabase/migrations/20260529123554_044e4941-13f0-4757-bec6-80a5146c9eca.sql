-- Persistent forever clue trail per lead, visible to admins + reps
CREATE TABLE public.lead_clue_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  rep_code TEXT,
  rep_name TEXT,
  kind TEXT NOT NULL, -- 'tool_open' | 'scan' | 'rocketreach' | 'detective' | 'status_change' | 'touch' | 'note' | 'outreach' | 'meeting' | 'manual'
  label TEXT NOT NULL,
  tool_key TEXT, -- e.g. 'website-scanner', 'outreach-composer', 'detective-mode', 'rocketreach'
  stage_from TEXT,
  stage_to TEXT,
  tip TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_clue_trail_lead_time ON public.lead_clue_trail (lead_id, created_at DESC);
CREATE INDEX idx_lead_clue_trail_rep_time ON public.lead_clue_trail (rep_code, created_at DESC);

GRANT SELECT, INSERT ON public.lead_clue_trail TO authenticated;
GRANT ALL ON public.lead_clue_trail TO service_role;

ALTER TABLE public.lead_clue_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_view_clue_trail"
ON public.lead_clue_trail FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "service_role_clue_trail_all"
ON public.lead_clue_trail FOR ALL
TO authenticated
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');