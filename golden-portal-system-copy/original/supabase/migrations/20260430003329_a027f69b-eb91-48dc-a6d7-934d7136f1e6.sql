-- 1. Add role column to rep_codes
ALTER TABLE public.rep_codes
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'rep'
    CHECK (role IN ('rep','partner'));

CREATE INDEX IF NOT EXISTS rep_codes_role_idx ON public.rep_codes(role);

-- 2. Seed the partner row (idempotent)
INSERT INTO public.rep_codes (code, rep_name, rep_email, commission_rate, is_active, role)
VALUES ('963169', 'Business Partner', 'partner@aetheris.technology', 0.10, true, 'partner')
ON CONFLICT (code) DO UPDATE
  SET role = EXCLUDED.role,
      rep_name = EXCLUDED.rep_name,
      is_active = true;