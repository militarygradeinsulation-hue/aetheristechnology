-- Hygiene scans
CREATE TABLE public.hygiene_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  scan_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'running',
  total_issues INTEGER NOT NULL DEFAULT 0,
  totals_by_category JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hygiene_scans_account ON public.hygiene_scans(account_id, scan_date DESC);

ALTER TABLE public.hygiene_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages hygiene scans"
ON public.hygiene_scans FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users view their own hygiene scans"
ON public.hygiene_scans FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- Hygiene actions
CREATE TABLE public.hygiene_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.hygiene_scans(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'medium',
  severity TEXT NOT NULL DEFAULT 'medium',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  approval_mode TEXT NOT NULL DEFAULT 'individual',
  recommended_action JSONB NOT NULL DEFAULT '{}'::jsonb,
  affected_record_ids TEXT[] NOT NULL DEFAULT '{}',
  affected_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);
CREATE INDEX idx_hygiene_actions_scan ON public.hygiene_actions(scan_id);
CREATE INDEX idx_hygiene_actions_account_status ON public.hygiene_actions(account_id, status);

ALTER TABLE public.hygiene_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages hygiene actions"
ON public.hygiene_actions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users view their own hygiene actions"
ON public.hygiene_actions FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users update their own hygiene actions"
ON public.hygiene_actions FOR UPDATE
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()))
WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- Hygiene log
CREATE TABLE public.hygiene_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.hygiene_actions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  hubspot_object_type TEXT NOT NULL,
  hubspot_object_id TEXT NOT NULL,
  field_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  before_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  rolled_back_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hygiene_log_action ON public.hygiene_log(action_id);
CREATE INDEX idx_hygiene_log_account ON public.hygiene_log(account_id, executed_at DESC);

ALTER TABLE public.hygiene_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages hygiene log"
ON public.hygiene_log FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users view their own hygiene log"
ON public.hygiene_log FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- Hygiene settings
CREATE TABLE public.hygiene_settings (
  account_id UUID PRIMARY KEY,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  allow_auto_high_conf BOOLEAN NOT NULL DEFAULT false,
  enable_enrichment BOOLEAN NOT NULL DEFAULT false,
  max_batch_size INTEGER NOT NULL DEFAULT 100,
  pause_threshold_pct INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hygiene_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages hygiene settings"
ON public.hygiene_settings FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users view their own hygiene settings"
ON public.hygiene_settings FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users insert their own hygiene settings"
ON public.hygiene_settings FOR INSERT
WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users update their own hygiene settings"
ON public.hygiene_settings FOR UPDATE
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()))
WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_hygiene_scans_updated_at
BEFORE UPDATE ON public.hygiene_scans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hygiene_actions_updated_at
BEFORE UPDATE ON public.hygiene_actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hygiene_settings_updated_at
BEFORE UPDATE ON public.hygiene_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();