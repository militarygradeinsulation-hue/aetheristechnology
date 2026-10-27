ALTER TABLE public.forensic_scans
  ADD COLUMN IF NOT EXISTS private_intake boolean NOT NULL DEFAULT false;