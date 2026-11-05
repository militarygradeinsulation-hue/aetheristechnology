
-- subscriber_profiles: business context for personalized AI deliveries
CREATE TABLE public.subscriber_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  user_id uuid NOT NULL,
  business_name text,
  industry text,
  target_audience text,
  tone_preference text DEFAULT 'professional',
  goals text[] DEFAULT '{}',
  website_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriber_profiles_user ON public.subscriber_profiles(user_id);
CREATE INDEX idx_subscriber_profiles_sub ON public.subscriber_profiles(subscription_id);

ALTER TABLE public.subscriber_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriber profiles"
  ON public.subscriber_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriber profiles"
  ON public.subscriber_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriber profiles"
  ON public.subscriber_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriber profiles"
  ON public.subscriber_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_subscriber_profiles_updated_at
  BEFORE UPDATE ON public.subscriber_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- subscription_deliveries: monthly AI-generated output archive
CREATE TABLE public.subscription_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  user_id uuid NOT NULL,
  delivery_type text NOT NULL,
  output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_date timestamptz NOT NULL DEFAULT now(),
  feedback_score integer,
  stripe_invoice_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_deliveries_user ON public.subscription_deliveries(user_id);
CREATE INDEX idx_subscription_deliveries_sub ON public.subscription_deliveries(subscription_id);

ALTER TABLE public.subscription_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deliveries"
  ON public.subscription_deliveries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage deliveries"
  ON public.subscription_deliveries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- subscriber_feedback: per-delivery ratings to teach the AI
CREATE TABLE public.subscriber_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.subscription_deliveries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating IN (-1, 1)),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriber_feedback_delivery ON public.subscriber_feedback(delivery_id);
CREATE INDEX idx_subscriber_feedback_user ON public.subscriber_feedback(user_id);

ALTER TABLE public.subscriber_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.subscriber_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.subscriber_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage feedback"
  ON public.subscriber_feedback FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
