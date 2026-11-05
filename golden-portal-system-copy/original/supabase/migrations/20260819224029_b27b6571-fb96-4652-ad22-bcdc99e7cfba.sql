ALTER TABLE public.plan_entitlements
  ADD COLUMN IF NOT EXISTS stripe_live_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_live_product_id text;