
ALTER TABLE public.tool_licenses DROP CONSTRAINT IF EXISTS tool_licenses_plan_check;
ALTER TABLE public.tool_licenses ADD CONSTRAINT tool_licenses_plan_check
  CHECK (plan IN ('single','triple','unlimited','extension'));
ALTER TABLE public.tool_licenses ADD COLUMN IF NOT EXISTS brand_url text;
ALTER TABLE public.tool_licenses ADD COLUMN IF NOT EXISTS brand_tone text;
