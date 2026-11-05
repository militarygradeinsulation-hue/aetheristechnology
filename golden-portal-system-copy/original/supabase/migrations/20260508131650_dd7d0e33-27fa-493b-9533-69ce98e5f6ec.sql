
-- Onboarding modules: one row per training module
CREATE TABLE public.onboarding_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  order_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | generating | ready | failed
  slides_json jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{title, bullets[], narration, screenshot_url, audio_url, duration_sec}]
  total_duration_sec numeric DEFAULT 0,
  error_message text,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_modules ENABLE ROW LEVEL SECURITY;

-- Public read so reps (no auth.uid) can view; writes restricted via edge functions using service role
CREATE POLICY "Anyone can view onboarding modules"
  ON public.onboarding_modules FOR SELECT USING (true);

CREATE TRIGGER trg_onboarding_modules_updated
  BEFORE UPDATE ON public.onboarding_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-rep progress
CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  module_slug text NOT NULL,
  watched_seconds numeric NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_code, module_slug)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Writes/reads gated through edge functions with service role + portal token validation
CREATE POLICY "Anyone can view onboarding progress"
  ON public.onboarding_progress FOR SELECT USING (true);

CREATE TRIGGER trg_onboarding_progress_updated
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for screenshots + audio + final mp4s
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-assets', 'onboarding-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read onboarding assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'onboarding-assets');

CREATE POLICY "Service role can write onboarding assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'onboarding-assets');

CREATE POLICY "Service role can update onboarding assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'onboarding-assets');
