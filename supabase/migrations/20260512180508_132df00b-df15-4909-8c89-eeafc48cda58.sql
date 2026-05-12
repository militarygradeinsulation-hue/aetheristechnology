
CREATE TABLE public.shared_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT,
  candidate_phone TEXT,
  share_code TEXT,
  resume_path TEXT,
  resume_filename TEXT,
  ai_fit_score NUMERIC,
  ai_summary TEXT,
  ai_strengths JSONB,
  ai_concerns JSONB,
  scheduled_at TIMESTAMPTZ,
  meeting_link TEXT,
  location TEXT,
  interviewer TEXT NOT NULL DEFAULT 'admin' CHECK (interviewer IN ('admin','bradon','both')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','completed','passed','rejected')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','careers')),
  created_by TEXT NOT NULL DEFAULT 'admin' CHECK (created_by IN ('admin','bradon')),
  task_id UUID REFERENCES public.shared_tasks(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_interviews_scheduled_at ON public.shared_interviews(scheduled_at);
CREATE INDEX idx_shared_interviews_status ON public.shared_interviews(status);
CREATE INDEX idx_shared_interviews_share_code ON public.shared_interviews(share_code);

ALTER TABLE public.shared_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_interviews_select_open" ON public.shared_interviews FOR SELECT USING (true);
CREATE POLICY "shared_interviews_insert_open" ON public.shared_interviews FOR INSERT WITH CHECK (true);
CREATE POLICY "shared_interviews_update_open" ON public.shared_interviews FOR UPDATE USING (true);
CREATE POLICY "shared_interviews_delete_open" ON public.shared_interviews FOR DELETE USING (true);

CREATE TRIGGER trg_shared_interviews_updated
BEFORE UPDATE ON public.shared_interviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
