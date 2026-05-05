-- ===========================================================
-- CAREERS TEST SYSTEM
-- ===========================================================
CREATE TABLE IF NOT EXISTS public.careers_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  choices jsonb NOT NULL,                  -- [{id:"a",text:"..."}, ...]
  correct_choice_id text NOT NULL,
  category text,
  difficulty smallint DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.careers_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_careers_questions" ON public.careers_questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admins_view_careers_questions" ON public.careers_questions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.careers_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_email text NOT NULL,
  candidate_name text,
  candidate_phone text,
  questions jsonb NOT NULL,               -- snapshot of the 20 served (with choices, NO correct id)
  answers jsonb NOT NULL DEFAULT '{}'::jsonb, -- {questionId: choiceId}
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  submitted_at timestamptz,
  score_pct numeric,
  correct_count int,
  total_count int,
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | submitted | expired | passed | failed
  share_code text UNIQUE,                 -- only set when passed
  notes_to_admin text,                    -- candidate's free-form note
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_careers_attempts_email ON public.careers_attempts (lower(candidate_email), started_at DESC);
CREATE INDEX idx_careers_attempts_share_code ON public.careers_attempts (share_code) WHERE share_code IS NOT NULL;
ALTER TABLE public.careers_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_careers_attempts" ON public.careers_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.careers_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.careers_attempts(id) ON DELETE CASCADE,
  share_code text UNIQUE NOT NULL,
  candidate_name text NOT NULL,
  candidate_email text NOT NULL,
  candidate_phone text,
  resume_path text,                       -- storage path in careers-resumes bucket
  resume_filename text,
  notes text,                             -- "things they sent me from the test"
  score_pct numeric,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_careers_apps_share_code ON public.careers_applications (share_code);
ALTER TABLE public.careers_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_careers_apps" ON public.careers_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Storage bucket for resumes (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('careers-resumes', 'careers-resumes', false)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "service_role_careers_resumes" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'careers-resumes') WITH CHECK (bucket_id = 'careers-resumes');

-- ===========================================================
-- CALL RECORDINGS (rep listen mode per lead)
-- ===========================================================
CREATE TABLE IF NOT EXISTS public.call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_code text NOT NULL,
  lead_id uuid REFERENCES public.rep_leads(id) ON DELETE SET NULL,
  lead_business text,
  mode text NOT NULL DEFAULT 'record',          -- record | coach
  audio_path text,                              -- storage path in call-recordings bucket
  duration_sec int,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ts, text, speaker?}]
  ai_messages jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ts, type:"suggest"|"objection"|"close", text}]
  outcome text,                                 -- voicemail | meeting_set | no_answer | not_interested | sale | other
  rep_notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_call_recordings_rep ON public.call_recordings (rep_code, started_at DESC);
CREATE INDEX idx_call_recordings_lead ON public.call_recordings (lead_id, started_at DESC);
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_call_recordings" ON public.call_recordings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Private storage bucket for audio
INSERT INTO storage.buckets (id, name, public) VALUES ('call-recordings', 'call-recordings', false)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "service_role_call_recordings_storage" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'call-recordings') WITH CHECK (bucket_id = 'call-recordings');

-- updated_at trigger for questions
CREATE TRIGGER trg_careers_questions_updated_at
  BEFORE UPDATE ON public.careers_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================================
-- SEED 60 QUESTIONS (Aetheris positioning, Leak Audit, pricing, ICP, sales process)
-- ===========================================================
INSERT INTO public.careers_questions (question, choices, correct_choice_id, category, difficulty) VALUES
-- Positioning (10)
('What is Aetheris''s positioning?', '[{"id":"a","text":"Marketing agency"},{"id":"b","text":"Business Forensics Operator"},{"id":"c","text":"AI consultancy"},{"id":"d","text":"Web development shop"}]'::jsonb, 'b', 'positioning', 1),
('Complete the hook: "Your business is leaking. You just can''t see it from ___."', '[{"id":"a","text":"the outside"},{"id":"b","text":"the inside"},{"id":"c","text":"your CRM"},{"id":"d","text":"your dashboard"}]'::jsonb, 'b', 'positioning', 1),
('Which methodology does Aetheris own?', '[{"id":"a","text":"The Growth Stack"},{"id":"b","text":"The Leak Audit"},{"id":"c","text":"The 7-Step Funnel"},{"id":"d","text":"The Forensic Framework"}]'::jsonb, 'b', 'positioning', 1),
('Aetheris sees itself as a ___, not a consultant.', '[{"id":"a","text":"vendor"},{"id":"b","text":"operator"},{"id":"c","text":"freelancer"},{"id":"d","text":"coach"}]'::jsonb, 'b', 'positioning', 1),
('Which tone is Aetheris''s brand?', '[{"id":"a","text":"Corporate-polished"},{"id":"b","text":"Influencer-friendly"},{"id":"c","text":"Aggressive, blunt, non-corporate"},{"id":"d","text":"Academic"}]'::jsonb, 'c', 'positioning', 1),
('Crimson is reserved on the brand for what?', '[{"id":"a","text":"Buttons"},{"id":"b","text":"Headers"},{"id":"c","text":"Leak signal only (bleeds, ACTIVE stamps, the word leaking)"},{"id":"d","text":"Backgrounds"}]'::jsonb, 'c', 'design', 2),
('Aetheris is positioned as a forensic operator vs. what?', '[{"id":"a","text":"Marketer"},{"id":"b","text":"Developer"},{"id":"c","text":"Influencer"},{"id":"d","text":"Coach"}]'::jsonb, 'c', 'positioning', 1),
('How many steps in The Leak Audit?', '[{"id":"a","text":"3"},{"id":"b","text":"5"},{"id":"c","text":"7"},{"id":"d","text":"10"}]'::jsonb, 'c', 'positioning', 1),
('What is the FREE self-scan tool URL path?', '[{"id":"a","text":"/free-audit"},{"id":"b","text":"/leak-audit"},{"id":"c","text":"/scanner"},{"id":"d","text":"/diagnostic"}]'::jsonb, 'b', 'positioning', 1),
('Aetheris''s primary geographic SEO target?', '[{"id":"a","text":"Chicago, IL"},{"id":"b","text":"Indianapolis, Indiana"},{"id":"c","text":"Nashville, TN"},{"id":"d","text":"National only"}]'::jsonb, 'b', 'positioning', 1),

-- Pricing (12)
('What is the operator-led Forensic Diagnostic flat fee?', '[{"id":"a","text":"$500"},{"id":"b","text":"$1,500"},{"id":"c","text":"$2,500"},{"id":"d","text":"$5,000"}]'::jsonb, 'c', 'pricing', 1),
('The Forensic Diagnostic fee is ___ toward an engagement.', '[{"id":"a","text":"non-refundable"},{"id":"b","text":"applied"},{"id":"c","text":"separate from"},{"id":"d","text":"doubled"}]'::jsonb, 'b', 'pricing', 1),
('What is the Digital Snapshot price?', '[{"id":"a","text":"$49"},{"id":"b","text":"$125"},{"id":"c","text":"$250"},{"id":"d","text":"$499"}]'::jsonb, 'b', 'pricing', 1),
('What is the Website Evaluation price?', '[{"id":"a","text":"$250"},{"id":"b","text":"$500"},{"id":"c","text":"$750"},{"id":"d","text":"$1,500"}]'::jsonb, 'b', 'pricing', 1),
('Implementation engagements range from?', '[{"id":"a","text":"$1K-$5K"},{"id":"b","text":"$5K-$25K+"},{"id":"c","text":"$25K-$100K"},{"id":"d","text":"$50K+ only"}]'::jsonb, 'b', 'pricing', 1),
('Rep commission percentage on every closed deal?', '[{"id":"a","text":"5%"},{"id":"b","text":"10%"},{"id":"c","text":"15%"},{"id":"d","text":"20%"}]'::jsonb, 'c', 'commission', 2),
('Commission split (locked) is Company / Rep / Partner = ?', '[{"id":"a","text":"80/10/10"},{"id":"b","text":"70/15/15"},{"id":"c","text":"60/20/20"},{"id":"d","text":"50/25/25"}]'::jsonb, 'b', 'commission', 2),
('Recurring monthly invoices pay commission for how long?', '[{"id":"a","text":"3 months only"},{"id":"b","text":"12 months"},{"id":"c","text":"As long as the client stays subscribed"},{"id":"d","text":"One-time only"}]'::jsonb, 'c', 'commission', 2),
('Commission is paid within ___ of client payment clearing.', '[{"id":"a","text":"24 hours"},{"id":"b","text":"7 days"},{"id":"c","text":"30 days"},{"id":"d","text":"Quarterly"}]'::jsonb, 'b', 'commission', 1),
('Are clawbacks allowed on completed work?', '[{"id":"a","text":"Yes, anytime"},{"id":"b","text":"Yes, in first 30 days"},{"id":"c","text":"No"},{"id":"d","text":"Only on retainers"}]'::jsonb, 'c', 'commission', 1),
('The recommended door-opener product is the?', '[{"id":"a","text":"14-Day Diagnostic"},{"id":"b","text":"Digital Snapshot"},{"id":"c","text":"Implementation"},{"id":"d","text":"Fractional CTO retainer"}]'::jsonb, 'b', 'sales', 1),
('Which product proves authority and earns trust before the diagnostic?', '[{"id":"a","text":"Digital Snapshot"},{"id":"b","text":"Website Evaluation"},{"id":"c","text":"Subscription"},{"id":"d","text":"Implementation"}]'::jsonb, 'b', 'sales', 2),

-- Sales process / what to do / not to do (15)
('When prospecting, you should lead with?', '[{"id":"a","text":"Pricing"},{"id":"b","text":"Observation/problem"},{"id":"c","text":"Your credentials"},{"id":"d","text":"A demo"}]'::jsonb, 'b', 'sales', 2),
('Most deals close on follow-up?', '[{"id":"a","text":"1"},{"id":"b","text":"2 or 3"},{"id":"c","text":"5+"},{"id":"d","text":"First call"}]'::jsonb, 'b', 'sales', 2),
('What should you NOT do?', '[{"id":"a","text":"Be direct"},{"id":"b","text":"Trash-talk their current vendor"},{"id":"c","text":"Reference competitors"},{"id":"d","text":"Use specific numbers"}]'::jsonb, 'b', 'sales', 1),
('What should you do when prospecting?', '[{"id":"a","text":"Lead with price"},{"id":"b","text":"Use specific numbers from their website"},{"id":"c","text":"Promise timelines you can''t control"},{"id":"d","text":"Disappear after the first no"}]'::jsonb, 'b', 'sales', 1),
('Outreach style should reflect what about owners?', '[{"id":"a","text":"They are babies and need hand-holding"},{"id":"b","text":"They are business owners, not babies"},{"id":"c","text":"They want corporate language"},{"id":"d","text":"They love jargon"}]'::jsonb, 'b', 'sales', 1),
('Aetheris reps sell to which kind of company?', '[{"id":"a","text":"Fortune 500"},{"id":"b","text":"Established small/mid businesses with operational leaks"},{"id":"c","text":"Pre-revenue startups"},{"id":"d","text":"Government agencies"}]'::jsonb, 'b', 'icp', 1),
('Indicator a prospect is a great fit?', '[{"id":"a","text":"They have a perfect website already"},{"id":"b","text":"They feel something is broken but can''t name it"},{"id":"c","text":"They want the cheapest option"},{"id":"d","text":"They need a logo"}]'::jsonb, 'b', 'icp', 2),
('You should follow up at MINIMUM how many times?', '[{"id":"a","text":"1"},{"id":"b","text":"2"},{"id":"c","text":"3"},{"id":"d","text":"5"}]'::jsonb, 'c', 'sales', 1),
('When the Snapshot lands, what do you do next?', '[{"id":"a","text":"Wait for them to call"},{"id":"b","text":"Walk them through the gaps and bridge to Diagnostic"},{"id":"c","text":"Send a contract"},{"id":"d","text":"Pitch a retainer cold"}]'::jsonb, 'b', 'sales', 2),
('The Diagnostic''s job is to?', '[{"id":"a","text":"Sell software"},{"id":"b","text":"Find the real problems and reveal the full damage"},{"id":"c","text":"Generate a logo"},{"id":"d","text":"Book a future call"}]'::jsonb, 'b', 'sales', 2),
('You earn trust by?', '[{"id":"a","text":"Promising the world"},{"id":"b","text":"Pointing at problems with specifics"},{"id":"c","text":"Discounting"},{"id":"d","text":"Long pitch decks"}]'::jsonb, 'b', 'sales', 2),
('When a prospect says no, you should?', '[{"id":"a","text":"Move on permanently"},{"id":"b","text":"Argue"},{"id":"c","text":"Stay in cadence — most no''s aren''t final"},{"id":"d","text":"Send a refund"}]'::jsonb, 'c', 'sales', 1),
('Which sequence is correct?', '[{"id":"a","text":"Implementation -> Snapshot -> Diagnostic"},{"id":"b","text":"Snapshot -> Website Eval -> Diagnostic -> Implementation"},{"id":"c","text":"Diagnostic -> Snapshot -> Implementation"},{"id":"d","text":"Retainer -> Snapshot -> Diagnostic"}]'::jsonb, 'b', 'sales', 2),
('Best opening message format?', '[{"id":"a","text":"Long pitch with credentials"},{"id":"b","text":"Short observation about their site, offer to show gaps"},{"id":"c","text":"Cold price quote"},{"id":"d","text":"Calendly link with no context"}]'::jsonb, 'b', 'sales', 2),
('You should reference what to create urgency?', '[{"id":"a","text":"Generic stats"},{"id":"b","text":"Their competitors who look better online"},{"id":"c","text":"Industry awards"},{"id":"d","text":"Your client list"}]'::jsonb, 'b', 'sales', 2),

-- Product knowledge / forbidden phrasing (8)
('What is FORBIDDEN in marketing copy?', '[{"id":"a","text":"Forensic language"},{"id":"b","text":"Magic Robot analogies"},{"id":"c","text":"Specific numbers"},{"id":"d","text":"Bullet lists"}]'::jsonb, 'b', 'brand', 2),
('Which job title is FORBIDDEN?', '[{"id":"a","text":"Operator"},{"id":"b","text":"AI Systems Architect"},{"id":"c","text":"Forensics Operator"},{"id":"d","text":"Founder"}]'::jsonb, 'b', 'brand', 2),
('Which UX pattern is FORBIDDEN?', '[{"id":"a","text":"Sticky nav"},{"id":"b","text":"Social proof popups / purchase popups / testimonial carousels"},{"id":"c","text":"Hero video"},{"id":"d","text":"Footer CTA"}]'::jsonb, 'b', 'brand', 2),
('The serif font for autopsy headlines is?', '[{"id":"a","text":"Playfair"},{"id":"b","text":"Fraunces"},{"id":"c","text":"Merriweather"},{"id":"d","text":"Georgia"}]'::jsonb, 'b', 'design', 3),
('The mono font for case-file labels is?', '[{"id":"a","text":"Courier"},{"id":"b","text":"JetBrains Mono"},{"id":"c","text":"Roboto Mono"},{"id":"d","text":"Fira Code"}]'::jsonb, 'b', 'design', 3),
('Primary brand background is?', '[{"id":"a","text":"White"},{"id":"b","text":"Dark charcoal"},{"id":"c","text":"Blue"},{"id":"d","text":"Sand"}]'::jsonb, 'b', 'design', 1),
('Primary accent color is?', '[{"id":"a","text":"Crimson"},{"id":"b","text":"Amber"},{"id":"c","text":"Teal"},{"id":"d","text":"Lime"}]'::jsonb, 'b', 'design', 1),
('Generated images must have what watermark?', '[{"id":"a","text":"Aetheris.tech"},{"id":"b","text":"Aetheris AI Studio bottom-right"},{"id":"c","text":"None"},{"id":"d","text":"Made with Lovable"}]'::jsonb, 'b', 'brand', 3),

-- Soft skills / discipline (8)
('A great rep''s most important habit?', '[{"id":"a","text":"Cold-calling all day"},{"id":"b","text":"Disciplined follow-up cadence"},{"id":"c","text":"Posting on LinkedIn"},{"id":"d","text":"Reading sales books"}]'::jsonb, 'b', 'mindset', 2),
('When a deal goes cold, you should?', '[{"id":"a","text":"Drop it"},{"id":"b","text":"Send 3+ value-add follow-ups before parking"},{"id":"c","text":"Discount immediately"},{"id":"d","text":"Pass it to another rep"}]'::jsonb, 'b', 'mindset', 2),
('You should track your pipeline?', '[{"id":"a","text":"In your head"},{"id":"b","text":"In the rep portal / CRM"},{"id":"c","text":"On paper only"},{"id":"d","text":"In email drafts"}]'::jsonb, 'b', 'discipline', 1),
('Your honesty about timelines should be?', '[{"id":"a","text":"Optimistic to close faster"},{"id":"b","text":"Conservative — never promise what you can''t control"},{"id":"c","text":"Vague"},{"id":"d","text":"Match what client requests"}]'::jsonb, 'b', 'discipline', 2),
('When you don''t know an answer on a call, you?', '[{"id":"a","text":"Make something up"},{"id":"b","text":"Say I''ll get you a precise answer in 24 hrs and follow through"},{"id":"c","text":"Change the subject"},{"id":"d","text":"End the call"}]'::jsonb, 'b', 'discipline', 2),
('Daily minimum activity is best measured by?', '[{"id":"a","text":"Hours worked"},{"id":"b","text":"Quality outreach + follow-ups completed"},{"id":"c","text":"Coffees consumed"},{"id":"d","text":"Slack messages sent"}]'::jsonb, 'b', 'discipline', 2),
('You should treat the brand voice as?', '[{"id":"a","text":"Flexible based on prospect"},{"id":"b","text":"Non-negotiable — blunt, forensic, operator"},{"id":"c","text":"Whatever sounds friendly"},{"id":"d","text":"Salesy when needed"}]'::jsonb, 'b', 'brand', 2),
('Confidentiality rule for client data?', '[{"id":"a","text":"Share with friends if it helps"},{"id":"b","text":"Treat all client data as confidential, no exceptions"},{"id":"c","text":"Post anonymized examples publicly"},{"id":"d","text":"Share with other reps freely"}]'::jsonb, 'b', 'discipline', 1),

-- Practical scenario (7)
('A prospect ghosts after the Snapshot. You?', '[{"id":"a","text":"Mark dead"},{"id":"b","text":"Send a value follow-up referencing one specific Snapshot finding"},{"id":"c","text":"Email them daily"},{"id":"d","text":"Discount the Diagnostic"}]'::jsonb, 'b', 'sales', 3),
('Prospect says price is too high. Best response?', '[{"id":"a","text":"Drop the price 50%"},{"id":"b","text":"Reframe to cost of the leak vs cost to fix"},{"id":"c","text":"Walk away"},{"id":"d","text":"Add free bonuses"}]'::jsonb, 'b', 'sales', 3),
('Prospect asks why not just hire an in-house person?', '[{"id":"a","text":"Argue against it"},{"id":"b","text":"Explain Aetheris diagnoses across many companies, sees patterns one hire can''t"},{"id":"c","text":"Agree and walk away"},{"id":"d","text":"Drop price"}]'::jsonb, 'b', 'sales', 3),
('Prospect already has a marketing agency. You?', '[{"id":"a","text":"Trash the agency"},{"id":"b","text":"Position Aetheris as forensics — different scope, finds what marketing misses"},{"id":"c","text":"Walk away"},{"id":"d","text":"Match the agency''s services"}]'::jsonb, 'b', 'sales', 3),
('Prospect wants a free audit beyond the self-scan. You?', '[{"id":"a","text":"Do it for free"},{"id":"b","text":"Point them to /leak-audit and pitch the $2,500 Forensic Diagnostic for operator-led"},{"id":"c","text":"Bundle a free week"},{"id":"d","text":"Discount the Diagnostic"}]'::jsonb, 'b', 'sales', 3),
('A new lead is dropped to you. First action?', '[{"id":"a","text":"Cold call immediately"},{"id":"b","text":"Review their website + run mental Leak Audit, then craft observation outreach"},{"id":"c","text":"Email a calendar link"},{"id":"d","text":"Send pricing"}]'::jsonb, 'b', 'sales', 2),
('You uncover a leak the prospect didn''t know about. You?', '[{"id":"a","text":"Hide it for the diagnostic"},{"id":"b","text":"Name it specifically with dollar impact in your follow-up"},{"id":"c","text":"Stay vague"},{"id":"d","text":"Email it to them next month"}]'::jsonb, 'b', 'sales', 3);
