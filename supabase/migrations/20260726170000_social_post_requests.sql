-- Platform-agnostic "post request" queue for browser-driven posting.
-- Unlike the API-backed *_post_queue tables, nothing here calls a social
-- platform automatically — a human or a browser-controlling agent reads
-- pending rows from the admin panel, posts manually in a browser tab, then
-- reports the result back (posted + URL, or failed + reason).
CREATE TABLE public.social_post_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL,
  content text NOT NULL,
  media_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending', -- pending | claimed | posted | failed | skipped
  claimed_by text,
  claimed_at timestamptz,
  result_url text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_post_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view post requests"
  ON public.social_post_requests FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert post requests"
  ON public.social_post_requests FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update post requests"
  ON public.social_post_requests FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete post requests"
  ON public.social_post_requests FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage post requests"
  ON public.social_post_requests FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
