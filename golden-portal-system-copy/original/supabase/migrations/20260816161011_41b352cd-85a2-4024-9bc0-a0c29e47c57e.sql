-- Aetheris Company Operating System: module registry, composed company systems,
-- brand contexts, goals/checks/metrics/forecasts, scoped memory and audit log.

CREATE TABLE IF NOT EXISTS public.universe_module_registry (
  id text PRIMARY KEY,
  name text NOT NULL,
  route text NOT NULL,
  category text NOT NULL,
  required_tier text NOT NULL DEFAULT 'diagnostic',
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  outputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  config_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity text NOT NULL DEFAULT 'low',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.universe_module_registry TO service_role;
ALTER TABLE public.universe_module_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registry service only" ON public.universe_module_registry FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_brand_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.golden_report_companies(id) ON DELETE CASCADE,
  scan_id uuid REFERENCES public.forensic_scans(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  logo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  typography jsonb NOT NULL DEFAULT '[]'::jsonb,
  imagery_direction text,
  tone text,
  terminology jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience text,
  cta_style text,
  inferred_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, version)
);
GRANT ALL ON public.company_brand_contexts TO service_role;
ALTER TABLE public.company_brand_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand ctx service only" ON public.company_brand_contexts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.golden_report_companies(id) ON DELETE CASCADE,
  archive_id uuid REFERENCES public.golden_report_archive(id) ON DELETE SET NULL,
  scan_id uuid NOT NULL REFERENCES public.forensic_scans(id) ON DELETE CASCADE,
  blueprint_id uuid REFERENCES public.golden_system_blueprints(id) ON DELETE SET NULL,
  system_version integer NOT NULL DEFAULT 1,
  template_version text NOT NULL DEFAULT 'aetheris-company-system-1',
  source_report_hash text NOT NULL,
  brand_context_id uuid REFERENCES public.company_brand_contexts(id) ON DELETE SET NULL,
  brand_version integer,
  tier text NOT NULL DEFAULT 'diagnostic',
  status text NOT NULL DEFAULT 'draft',
  approval_state text NOT NULL DEFAULT 'draft',
  approved_by text,
  approved_at timestamptz,
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
  rep_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scan_id, source_report_hash, template_version)
);
GRANT ALL ON public.company_systems TO service_role;
ALTER TABLE public.company_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "systems service only" ON public.company_systems FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_company_systems_company ON public.company_systems(company_id);
CREATE INDEX IF NOT EXISTS idx_company_systems_rep ON public.company_systems(rep_code);

CREATE TABLE IF NOT EXISTS public.company_system_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  module_name text NOT NULL,
  route text,
  category text,
  required_tier text,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  root_cause_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  lock_reason text,
  gap_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, module_id)
);
GRANT ALL ON public.company_system_modules TO service_role;
ALTER TABLE public.company_system_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system modules service only" ON public.company_system_modules FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_system_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  from_module text NOT NULL,
  to_module text NOT NULL,
  payload text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, from_module, to_module, payload)
);
GRANT ALL ON public.company_system_connections TO service_role;
ALTER TABLE public.company_system_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system connections service only" ON public.company_system_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_system_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  root_cause_id text,
  module_id text,
  title text NOT NULL,
  classification text,
  baseline text,
  kpi text,
  target text,
  owner_role text,
  priority integer NOT NULL DEFAULT 3,
  review_cadence text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.company_system_goals TO service_role;
ALTER TABLE public.company_system_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system goals service only" ON public.company_system_goals FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_system_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.company_system_goals(id) ON DELETE SET NULL,
  module_id text,
  name text NOT NULL,
  evidence_basis text,
  threshold text,
  alert text,
  last_status text,
  last_run_at timestamptz,
  last_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.company_system_checks TO service_role;
ALTER TABLE public.company_system_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system checks service only" ON public.company_system_checks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.company_system_goals(id) ON DELETE SET NULL,
  metric_key text NOT NULL,
  label text,
  value numeric,
  unit text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.company_system_metrics TO service_role;
ALTER TABLE public.company_system_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system metrics service only" ON public.company_system_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_system_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  basis text,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  canonical_annual_low bigint,
  canonical_annual_high bigint,
  currency text NOT NULL DEFAULT 'USD',
  scenarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.company_system_forecasts TO service_role;
ALTER TABLE public.company_system_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system forecasts service only" ON public.company_system_forecasts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  company_id uuid,
  scan_id uuid,
  actor text,
  actor_role text,
  kind text NOT NULL,
  module_id text,
  action_id text,
  input jsonb,
  preview jsonb,
  result jsonb,
  status text NOT NULL DEFAULT 'logged',
  error_message text,
  rollback_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.company_system_events TO service_role;
ALTER TABLE public.company_system_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system events service only" ON public.company_system_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_company_system_events_system ON public.company_system_events(system_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.company_system_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.golden_report_companies(id) ON DELETE CASCADE,
  scan_id uuid REFERENCES public.forensic_scans(id) ON DELETE CASCADE,
  system_id uuid REFERENCES public.company_systems(id) ON DELETE CASCADE,
  scope text NOT NULL,
  memory_key text NOT NULL,
  value text NOT NULL,
  provenance text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  status text NOT NULL DEFAULT 'inferred',
  sensitivity text NOT NULL DEFAULT 'low',
  author text,
  last_verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.company_system_memory TO service_role;
ALTER TABLE public.company_system_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system memory service only" ON public.company_system_memory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_memory_key
  ON public.company_system_memory (company_id, scope, memory_key, COALESCE(system_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(scan_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_company_memory_scope ON public.company_system_memory(company_id, scope, status);

CREATE TRIGGER trg_universe_module_registry_updated BEFORE UPDATE ON public.universe_module_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_company_brand_contexts_updated BEFORE UPDATE ON public.company_brand_contexts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_company_systems_updated BEFORE UPDATE ON public.company_systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_company_system_modules_updated BEFORE UPDATE ON public.company_system_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_company_system_goals_updated BEFORE UPDATE ON public.company_system_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_company_system_checks_updated BEFORE UPDATE ON public.company_system_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_company_system_memory_updated BEFORE UPDATE ON public.company_system_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();