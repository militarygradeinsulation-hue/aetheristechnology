CREATE UNIQUE INDEX IF NOT EXISTS golden_system_blueprints_idempotency_idx
  ON public.golden_system_blueprints (scan_id, source_report_hash, template_version);
CREATE INDEX IF NOT EXISTS golden_report_findings_index_title_trgm
  ON public.golden_report_findings_index USING gin (title gin_trgm_ops);