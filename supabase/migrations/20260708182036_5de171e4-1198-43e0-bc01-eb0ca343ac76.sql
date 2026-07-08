
CREATE TABLE public.tool_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  email text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('single','triple','unlimited')),
  tool_ids text[] NOT NULL DEFAULT '{}',
  stripe_session_id text,
  amount_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX idx_tool_licenses_email ON public.tool_licenses(lower(email));
GRANT ALL ON public.tool_licenses TO service_role;
ALTER TABLE public.tool_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc licenses" ON public.tool_licenses FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.tool_free_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tool_id text NOT NULL,
  runs_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, tool_id)
);
GRANT ALL ON public.tool_free_runs TO service_role;
ALTER TABLE public.tool_free_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc free runs" ON public.tool_free_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.tool_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_code text NOT NULL REFERENCES public.tool_licenses(code) ON DELETE CASCADE,
  tool_id text NOT NULL,
  memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (license_code, tool_id)
);
GRANT ALL ON public.tool_memory TO service_role;
ALTER TABLE public.tool_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc memory" ON public.tool_memory FOR ALL TO service_role USING (true) WITH CHECK (true);
