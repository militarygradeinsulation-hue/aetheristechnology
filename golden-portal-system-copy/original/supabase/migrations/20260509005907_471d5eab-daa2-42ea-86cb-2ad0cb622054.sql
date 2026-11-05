ALTER TABLE public.careers_applications
  ADD COLUMN IF NOT EXISTS contacted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz;