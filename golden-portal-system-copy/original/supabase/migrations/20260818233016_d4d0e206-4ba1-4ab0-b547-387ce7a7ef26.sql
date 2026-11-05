ALTER TABLE public.company_systems
  ADD COLUMN IF NOT EXISTS previous_system_id uuid REFERENCES public.company_systems(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provisioning_state text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provisioning_error text,
  ADD COLUMN IF NOT EXISTS provisioned_at timestamptz;

CREATE INDEX IF NOT EXISTS company_systems_company_version_idx
  ON public.company_systems (company_id, system_version DESC);

CREATE UNIQUE INDEX IF NOT EXISTS company_system_memory_ident_idx
  ON public.company_system_memory (company_id, scope, memory_key, system_id, scan_id) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX IF NOT EXISTS golden_system_blueprints_ident_idx
  ON public.golden_system_blueprints (scan_id, source_report_hash, template_version, blueprint_version);

CREATE INDEX IF NOT EXISTS golden_report_findings_index_scan_idx
  ON public.golden_report_findings_index (scan_id);