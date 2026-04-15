
CREATE TABLE public.generated_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_title text NOT NULL,
  topic_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  file_url text,
  stripe_session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_playbooks_user_id ON public.generated_playbooks(user_id);
CREATE INDEX idx_generated_playbooks_status ON public.generated_playbooks(status);

ALTER TABLE public.generated_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated playbooks"
  ON public.generated_playbooks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage generated playbooks"
  ON public.generated_playbooks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_generated_playbooks_updated_at
  BEFORE UPDATE ON public.generated_playbooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
