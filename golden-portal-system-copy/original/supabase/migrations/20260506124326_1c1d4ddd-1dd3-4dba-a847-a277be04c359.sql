CREATE TABLE IF NOT EXISTS public.admin_kv (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_kv ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access admin_kv" ON public.admin_kv FOR SELECT USING (false);