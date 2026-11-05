-- 1. Per-run metrics for the audit pipeline
CREATE TABLE IF NOT EXISTS public.audit_run_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid NOT NULL REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  total_ms integer NOT NULL DEFAULT 0,
  stage_timings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_call_count integer NOT NULL DEFAULT 0,
  ai_error_count integer NOT NULL DEFAULT 0,
  ai_total_ms integer NOT NULL DEFAULT 0,
  patterns_with_zero_findings integer NOT NULL DEFAULT 0,
  total_patterns integer NOT NULL DEFAULT 0,
  health_score integer NOT NULL DEFAULT 0,
  bottleneck_stage text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_run_metrics_account ON public.audit_run_metrics(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_run_metrics_run ON public.audit_run_metrics(audit_run_id);
ALTER TABLE public.audit_run_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages audit metrics" ON public.audit_run_metrics
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Users view their own audit metrics" ON public.audit_run_metrics
  FOR SELECT USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- 2. Tuning config singleton
CREATE TABLE IF NOT EXISTS public.audit_tuning_config (
  id integer PRIMARY KEY DEFAULT 1,
  auto_apply_enabled boolean NOT NULL DEFAULT false,
  self_analysis_enabled boolean NOT NULL DEFAULT true,
  stalled_multiplier numeric NOT NULL DEFAULT 1.5,
  dead_lead_days integer NOT NULL DEFAULT 60,
  slow_followup_hours integer NOT NULL DEFAULT 4,
  stuck_proposal_days integer NOT NULL DEFAULT 30,
  reactivation_min_amount integer NOT NULL DEFAULT 1000,
  reactivation_window_min_days integer NOT NULL DEFAULT 180,
  reactivation_window_max_days integer NOT NULL DEFAULT 540,
  owner_overload_multiplier numeric NOT NULL DEFAULT 3.0,
  high_value_deal_min integer NOT NULL DEFAULT 5000,
  high_intent_min_engagements integer NOT NULL DEFAULT 2,
  diagnostics_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  recommendations_model text NOT NULL DEFAULT 'google/gemini-2.5-pro',
  summary_model text NOT NULL DEFAULT 'google/gemini-2.5-pro',
  self_analysis_model text NOT NULL DEFAULT 'google/gemini-2.5-pro',
  diagnostics_parallelism integer NOT NULL DEFAULT 4,
  enabled_patterns jsonb NOT NULL DEFAULT '["stalled_deals","dead_leads","slow_followup","stuck_proposal","closed_lost_reactivation","owner_overload","missing_contact_info","high_intent_no_workflow"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_tuning_config_singleton CHECK (id = 1)
);
INSERT INTO public.audit_tuning_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.audit_tuning_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages tuning config" ON public.audit_tuning_config
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins view tuning config" ON public.audit_tuning_config
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update tuning config" ON public.audit_tuning_config
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3. Tuning proposals
CREATE TABLE IF NOT EXISTS public.audit_tuning_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid REFERENCES public.audit_runs(id) ON DELETE SET NULL,
  field text NOT NULL,
  current_value jsonb NOT NULL,
  proposed_value jsonb NOT NULL,
  reason text NOT NULL,
  expected_impact text,
  confidence numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tuning_proposals_status ON public.audit_tuning_proposals(status, created_at DESC);
ALTER TABLE public.audit_tuning_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages tuning proposals" ON public.audit_tuning_proposals
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins view tuning proposals" ON public.audit_tuning_proposals
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update tuning proposals" ON public.audit_tuning_proposals
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4. Code proposals (never auto-applied)
CREATE TABLE IF NOT EXISTS public.audit_code_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid REFERENCES public.audit_runs(id) ON DELETE SET NULL,
  title text NOT NULL,
  diagnosis text NOT NULL,
  target_file text NOT NULL,
  proposed_change text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_code_proposals_status ON public.audit_code_proposals(status, created_at DESC);
ALTER TABLE public.audit_code_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages code proposals" ON public.audit_code_proposals
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins view code proposals" ON public.audit_code_proposals
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update code proposals" ON public.audit_code_proposals
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));