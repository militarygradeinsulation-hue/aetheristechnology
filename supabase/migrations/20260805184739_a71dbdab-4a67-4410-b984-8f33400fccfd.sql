-- Report state currently lives only inside the report JSON, so nothing can
-- gate on it cheaply. Generated columns keep it authoritative: the value is
-- always the report's own state and can never be set independently of it.
ALTER TABLE public.forensic_scans
  ADD COLUMN IF NOT EXISTS report_state text
    GENERATED ALWAYS AS (report ->> 'report_state') STORED;

ALTER TABLE public.forensic_scans
  ADD COLUMN IF NOT EXISTS financial_model_version integer
    GENERATED ALWAYS AS (
      NULLIF(report -> 'financial_ledger' ->> 'model_version', '')::integer
    ) STORED;

CREATE INDEX IF NOT EXISTS forensic_scans_report_state_idx
  ON public.forensic_scans (report_state)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS forensic_scans_financial_model_version_idx
  ON public.forensic_scans (financial_model_version)
  WHERE status = 'completed';