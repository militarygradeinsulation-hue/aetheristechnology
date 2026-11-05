
-- Create rep_codes table
CREATE TABLE public.rep_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  rep_name text NOT NULL DEFAULT '',
  rep_email text,
  commission_rate numeric NOT NULL DEFAULT 0.10,
  is_active boolean NOT NULL DEFAULT true,
  total_sales_cents integer NOT NULL DEFAULT 0,
  total_commission_cents integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rep_codes ENABLE ROW LEVEL SECURITY;

-- Admin read/write
CREATE POLICY "Admins can view rep codes"
  ON public.rep_codes FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update rep codes"
  ON public.rep_codes FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can insert rep codes"
  ON public.rep_codes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete rep codes"
  ON public.rep_codes FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Service role full access
CREATE POLICY "Service role can manage rep codes"
  ON public.rep_codes FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Allow anon to validate codes (SELECT only active codes)
CREATE POLICY "Anyone can validate rep codes"
  ON public.rep_codes FOR SELECT
  TO anon
  USING (is_active = true);

-- Add rep_code column to purchases
ALTER TABLE public.purchases ADD COLUMN rep_code text;

-- Pre-populate 10 codes
INSERT INTO public.rep_codes (code) VALUES
  ('482917'),
  ('739254'),
  ('156843'),
  ('624781'),
  ('895326'),
  ('317469'),
  ('568192'),
  ('743058'),
  ('281637'),
  ('964523');
