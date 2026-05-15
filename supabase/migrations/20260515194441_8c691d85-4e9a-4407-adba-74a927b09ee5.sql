CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'webinar',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  image_url TEXT,
  signup_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published events"
  ON public.events FOR SELECT
  USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_events_published ON public.events(is_published, starts_at);

CREATE TABLE public.event_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can sign up for events"
  ON public.event_signups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view signups"
  ON public.event_signups FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete signups"
  ON public.event_signups FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_event_signups_event_id ON public.event_signups(event_id);