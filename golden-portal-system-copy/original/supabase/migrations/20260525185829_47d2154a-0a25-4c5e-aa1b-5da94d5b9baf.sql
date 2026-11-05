
CREATE TABLE public.ai_detection_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_name TEXT NOT NULL,
  subject_name_lower TEXT GENERATED ALWAYS AS (lower(subject_name)) STORED,
  notes TEXT,
  sample_count INTEGER NOT NULL DEFAULT 0,
  overall_score NUMERIC,
  overall_verdict TEXT,
  same_author TEXT,
  samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_detection_scans_subject ON public.ai_detection_scans(subject_name_lower);
CREATE INDEX idx_ai_detection_scans_created_at ON public.ai_detection_scans(created_at DESC);

ALTER TABLE public.ai_detection_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai detection scans"
ON public.ai_detection_scans FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert ai detection scans"
ON public.ai_detection_scans FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update ai detection scans"
ON public.ai_detection_scans FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete ai detection scans"
ON public.ai_detection_scans FOR DELETE
USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_ai_detection_scans_updated_at
BEFORE UPDATE ON public.ai_detection_scans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
