CREATE TABLE IF NOT EXISTS public.company_system_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  actor text NOT NULL,
  actor_role text NOT NULL,
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  action_id text NOT NULL,
  input_hash text NOT NULL,
  source_report_hash text NOT NULL,
  system_version integer NOT NULL DEFAULT 1,
  affects jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.company_system_confirmations TO service_role;
ALTER TABLE public.company_system_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confirmations service only"
  ON public.company_system_confirmations FOR ALL
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_csc_system ON public.company_system_confirmations(system_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csc_open ON public.company_system_confirmations(expires_at) WHERE consumed_at IS NULL;

ALTER TABLE public.company_systems ADD COLUMN IF NOT EXISTS system_version integer NOT NULL DEFAULT 1;