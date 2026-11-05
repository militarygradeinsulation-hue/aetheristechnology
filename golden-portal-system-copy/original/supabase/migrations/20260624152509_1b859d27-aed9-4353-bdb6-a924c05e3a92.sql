
ALTER TABLE public.call_recordings
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'extension',
  ADD COLUMN IF NOT EXISTS title text;

CREATE INDEX IF NOT EXISTS idx_call_recordings_source_time
  ON public.call_recordings (source, started_at DESC);
