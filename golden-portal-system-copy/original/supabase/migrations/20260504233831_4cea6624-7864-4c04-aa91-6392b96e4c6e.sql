CREATE TABLE IF NOT EXISTS public.checklist_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  company text,
  role text,
  biggest_pain text,
  source text DEFAULT 'ai_implementation_checklist',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checklist_leads_email_idx ON public.checklist_leads (lower(email));
CREATE INDEX IF NOT EXISTS checklist_leads_created_idx ON public.checklist_leads (created_at DESC);

ALTER TABLE public.checklist_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit checklist lead"
  ON public.checklist_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view checklist leads"
  ON public.checklist_leads FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));