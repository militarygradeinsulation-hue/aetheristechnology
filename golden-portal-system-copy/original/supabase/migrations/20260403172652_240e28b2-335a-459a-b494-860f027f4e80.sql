
-- Create playbooks table
CREATE TABLE public.playbooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  description text NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  file_url text NOT NULL,
  icon_name text DEFAULT 'FileText',
  published_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

-- Anyone can view playbooks
CREATE POLICY "Playbooks are viewable by everyone"
ON public.playbooks FOR SELECT
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage playbooks"
ON public.playbooks FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('playbooks', 'playbooks', true);

-- Public read access for playbook files
CREATE POLICY "Playbook files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'playbooks');

-- Seed existing playbooks
INSERT INTO public.playbooks (title, subtitle, description, tags, file_url, icon_name) VALUES
('The 2026 Digital Influence Playbook', 'Navigating the AI-Discovery Frontier', 'The complete strategic framework for dominating AI-powered search, mastering Generative Engine Optimization (GEO), and building a recommendation-first brand strategy. Includes the Hub-and-Spoke execution model and No-Call Sales System.', ARRAY['GEO', 'AI Search', 'Social Selling'], '/resources/The_2026_Digital_Influence_Playbook.pdf', 'TrendingUp'),
('The 2026 Strategic Leadership Manifesto', 'The Jobsian Pivot for the AI-Driven B2B Era', 'How to apply Steve Jobs'' principles of radical focus, brutal simplification, and product-led growth to survive the AI-recommendation economy. Includes the Strategic Elimination Framework and GEO Performance Dashboard.', ARRAY['Leadership', 'Product-Led Growth', 'Strategy'], '/resources/The_2026_Strategic_Leadership_Manifesto.pdf', 'BookOpen'),
('The 2026 Short-Form Video Primer', 'A Masterclass in Vertical Content Strategy', 'Platform-by-platform breakdown of YouTube Shorts (200B daily views), TikTok (95 min/day usage), and Instagram Reels (30.81% reach rate). Includes the Hub-and-Spoke production model and weekly publishing schedule.', ARRAY['Video Strategy', 'YouTube Shorts', 'TikTok'], '/resources/The_2026_Short-Form_Video_Primer.pdf', 'Video'),
('Strategic Briefing: Evolution of Influence', 'Leadership and Brand Discovery in the AI Era', 'Executive overview of the AI-led paradigm shift in search, the decline of traditional discovery (34% B2B traffic drop), short-form video strategy, and the product-led growth model exemplified by Tesla''s $0 ad spend.', ARRAY['Executive Brief', 'AI Disruption', 'Brand Strategy'], '/resources/Strategic_Briefing_The_Evolution_of_Influence_Leadership_and_Brand_Discovery.pdf', 'FileText'),
('The Authority Factor', 'Earned Media in AI Search Rankings', 'Why earned media accounts for 89% of all AI search citations, how LLM partnerships with media outlets affect your visibility, and why 32% of CMOs are increasing PR budgets specifically for AI optimization.', ARRAY['Earned Media', 'AI Citations', 'PR Strategy'], '/resources/The_Authority_Factor_Earned_Media.pdf', 'Shield'),
('Key Metrics for AI Search Performance', 'Measuring Your Brand in the AI Era', 'The three critical KPIs every business must track: AI Visibility Score, Citation Share, and Share of AI Voice. 33% of B2B tech CMOs now report these metrics directly to their CEOs.', ARRAY['KPIs', 'AI Metrics', 'Performance'], '/resources/Key_Metrics_for_AI_Search_Performance.pdf', 'BarChart3');
