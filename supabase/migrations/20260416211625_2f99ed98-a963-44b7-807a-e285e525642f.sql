-- Admin personal library: stores all tool generations from /admin Tools tab
CREATE TABLE public.admin_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_type text NOT NULL,
  title text NOT NULL,
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_library ENABLE ROW LEVEL SECURITY;

-- Service role only — all access goes through the admin-library edge function
-- which validates the admin passcode on every call.
CREATE POLICY "Service role can manage admin library"
ON public.admin_library
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_admin_library_created_at ON public.admin_library (created_at DESC);
CREATE INDEX idx_admin_library_tool_type ON public.admin_library (tool_type);