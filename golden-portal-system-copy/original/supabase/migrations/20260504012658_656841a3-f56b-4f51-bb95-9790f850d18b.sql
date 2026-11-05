
ALTER TABLE public.purchase_deliverables
  ADD COLUMN IF NOT EXISTS intake_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS access_token text UNIQUE;

UPDATE public.purchase_deliverables
SET access_token = encode(gen_random_bytes(24), 'hex')
WHERE access_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_deliverables_token
  ON public.purchase_deliverables(access_token);

DROP POLICY IF EXISTS "Anyone can view deliverables by session" ON public.purchase_deliverables;

CREATE POLICY "Public can view deliverable by access_token"
  ON public.purchase_deliverables
  FOR SELECT
  TO anon, authenticated
  USING (access_token IS NOT NULL);

CREATE POLICY "Public can update intake by access_token"
  ON public.purchase_deliverables
  FOR UPDATE
  TO anon, authenticated
  USING (access_token IS NOT NULL)
  WITH CHECK (access_token IS NOT NULL);
