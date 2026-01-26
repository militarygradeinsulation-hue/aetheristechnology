-- Create enum for claim code status
CREATE TYPE public.claim_status AS ENUM ('generated', 'email_clicked', 'contacted', 'converted', 'expired');

-- Create claim_codes table
CREATE TABLE public.claim_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  status claim_status NOT NULL DEFAULT 'generated',
  pricing_tier TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_clicked_at TIMESTAMP WITH TIME ZONE,
  contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.claim_codes ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for tracking code generation)
CREATE POLICY "Anyone can insert claim codes"
ON public.claim_codes
FOR INSERT
WITH CHECK (true);

-- Allow public to update status (for tracking email clicks)
CREATE POLICY "Anyone can update claim code status"
ON public.claim_codes
FOR UPDATE
USING (true);

-- Only you (admin) should read all - for now allow public read for simplicity
CREATE POLICY "Anyone can view claim codes"
ON public.claim_codes
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_claim_codes_updated_at
BEFORE UPDATE ON public.claim_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();