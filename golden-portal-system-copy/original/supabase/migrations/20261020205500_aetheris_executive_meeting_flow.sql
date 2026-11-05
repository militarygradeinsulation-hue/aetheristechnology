-- Shared executive meeting cases for the Aetheris relationship-to-close process.
-- All browser access goes through the portal-meeting-flow edge function.
-- No anon/authenticated table access is granted.

CREATE TABLE IF NOT EXISTS public.aetheris_executive_meeting_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL CHECK (length(company) BETWEEN 1 AND 240),
  contact_name text,
  contact_role text,
  contact_email text,
  stage text NOT NULL DEFAULT 'dean'
    CHECK (stage IN ('dean','braden','joseph','closed')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','won','lost','on_hold','disqualified','archived')),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  gates jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision jsonb NOT NULL DEFAULT '{}'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  handoff_summary text,
  created_by_code text,
  updated_by_code text,
  last_meeting_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exec_meeting_cases_status_idx
  ON public.aetheris_executive_meeting_cases(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS exec_meeting_cases_stage_idx
  ON public.aetheris_executive_meeting_cases(stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS exec_meeting_cases_company_idx
  ON public.aetheris_executive_meeting_cases(lower(company));

ALTER TABLE public.aetheris_executive_meeting_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aetheris_executive_meeting_cases FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.aetheris_executive_meeting_cases TO service_role;

COMMENT ON TABLE public.aetheris_executive_meeting_cases IS
  'Shared Dean -> Braden -> Joseph meeting records, question answers, stage gates, handoffs, and commercial decision state.';
