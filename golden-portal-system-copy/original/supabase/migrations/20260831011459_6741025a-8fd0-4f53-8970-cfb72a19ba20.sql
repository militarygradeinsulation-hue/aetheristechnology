CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name TEXT NOT NULL,
  partner_slug TEXT NOT NULL UNIQUE,
  label TEXT,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  daily_scan_limit INTEGER NOT NULL DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_api_scans (
  scan_id UUID NOT NULL PRIMARY KEY,
  partner_key_id UUID NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  target_url TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_api_scans_key_created_idx
  ON public.partner_api_scans (partner_key_id, created_at DESC);

GRANT ALL ON public.partner_api_keys TO service_role;
GRANT ALL ON public.partner_api_scans TO service_role;

ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages partner api keys"
  ON public.partner_api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages partner api scans"
  ON public.partner_api_scans FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.partner_api_keys (partner_name, partner_slug, label, key_hash, key_prefix, daily_scan_limit)
VALUES (
  'YourBrain Technology',
  'yourbrain',
  'yourbrain.technology production key',
  '75fd55847bbfae79ba1ec608346c50e731319944eb435e1d8a61de76f26c7234',
  'arp_live_75031fa',
  100
)
ON CONFLICT (partner_slug) DO NOTHING;