
ALTER TABLE public.rep_daily_checklist
  ADD COLUMN IF NOT EXISTS calls_made integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emails_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linkedin_dms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linkedin_comments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;
