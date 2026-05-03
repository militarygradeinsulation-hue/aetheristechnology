
CREATE TABLE public.industry_news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tech',
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  summary TEXT,
  image_url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_industry_news_published ON public.industry_news_cache (published_at DESC);
CREATE INDEX idx_industry_news_category ON public.industry_news_cache (category);

ALTER TABLE public.industry_news_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read industry news" ON public.industry_news_cache FOR SELECT USING (true);

CREATE TABLE public.industry_news_meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.industry_news_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read meta" ON public.industry_news_meta FOR SELECT USING (true);
