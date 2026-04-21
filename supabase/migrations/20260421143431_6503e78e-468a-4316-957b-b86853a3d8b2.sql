
-- Table to track auto-generated deliverables for one-time purchases
CREATE TABLE public.purchase_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL,
  email text NOT NULL,
  user_id uuid,
  price_id text NOT NULL,
  tool_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_deliverables_session ON public.purchase_deliverables(stripe_session_id);
CREATE INDEX idx_purchase_deliverables_user ON public.purchase_deliverables(user_id);
CREATE INDEX idx_purchase_deliverables_status ON public.purchase_deliverables(status);

ALTER TABLE public.purchase_deliverables ENABLE ROW LEVEL SECURITY;

-- Users can view their own deliverables (for polling on checkout return)
CREATE POLICY "Users can view own deliverables"
  ON public.purchase_deliverables FOR SELECT
  USING (auth.uid() = user_id);

-- Anon users can view by stripe_session_id (for non-logged-in purchases)
CREATE POLICY "Anyone can view deliverables by session"
  ON public.purchase_deliverables FOR SELECT
  TO anon
  USING (true);

-- Service role full access
CREATE POLICY "Service role can manage deliverables"
  ON public.purchase_deliverables FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Auto-update updated_at
CREATE TRIGGER update_purchase_deliverables_updated_at
  BEFORE UPDATE ON public.purchase_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
