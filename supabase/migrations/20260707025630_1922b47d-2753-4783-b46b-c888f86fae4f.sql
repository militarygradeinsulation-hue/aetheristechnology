CREATE TABLE public.portal_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
GRANT SELECT ON public.portal_feature_flags TO anon, authenticated;
GRANT ALL ON public.portal_feature_flags TO service_role;
ALTER TABLE public.portal_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags readable by all" ON public.portal_feature_flags FOR SELECT USING (true);

CREATE TRIGGER update_portal_feature_flags_updated_at
BEFORE UPDATE ON public.portal_feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.portal_feature_flags (flag_key, label, description, enabled) VALUES
  ('instruments_tab', 'Instruments Tab', 'Show the 5 Instruments (Chaos Scan, Head-to-Head, Reciprocation, Golden Report, Aetheris IQ) in the rep portal', true),
  ('operator_console', 'Operator Console', 'Show the Operator Console tab (multi-tool cockpit mirroring the extension)', true),
  ('leads_board', 'Leads Board', 'Show the Leads workspace inside the rep portal', true),
  ('chaos_scan', 'Chaos Scan Tool', 'Enable Chaos Scan instrument', true),
  ('head_to_head', 'Head-to-Head Tool', 'Enable Head-to-Head instrument', true),
  ('reciprocation_engine', 'Reciprocation Engine', 'Enable Reciprocation Engine instrument', true),
  ('golden_report', 'Golden Report', 'Enable Golden Report instrument', true),
  ('aetheris_iq', 'Aetheris IQ', 'Enable Aetheris IQ instrument', true)
ON CONFLICT (flag_key) DO NOTHING;