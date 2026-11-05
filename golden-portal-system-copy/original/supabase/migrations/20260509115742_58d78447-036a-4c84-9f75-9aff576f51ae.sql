ALTER TABLE public.careers_applications
ADD COLUMN IF NOT EXISTS resume_text text,
ADD COLUMN IF NOT EXISTS resume_html text,
ADD COLUMN IF NOT EXISTS resume_extract_method text,
ADD COLUMN IF NOT EXISTS resume_extract_error text,
ADD COLUMN IF NOT EXISTS resume_recreated_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_careers_applications_resume_recreated_at
ON public.careers_applications (resume_recreated_at);