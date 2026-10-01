-- Native (non-Ayrshare) OAuth + posting for X (Twitter) and Facebook Pages / Instagram.
-- Mirrors the existing linkedin_tokens / linkedin_post_queue pattern.

-- Short-lived OAuth handshake storage (PKCE code_verifier for X, CSRF state + temp
-- long-lived user token / discovered pages for Facebook page selection).
CREATE TABLE public.oauth_sessions (
  state text NOT NULL PRIMARY KEY,
  provider text NOT NULL,
  code_verifier text,
  redirect_uri text NOT NULL,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage oauth sessions"
  ON public.oauth_sessions FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- ===================== X (Twitter) =====================

CREATE TABLE public.x_tokens (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  x_user_id text,
  x_username text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.x_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage x tokens"
  ON public.x_tokens FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE TABLE public.x_post_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  source_type text,
  source_id uuid,
  status text NOT NULL DEFAULT 'queued',
  scheduled_for timestamptz,
  posted_at timestamptz,
  x_post_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.x_post_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view x queue"
  ON public.x_post_queue FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert x queue"
  ON public.x_post_queue FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update x queue"
  ON public.x_post_queue FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete x queue"
  ON public.x_post_queue FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage x queue"
  ON public.x_post_queue FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- ===================== Facebook Page / Instagram =====================

CREATE TABLE public.facebook_tokens (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY,
  page_access_token text,
  page_id text,
  page_name text,
  ig_user_id text,
  ig_username text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facebook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage facebook tokens"
  ON public.facebook_tokens FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE TABLE public.facebook_post_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  source_type text,
  source_id uuid,
  status text NOT NULL DEFAULT 'queued',
  scheduled_for timestamptz,
  posted_at timestamptz,
  facebook_post_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facebook_post_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view facebook queue"
  ON public.facebook_post_queue FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert facebook queue"
  ON public.facebook_post_queue FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update facebook queue"
  ON public.facebook_post_queue FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete facebook queue"
  ON public.facebook_post_queue FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage facebook queue"
  ON public.facebook_post_queue FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE TABLE public.instagram_post_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caption text,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'IMAGE',
  source_type text,
  source_id uuid,
  status text NOT NULL DEFAULT 'queued',
  scheduled_for timestamptz,
  posted_at timestamptz,
  instagram_post_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_post_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view instagram queue"
  ON public.instagram_post_queue FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert instagram queue"
  ON public.instagram_post_queue FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update instagram queue"
  ON public.instagram_post_queue FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete instagram queue"
  ON public.instagram_post_queue FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage instagram queue"
  ON public.instagram_post_queue FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
