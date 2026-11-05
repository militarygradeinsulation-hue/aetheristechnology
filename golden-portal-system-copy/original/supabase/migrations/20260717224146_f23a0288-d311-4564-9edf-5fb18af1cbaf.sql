
CREATE TABLE public.linkedin_comment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url TEXT,
  post_author TEXT,
  post_context TEXT,
  draft_text TEXT NOT NULL,
  tone TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.linkedin_comment_drafts TO service_role;
ALTER TABLE public.linkedin_comment_drafts ENABLE ROW LEVEL SECURITY;
-- No policies: table is admin-only via edge function using service_role.

CREATE INDEX idx_licd_status ON public.linkedin_comment_drafts(status, created_at DESC);

CREATE TRIGGER update_licd_updated_at
  BEFORE UPDATE ON public.linkedin_comment_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
