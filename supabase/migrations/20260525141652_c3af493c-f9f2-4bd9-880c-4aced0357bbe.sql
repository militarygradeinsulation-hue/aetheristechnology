CREATE TABLE public.linkedin_reply_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('text','image')),
  post_text text,
  image_url text,
  storage_path text,
  post_summary text,
  stance text,
  rationale text,
  preset_labels text[] DEFAULT '{}'::text[],
  extra_context text,
  generated_reply text NOT NULL,
  mode text NOT NULL DEFAULT 'brief',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_linkedin_reply_library_rep ON public.linkedin_reply_library (rep_code, created_at DESC);

ALTER TABLE public.linkedin_reply_library ENABLE ROW LEVEL SECURITY;

-- No public policies: access only via service-role edge functions.

CREATE TRIGGER update_linkedin_reply_library_updated_at
BEFORE UPDATE ON public.linkedin_reply_library
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();