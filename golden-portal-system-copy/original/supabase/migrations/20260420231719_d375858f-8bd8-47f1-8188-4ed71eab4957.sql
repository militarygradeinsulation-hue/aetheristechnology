
-- LinkedIn OAuth tokens (single-row config)
CREATE TABLE public.linkedin_tokens (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  linkedin_person_urn text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.linkedin_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage linkedin tokens"
  ON public.linkedin_tokens FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- LinkedIn post queue
CREATE TABLE public.linkedin_post_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  format text,
  source_type text,
  source_id uuid,
  status text NOT NULL DEFAULT 'queued',
  scheduled_for timestamptz,
  posted_at timestamptz,
  linkedin_post_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.linkedin_post_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view linkedin queue"
  ON public.linkedin_post_queue FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert linkedin queue"
  ON public.linkedin_post_queue FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update linkedin queue"
  ON public.linkedin_post_queue FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete linkedin queue"
  ON public.linkedin_post_queue FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage linkedin queue"
  ON public.linkedin_post_queue FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
