CREATE TABLE public.rep_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_code TEXT NOT NULL,
  rep_name TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  admin_reply TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.rep_ideas TO service_role;

ALTER TABLE public.rep_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to rep_ideas"
  ON public.rep_ideas FOR ALL
  USING (false) WITH CHECK (false);

CREATE INDEX idx_rep_ideas_code ON public.rep_ideas(rep_code);
CREATE INDEX idx_rep_ideas_status ON public.rep_ideas(status);
CREATE INDEX idx_rep_ideas_created ON public.rep_ideas(created_at DESC);

CREATE TRIGGER update_rep_ideas_updated_at
  BEFORE UPDATE ON public.rep_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();