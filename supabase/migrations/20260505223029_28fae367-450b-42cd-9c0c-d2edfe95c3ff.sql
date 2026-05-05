-- =========================
-- Shared Workspace tables
-- =========================
CREATE TABLE IF NOT EXISTS public.shared_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  owner text NOT NULL DEFAULT 'admin' CHECK (owner IN ('admin','bradon')),
  assignee text NOT NULL CHECK (assignee IN ('admin','bradon')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  bucket text NOT NULL DEFAULT 'today' CHECK (bucket IN ('today','week','later')),
  due_at timestamptz,
  starts_at timestamptz,
  completed_at timestamptz,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_tasks_assignee_status ON public.shared_tasks (assignee, status, due_at NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_shared_tasks_due ON public.shared_tasks (due_at) WHERE status <> 'done';

CREATE TABLE IF NOT EXISTS public.shared_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL CHECK (author IN ('admin','bradon')),
  body text NOT NULL,
  task_id uuid REFERENCES public.shared_tasks(id) ON DELETE CASCADE,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_notes_task ON public.shared_notes (task_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_created ON public.shared_notes (created_at DESC);

CREATE TABLE IF NOT EXISTS public.shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader text NOT NULL CHECK (uploader IN ('admin','bradon')),
  task_id uuid REFERENCES public.shared_tasks(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes integer,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_files_task ON public.shared_files (task_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_created ON public.shared_files (created_at DESC);

CREATE TABLE IF NOT EXISTS public.shared_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL CHECK (recipient IN ('admin','bradon')),
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  task_id uuid REFERENCES public.shared_tasks(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_notifs_unread ON public.shared_notifications (recipient, created_at DESC) WHERE read_at IS NULL;

-- updated_at trigger for tasks
DROP TRIGGER IF EXISTS trg_shared_tasks_updated ON public.shared_tasks;
CREATE TRIGGER trg_shared_tasks_updated
  BEFORE UPDATE ON public.shared_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- RLS — admin route is passcode-gated; allow anon r/w like other admin tables
-- =========================
ALTER TABLE public.shared_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY shared_tasks_all ON public.shared_tasks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY shared_notes_all ON public.shared_notes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY shared_files_all ON public.shared_files FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY shared_notifs_all ON public.shared_notifications FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Storage bucket
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files','workspace-files', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "workspace-files read" ON storage.objects
    FOR SELECT USING (bucket_id = 'workspace-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "workspace-files write" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'workspace-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "workspace-files update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'workspace-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "workspace-files delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'workspace-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Auto-notify on task create / status change
-- =========================
CREATE OR REPLACE FUNCTION public.notify_shared_task() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- notify the assignee if owner != assignee
    IF NEW.assignee <> NEW.owner THEN
      INSERT INTO public.shared_notifications (recipient, kind, title, body, task_id)
      VALUES (NEW.assignee, 'assigned',
              'New task assigned: ' || NEW.title,
              COALESCE(NEW.description,''), NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'done' AND COALESCE(OLD.status,'') <> 'done' THEN
      -- notify owner that it's done (if they didn't complete it themselves)
      IF NEW.owner <> NEW.assignee THEN
        INSERT INTO public.shared_notifications (recipient, kind, title, body, task_id)
        VALUES (NEW.owner, 'completed',
                'Completed: ' || NEW.title,
                'Marked done by ' || NEW.assignee, NEW.id);
      END IF;
      NEW.completed_at := now();
    END IF;
    IF NEW.assignee <> OLD.assignee THEN
      INSERT INTO public.shared_notifications (recipient, kind, title, body, task_id)
      VALUES (NEW.assignee, 'assigned',
              'Reassigned to you: ' || NEW.title,
              COALESCE(NEW.description,''), NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_shared_task ON public.shared_tasks;
CREATE TRIGGER trg_notify_shared_task
  BEFORE INSERT OR UPDATE ON public.shared_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_shared_task();