CREATE TABLE public.admin_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  client_company text,
  client_contact text,
  client_email text,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  sow_title text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  catalog_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicated_from uuid,
  created_by text NOT NULL DEFAULT 'admin',
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_quotes TO service_role;
ALTER TABLE public.admin_quotes ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: only the admin-quotes function (service role, admin token verified) can access.
CREATE INDEX admin_quotes_updated_idx ON public.admin_quotes (updated_at DESC);
CREATE TRIGGER admin_quotes_updated_at BEFORE UPDATE ON public.admin_quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();