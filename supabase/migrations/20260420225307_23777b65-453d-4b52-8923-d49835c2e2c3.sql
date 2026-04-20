
-- Create content_sync_log table
CREATE TABLE public.content_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  outlook_message_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id)
);

ALTER TABLE public.content_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync log"
  ON public.content_sync_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert sync log"
  ON public.content_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update sync log"
  ON public.content_sync_log FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete sync log"
  ON public.content_sync_log FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create content_posting_schedule table
CREATE TABLE public.content_posting_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INT NOT NULL,
  day_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  strategic_goal TEXT,
  post_time TIME DEFAULT '09:00:00',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_posting_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posting schedule"
  ON public.content_posting_schedule FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert posting schedule"
  ON public.content_posting_schedule FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update posting schedule"
  ON public.content_posting_schedule FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete posting schedule"
  ON public.content_posting_schedule FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_content_posting_schedule_updated_at
  BEFORE UPDATE ON public.content_posting_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
