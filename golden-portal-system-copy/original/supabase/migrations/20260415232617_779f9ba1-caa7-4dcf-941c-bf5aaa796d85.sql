
-- Create enum for tool types
CREATE TYPE public.tool_type AS ENUM ('social_content', 'sales_scripts', 'content_calendar', 'follow_up_plan');

-- Create tool_generations table
CREATE TABLE public.tool_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  tool_type public.tool_type NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tier TEXT NOT NULL DEFAULT 'free',
  stripe_session_id TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tool_generations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert
CREATE POLICY "Anyone can insert tool generations"
ON public.tool_generations FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can view own generations
CREATE POLICY "Users can view own tool generations"
ON public.tool_generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role manages all
CREATE POLICY "Service role can manage tool generations"
ON public.tool_generations FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Index for faster lookups
CREATE INDEX idx_tool_generations_user_type ON public.tool_generations (user_id, tool_type);
