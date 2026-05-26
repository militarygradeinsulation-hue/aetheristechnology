
CREATE TABLE IF NOT EXISTS public.admin_podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  topic text,
  script text NOT NULL,
  voice_id text,
  voice_name text,
  audio_url text,
  image_url text,
  duration_seconds integer,
  source_type text,
  source_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_podcasts ENABLE ROW LEVEL SECURITY;

-- Admin-only access; edge functions use the service role and bypass RLS.
CREATE POLICY "no client access to admin_podcasts"
  ON public.admin_podcasts FOR ALL
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS admin_podcasts_created_at_idx
  ON public.admin_podcasts (created_at DESC);

CREATE TRIGGER admin_podcasts_set_updated_at
  BEFORE UPDATE ON public.admin_podcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-podcasts', 'admin-podcasts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read admin-podcasts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'admin-podcasts');
