
CREATE TABLE public.diagnostic_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  industry TEXT,
  company_size TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score INTEGER NOT NULL DEFAULT 0,
  category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostic_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert diagnostic leads"
ON public.diagnostic_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view diagnostic leads"
ON public.diagnostic_leads
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
