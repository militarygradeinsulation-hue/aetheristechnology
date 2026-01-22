-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create blog_posts table for the blog system
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image TEXT,
  author TEXT NOT NULL DEFAULT 'Aetheris AI Team',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  meta_description TEXT,
  location_focus TEXT
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to published posts
CREATE POLICY "Published posts are viewable by everyone" 
ON public.blog_posts 
FOR SELECT 
USING (is_published = true);

-- Create index for slug lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);

-- Create index for published posts ordered by date
CREATE INDEX idx_blog_posts_published ON public.blog_posts(is_published, published_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  quote TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  industry TEXT,
  location TEXT,
  avatar_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Testimonials are viewable by everyone" 
ON public.testimonials 
FOR SELECT 
USING (true);

-- Insert initial testimonials
INSERT INTO public.testimonials (client_name, company, role, quote, rating, industry, location, is_featured) VALUES
('Michael Chen', 'Midwest Manufacturing Co.', 'Operations Director', 'Aetheris AI transformed our production line with predictive maintenance AI. We''ve reduced downtime by 40% and saved over $200K in the first year alone.', 5, 'Manufacturing', 'Indianapolis, IN', true),
('Sarah Williams', 'Hoosier Healthcare Group', 'Chief Technology Officer', 'Their custom AI scheduling system has revolutionized how we manage patient appointments. No-shows dropped by 60% and staff efficiency increased dramatically.', 5, 'Healthcare', 'Carmel, IN', true),
('David Rodriguez', 'Summit Logistics', 'CEO', 'The AI-powered route optimization Aetheris built for us cut fuel costs by 25%. Their team understood our Indiana routes and local challenges perfectly.', 5, 'Logistics', 'Fort Wayne, IN', true),
('Jennifer Thompson', 'Thompson & Associates Law', 'Managing Partner', 'Their document AI saves our paralegals 15+ hours per week. For a small Indianapolis firm, that''s game-changing. Highly recommend Aetheris!', 5, 'Legal Services', 'Indianapolis, IN', false),
('Robert Kim', 'Crossroads Restaurant Group', 'Owner', 'The AI inventory and staffing predictions are incredibly accurate. We''ve cut food waste by 30% across all 5 locations.', 5, 'Food Service', 'Fishers, IN', true);

-- Insert initial blog posts with Indiana-focused content
INSERT INTO public.blog_posts (title, slug, excerpt, content, author, published_at, is_published, tags, meta_description, location_focus) VALUES
(
  'How Indianapolis Businesses Are Using AI to Compete Nationally',
  'indianapolis-businesses-ai-competition',
  'Discover how forward-thinking Indianapolis companies are leveraging artificial intelligence to compete with coastal tech giants.',
  '# How Indianapolis Businesses Are Using AI to Compete Nationally

Indianapolis has long been known for its strong manufacturing base, healthcare industry, and logistics networks. But in 2024, a new story is emerging: Hoosier businesses are embracing AI at an unprecedented rate.

## The Indianapolis AI Advantage

What makes Indianapolis uniquely positioned for AI adoption?

### 1. Lower Operating Costs
With significantly lower real estate and labor costs than San Francisco or New York, Indianapolis businesses can invest more heavily in technology transformation.

### 2. Strong STEM Talent Pipeline
Indiana University, Purdue, and Butler are producing world-class computer science graduates who often choose to stay local.

### 3. Industry Diversity
From Eli Lilly''s pharmaceutical research to Cummins'' manufacturing innovation, Indianapolis has diverse industries ready for AI integration.

## Real Success Stories

### Midwest Manufacturing Co.
This Indianapolis-based manufacturer implemented predictive maintenance AI that reduced equipment downtime by 40%.

### Hoosier Healthcare Group
By deploying AI-powered scheduling, this Carmel healthcare network reduced patient no-shows by 60%.

Ready to transform your Indianapolis business with AI? Contact Aetheris AI for a free consultation.',
  'Joseph Toney',
  now() - interval '2 days',
  true,
  ARRAY['Indianapolis', 'AI', 'Business', 'Local'],
  'Learn how Indianapolis businesses are using AI to compete nationally with success stories from Hoosier companies.',
  'Indianapolis'
),
(
  'AI Automation for Indiana Manufacturing: A Complete Guide',
  'ai-automation-indiana-manufacturing-guide',
  'A comprehensive guide to implementing AI automation in Indiana''s manufacturing sector.',
  '# AI Automation for Indiana Manufacturing: A Complete Guide

Indiana''s manufacturing sector generates over $100 billion annually, making it one of the top manufacturing states in the nation.

## Why Indiana Manufacturers Need AI Now

### The Labor Challenge
With unemployment at historic lows, finding skilled workers is harder than ever. AI can augment your existing workforce.

### Global Competition
International competitors are adopting AI rapidly. Indiana manufacturers must keep pace.

## Key AI Applications for Manufacturing

### Predictive Maintenance
Analyzes sensor data to predict equipment failures before they happen. ROI: 30-50% reduction in unplanned downtime.

### Quality Control AI
Computer vision systems inspect products faster and more accurately than human inspectors.

### Supply Chain Optimization
Predicts demand, optimizes inventory, and identifies supply chain risks.

Contact Aetheris AI for a free manufacturing AI assessment.',
  'Joseph Toney',
  now() - interval '5 days',
  true,
  ARRAY['Manufacturing', 'AI', 'Automation', 'Indiana'],
  'Complete guide to AI automation for Indiana manufacturers covering predictive maintenance and supply chain optimization.',
  'Indiana'
),
(
  '5 Ways AI is Transforming Indiana Healthcare',
  'ai-transforming-indiana-healthcare',
  'From patient scheduling to diagnostic assistance, discover how AI is revolutionizing healthcare delivery across Indiana.',
  '# 5 Ways AI is Transforming Indiana Healthcare

Indiana''s healthcare sector is experiencing a technological revolution. From major hospital systems in Indianapolis to rural clinics, AI is improving patient outcomes.

## 1. Intelligent Patient Scheduling
AI-powered scheduling systems predict no-shows and optimize appointment lengths. Result: 40-60% reduction in no-shows.

## 2. Diagnostic Assistance
AI makes doctors faster and more accurate with radiology AI, pathology AI, and cardiology AI tools.

## 3. Administrative Automation
Healthcare workers spend 30-40% of their time on paperwork. AI reduces this through automatic documentation and claims processing.

## 4. Predictive Patient Care
AI identifies at-risk patients before emergencies occur with hospital readmission prediction and sepsis early warning.

## 5. Revenue Cycle Optimization
AI improves financial health by predicting payment likelihood and identifying coding errors.

Ready to explore healthcare AI for your Indiana practice? Contact Aetheris AI today.',
  'Joseph Toney',
  now() - interval '1 week',
  true,
  ARRAY['Healthcare', 'AI', 'Indiana', 'Medical'],
  'Discover 5 ways AI is transforming Indiana healthcare from patient scheduling to diagnostic assistance.',
  'Indiana'
);