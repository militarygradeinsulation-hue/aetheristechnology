-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- TOKEN ENCRYPTION HELPERS
-- AES via pgcrypto, key sourced from Postgres GUC `app.hubspot_token_key`
-- which we set from the edge function (Deno) using SET LOCAL before calling.
-- For simplicity, helpers accept the key as an argument so edge functions
-- pass the secret directly. Functions are SECURITY DEFINER but REVOKEd from
-- public so only service_role can call them.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.encrypt_token(_plaintext text, _key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _plaintext IS NULL OR _key IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(
    pgp_sym_encrypt(_plaintext, _key, 'cipher-algo=aes256'),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_token(_ciphertext text, _key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _ciphertext IS NULL OR _key IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(decode(_ciphertext, 'base64'), _key);
END;
$$;

REVOKE ALL ON FUNCTION public.encrypt_token(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_token(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_token(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_token(text, text) TO service_role;

-- ============================================================================
-- ACCOUNTS (one per user)
-- ============================================================================
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  hubspot_portal_id TEXT,
  hubspot_refresh_token_encrypted TEXT,
  hubspot_access_token_encrypted TEXT,
  hubspot_access_token_expires_at TIMESTAMPTZ,
  hubspot_connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  sync_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Users can read their own account row
CREATE POLICY "Users view their own account"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own account row (one-time on signup)
CREATE POLICY "Users insert their own account"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own account row (limited; sync writes go through service role)
CREATE POLICY "Users update their own account"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MIRROR: CONTACTS
-- ============================================================================
CREATE TABLE public.mirror_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  hubspot_id TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  lifecycle_stage TEXT,
  lead_status TEXT,
  owner_id TEXT,
  created_date TIMESTAMPTZ,
  last_activity_date TIMESTAMPTZ,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, hubspot_id)
);

CREATE INDEX idx_mirror_contacts_account ON public.mirror_contacts(account_id);
CREATE INDEX idx_mirror_contacts_lifecycle ON public.mirror_contacts(account_id, lifecycle_stage);
CREATE INDEX idx_mirror_contacts_owner ON public.mirror_contacts(account_id, owner_id);

ALTER TABLE public.mirror_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own contacts"
  ON public.mirror_contacts FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================================================
-- MIRROR: DEALS
-- ============================================================================
CREATE TABLE public.mirror_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  hubspot_id TEXT NOT NULL,
  deal_name TEXT,
  amount NUMERIC,
  stage TEXT,
  pipeline TEXT,
  close_date TIMESTAMPTZ,
  owner_id TEXT,
  created_date TIMESTAMPTZ,
  last_activity_date TIMESTAMPTZ,
  days_in_current_stage INTEGER,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, hubspot_id)
);

CREATE INDEX idx_mirror_deals_account ON public.mirror_deals(account_id);
CREATE INDEX idx_mirror_deals_stage ON public.mirror_deals(account_id, stage);
CREATE INDEX idx_mirror_deals_owner ON public.mirror_deals(account_id, owner_id);

ALTER TABLE public.mirror_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own deals"
  ON public.mirror_deals FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================================================
-- MIRROR: ENGAGEMENTS
-- ============================================================================
CREATE TABLE public.mirror_engagements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  hubspot_id TEXT NOT NULL,
  contact_id TEXT,
  deal_id TEXT,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, hubspot_id, type)
);

CREATE INDEX idx_mirror_engagements_account ON public.mirror_engagements(account_id);
CREATE INDEX idx_mirror_engagements_contact ON public.mirror_engagements(account_id, contact_id);
CREATE INDEX idx_mirror_engagements_deal ON public.mirror_engagements(account_id, deal_id);
CREATE INDEX idx_mirror_engagements_timestamp ON public.mirror_engagements(account_id, timestamp DESC);

ALTER TABLE public.mirror_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own engagements"
  ON public.mirror_engagements FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================================================
-- MIRROR: OWNERS
-- ============================================================================
CREATE TABLE public.mirror_owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  hubspot_id TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, hubspot_id)
);

CREATE INDEX idx_mirror_owners_account ON public.mirror_owners(account_id);

ALTER TABLE public.mirror_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own owners"
  ON public.mirror_owners FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));
