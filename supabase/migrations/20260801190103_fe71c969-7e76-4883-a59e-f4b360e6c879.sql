ALTER TABLE public.forensic_scans
  ADD COLUMN IF NOT EXISTS report_source TEXT NOT NULL DEFAULT 'unknown_legacy',
  ADD COLUMN IF NOT EXISTS creator_user_id UUID,
  ADD COLUMN IF NOT EXISTS creator_name TEXT,
  ADD COLUMN IF NOT EXISTS creator_email TEXT,
  ADD COLUMN IF NOT EXISTS creator_profile_id TEXT,
  ADD COLUMN IF NOT EXISTS portal_source TEXT,
  ADD COLUMN IF NOT EXISTS lead_name TEXT,
  ADD COLUMN IF NOT EXISTS lead_email TEXT,
  ADD COLUMN IF NOT EXISTS lead_phone TEXT,
  ADD COLUMN IF NOT EXISTS source_notified_at TIMESTAMPTZ;

UPDATE public.forensic_scans SET report_source = 'unknown_legacy' WHERE report_source IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'forensic_scans_report_source_check'
  ) THEN
    ALTER TABLE public.forensic_scans
      ADD CONSTRAINT forensic_scans_report_source_check
      CHECK (report_source IN ('public_website','rep_portal','partner_portal','admin_internal','unknown_legacy'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS forensic_scans_report_source_idx ON public.forensic_scans (report_source, created_at DESC);