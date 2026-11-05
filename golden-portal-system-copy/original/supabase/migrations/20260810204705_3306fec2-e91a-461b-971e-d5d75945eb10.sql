CREATE TABLE public.exec_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'task' CHECK (kind IN ('event','task','note')),
  title text NOT NULL,
  details text,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','doing','done')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assignee text NOT NULL DEFAULT 'all',
  author text NOT NULL DEFAULT 'joseph',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.exec_items TO service_role;

ALTER TABLE public.exec_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to exec_items"
  ON public.exec_items FOR ALL
  USING (false) WITH CHECK (false);

CREATE TRIGGER exec_items_updated_at
  BEFORE UPDATE ON public.exec_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_exec_items_kind_starts ON public.exec_items (kind, starts_at);