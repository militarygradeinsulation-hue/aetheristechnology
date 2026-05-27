ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS toc text[] DEFAULT '{}'::text[];

UPDATE public.playbooks
SET summary = description
WHERE summary IS NULL OR summary = '';