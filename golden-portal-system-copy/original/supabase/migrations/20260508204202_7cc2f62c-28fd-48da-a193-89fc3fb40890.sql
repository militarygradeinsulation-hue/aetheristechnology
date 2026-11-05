
ALTER TABLE public.careers_applications
  ADD COLUMN IF NOT EXISTS ai_fit_score numeric,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_strengths jsonb,
  ADD COLUMN IF NOT EXISTS ai_concerns jsonb,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.careers_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code text NOT NULL,
  author_rep_code text NOT NULL,
  author_name text,
  body text NOT NULL DEFAULT '',
  attachment_path text,
  attachment_filename text,
  delivered_via text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_careers_messages_code_rep_time
  ON public.careers_messages (share_code, author_rep_code, created_at DESC);

ALTER TABLE public.careers_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_careers_messages" ON public.careers_messages
  TO service_role USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('careers-messages', 'careers-messages', false)
ON CONFLICT (id) DO NOTHING;
