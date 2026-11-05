-- Aetheris Company Operating System: team workspaces, tasks, playbooks,
-- typed event bus, CRM linkage. Purely additive.

CREATE TABLE IF NOT EXISTS public.company_system_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  team_key text NOT NULL,
  name text NOT NULL,
  summary text,
  root_cause_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  module_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, team_key)
);
GRANT ALL ON public.company_system_teams TO service_role;
ALTER TABLE public.company_system_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system teams service only" ON public.company_system_teams FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.company_system_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  company_id uuid,
  team_key text NOT NULL DEFAULT 'executive',
  goal_id uuid,
  root_cause_id text,
  module_id text,
  title text NOT NULL,
  detail text,
  kind text NOT NULL DEFAULT 'action',
  owner_role text,
  status text NOT NULL DEFAULT 'open',
  priority integer NOT NULL DEFAULT 3,
  due_date date,
  requires_company_data boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'blueprint',
  dedupe_key text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_cs_tasks_system_team ON public.company_system_tasks(system_id, team_key);
GRANT ALL ON public.company_system_tasks TO service_role;
ALTER TABLE public.company_system_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system tasks service only" ON public.company_system_tasks FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.company_system_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  team_key text NOT NULL DEFAULT 'executive',
  title text NOT NULL,
  root_cause_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  tips jsonb NOT NULL DEFAULT '[]'::jsonb,
  module_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, dedupe_key)
);
GRANT ALL ON public.company_system_playbooks TO service_role;
ALTER TABLE public.company_system_playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system playbooks service only" ON public.company_system_playbooks FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.company_system_event_bus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.company_systems(id) ON DELETE CASCADE,
  company_id uuid,
  event_type text NOT NULL,
  from_module text,
  to_module text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_cs_bus_status ON public.company_system_event_bus(system_id, status);
GRANT ALL ON public.company_system_event_bus TO service_role;
ALTER TABLE public.company_system_event_bus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system event bus service only" ON public.company_system_event_bus FOR ALL USING (true);

ALTER TABLE public.company_systems ADD COLUMN IF NOT EXISTS crm_company_id uuid;
ALTER TABLE public.company_systems ADD COLUMN IF NOT EXISTS crm_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.company_system_goals ADD COLUMN IF NOT EXISTS team_key text;
ALTER TABLE public.company_system_goals ADD COLUMN IF NOT EXISTS current_value text;
ALTER TABLE public.company_system_goals ADD COLUMN IF NOT EXISTS requires_company_data boolean NOT NULL DEFAULT false;

CREATE TRIGGER trg_cs_teams_updated BEFORE UPDATE ON public.company_system_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cs_tasks_updated BEFORE UPDATE ON public.company_system_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cs_playbooks_updated BEFORE UPDATE ON public.company_system_playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cs_bus_updated BEFORE UPDATE ON public.company_system_event_bus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();