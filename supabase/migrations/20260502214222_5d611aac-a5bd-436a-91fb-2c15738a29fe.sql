
-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  phone text,
  stripe_customer_id text,
  source text,
  rep_code text,
  partner_code text,
  lifetime_value_cents integer NOT NULL DEFAULT 0,
  total_purchases integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_env_idx ON public.customers (lower(email));
CREATE INDEX IF NOT EXISTS customers_rep_idx ON public.customers (rep_code);
CREATE INDEX IF NOT EXISTS customers_stripe_idx ON public.customers (stripe_customer_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customers" ON public.customers FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Sales
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  email text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  product_id text,
  price_id text,
  product_name text,
  kind text NOT NULL DEFAULT 'one_time', -- one_time | subscription | renewal | refund
  stripe_session_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  stripe_charge_id text,
  rep_code text,
  partner_code text,
  status text NOT NULL DEFAULT 'paid',
  environment text NOT NULL DEFAULT 'sandbox',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_customer_idx ON public.sales (customer_id);
CREATE INDEX IF NOT EXISTS sales_rep_idx ON public.sales (rep_code);
CREATE INDEX IF NOT EXISTS sales_env_idx ON public.sales (environment);
CREATE UNIQUE INDEX IF NOT EXISTS sales_session_uniq ON public.sales (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sales_invoice_uniq ON public.sales (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sales" ON public.sales FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Commissions
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  recipient_role text NOT NULL, -- company | rep | partner
  recipient_code text,          -- rep_code (null for company)
  amount_cents integer NOT NULL,
  rate numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | paid | reversed
  paid_at timestamptz,
  payout_reference text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commissions_sale_idx ON public.commissions (sale_id);
CREATE INDEX IF NOT EXISTS commissions_recipient_idx ON public.commissions (recipient_code);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage commissions" ON public.commissions FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Activity log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  rep_code text,
  actor text,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_event_idx ON public.activity_log (event_type);
CREATE INDEX IF NOT EXISTS activity_log_customer_idx ON public.activity_log (customer_id);
CREATE INDEX IF NOT EXISTS activity_log_rep_idx ON public.activity_log (rep_code);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log (created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read activity" ON public.activity_log FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins write activity" ON public.activity_log FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Webhook idempotency
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook events" ON public.processed_webhook_events FOR SELECT USING (public.is_admin(auth.uid()));

-- Updated_at trigger
DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to upsert customer & bump LTV
CREATE OR REPLACE FUNCTION public.upsert_customer_with_sale(
  _email text, _name text, _phone text, _stripe_customer_id text,
  _source text, _rep_code text, _partner_code text, _amount_cents integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
BEGIN
  IF _email IS NULL OR _email = '' THEN RETURN NULL; END IF;
  INSERT INTO public.customers (email, name, phone, stripe_customer_id, source, rep_code, partner_code, lifetime_value_cents, total_purchases, last_seen_at)
  VALUES (lower(_email), _name, _phone, _stripe_customer_id, _source, _rep_code, _partner_code, COALESCE(_amount_cents,0), 1, now())
  ON CONFLICT (lower(email)) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.customers.name),
    phone = COALESCE(EXCLUDED.phone, public.customers.phone),
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.customers.stripe_customer_id),
    rep_code = COALESCE(public.customers.rep_code, EXCLUDED.rep_code),
    partner_code = COALESCE(public.customers.partner_code, EXCLUDED.partner_code),
    lifetime_value_cents = public.customers.lifetime_value_cents + COALESCE(_amount_cents,0),
    total_purchases = public.customers.total_purchases + 1,
    last_seen_at = now(),
    updated_at = now()
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
