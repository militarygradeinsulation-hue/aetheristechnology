
CREATE TABLE public.obsidian_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  source TEXT DEFAULT 'aetheris_home',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);
GRANT INSERT ON public.obsidian_waitlist TO anon, authenticated;
GRANT ALL ON public.obsidian_waitlist TO service_role;
ALTER TABLE public.obsidian_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join waitlist" ON public.obsidian_waitlist FOR INSERT TO anon, authenticated WITH CHECK (email IS NOT NULL AND length(email) < 320);
