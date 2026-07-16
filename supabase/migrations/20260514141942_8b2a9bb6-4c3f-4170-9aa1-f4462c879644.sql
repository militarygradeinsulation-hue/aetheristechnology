
CREATE TABLE IF NOT EXISTS public.hubspot_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  hubspot_id text NOT NULL UNIQUE,
  title text,
  meeting_link text,
  location text,
  outcome text,
  internal_notes text,
  start_time timestamptz,
  end_time timestamptz,
  organizer_owner_id text,
  organizer_email text,
  attendee_email text,
  attendee_name text,
  attendee_company text,
  attendee_phone text,
  contact_hubspot_id text,
  deal_hubspot_id text,
  rep_code text,
  source text DEFAULT 'hubspot_meeting_link',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hubspot_meetings_start_idx ON public.hubspot_meetings (start_time DESC);
CREATE INDEX IF NOT EXISTS hubspot_meetings_attendee_email_idx ON public.hubspot_meetings (lower(attendee_email));
CREATE INDEX IF NOT EXISTS hubspot_meetings_rep_code_idx ON public.hubspot_meetings (rep_code);

ALTER TABLE public.hubspot_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meetings" ON public.hubspot_meetings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER hubspot_meetings_updated_at
  BEFORE UPDATE ON public.hubspot_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.hubspot_meetings_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  last_synced_at timestamptz,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  meetings_synced int NOT NULL DEFAULT 0
);

ALTER TABLE public.hubspot_meetings_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read state" ON public.hubspot_meetings_state
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

INSERT INTO public.hubspot_meetings_state (id) VALUES (true) ON CONFLICT DO NOTHING;
