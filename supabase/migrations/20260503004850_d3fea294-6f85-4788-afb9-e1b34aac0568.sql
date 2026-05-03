
CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  body TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_name TEXT NOT NULL DEFAULT 'Aetheris Operator',
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_posts_published ON public.news_posts (published, published_at DESC);
CREATE INDEX idx_news_posts_slug ON public.news_posts (slug);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published news"
ON public.news_posts FOR SELECT
USING (published = true);

CREATE POLICY "Admins manage news (select)"
ON public.news_posts FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage news (insert)"
ON public.news_posts FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage news (update)"
ON public.news_posts FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage news (delete)"
ON public.news_posts FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
