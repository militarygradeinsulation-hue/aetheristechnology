
-- 1) Add rep ownership to CRM tables
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS owner_code TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS qualified_by_code TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS owner_code TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS proposal_sent_at TIMESTAMPTZ;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS owner_code TEXT;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner_code ON public.crm_contacts(owner_code);
CREATE INDEX IF NOT EXISTS idx_crm_deals_owner_code ON public.crm_deals(owner_code);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_owner_code ON public.crm_interactions(owner_code);

-- 2) Weekly cadence (admin-editable schedule shown to reps)
CREATE TABLE IF NOT EXISTS public.rep_playbook_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  block_order SMALLINT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  duration_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rep_playbook_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage playbook schedule" ON public.rep_playbook_schedule
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Service role manages playbook schedule" ON public.rep_playbook_schedule
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE TRIGGER trg_rep_playbook_schedule_updated BEFORE UPDATE ON public.rep_playbook_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Plays library (reusable scripts/sequences)
CREATE TABLE IF NOT EXISTS public.rep_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'cold_call',
  stage TEXT,
  industry TEXT,
  body TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rep_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage plays" ON public.rep_plays
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Service role manages plays" ON public.rep_plays
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE TRIGGER trg_rep_plays_updated BEFORE UPDATE ON public.rep_plays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Quotas / weekly goals per rep
CREATE TABLE IF NOT EXISTS public.rep_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'weekly' CHECK (period IN ('weekly','monthly','quarterly')),
  calls_target INTEGER NOT NULL DEFAULT 0,
  meetings_target INTEGER NOT NULL DEFAULT 0,
  proposals_target INTEGER NOT NULL DEFAULT 0,
  revenue_target_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rep_code, period)
);
ALTER TABLE public.rep_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quotas" ON public.rep_quotas
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Service role manages quotas" ON public.rep_quotas
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE TRIGGER trg_rep_quotas_updated BEFORE UPDATE ON public.rep_quotas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) AI Idea of the Day (one record per day, broadcasted to all reps)
CREATE TABLE IF NOT EXISTS public.rep_idea_of_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  for_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  source TEXT NOT NULL DEFAULT 'ai',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rep_idea_of_day ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage idea of day" ON public.rep_idea_of_day
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Service role manages idea of day" ON public.rep_idea_of_day
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
