
CREATE TABLE public.access_codes (
  code text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE UNIQUE INDEX access_codes_email_unique ON public.access_codes (lower(email));

GRANT ALL ON public.access_codes TO service_role;

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies — all reads/writes go through edge functions using service_role.
