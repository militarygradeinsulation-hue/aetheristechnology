CREATE TABLE IF NOT EXISTS public.private_video_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 access_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 title text NOT NULL,
 bucket text NOT NULL DEFAULT 'private-outreach-videos',
 object_path text NOT NULL,
 notification_email text,
 created_at timestamptz NOT NULL DEFAULT now(),
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.private_video_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 link_id uuid NOT NULL REFERENCES public.private_video_links(id) ON DELETE CASCADE,
 event_type text NOT NULL CHECK(event_type IN ('play','progress','complete')),
 session_id uuid NOT NULL,
 progress_seconds integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 user_agent text
);
CREATE UNIQUE INDEX IF NOT EXISTS private_video_one_play_per_session ON public.private_video_events(link_id,session_id,event_type) WHERE event_type IN ('play','complete');
ALTER TABLE public.private_video_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_video_events ENABLE ROW LEVEL SECURITY;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('private-outreach-videos','private-outreach-videos',false,52428800,ARRAY['video/mp4'])
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.private_video_links(access_token,title,bucket,object_path,notification_email)
VALUES ('b7d45c68-8d35-4f41-b2c5-f2188a4d3e62','Aetheris Private Introduction','private-outreach-videos','outreach/intro-2026-11-19.mp4',NULL)
ON CONFLICT(access_token) DO NOTHING;
