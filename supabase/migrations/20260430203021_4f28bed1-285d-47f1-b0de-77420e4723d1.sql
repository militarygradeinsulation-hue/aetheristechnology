
CREATE TABLE public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_code text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('admin','rep','partner')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  parent_id uuid REFERENCES public.team_messages(id) ON DELETE CASCADE,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_messages_created ON public.team_messages(created_at DESC);
CREATE INDEX idx_team_messages_parent ON public.team_messages(parent_id);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Read for everyone (board is internal but service-role edge functions front it).
-- We need anon SELECT so realtime subscriptions work for portal users using anon key.
CREATE POLICY "team_messages readable by all"
ON public.team_messages FOR SELECT
USING (true);

-- All writes via edge function (service role bypasses RLS). No client-side write policies.

CREATE TRIGGER team_messages_updated_at
BEFORE UPDATE ON public.team_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER TABLE public.team_messages REPLICA IDENTITY FULL;

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-uploads', 'team-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "team-uploads public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-uploads');

CREATE POLICY "team-uploads authenticated insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-uploads');
