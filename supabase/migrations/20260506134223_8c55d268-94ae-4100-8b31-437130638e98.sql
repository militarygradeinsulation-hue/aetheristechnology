-- Admin Documents area: AI-generated legal/policy docs the admin maintains for reps to sign.
CREATE TABLE IF NOT EXISTS public.admin_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'general',
  prompt TEXT,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  require_signature BOOLEAN NOT NULL DEFAULT true,
  visible_to TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_documents ENABLE ROW LEVEL SECURITY;
-- Service-role only (admin edge functions). No public policies.

CREATE TABLE IF NOT EXISTS public.admin_document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.admin_documents(id) ON DELETE CASCADE,
  rep_code TEXT NOT NULL,
  rep_name TEXT,
  typed_signature TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(document_id, rep_code)
);

ALTER TABLE public.admin_document_signatures ENABLE ROW LEVEL SECURITY;
-- Service-role only.

CREATE INDEX IF NOT EXISTS idx_admin_documents_status ON public.admin_documents(status);
CREATE INDEX IF NOT EXISTS idx_admin_doc_signatures_doc ON public.admin_document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_admin_doc_signatures_rep ON public.admin_document_signatures(rep_code);

CREATE TRIGGER admin_documents_updated_at
BEFORE UPDATE ON public.admin_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();