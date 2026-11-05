
CREATE TABLE public.scan_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scan_id uuid REFERENCES public.website_scans(id) ON DELETE CASCADE NOT NULL,
  tier text NOT NULL,
  stripe_session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scan purchases"
  ON public.scan_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage scan purchases"
  ON public.scan_purchases FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_scan_purchases_user ON public.scan_purchases(user_id);
CREATE INDEX idx_scan_purchases_scan ON public.scan_purchases(scan_id);
CREATE INDEX idx_scan_purchases_session ON public.scan_purchases(stripe_session_id);
