
-- Create drip_prospects table
CREATE TABLE public.drip_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  business_name TEXT,
  website_url TEXT,
  industry TEXT,
  location TEXT,
  scraped_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drip_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage drip_prospects"
  ON public.drip_prospects FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view drip_prospects"
  ON public.drip_prospects FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX idx_drip_prospects_status ON public.drip_prospects (status);
CREATE INDEX idx_drip_prospects_email ON public.drip_prospects (email);

-- Create drip_sequences table
CREATE TABLE public.drip_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drip_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage drip_sequences"
  ON public.drip_sequences FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view drip_sequences"
  ON public.drip_sequences FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Create drip_emails table
CREATE TABLE public.drip_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.drip_prospects(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  subject TEXT,
  body_html TEXT,
  outlook_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drip_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage drip_emails"
  ON public.drip_emails FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view drip_emails"
  ON public.drip_emails FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX idx_drip_emails_scheduled ON public.drip_emails (scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_drip_emails_prospect ON public.drip_emails (prospect_id);

-- Add updated_at triggers
CREATE TRIGGER update_drip_prospects_updated_at
  BEFORE UPDATE ON public.drip_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drip_sequences_updated_at
  BEFORE UPDATE ON public.drip_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
