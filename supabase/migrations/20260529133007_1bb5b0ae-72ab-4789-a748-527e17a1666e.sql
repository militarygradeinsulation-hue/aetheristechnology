-- Per-lead action items: covers BOTH the initial touch checklist and the
-- auto-generated multi-week follow-up sequence. One unified table keeps
-- the rep and admin views simple.
CREATE TABLE public.lead_action_items (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID NOT NULL REFERENCES public.rep_leads(id) ON DELETE CASCADE,
  rep_code      TEXT,                       -- rep who owns the lead at the time of creation
  kind          TEXT NOT NULL CHECK (kind IN ('touch','followup')),
  step_key      TEXT NOT NULL,              -- machine key: 'scan','find_leak','attach_playbook','create_email','send','followup_day3', etc.
  title         TEXT NOT NULL,
  description   TEXT,
  order_idx     INTEGER NOT NULL DEFAULT 0,
  due_at        TIMESTAMPTZ,                -- null for touch steps, set for follow-up sequence
  completed_at  TIMESTAMPTZ,
  completed_by  TEXT,
  skipped_at    TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_action_items_lead     ON public.lead_action_items(lead_id);
CREATE INDEX idx_lead_action_items_rep      ON public.lead_action_items(rep_code);
CREATE INDEX idx_lead_action_items_due      ON public.lead_action_items(due_at) WHERE completed_at IS NULL AND skipped_at IS NULL;
CREATE UNIQUE INDEX idx_lead_action_items_unique_step ON public.lead_action_items(lead_id, step_key);

-- All access is mediated by edge functions that verify portal/admin tokens.
-- Direct PostgREST access is blocked — only service_role can touch the table.
GRANT ALL ON public.lead_action_items TO service_role;

ALTER TABLE public.lead_action_items ENABLE ROW LEVEL SECURITY;

-- Locked-down policies: deny anon/authenticated entirely (edge functions use
-- the service role and enforce auth in code).
CREATE POLICY "service_role_full_access_lead_action_items"
ON public.lead_action_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_lead_action_items_updated_at
BEFORE UPDATE ON public.lead_action_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();