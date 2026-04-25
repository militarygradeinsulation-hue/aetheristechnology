
CREATE TABLE public.mirror_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  hubspot_id TEXT NOT NULL,
  name TEXT,
  domain TEXT,
  industry TEXT,
  owner_id TEXT,
  created_date TIMESTAMPTZ,
  last_activity_date TIMESTAMPTZ,
  num_employees INTEGER,
  annual_revenue NUMERIC,
  properties JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, hubspot_id)
);

CREATE INDEX idx_mirror_companies_account ON public.mirror_companies(account_id);

ALTER TABLE public.mirror_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own companies"
ON public.mirror_companies FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE TABLE public.mirror_deal_contacts (
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, deal_id, contact_id)
);

CREATE INDEX idx_mirror_deal_contacts_account ON public.mirror_deal_contacts(account_id);
CREATE INDEX idx_mirror_deal_contacts_contact ON public.mirror_deal_contacts(account_id, contact_id);

ALTER TABLE public.mirror_deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own deal-contact links"
ON public.mirror_deal_contacts FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE TABLE public.mirror_deal_companies (
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, deal_id, company_id)
);

CREATE INDEX idx_mirror_deal_companies_account ON public.mirror_deal_companies(account_id);
CREATE INDEX idx_mirror_deal_companies_company ON public.mirror_deal_companies(account_id, company_id);

ALTER TABLE public.mirror_deal_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own deal-company links"
ON public.mirror_deal_companies FOR SELECT
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));
