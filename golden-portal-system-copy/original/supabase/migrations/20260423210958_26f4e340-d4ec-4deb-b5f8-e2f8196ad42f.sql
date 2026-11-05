-- Audit runs: one row per "Run Audit" click
CREATE TABLE public.audit_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | complete | failed
  current_stage TEXT, -- patterns | diagnostics | prioritization | recommendations | report | done
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_exposure_cents BIGINT DEFAULT 0,
  findings_count INTEGER DEFAULT 0,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_runs_account ON public.audit_runs(account_id, started_at DESC);

ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own audit runs"
ON public.audit_runs FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages audit runs"
ON public.audit_runs FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_audit_runs_updated_at
BEFORE UPDATE ON public.audit_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pattern results: raw output of each of the 8 leak detection queries
CREATE TABLE public.pattern_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_run_id UUID NOT NULL REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  pattern_key TEXT NOT NULL, -- e.g. 'stalled_deals'
  pattern_label TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  exposure_cents BIGINT NOT NULL DEFAULT 0,
  sample_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  formula TEXT,
  time_period TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pattern_results_run ON public.pattern_results(audit_run_id);
CREATE INDEX idx_pattern_results_account ON public.pattern_results(account_id);

ALTER TABLE public.pattern_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own pattern results"
ON public.pattern_results FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages pattern results"
ON public.pattern_results FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Pending actions: queued from "Approve & Execute" buttons (no real writes yet)
CREATE TABLE public.pending_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  audit_run_id UUID REFERENCES public.audit_runs(id) ON DELETE SET NULL,
  finding_key TEXT NOT NULL,
  action_type TEXT NOT NULL, -- e.g. 'reassign_deal', 'send_email', 'create_task'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | executed | failed
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_actions_account ON public.pending_actions(account_id, status);
CREATE INDEX idx_pending_actions_run ON public.pending_actions(audit_run_id);

ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own pending actions"
ON public.pending_actions FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users insert their own pending actions"
ON public.pending_actions FOR INSERT
WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages pending actions"
ON public.pending_actions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_pending_actions_updated_at
BEFORE UPDATE ON public.pending_actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique index on mirror tables for upsert safety (used by sync + seeder)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mirror_contacts_account_hsid
  ON public.mirror_contacts(account_id, hubspot_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mirror_deals_account_hsid
  ON public.mirror_deals(account_id, hubspot_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mirror_engagements_account_hsid
  ON public.mirror_engagements(account_id, hubspot_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mirror_owners_account_hsid
  ON public.mirror_owners(account_id, hubspot_id);

-- Helpful query indexes for pattern detection
CREATE INDEX IF NOT EXISTS idx_mirror_deals_stage ON public.mirror_deals(account_id, stage);
CREATE INDEX IF NOT EXISTS idx_mirror_deals_lastact ON public.mirror_deals(account_id, last_activity_date);
CREATE INDEX IF NOT EXISTS idx_mirror_deals_close ON public.mirror_deals(account_id, close_date);
CREATE INDEX IF NOT EXISTS idx_mirror_deals_owner ON public.mirror_deals(account_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_mirror_contacts_lifecycle ON public.mirror_contacts(account_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_mirror_contacts_lastact ON public.mirror_contacts(account_id, last_activity_date);
CREATE INDEX IF NOT EXISTS idx_mirror_engagements_contact ON public.mirror_engagements(account_id, contact_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_mirror_engagements_deal ON public.mirror_engagements(account_id, deal_id, timestamp);