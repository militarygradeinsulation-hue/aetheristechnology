CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.golden_report_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  primary_domain text,
  website_url text,
  aliases text[] NOT NULL DEFAULT '{}',
  industry text,
  location text,
  business_summary text,
  summary_source text NOT NULL DEFAULT 'pending',
  summary_generated_at timestamptz,
  contact_names text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX golden_report_companies_domain_key
  ON public.golden_report_companies (primary_domain) WHERE primary_domain IS NOT NULL;
CREATE UNIQUE INDEX golden_report_companies_name_key
  ON public.golden_report_companies (normalized_name) WHERE primary_domain IS NULL;
CREATE INDEX golden_report_companies_name_trgm
  ON public.golden_report_companies USING gin (display_name gin_trgm_ops);
CREATE INDEX golden_report_companies_domain_trgm
  ON public.golden_report_companies USING gin (coalesce(primary_domain,'') gin_trgm_ops);
CREATE INDEX golden_report_companies_summary_trgm
  ON public.golden_report_companies USING gin (coalesce(business_summary,'') gin_trgm_ops);

GRANT ALL ON public.golden_report_companies TO service_role;
ALTER TABLE public.golden_report_companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.golden_report_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.golden_report_companies(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL UNIQUE REFERENCES public.forensic_scans(id) ON DELETE CASCADE,
  report_version integer NOT NULL DEFAULT 1,
  report_state text,
  is_valid boolean NOT NULL DEFAULT false,
  target_url text,
  raw_company_name text,
  report_source text,
  portal_source text,
  rep_code text,
  creator_name text,
  creator_email text,
  annual_low numeric,
  annual_high numeric,
  currency text NOT NULL DEFAULT 'USD',
  leak_count integer NOT NULL DEFAULT 0,
  finding_count integer NOT NULL DEFAULT 0,
  root_cause_count integer NOT NULL DEFAULT 0,
  score numeric,
  grade text,
  executive_summary text,
  top_priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_leaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_hash text,
  compiler_version text,
  financial_model_version integer,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX golden_report_archive_company ON public.golden_report_archive (company_id, completed_at DESC);
CREATE INDEX golden_report_archive_completed ON public.golden_report_archive (completed_at DESC);
CREATE INDEX golden_report_archive_rep ON public.golden_report_archive (rep_code);
CREATE INDEX golden_report_archive_source ON public.golden_report_archive (report_source);
CREATE INDEX golden_report_archive_state ON public.golden_report_archive (report_state);
CREATE INDEX golden_report_archive_summary_trgm
  ON public.golden_report_archive USING gin (coalesce(executive_summary,'') gin_trgm_ops);
CREATE INDEX golden_report_archive_url_trgm
  ON public.golden_report_archive USING gin (coalesce(target_url,'') gin_trgm_ops);

GRANT ALL ON public.golden_report_archive TO service_role;
ALTER TABLE public.golden_report_archive ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.golden_report_findings_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id uuid NOT NULL REFERENCES public.golden_report_archive(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES public.forensic_scans(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.golden_report_companies(id) ON DELETE CASCADE,
  finding_key text NOT NULL,
  title text NOT NULL,
  detail text,
  category text,
  chapter_slug text,
  root_cause_id text,
  root_cause_title text,
  evidence_grade text,
  priority integer,
  leak_ref text,
  annual_low numeric,
  annual_high numeric,
  recommended_action text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX golden_findings_unique ON public.golden_report_findings_index (archive_id, finding_key);
CREATE INDEX golden_findings_company ON public.golden_report_findings_index (company_id);
CREATE INDEX golden_findings_title_trgm
  ON public.golden_report_findings_index USING gin (title gin_trgm_ops);

GRANT ALL ON public.golden_report_findings_index TO service_role;
ALTER TABLE public.golden_report_findings_index ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.golden_system_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id uuid NOT NULL REFERENCES public.golden_report_archive(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES public.forensic_scans(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.golden_report_companies(id) ON DELETE CASCADE,
  blueprint_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'queued',
  source_report_hash text NOT NULL,
  template_version text NOT NULL,
  ai_provider text,
  ai_model text,
  output_json jsonb,
  output_markdown text,
  master_prompt text,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_passed boolean NOT NULL DEFAULT false,
  error_message text,
  approval_state text NOT NULL DEFAULT 'draft',
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX golden_blueprints_idempotent
  ON public.golden_system_blueprints (scan_id, source_report_hash, template_version);
CREATE INDEX golden_blueprints_archive ON public.golden_system_blueprints (archive_id, created_at DESC);

GRANT ALL ON public.golden_system_blueprints TO service_role;
ALTER TABLE public.golden_system_blueprints ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER golden_report_companies_updated_at BEFORE UPDATE ON public.golden_report_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER golden_report_archive_updated_at BEFORE UPDATE ON public.golden_report_archive
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER golden_system_blueprints_updated_at BEFORE UPDATE ON public.golden_system_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();