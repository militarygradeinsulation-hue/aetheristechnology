
-- Settings table (single row, id='default')
CREATE TABLE IF NOT EXISTS public.forecast_settings (
  id text PRIMARY KEY DEFAULT 'default',
  is_active boolean NOT NULL DEFAULT true,
  refresh_cadence_minutes integer NOT NULL DEFAULT 1440,
  web_window text NOT NULL DEFAULT 'w',
  topic_queries jsonb NOT NULL DEFAULT '[]'::jsonb,
  industry_presets jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources jsonb NOT NULL DEFAULT '{"aetheris_blog":true,"aetheris_playbooks":true,"web":true}'::jsonb,
  sections jsonb NOT NULL DEFAULT '{"tip":true,"education":true,"tech":true,"industry":true,"live_pulse":true,"companies":true}'::jsonb,
  education_pool jsonb NOT NULL DEFAULT '[]'::jsonb,
  live_pulse_minutes integer NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forecast_settings_single_row CHECK (id = 'default'),
  CONSTRAINT forecast_settings_window_chk CHECK (web_window IN ('h','d','w','m')),
  CONSTRAINT forecast_settings_cadence_chk CHECK (refresh_cadence_minutes >= 30),
  CONSTRAINT forecast_settings_pulse_chk CHECK (live_pulse_minutes >= 5)
);

ALTER TABLE public.forecast_settings ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only access via edge functions.

CREATE TRIGGER trg_forecast_settings_updated_at
BEFORE UPDATE ON public.forecast_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the single config row with defaults + initial topic queries + industry presets.
INSERT INTO public.forecast_settings (id, topic_queries, industry_presets)
VALUES (
  'default',
  '[
    {"id":"q1","label":"Indy SMB Hiring","query":"Indianapolis Indiana SMB hiring expansion announcement last week","enabled":true},
    {"id":"q2","label":"Indy Funding","query":"Indianapolis small business funding raise acquisition this week","enabled":true},
    {"id":"q3","label":"AI/CRM Trend","query":"AI tools small business CRM automation trend this week","enabled":true},
    {"id":"q4","label":"CRM Releases","query":"HubSpot Salesforce Pipedrive update release notes this week","enabled":true},
    {"id":"q5","label":"Indy Verticals","query":"Indianapolis roofing HVAC dental medspa law firm growth news","enabled":true}
  ]'::jsonb,
  '[
    {"id":"roofing","label":"Roofing","queries":["Indianapolis roofing storm damage news","Indiana roofing license renewal trends"]},
    {"id":"hvac","label":"HVAC","queries":["Indianapolis HVAC install hiring surge","Indiana HVAC tax credit changes"]},
    {"id":"dental","label":"Dental / Med Spa","queries":["Indianapolis dental DSO acquisition","Med spa Indiana opening"]},
    {"id":"law","label":"Law","queries":["Indianapolis law firm hiring associates","Indiana legal tech adoption"]},
    {"id":"saas","label":"SaaS","queries":["Indianapolis SaaS Series A funding","Indy startup product launch"]},
    {"id":"ai_crm","label":"AI / CRM","queries":["AI tools small business CRM automation trend this week","HubSpot Salesforce Pipedrive update release notes this week"]},
    {"id":"indy_pulse","label":"Indy SMB Pulse","queries":["Indianapolis Indiana SMB hiring expansion announcement last week","Indianapolis small business funding raise acquisition this week"]}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Extend briefings table
ALTER TABLE public.forecast_briefings
  ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS live_pulse jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS settings_snapshot jsonb;
