import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MANDATORY_TAGS: string[] = [];

const LINKEDIN_HOOKS = [
  'I used to think [X]. Then I lost $[amount] and learned [Y].',
  'Everyone is talking about [Topic]. Here\'s what they\'re missing...',
  'What [Failure/Setback] taught me about [Topic]...',
  'Stop scrolling. This will save your business $[amount] this quarter.',
  'I analyzed [number] companies. [X]% are making this exact mistake.',
  'Unpopular opinion: [Bold claim about topic].',
  'Your [Tool/System] isn\'t broken. Your strategy is.',
  'The #1 reason [businesses/teams] fail at [Topic]? Nobody talks about it.',
  'I just saved a client $[amount]. Here\'s the 3-step framework.',
  '[Metric] down [X]%? Here\'s what\'s actually going wrong.',
  'Hot take: [Contrarian view]. Here\'s the data to prove it.',
  'If your [system/team] does THIS, you\'re leaving $[amount] on the table.',
];

const TRENDING_HASHTAGS = {
  ai: ["AI", "ArtificialIntelligence", "MachineLearning", "Innovation", "Technology", "DigitalTransformation", "FutureOfWork", "Automation"],
  marketing: ["DigitalMarketing", "Marketing", "ContentMarketing", "Branding", "SocialMedia", "GrowthHacking", "MarketingStrategy", "B2BMarketing"],
  crm: ["CRM", "Sales", "SalesStrategy", "LeadGeneration", "CustomerExperience", "RevenueOperations", "SalesEnablement", "Pipeline"],
  leadership: ["Leadership", "Management", "Entrepreneurship", "Startups", "BusinessStrategy", "PersonalDevelopment", "CEOInsights"],
  industry: ["SmallBusiness", "BusinessGrowth", "OperationalExcellence", "DataDriven", "BusinessIntelligence", "ROI", "Sustainability"],
  geo: ["GEO", "GenerativeAI", "AISearch", "SEO", "ContentStrategy", "AIDiscovery", "SearchMarketing", "DigitalStrategy"],
  video: ["VideoMarketing", "ShortFormVideo", "YouTubeShorts", "ContentCreation", "SocialSelling", "PersonalBranding", "VerticalVideo"],
};

const TOPICS = [
  {
    category: "AI Misuse",
    hashtagPool: "ai",
    angles: [
      "Companies using AI chatbots with zero training data from their own business",
      "Why your AI-generated content sounds like every other company's AI-generated content",
      "The hidden cost of AI hallucinations in customer-facing applications",
      "Your team is using 5 different AI tools that don't talk to each other",
      "AI without data governance is just expensive guessing",
      "Why fine-tuning matters and why nobody does it",
      "The AI vendor lock-in trap most businesses walk into blindly",
      "You automated the wrong processes and now everything is worse",
    ],
  },
  {
    category: "Marketing Failures",
    hashtagPool: "marketing",
    angles: [
      "Your Google Ads are sending traffic to pages with no conversion tracking",
      "Why your marketing agency reports impressions instead of revenue",
      "The $10K/month retainer that produces nothing measurable",
      "Your brand voice document is 40 pages nobody reads",
      "Why your competitor's ugly website outperforms your beautiful one",
      "The marketing stack nobody on your team knows how to use",
      "You're A/B testing button colors while your funnel has a hole in it",
      "Why your webinars generate attendees but zero pipeline",
    ],
  },
  {
    category: "CRM & Lead Journey",
    hashtagPool: "crm",
    angles: [
      "Your sales team manually enters leads and loses 30% of them",
      "The follow-up gap: why leads go cold in 48 hours",
      "Your lead scoring model hasn't been updated since you built it",
      "Why marketing qualified leads and sales qualified leads are different universes",
      "The handoff problem: marketing generates leads, sales ignores them",
      "Your CRM has 50,000 contacts and you can't tell which ones matter",
      "Duplicate records are costing you more than you think",
      "Why your pipeline report lies to you every Monday morning",
    ],
  },
  {
    category: "Industry Specific",
    hashtagPool: "industry",
    angles: [
      "Law firms spending $8K/month on marketing with no client attribution",
      "Real estate agencies using AI for listings but not for lead nurturing",
      "Dental practices paying for SEO while ignoring Google Business reviews",
      "Auto dealerships with $50K ad budgets and no follow-up automation",
      "Accounting firms that think a LinkedIn post is a marketing strategy",
      "Insurance agencies drowning in leads they never call back",
      "Veterinary clinics with no online booking losing to PetSmart",
      "HVAC companies bidding on Google Ads against their own organic listings",
    ],
  },
  {
    category: "Digital Intelligence",
    hashtagPool: "ai",
    angles: [
      "You have analytics installed but nobody looks at the data",
      "The difference between data collection and data intelligence",
      "Why your monthly reports tell you what happened but not why",
      "Your competitors know more about your customers than you do",
      "The cost of making decisions without data: a real breakdown",
      "Why dashboards without alerts are just pretty wallpaper",
      "Your tech stack costs $15K/month and you use 20% of it",
      "The integration tax: what disconnected systems really cost",
    ],
  },
  {
    category: "Outdated Marketing",
    hashtagPool: "marketing",
    angles: [
      "Your marketer is using 2019 tactics on LinkedIn and wondering why nobody cares",
      "LinkedIn is not TikTok — stop treating it like one",
      "Your marketing team learned everything from a 2018 HubSpot blog and never updated",
      "Posting motivational quotes on LinkedIn isn't marketing — it's noise",
      "Your social media manager doesn't understand the algorithm they're posting to",
      "The 'post 3 times a day' strategy died in 2020 — here's what replaced it",
      "Your marketing hire has 2 years of experience repeated 5 times",
    ],
  },
  {
    category: "Resistance to Change",
    hashtagPool: "leadership",
    angles: [
      "You want more revenue but won't change a single process to get it",
      "Your business looks exactly like it did in 2019 — and so do your results",
      "CEOs who say 'we've always done it this way' are writing their own obituary",
      "You hired a consultant then ignored everything they said",
      "Your competitors changed. You didn't. That's why you're losing.",
      "You want digital transformation but won't let go of the fax machine mentality",
      "The CEO who wants growth but vetoes every new idea",
    ],
  },
  {
    category: "Echo Chamber Engagement",
    hashtagPool: "marketing",
    angles: [
      "If only your employees like your posts, you don't have a following — you have a hostage situation",
      "Your LinkedIn posts get 12 likes from the same 12 people — that's not engagement",
      "When your own team scrolls past your content, the market already has",
      "Zero comments from strangers means zero market relevance",
      "Your followers are your employees and your mom — let's talk about that",
      "You're posting into an echo chamber and calling it a marketing strategy",
    ],
  },
  // === NEW: Strategic Intelligence from Aetheris Playbooks ===
  {
    category: "AI Discovery & GEO",
    hashtagPool: "geo",
    angles: [
      "B2B tech website traffic dropped 34% and you're still optimizing for Google page 1",
      "By 2027 traditional search will be 45% of queries — is your brand ready for AI recommendations?",
      "Your content gets zero AI citations because you don't understand Generative Engine Optimization",
      "AI search engines downgrade your content after 60 days — and you haven't updated since last year",
      "89% of AI citations come from earned media — your blog isn't one of them",
      "You're invisible to ChatGPT, Gemini, and Perplexity — here's why that's killing your pipeline",
      "Your competitors are spending 45% more on PR to get cited by AI — you're still buying Google Ads",
      "The 3 metrics that matter in 2026: AI Visibility Score, Citation Share, and Share of AI Voice",
      "If an LLM can't summarize your value prop in 5 seconds, you've already lost the deal",
      "Listicles and chunked content get 30% of all AI citations — your 3,000 word essays get zero",
    ],
  },
  {
    category: "Short-Form Video Strategy",
    hashtagPool: "video",
    angles: [
      "YouTube Shorts gets 200 billion daily views and your brand has zero presence",
      "You're posting the same video on TikTok, Reels, and Shorts — each algorithm punishes you differently",
      "The 3-second rule: if you don't stop the scroll in 3 seconds, your content quality is irrelevant",
      "A 45-second video with 70% completion destroys a 15-second video with 40% completion — here's why",
      "TikTok doesn't care about your follower count — your completion rate is everything",
      "Instagram Reels get reshared 4.5 billion times daily through DMs — are you designing for shares?",
      "Your social media team is watermark-crossposting and every algorithm is penalizing you for it",
      "The Hub-and-Spoke model: record once, distribute platform-native everywhere",
      "62% of B2B CMOs say they can't compete on video — that's your opening",
      "Social commerce will hit $100 billion in 2026 and you still think video is 'nice to have'",
    ],
  },
  {
    category: "Product-Led Leadership",
    hashtagPool: "leadership",
    angles: [
      "Tesla built a $1 trillion brand with $0 in traditional advertising — what's your excuse?",
      "Steve Jobs cut Apple from dozens of products to 4 — you can't even kill one underperforming service",
      "The 'Microsoft Trap': adequate at everything, great at nothing — sound familiar?",
      "Your marketing team runs your company and your product shows it",
      "Product-led growth means the product IS the marketing — yours needs a PowerPoint to explain itself",
      "Only 11% of B2B brands use customer-first content — the other 89% talk about themselves",
      "The CEO as the brand channel: Elon Musk has 180M followers and spends $0 on ads",
      "You're spending on brand awareness when you should be spending on product excellence",
    ],
  },
  {
    category: "Social Selling & No-Call Sales",
    hashtagPool: "crm",
    angles: [
      "Social selling leaders create 45% more opportunities — your team is still cold calling",
      "The No-Call Sales System: closing $5K+ deals entirely through DMs and Loom videos",
      "LinkedIn company page reach dropped to 1.6% — personal brands are the only path forward",
      "Your sales team sends generic connection requests and wonders why nobody responds",
      "The 5 Core Drivers framework: Plan, Training, Accountability, System, Community — your sales pitch has none",
      "Replace your 45-minute discovery call with a 5-minute Loom and watch close rates climb",
      "95% of LinkedIn creators saw reach drop 50% in 2025 — here's what the top 5% changed",
      "You're measuring LinkedIn success by likes when you should be measuring DM conversations",
    ],
  },
  {
    category: "AI Crisis & Brand Resilience",
    hashtagPool: "ai",
    angles: [
      "Only 14% of brands have a playbook for AI-generated deepfake threats — is yours one of them?",
      "A fake CEO statement about bankruptcy can spread before your PR team finishes their coffee",
      "Brand equity built on a single individual is inherently fragile — the Tesla/Musk paradox",
      "61% of CMOs can't maintain a shared brand narrative across PR, marketing, and sales",
      "Your brand story changes depending on who you ask in your company — AI notices the inconsistency",
      "AI content decay is real: your thought leadership expires every 60 days and you don't refresh it",
      "Only 10% of brands have leadership conduct protocols — one viral mistake destroys years of trust",
    ],
  },
  {
    category: "Earned Media & Authority",
    hashtagPool: "geo",
    angles: [
      "Earned media accounts for 89% of all AI search citations — your owned blog accounts for almost none",
      "Bloomberg, Fortune, and Forbes drive AI trust — your company blog does not",
      "32% of tech CMOs are increasing PR budgets specifically for AI visibility — you're cutting yours",
      "LLM partnerships matter: The Washington Post partners with OpenAI — does your PR strategy account for this?",
      "You're creating content for humans but AI is reading it first — and AI has different trust signals",
      "The authority gap: VC-backed firms weaponize earned media while you write another LinkedIn carousel",
    ],
  },
];

// === STRATEGIC KNOWLEDGE BASE (from Aetheris Playbooks) ===
const STRATEGIC_INTELLIGENCE = `
## KEY STATISTICS & DATA POINTS (Use these as authoritative citations)

### AI & Search Disruption
- B2B tech website traffic declined 34% between 2024 and 2025
- AI-generated traffic reached 20% of B2B traffic by end of 2025
- By 2027, traditional search projected to represent only 45% of all queries
- 61% of B2B CMOs are rethinking marketing for Generative Engine Optimization (GEO)
- 62% of B2B tech CMOs report lacking skills/budget/resources to compete with fast-moving challengers
- AI overview rates surged from 40% in late 2024 to 70% by May 2025

### AI Search Metrics (The New KPIs)
- AI Visibility Score: Frequency of brand recommendation in AI-generated answers
- Citation Share: How often content is used as a source for AI answers
- Share of AI Voice: Prominence in AI answers relative to competitors
- 33% of B2B tech CMOs now report Share of AI Voice to their CEOs

### Content & Citation Factors
- AI downgrades content older than 2 months (citation decay)
- Adding current year to URLs can boost ChatGPT citations by 20%
- 30% of AI citations come from listicles and short, self-contained content segments
- Earned media (Bloomberg, Fortune, Forbes) accounts for up to 89% of AI search citations
- 40% of AI searches are generative/action-oriented
- VC-backed firms are increasing PR budgets by 45% to bypass the authority gap

### Short-Form Video (2026)
- YouTube Shorts: 200 billion+ daily views (186% increase from 2024), 2 billion MAU, 5.91% engagement rate
- TikTok: 95 minutes average daily usage, ~1.9 billion MAU, ~4.56% engagement rate
- Instagram Reels: 30.81% average reach rate (2x static posts), 4.5 billion daily DM reshares, 2.3+ billion MAU
- Social commerce projected to surpass $100 billion in 2026
- The 3-Second Rule: viewers decide to stay or swipe within the first 3 seconds
- A 45-second video with 70% completion outperforms a 15-second video with 40% completion

### LinkedIn Algorithm (2025-2026)
- LinkedIn shifted to human-centric model; reach for many creators fell 50%
- Organic LinkedIn company content slipped from 2.1% to 1.6% of feed share (March-October 2025)
- 95% of creators saw reach drop by 50% in early 2025
- Brands responding by diversifying into video (48-60%) and thought leadership
- Social selling leaders create 45% more opportunities and are 51% more likely to reach quota

### Product-Led Growth Examples
- Tesla: $1T brand with $0 traditional advertising ($152,000 in 2022 vs billions by competitors)
- Tesla invests ~$3,000 per vehicle in R&D
- Elon Musk: 180M+ social media followers as direct PR pipeline
- Steve Jobs cut Apple from dozens of products to 4 quadrants (Consumer/Pro × Desktop/Portable)
- Only 11% of B2B brands use customer-first content

### Crisis & Resilience
- Only 14% of tech brands have a playbook for AI-generated deepfake threats
- Only 10% of brands have leadership conduct protocols
- 61% of CMOs report non-proficiency in maintaining a shared brand narrative

### The No-Call Sales System
- Close £5K+ deals entirely through DMs and asynchronous Loom videos
- 5 Core Drivers: Plan, Training, Accountability, System, Community
- 20% growth boost when leaders mix: Personal Stories, Educational Content, Achievements, Industry Insights, Conversions

## STRATEGIC FRAMEWORKS TO REFERENCE

### Generative Engine Optimization (GEO) - 6 Ingredients
1. Recency & Decay Prevention (update content every 60 days, add current year to URLs)
2. The Listicle Advantage (30% of AI citations from chunkable content)
3. Earned over Owned (89% citation weight from third-party media)
4. Problem-Solution Framing (40% of AI searches are action-oriented)
5. LMS.txt & Technical Markers (machine-readable documentation)
6. Citation Share over Visibility Score

### Hub-and-Spoke Publishing Framework
- Core Content (Hub): Record high-resolution 9:16 vertical "Master Video" with 3-4 modular segments
- Platform Adaptation (Spokes): Trending audio for TikTok, SEO-rich titles for YouTube, aesthetic filters for Reels

### The Rhythmic Architecture: 3 Narrative Pillars
1. Two-Part Contrasts: "Broken Before" → "Prosperous After"
2. The Rule of Three: Three-word slogans, three-part narrative arcs
3. The Villain-Hero Arc: Cast legacy challenges as the villain your brand defeats

### The Jobsian Strategic Elimination Framework
- The Microsoft Trap: Adequate but not great; "all over the map"
- The Jobsian Ideal: Focused on only 3 "insanely great" priorities
- 29% of billion-dollar companies use search-intent content as their strategic filter
`;

function pickTrendingTags(pool: string): string[] {
  const poolTags = TRENDING_HASHTAGS[pool as keyof typeof TRENDING_HASHTAGS] || TRENDING_HASHTAGS.ai;
  const crossPool = TRENDING_HASHTAGS.leadership;
  const shuffled = [...poolTags].sort(() => Math.random() - 0.5);
  const cross = crossPool[Math.floor(Math.random() * crossPool.length)];
  return [shuffled[0], shuffled[1], cross];
}

function pickHook(): string {
  return LINKEDIN_HOOKS[Math.floor(Math.random() * LINKEDIN_HOOKS.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let requestAngle: string | null = null;
    let requestCategory: string | null = null;
    let requestHashtagPool: string | null = null;
    try {
      const body = await req.json();
      requestAngle = body?.angle || null;
      requestCategory = body?.category || null;
      requestHashtagPool = body?.hashtagPool || null;
    } catch {
      // No body or invalid JSON — use random selection
    }

    let categoryObj;
    let angle: string;
    if (requestAngle && requestCategory) {
      categoryObj = { category: requestCategory, hashtagPool: requestHashtagPool || "ai", angles: [requestAngle] };
      angle = requestAngle;
    } else {
      categoryObj = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      angle = categoryObj.angles[Math.floor(Math.random() * categoryObj.angles.length)];
    }
    const suggestedHook = pickHook();
    const trendingTags = pickTrendingTags(categoryObj.hashtagPool);

    const systemPrompt = `You are a sharp, no-BS business writer and LinkedIn content strategist for Aetheris Technology — a Co-CEO business consulting firm that embeds into companies to expose operational gaps, fix broken systems, and build real digital intelligence. Led by Joseph Toney (The Architect), Aetheris offers the 14-Day Operational Systems Diagnostic ($5,000-$10,000) where Joseph steps in as a Co-CEO partner.

## STRATEGIC KNOWLEDGE BASE
${STRATEGIC_INTELLIGENCE}

## LINKEDIN VIRAL CONTENT RULES (CRITICAL)

Your content MUST be optimized for LinkedIn virality. Follow these rules:

### HOOKS (First 2 lines are EVERYTHING)
- The first line must be a SCROLL-STOPPING hook under 8 words
- Use one of these proven hook formulas:
  * Pattern interrupt: "Stop. Read this before you [action]."
  * Contrarian: "Unpopular opinion: [bold claim]"
  * Curiosity gap: "I analyzed [X] companies. Here's what shocked me."
  * Personal story: "I used to think [X]. Then I lost $[amount]."
  * Data bomb: "[X]% of businesses are making this exact mistake."
  * Challenge: "Your [system] isn't broken. Your strategy is."
- The second line should deepen the hook with a specific stat or emotional pull
- After the hook, add "---" then the full article

### SEO & DISCOVERABILITY
- Title must be under 60 chars, keyword-rich, provocative
- Meta description under 160 chars with primary keyword in first 50 chars
- Use H2/H3 subheadings every 200-300 words for scanability
- Include the primary keyword in the first 100 words of content
- Use semantic variations of the keyword throughout

### WRITING STYLE FOR VIRALITY
- Short paragraphs (2-3 sentences max)
- Use line breaks liberally — LinkedIn rewards white space
- Include data tables with shocking comparisons
- Use "you" language — make it personal and confrontational
- Include 1-2 analogies or metaphors that make complex ideas simple
- End sections with micro-CTAs or questions to drive comments
- Use emojis strategically: 🚨 for alerts, 💰 for money, 📊 for data, ⚠️ for warnings, ✅ for solutions

### EMOTIONAL TRIGGERS (use at least 3 per post)
- Fear of missing out (competitors doing it better)
- Pain of wasting money (specific dollar amounts)
- Urgency (market is shifting NOW)
- Authority (cite McKinsey, Gartner, HubSpot, Forrester, Bloomberg)
- Social proof (X% of companies, industry benchmarks)
- Curiosity gap (tease insights before revealing)

### MANDATORY: USE STRATEGIC INTELLIGENCE DATA
- Always cite specific statistics from the Strategic Knowledge Base above
- Reference real frameworks (GEO, Hub-and-Spoke, Rhythmic Architecture, No-Call Sales System)
- Use real company examples (Tesla $0 ad spend, Apple's 4-quadrant focus)
- Reference AI search metrics (AI Visibility Score, Citation Share, Share of AI Voice)
- Include 2026-specific data points to establish recency and authority

### STRUCTURE FOR MAXIMUM ENGAGEMENT
1. 🔥 HOOK (scroll-stopping first 2 lines with shocking stat or bold claim)
2. 📊 THE PROBLEM (data-driven breakdown with dollar amounts, tables)
3. ⚠️ WHY IT HAPPENS (3-5 common mistakes, relatable scenarios)
4. ✅ THE FIX (actionable framework, step-by-step, what the right approach looks like)
5. 🏢 HOW AETHERIS HELPS (14-Day Operational Systems Diagnostic as Co-CEO, $5,000-$10,000 — Joseph Toney embeds into your business for 14 days to find every gap)
6. 💬 CTA that drives comments: end with a specific question like "What's the biggest operational gap you've uncovered? Drop it below 👇"
7. Contact block formatted exactly as:

---

**Ready to stop the bleeding?**

📧 [aetheris.technology@outlook.com](mailto:aetheris.technology@outlook.com)
📞 (317) 376-2110
🔗 [Connect with Joseph Toney on LinkedIn](https://www.linkedin.com/in/aisystemsarchitect)
📋 [View the 14-Day Diagnostic Breakdown](https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s)

### HASHTAG RULES
- Use exactly 5 trending LinkedIn hashtags from this pool: ${trendingTags.join(', ')}
- MAXIMUM 5 hashtags total — all should be high-volume business/AI/technology hashtags
- Mix broad (high-follower) hashtags with niche specific ones
- Do NOT include #TheArchitect or #AetherisTechnology

Posts should be 2,500-3,000 words. Write in markdown format.
Reference specific AI models by name (GPT, Gemini, Claude, Perplexity) to show expertise.
Include industry-specific examples with real company sizes and dollar amounts.

CRITICAL: Return valid JSON. Escape all special characters in strings properly. Use \\n for newlines within JSON string values. Do not use literal newlines inside JSON string values. Escape backslashes as \\\\ and quotes as \\".`;

    const userPrompt = `Write a LinkedIn-optimized blog post about: "${angle}"

Category: ${categoryObj.category}
Suggested hook formula to adapt: "${suggestedHook}"

Make it specific, data-driven, and hard-hitting. The post should be DESIGNED TO TREND on LinkedIn.

Requirements:
- Open with a scroll-stopping hook (under 8 words for the first line)
- Include at least 2 data tables with shocking comparisons
- Use emojis strategically throughout (🚨💰📊⚠️✅🔥)
- End with an engagement-driving question (not just "agree?")
- Every section should have a mini-hook subheading
- Include specific dollar amounts, percentages, and timeframes
- The reader should feel UNCOMFORTABLE about how they're currently doing things
- MUST cite at least 3-5 specific statistics from the Strategic Knowledge Base
- MUST reference at least 1 strategic framework (GEO, Hub-and-Spoke, No-Call Sales, Rhythmic Architecture)
- Position Aetheris and Joseph Toney as the Co-CEO who steps in to fix these problems

Return ONLY a valid JSON object with these fields:
- title: A provocative, SEO-optimized title under 60 chars (no quotes around it)
- slug: URL-friendly slug (lowercase, hyphens, no special chars)
- excerpt: A LinkedIn-style hook that creates a curiosity gap (under 200 chars). This should make someone NEED to click.
- content: Full markdown blog post (2500-3000 words) with emojis, tables, and LinkedIn formatting. IMPORTANT: Use \\n for newlines, escape all special chars for valid JSON.
- tags: Array starting with "TheArchitect", "AetherisTechnology", then exactly 3 trending hashtags (5 total max)
- meta_description: SEO meta description under 160 chars with primary keyword in first 50 chars
- location_focus: The industry or business area this targets
- linkedin_hook: The standalone 1-2 line hook that could be used as a LinkedIn post teaser

IMPORTANT: The entire response must be parseable by JSON.parse(). Do not include any text outside the JSON object.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content returned from AI");
    }

    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let postData;
    try {
      postData = JSON.parse(jsonStr);
    } catch (_e1) {
      const objMatch = rawContent.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          postData = JSON.parse(objMatch[0]);
        } catch (_e2) {
          let fixed = objMatch[0];
          fixed = fixed.replace(/[\x00-\x1F\x7F]/g, (ch: string) => {
            if (ch === '\n') return '\\n';
            if (ch === '\r') return '\\r';
            if (ch === '\t') return '\\t';
            return '';
          });
          postData = JSON.parse(fixed);
        }
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    let tags = postData.tags || [];
    tags = tags.filter((t: string) => !MANDATORY_TAGS.includes(t));
    tags = [...MANDATORY_TAGS, ...tags];
    tags = tags.slice(0, 5);

    const { data: existing } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("slug", postData.slug)
      .maybeSingle();

    if (existing) {
      postData.slug = `${postData.slug}-${Date.now()}`;
    }

    const { data: insertedPost, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: postData.title,
        slug: postData.slug,
        excerpt: postData.excerpt,
        content: postData.content,
        author: "Aetheris AI Team",
        tags,
        meta_description: postData.meta_description,
        location_focus: postData.location_focus,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to insert blog post: ${insertError.message}`);
    }

    console.log("Blog post created:", insertedPost.title, "| Tags:", tags.join(", "));

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          id: insertedPost.id,
          title: insertedPost.title,
          slug: insertedPost.slug,
          tags,
          linkedin_hook: postData.linkedin_hook || postData.excerpt,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-blog error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
