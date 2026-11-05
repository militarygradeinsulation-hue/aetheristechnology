
ALTER TABLE public.rep_codes ADD COLUMN IF NOT EXISTS team_name text DEFAULT 'Team 2 — New Hires';
CREATE INDEX IF NOT EXISTS rep_codes_team_idx ON public.rep_codes(team_name);

CREATE TABLE IF NOT EXISTS public.hire_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  experience_band text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hire_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage hire_teams" ON public.hire_teams FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hire_team_cadence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.hire_teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  cadence text NOT NULL,
  day_of_week int,
  notes text,
  push_to_calendar boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hire_team_cadence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage hire_team_cadence" ON public.hire_team_cadence FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hire_playbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hire_playbook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage hire_playbook_entries" ON public.hire_playbook_entries FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Seed teams
INSERT INTO public.hire_teams (name, description, experience_band, sort_order) VALUES
  ('Team 1 — Veterans', 'Reps with 6+ months on the floor. Self-directed, leadership-track.', '6mo+', 1),
  ('Team 2 — New Hires', 'Brand-new applicants in their first 6 months. High-touch onboarding.', '0–6mo', 2)
ON CONFLICT (name) DO NOTHING;

-- Seed cadence for Team 1
INSERT INTO public.hire_team_cadence (team_id, title, cadence, day_of_week, notes, push_to_calendar, sort_order)
SELECT id, 'Leadership sync', 'weekly', 1, '30-min strategy + pipeline review. Bring one win + one blocker.', true, 1 FROM public.hire_teams WHERE name = 'Team 1 — Veterans'
UNION ALL
SELECT id, 'Strategy deep-dive', 'monthly', NULL, 'Quarterly account review, comp deep-dive, market shifts.', true, 2 FROM public.hire_teams WHERE name = 'Team 1 — Veterans'
UNION ALL
SELECT id, 'Comp + retention review', 'quarterly', NULL, 'Validate tier placement, bonus eligibility, equity conversation.', true, 3 FROM public.hire_teams WHERE name = 'Team 1 — Veterans';

-- Seed cadence for Team 2
INSERT INTO public.hire_team_cadence (team_id, title, cadence, day_of_week, notes, push_to_calendar, sort_order)
SELECT id, 'Daily 15-min stand-up (Week 1)', 'daily', NULL, 'What did you ship yesterday? What are you doing today? Any blocker?', true, 1 FROM public.hire_teams WHERE name = 'Team 2 — New Hires'
UNION ALL
SELECT id, 'Coaching call (Weeks 2–4)', 'weekly', 3, '3x/week — Mon/Wed/Fri. Role-play one objection per session.', true, 2 FROM public.hire_teams WHERE name = 'Team 2 — New Hires'
UNION ALL
SELECT id, '1:1 with leadership (Month 2+)', 'weekly', 2, '30 min. Career path, comp clarity, blockers.', true, 3 FROM public.hire_teams WHERE name = 'Team 2 — New Hires'
UNION ALL
SELECT id, 'Friday training module due', 'weekly', 5, 'New training assigned every Monday. Must be passed by EOD Friday.', true, 4 FROM public.hire_teams WHERE name = 'Team 2 — New Hires';

-- Seed playbook
INSERT INTO public.hire_playbook_entries (section, title, body, sort_order) VALUES
  ('day_one', 'Welcome text — send within 1 hour of offer accept', 'Hey {first_name} — welcome to the team. You should have your portal code in your inbox. Log in tonight, watch the 8-min orientation video, and DM me one question. We''ll have a 15-min kickoff tomorrow at 10am.', 1),
  ('day_one', 'Day-1 email template', 'Subject: Your Aetheris portal is live\n\n{first_name},\n\nYour login is in your inbox. Three things before tomorrow:\n1. Watch the orientation video (8 min)\n2. Read the commission structure (5 min)\n3. Pick your first 5 target accounts\n\nReply with one question. Anything. I want to see you''re engaged.\n\n— {your_name}', 2),
  ('week_one', 'Daily check-in questions', 'Ask every day in week 1:\n• What did you ship yesterday?\n• What are you working on today?\n• What''s the one thing blocking you?\n• Is there anything I can clear for you in the next 24h?', 3),
  ('week_one', 'End-of-week 1 review', 'By Friday they should have: portal logged in 5+ times, completed orientation training, sent 10 outbound messages, booked at least 1 discovery call (or attempted 5). If not — escalate, do not wait.', 4),
  ('red_flags', 'No login for 48 hours', 'Pick up the phone. Not a text. Not an email. CALL them. If no answer in 24h, leave a voicemail saying ''I''m worried — call me back today.''', 5),
  ('red_flags', 'Goes quiet in week 2–3', 'This is the killzone. Most new reps quit silently between days 10–21. Schedule an immediate 1:1, ask: ''On a scale of 1–10, how confident are you this is going to work for you?'' Anything below 7 → block 30 min and unblock them.', 6),
  ('reactivation', 'Quiet 48h+ script', '''Hey — haven''t heard from you since {day}. No judgment, just want to make sure you''re not stuck on something I can clear in 5 minutes. Free at 2pm or 4pm today?''', 7),
  ('reactivation', 'Re-engagement after a missed week', '''I noticed you went dark last week. Two things: 1) is everything okay outside of work, and 2) what would have to change for this to feel winnable to you? Honest answer — I can''t fix what I don''t know about.''', 8)
ON CONFLICT DO NOTHING;
