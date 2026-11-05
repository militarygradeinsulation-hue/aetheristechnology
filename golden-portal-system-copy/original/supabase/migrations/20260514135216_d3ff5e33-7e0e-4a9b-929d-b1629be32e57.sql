
CREATE TABLE IF NOT EXISTS public.social_scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ayrshare_id text,
  content text NOT NULL,
  platforms text[] NOT NULL DEFAULT '{}',
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'queued',
  source text,
  source_id uuid,
  media_urls text[] DEFAULT '{}',
  result jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Service-role-only access; edge functions guard via admin token.
CREATE POLICY "Deny all to anon and authenticated"
  ON public.social_scheduled_posts FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS social_scheduled_posts_scheduled_for_idx
  ON public.social_scheduled_posts (scheduled_for DESC);

CREATE TRIGGER social_scheduled_posts_set_updated_at
  BEFORE UPDATE ON public.social_scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
