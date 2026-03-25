CREATE TABLE public.website_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert website scans"
  ON public.website_scans
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view website scans"
  ON public.website_scans
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));