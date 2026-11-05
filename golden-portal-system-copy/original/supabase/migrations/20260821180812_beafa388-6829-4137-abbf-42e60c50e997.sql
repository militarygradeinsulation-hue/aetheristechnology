CREATE TABLE public.nexus_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_key text NOT NULL,
  owner_code text NOT NULL,
  owner_role text NOT NULL DEFAULT 'rep',
  title text NOT NULL DEFAULT 'New conversation',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_count integer NOT NULL DEFAULT 0,
  client_updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_code, thread_key)
);

CREATE INDEX idx_nexus_threads_owner ON public.nexus_threads (owner_code, client_updated_at DESC);

GRANT ALL ON public.nexus_threads TO service_role;
ALTER TABLE public.nexus_threads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_nexus_threads_updated_at
  BEFORE UPDATE ON public.nexus_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.substack_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_post_id uuid,
  source_urn text,
  source_kind text NOT NULL DEFAULT 'linkedin',
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  emailed_at timestamptz,
  email_to text,
  published_url text,
  published_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_substack_drafts_status ON public.substack_drafts (status, created_at DESC);
CREATE INDEX idx_substack_drafts_scheduled ON public.substack_drafts (scheduled_for) WHERE scheduled_for IS NOT NULL;

GRANT ALL ON public.substack_drafts TO service_role;
ALTER TABLE public.substack_drafts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_substack_drafts_updated_at
  BEFORE UPDATE ON public.substack_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();