ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS best_for_who text,
  ADD COLUMN IF NOT EXISTS best_for_industries text[] DEFAULT '{}'::text[];