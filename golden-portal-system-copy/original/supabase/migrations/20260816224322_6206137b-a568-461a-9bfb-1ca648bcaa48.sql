ALTER TABLE public.content_engine_posts
  ADD COLUMN IF NOT EXISTS linkedin_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linkedin_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS linkedin_visibility text NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS linkedin_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS linkedin_post_urn text,
  ADD COLUMN IF NOT EXISTS linkedin_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS linkedin_error text,
  ADD COLUMN IF NOT EXISTS auto_comment text;

CREATE INDEX IF NOT EXISTS idx_content_engine_posts_li_due
  ON public.content_engine_posts (linkedin_status, linkedin_scheduled_at)
  WHERE linkedin_enabled = true;

CREATE TABLE IF NOT EXISTS public.linkedin_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_urn text UNIQUE,
  content_post_id uuid REFERENCES public.content_engine_posts(id) ON DELETE SET NULL,
  text text NOT NULL,
  visibility text NOT NULL DEFAULT 'PUBLIC',
  image_url text,
  auto_comment text,
  auto_comment_urn text,
  auto_comment_status text,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'published',
  error text,
  published_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.linkedin_publications TO service_role;
ALTER TABLE public.linkedin_publications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_linkedin_publications_published_at
  ON public.linkedin_publications (published_at DESC);