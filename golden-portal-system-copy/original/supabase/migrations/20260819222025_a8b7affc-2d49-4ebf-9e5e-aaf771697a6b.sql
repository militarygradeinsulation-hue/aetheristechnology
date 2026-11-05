-- 1) Subscription plan fields ------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS seats_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS system_id uuid,
  ADD COLUMN IF NOT EXISTS archive_id uuid,
  ADD COLUMN IF NOT EXISTS customer_email text;

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);

UPDATE public.subscriptions
   SET plan_id = 'intelligence'
 WHERE plan_id IS NULL AND price_id = 'golden_report_intelligence_monthly';

-- 2) Normalized plan entitlement mapping --------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  plan_id text PRIMARY KEY,
  stripe_lookup_key text UNIQUE,
  name text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  cadence text NOT NULL DEFAULT 'monthly',
  seat_limit integer NOT NULL DEFAULT 5,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_product_id text,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_entitlements TO anon;
GRANT SELECT ON public.plan_entitlements TO authenticated;
GRANT ALL ON public.plan_entitlements TO service_role;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plan catalog is public" ON public.plan_entitlements;
CREATE POLICY "Plan catalog is public" ON public.plan_entitlements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manages plans" ON public.plan_entitlements;
CREATE POLICY "Service role manages plans" ON public.plan_entitlements FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.plan_entitlements (plan_id, stripe_lookup_key, name, amount_cents, cadence, seat_limit, entitlements)
VALUES (
  'intelligence',
  'golden_report_intelligence_monthly',
  'Golden Report Intelligence',
  250000,
  'monthly',
  5,
  jsonb_build_object(
    'max_companies', 1, 'max_users', 5, 'report_ai', true, 'safe_internal_actions', true,
    'monthly_rescan', true, 'monthly_deliverables', true, 'company_system', true,
    'persistent_memory', true, 'billing_portal', true,
    'external_publishing', false, 'destructive_actions', false, 'external_integrations', false,
    'custom_builds', false, 'operator_hours', 0, 'verified_recovery_claims', false,
    'module_tier', 'intelligence', 'min_imagery', 6, 'min_posts', 12, 'schedule_days', 30
  )
)
ON CONFLICT (plan_id) DO UPDATE
  SET stripe_lookup_key = EXCLUDED.stripe_lookup_key,
      name = EXCLUDED.name,
      amount_cents = EXCLUDED.amount_cents,
      seat_limit = EXCLUDED.seat_limit,
      entitlements = EXCLUDED.entitlements,
      active = true,
      updated_at = now();

-- 3) Seats / membership --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid,
  invited_email text,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_members_user
  ON public.subscription_members(subscription_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_members_email
  ON public.subscription_members(subscription_id, lower(invited_email)) WHERE invited_email IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_members TO authenticated;
GRANT ALL ON public.subscription_members TO service_role;
ALTER TABLE public.subscription_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own subscription roster" ON public.subscription_members;
CREATE POLICY "Members read own subscription roster" ON public.subscription_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Owner manages roster" ON public.subscription_members;
CREATE POLICY "Owner manages roster" ON public.subscription_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role manages roster" ON public.subscription_members;
CREATE POLICY "Service role manages roster" ON public.subscription_members
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.enforce_subscription_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seat_cap integer;
  used integer;
BEGIN
  SELECT COALESCE(s.seats_limit, 5) INTO seat_cap
    FROM public.subscriptions s WHERE s.id = NEW.subscription_id;
  IF seat_cap IS NULL THEN
    seat_cap := 5;
  END IF;

  SELECT count(*) INTO used
    FROM public.subscription_members m
   WHERE m.subscription_id = NEW.subscription_id
     AND m.status = 'active'
     AND (TG_OP = 'INSERT' OR m.id <> NEW.id);

  IF NEW.status = 'active' AND used >= seat_cap THEN
    RAISE EXCEPTION 'Seat limit reached for this subscription (max %).', seat_cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_seat_limit ON public.subscription_members;
CREATE TRIGGER trg_subscription_seat_limit
  BEFORE INSERT OR UPDATE ON public.subscription_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_seat_limit();

-- 4) Subscription workflow orchestration --------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  stripe_invoice_id text,
  plan_id text,
  company_id uuid,
  system_id uuid,
  archive_id uuid,
  scan_id uuid,
  workflow_type text NOT NULL DEFAULT 'intelligence_monthly',
  workflow_version integer NOT NULL DEFAULT 1,
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  idempotency_key text NOT NULL UNIQUE,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued',
  stage text,
  stages_completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_workflows_status_chk
    CHECK (status IN ('queued','running','completed','failed','dead_letter'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_workflows_sub ON public.subscription_workflows(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_workflows_status ON public.subscription_workflows(status, next_retry_at);

GRANT SELECT ON public.subscription_workflows TO authenticated;
GRANT ALL ON public.subscription_workflows TO service_role;
ALTER TABLE public.subscription_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read own workflows" ON public.subscription_workflows;
CREATE POLICY "Owners read own workflows" ON public.subscription_workflows
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.subscription_members m WHERE m.subscription_id = subscription_workflows.subscription_id AND m.user_id = auth.uid() AND m.status = 'active')
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Service role manages workflows" ON public.subscription_workflows;
CREATE POLICY "Service role manages workflows" ON public.subscription_workflows
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 5) Duplicate prevention ------------------------------------------------------
ALTER TABLE public.subscription_deliveries
  ADD COLUMN IF NOT EXISTS billing_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS workflow_id uuid,
  ADD COLUMN IF NOT EXISTS plan_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_deliveries_invoice
  ON public.subscription_deliveries(subscription_id, stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_deliveries_period
  ON public.subscription_deliveries(subscription_id, delivery_type, billing_period_start)
  WHERE billing_period_start IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_systems_company_report_tier_version
  ON public.company_systems(company_id, archive_id, tier, system_version)
  WHERE archive_id IS NOT NULL;

-- 6) Atomic webhook claim ------------------------------------------------------
ALTER TABLE public.processed_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_processed_webhook_events_id
  ON public.processed_webhook_events(stripe_event_id);

-- 7) updated_at triggers -------------------------------------------------------
DROP TRIGGER IF EXISTS trg_plan_entitlements_updated ON public.plan_entitlements;
CREATE TRIGGER trg_plan_entitlements_updated BEFORE UPDATE ON public.plan_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_subscription_members_updated ON public.subscription_members;
CREATE TRIGGER trg_subscription_members_updated BEFORE UPDATE ON public.subscription_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_subscription_workflows_updated ON public.subscription_workflows;
CREATE TRIGGER trg_subscription_workflows_updated BEFORE UPDATE ON public.subscription_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();