CREATE TABLE IF NOT EXISTS public.outlook_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code TEXT NOT NULL UNIQUE REFERENCES public.rep_codes(code) ON DELETE CASCADE,
  outlook_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outlook_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- No public client policies: all access is via SECURITY DEFINER edge functions using service role.

CREATE INDEX IF NOT EXISTS idx_outlook_tokens_rep_code ON public.outlook_oauth_tokens(rep_code);

CREATE TRIGGER outlook_oauth_tokens_updated_at
BEFORE UPDATE ON public.outlook_oauth_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Short-lived OAuth state nonces to prevent CSRF in the OAuth dance
CREATE TABLE IF NOT EXISTS public.outlook_oauth_state (
  state TEXT PRIMARY KEY,
  rep_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);
ALTER TABLE public.outlook_oauth_state ENABLE ROW LEVEL SECURITY;