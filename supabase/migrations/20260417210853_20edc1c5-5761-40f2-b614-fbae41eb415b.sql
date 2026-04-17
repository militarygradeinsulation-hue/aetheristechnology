
-- ============== ENUMS ==============
DO $$ BEGIN
  CREATE TYPE public.crm_deal_stage AS ENUM ('lead','qualified','proposal','won','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_interaction_type AS ENUM ('call','email','meeting','note','form','task');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== COMPANIES ==============
CREATE TABLE IF NOT EXISTS public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  industry text,
  size text,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage companies" ON public.crm_companies
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages companies" ON public.crm_companies
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_crm_companies_updated
  BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== CONTACTS ==============
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  title text,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  owner text,
  tags text[] DEFAULT '{}',
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON public.crm_contacts(lower(email));
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON public.crm_contacts(company_id);
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contacts" ON public.crm_contacts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages contacts" ON public.crm_contacts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_crm_contacts_updated
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== DEALS ==============
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  value_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  stage public.crm_deal_stage NOT NULL DEFAULT 'lead',
  expected_close_date date,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON public.crm_deals(stage);
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage deals" ON public.crm_deals
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages deals" ON public.crm_deals
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_crm_deals_updated
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== INTERACTIONS ==============
CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  type public.crm_interaction_type NOT NULL DEFAULT 'note',
  subject text,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact ON public.crm_interactions(contact_id, occurred_at DESC);
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage interactions" ON public.crm_interactions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages interactions" ON public.crm_interactions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============== DEMO DATA ==============
CREATE TABLE IF NOT EXISTS public.crm_demo_data (
  id integer PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_demo_singleton CHECK (id = 1)
);
ALTER TABLE public.crm_demo_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view demo data" ON public.crm_demo_data
  FOR SELECT USING (true);
CREATE POLICY "Admins manage demo data" ON public.crm_demo_data
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages demo data" ON public.crm_demo_data
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Seed the demo data
INSERT INTO public.crm_demo_data (id, data) VALUES (1, '{
  "companies": [
    {"id":"c1","name":"Northpoint Logistics","website":"northpoint.example","industry":"Logistics","size":"50-200","location":"Indianapolis, IN"},
    {"id":"c2","name":"Helix Medical Group","website":"helixmed.example","industry":"Healthcare","size":"200-500","location":"Carmel, IN"},
    {"id":"c3","name":"Forge & Steel Manufacturing","website":"forgesteel.example","industry":"Manufacturing","size":"50-200","location":"Fishers, IN"},
    {"id":"c4","name":"Beacon Wealth Partners","website":"beaconwealth.example","industry":"Finance","size":"10-50","location":"Indianapolis, IN"},
    {"id":"c5","name":"Vertex SaaS","website":"vertexsaas.example","industry":"SaaS","size":"10-50","location":"Bloomington, IN"}
  ],
  "contacts": [
    {"id":"p1","company_id":"c1","full_name":"Marcus Reilly","title":"VP Operations","email":"marcus@northpoint.example","phone":"+1 317-555-0142","tags":["hot","decision-maker"],"source":"Inbound form"},
    {"id":"p2","company_id":"c2","full_name":"Dr. Sasha Lin","title":"Chief of Staff","email":"sasha@helixmed.example","phone":"+1 317-555-0188","tags":["qualified"],"source":"Diagnostic Quiz"},
    {"id":"p3","company_id":"c3","full_name":"Eli Vance","title":"COO","email":"eli@forgesteel.example","phone":"+1 317-555-0211","tags":["nurture"],"source":"Outbound"},
    {"id":"p4","company_id":"c4","full_name":"Priya Anand","title":"Managing Partner","email":"priya@beaconwealth.example","phone":"+1 317-555-0307","tags":["hot"],"source":"Referral"},
    {"id":"p5","company_id":"c5","full_name":"Jordan Webb","title":"Founder","email":"jordan@vertexsaas.example","phone":"+1 317-555-0399","tags":["proposal-out"],"source":"Website Scan"},
    {"id":"p6","company_id":"c1","full_name":"Kendra Hayes","title":"Logistics Manager","email":"kendra@northpoint.example","tags":["champion"],"source":"Inbound form"}
  ],
  "deals": [
    {"id":"d1","title":"Northpoint — Autonomous Workforce Pilot","contact_id":"p1","company_id":"c1","value_cents":4500000,"stage":"proposal","expected_close_date":"2026-05-15"},
    {"id":"d2","title":"Helix — 14-Day Diagnostic","contact_id":"p2","company_id":"c2","value_cents":750000,"stage":"qualified","expected_close_date":"2026-04-30"},
    {"id":"d3","title":"Forge & Steel — AI Readiness","contact_id":"p3","company_id":"c3","value_cents":1200000,"stage":"lead","expected_close_date":"2026-06-10"},
    {"id":"d4","title":"Beacon Wealth — Strategy Retainer","contact_id":"p4","company_id":"c4","value_cents":2400000,"stage":"won","expected_close_date":"2026-03-28"},
    {"id":"d5","title":"Vertex SaaS — Custom Playbook Bundle","contact_id":"p5","company_id":"c5","value_cents":680000,"stage":"proposal","expected_close_date":"2026-05-02"},
    {"id":"d6","title":"Old Lead — Atlas Foods","value_cents":300000,"stage":"lost","expected_close_date":"2026-02-12"}
  ],
  "interactions": [
    {"id":"i1","contact_id":"p1","type":"meeting","subject":"Discovery call","body":"Walked through current dispatch bottlenecks. Strong fit for Autonomous Workforce.","occurred_at":"2026-04-10T15:00:00Z"},
    {"id":"i2","contact_id":"p1","type":"email","subject":"Sent proposal v2","body":"Tightened pricing on the pilot scope.","occurred_at":"2026-04-12T18:32:00Z"},
    {"id":"i3","contact_id":"p2","type":"form","subject":"Submitted Business Diagnostic","body":"Score 72/100. Top gap: lead routing.","occurred_at":"2026-04-08T12:14:00Z"},
    {"id":"i4","contact_id":"p4","type":"call","subject":"Closed retainer","body":"Verbal yes. Contract sent.","occurred_at":"2026-04-14T20:05:00Z"},
    {"id":"i5","contact_id":"p5","type":"note","subject":"Champion warm — needs CFO buy-in","occurred_at":"2026-04-15T13:45:00Z"},
    {"id":"i6","contact_id":"p3","type":"email","subject":"Cold outbound #1","body":"Opened, no reply. Schedule follow-up.","occurred_at":"2026-04-09T16:00:00Z"}
  ]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
