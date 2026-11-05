CREATE TABLE public.admin_generated_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prompt text NOT NULL,
  style_preset text NOT NULL DEFAULT 'forensic_dark',
  category text NOT NULL DEFAULT 'dashboard',
  tsx_code text NOT NULL,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_generated_components TO service_role;
ALTER TABLE public.admin_generated_components ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_admin_generated_components_updated
  BEFORE UPDATE ON public.admin_generated_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_agc_created_at ON public.admin_generated_components (created_at DESC);