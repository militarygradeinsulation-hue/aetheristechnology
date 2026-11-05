
CREATE TABLE public.rep_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  experience TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rep_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert rep signups"
ON public.rep_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view rep signups"
ON public.rep_signups
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
