
CREATE TABLE public.rep_image_studio (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  url text NOT NULL,
  storage_path text,
  source text NOT NULL DEFAULT 'generated',
  model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rep_image_studio_rep_created_idx ON public.rep_image_studio (rep_code, created_at DESC);
ALTER TABLE public.rep_image_studio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages rep image studio"
  ON public.rep_image_studio FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
