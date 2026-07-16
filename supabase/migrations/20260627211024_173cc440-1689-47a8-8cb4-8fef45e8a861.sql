
CREATE TABLE IF NOT EXISTS public.tool_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  company TEXT,
  rep_code TEXT,
  tool_slug TEXT NOT NULL,
  tool_title TEXT,
  source TEXT,
  user_agent TEXT,
  visit_count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tool_leads_email_tool_uidx
  ON public.tool_leads (lower(email), tool_slug);
CREATE INDEX IF NOT EXISTS tool_leads_rep_code_idx ON public.tool_leads (rep_code);
CREATE INDEX IF NOT EXISTS tool_leads_last_seen_idx ON public.tool_leads (last_seen DESC);

GRANT INSERT ON public.tool_leads TO anon, authenticated;
GRANT ALL ON public.tool_leads TO service_role;

ALTER TABLE public.tool_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert tool leads"
  ON public.tool_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE TRIGGER tool_leads_updated_at
  BEFORE UPDATE ON public.tool_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
