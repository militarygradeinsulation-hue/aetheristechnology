import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MANDATORY_TAGS = ["TheArchitect", "AetherisTechnology"];

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
];

function pickTrendingTags(pool: string): string[] {
  const poolTags = TRENDING_HASHTAGS[pool as keyof typeof TRENDING_HASHTAGS] || TRENDING_HASHTAGS.ai;
  const crossPool = TRENDING_HASHTAGS.leadership;
  // Pick 2 from category pool + 1 from cross-pool for broader reach
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

    // Pick a random topic
    const categoryObj = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const angle = categoryObj.angles[Math.floor(Math.random() * categoryObj.angles.length)];
    const suggestedHook = pickHook();
    const trendingTags = pickTrendingTags(categoryObj.hashtagPool);

    const systemPrompt = `You are a sharp, no-BS business writer and LinkedIn content strategist for Aetheris Technology — an AI consulting firm that exposes how businesses waste money on bad AI implementations, disconnected marketing, and broken CRM systems.

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
- Include internal linking language (references to related topics)

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
- Authority (cite McKinsey, Gartner, HubSpot, Forrester)
- Social proof (X% of companies, industry benchmarks)
- Curiosity gap (tease insights before revealing)

### STRUCTURE FOR MAXIMUM ENGAGEMENT
1. 🔥 HOOK (scroll-stopping first 2 lines with shocking stat or bold claim)
2. 📊 THE PROBLEM (data-driven breakdown with dollar amounts, tables)
3. ⚠️ WHY IT HAPPENS (3-5 common mistakes, relatable scenarios)
4. ✅ THE FIX (actionable framework, step-by-step, what the right approach looks like)
5. 🏢 HOW AETHERIS HELPS (14-Day Operational Systems Diagnostic, $5,000-$10,000)
6. 💬 CTA that drives comments: end with a specific question like "What's the biggest CRM mistake you've seen? Drop it below 👇"
7. Contact block formatted exactly as:

---

**Ready to stop wasting money?**

📧 [aetheris.technology@outlook.com](mailto:aetheris.technology@outlook.com)
📞 (317) 376-2110
🔗 [Connect on LinkedIn](https://www.linkedin.com/in/aisystemsarchitect)

### HASHTAG RULES
- Always include these FIRST: #TheArchitect #AetherisTechnology
- Then add 3-5 trending LinkedIn hashtags from this pool: ${trendingTags.join(', ')}
- Mix broad (high-follower) hashtags with niche specific ones
- Format: #TheArchitect #AetherisTechnology #${trendingTags[0]} #${trendingTags[1]} #${trendingTags[2]} plus 1-2 topic-specific

Posts should be 2,500-3,000 words. Write in markdown format.
Reference specific AI models by name (GPT, Gemini, Claude) to show expertise.
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

Return ONLY a valid JSON object with these fields:
- title: A provocative, SEO-optimized title under 60 chars (no quotes around it)
- slug: URL-friendly slug (lowercase, hyphens, no special chars)
- excerpt: A LinkedIn-style hook that creates a curiosity gap (under 200 chars). This should make someone NEED to click.
- content: Full markdown blog post (2500-3000 words) with emojis, tables, and LinkedIn formatting. IMPORTANT: Use \\n for newlines, escape all special chars for valid JSON.
- tags: Array starting with "TheArchitect", "AetherisTechnology", then 3-5 trending hashtags relevant to the topic (e.g., "AI", "Sales", "DigitalTransformation", "Leadership")
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

    // Parse JSON from response (handle markdown code blocks)
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

    // Ensure mandatory tags are always first
    let tags = postData.tags || [];
    tags = tags.filter((t: string) => !MANDATORY_TAGS.includes(t));
    tags = [...MANDATORY_TAGS, ...tags];
    // Cap at 7 total hashtags (2 mandatory + 5 trending)
    tags = tags.slice(0, 7);

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("slug", postData.slug)
      .maybeSingle();

    if (existing) {
      postData.slug = `${postData.slug}-${Date.now()}`;
    }

    // Insert the blog post
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
