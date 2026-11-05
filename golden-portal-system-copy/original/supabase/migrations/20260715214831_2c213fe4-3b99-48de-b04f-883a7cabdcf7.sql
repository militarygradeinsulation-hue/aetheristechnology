
-- 1. Extend company_calendar
ALTER TABLE public.company_calendar
  ADD COLUMN IF NOT EXISTS owner_role text NOT NULL DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS due_time time;

CREATE INDEX IF NOT EXISTS company_calendar_owner_role_idx
  ON public.company_calendar(owner_role, date DESC);

-- 2. Leadership roles table
CREATE TABLE IF NOT EXISTS public.leadership_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  title text NOT NULL,
  owns jsonb NOT NULL DEFAULT '[]'::jsonb,
  does_not_own jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_authority jsonb NOT NULL DEFAULT '[]'::jsonb,
  accent_color text NOT NULL DEFAULT 'amber',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.leadership_roles TO service_role;

ALTER TABLE public.leadership_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages leadership_roles" ON public.leadership_roles;
CREATE POLICY "Service role manages leadership_roles"
  ON public.leadership_roles
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS leadership_roles_updated_at ON public.leadership_roles;
CREATE TRIGGER leadership_roles_updated_at
  BEFORE UPDATE ON public.leadership_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seed the three principals
INSERT INTO public.leadership_roles (role_slug, display_name, title, owns, does_not_own, decision_authority, accent_color, sort_order)
VALUES
  (
    'founder',
    'Joseph',
    'Founder & Principal — "The Architect"',
    '["The brand and public identity. Every case file carries this signature.",
      "The methodology (Chaos Theory Forensics) and the product: the diagnostic, the tools, the AI and automation systems.",
      "Client-facing authority on findings. When Aetheris says something is broken, this is the voice that says it.",
      "Final say on what Aetheris is and is not, and what work it takes."]'::jsonb,
    '["Day-to-day people management",
      "The sales pipeline",
      "Delivery logistics"]'::jsonb,
    '["What Aetheris is, what it says, what the work looks like",
      "What tools enter the product (vetted first by Sales)",
      "Veto on public-facing roles"]'::jsonb,
    'amber',
    1
  ),
  (
    'coo',
    'Dean',
    'Chief Operating Officer',
    '["Delivery. What was sold actually ships, on time, at the Aetheris bar.",
      "Hiring and firing. Builds the team and removes who doesn''t hold the line.",
      "Accountability. Owns outcomes and standards across the firm.",
      "Process and quality control. Turns the Founder''s methodology into a repeatable operation.",
      "The people function. Internal relationships, culture, hard conversations."]'::jsonb,
    '["Brand and public identity",
      "Product methodology decisions",
      "Sales pricing model"]'::jsonb,
    '["Whether the work gets delivered and by whom",
      "Who is on the team (Founder veto on public roles)",
      "Delivery capacity and timelines"]'::jsonb,
    'sky',
    2
  ),
  (
    'chief_sales',
    'Braden',
    'Chief of Sales',
    '["Sales. Pipeline, outreach, closing, revenue targets.",
      "Training. Onboards and sharpens everyone who touches a client or a tool.",
      "Tooling pipeline. Tests and vets new tools before they touch client work, then hands approved ones to the Founder to build around."]'::jsonb,
    '["Delivery execution",
      "People management outside sales",
      "Brand identity"]'::jsonb,
    '["Whether the work gets sold and for how much",
      "What tools get vetted for the product line",
      "Sales team pipeline discipline"]'::jsonb,
    'emerald',
    3
  )
ON CONFLICT (role_slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  title = EXCLUDED.title,
  owns = EXCLUDED.owns,
  does_not_own = EXCLUDED.does_not_own,
  decision_authority = EXCLUDED.decision_authority,
  accent_color = EXCLUDED.accent_color,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
