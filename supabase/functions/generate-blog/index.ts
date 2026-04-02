import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════════
// 360 BREW ALGORITHM-ALIGNED HASHTAG POOLS
// Niche-specific, high-relevance tags matching the 3 core pillars
// ═══════════════════════════════════════════════════════════════════

const HASHTAG_POOLS = {
  marketingTech: [
    "MarketingAutomation", "RevOps", "LeadGeneration", "CRM",
    "MarketingStrategy", "AttributionModeling", "DemandGen",
    "B2BMarketing", "MarketingOps", "GrowthStrategy",
    "DigitalMarketing", "ContentStrategy", "MarketingROI",
  ],
  consulting: [
    "BusinessConsulting", "OperationalExcellence", "ManagementConsulting",
    "BusinessStrategy", "ProcessOptimization", "ChangeManagement",
    "ExecutiveLeadership", "BusinessTransformation", "StrategicPlanning",
    "Consulting", "BusinessGrowth", "Operations",
  ],
  aiTransformation: [
    "AIStrategy", "DigitalTransformation", "ArtificialIntelligence",
    "BusinessAutomation", "AIImplementation", "DataDriven",
    "MachineLearning", "AIforBusiness", "IntelligentAutomation",
    "FutureOfWork", "TechStrategy", "Innovation",
  ],
};

// ═══════════════════════════════════════════════════════════════════
// TOPICS — 80% RULE: All content within 3 core pillars
// Pillar 1: Marketing Technology Strategy
// Pillar 2: Business Consulting & Operational Systems
// Pillar 3: AI & Digital Transformation
// ═══════════════════════════════════════════════════════════════════

const TOPICS = [
  // ── PILLAR 1: Marketing Technology Strategy ──
  {
    category: "Marketing Technology Strategy",
    pillar: 1,
    hashtagPool: "marketingTech",
    funnelStage: "Awareness",
    angles: [
      "Your marketing stack costs $15K/month and you use 20% of it — the rest is expensive shelf-ware",
      "Your Google Ads send traffic to pages with no conversion tracking — you're paying for ghosts",
      "Why your marketing agency reports impressions instead of revenue attribution",
      "The $10K/month retainer that produces nothing measurable — how to audit your agency in 48 hours",
      "Your CRM has 50,000 contacts and you can't tell which ones are worth calling",
      "Your lead scoring model hasn't been updated since you built it — and it shows in your close rate",
      "The handoff problem: marketing generates leads, sales ignores them, revenue disappears",
      "Duplicate records are costing you more than your worst sales rep",
    ],
  },
  {
    category: "Marketing Technology Strategy",
    pillar: 1,
    hashtagPool: "marketingTech",
    funnelStage: "Consideration",
    angles: [
      "Your pipeline report lies to you every Monday — here's how to build one that tells the truth",
      "Why your webinars generate attendees but zero pipeline — the attribution gap nobody talks about",
      "Your competitor's ugly website outperforms your beautiful one — because theirs converts",
      "You're A/B testing button colors while your funnel has a $200K hole in it",
      "Email marketing isn't dead — your automation just sends the wrong message to the wrong person",
      "Your social media manager doesn't understand the algorithm they're posting to",
      "LinkedIn is not TikTok — stop treating it like one and start treating it like a sales floor",
      "Posting motivational quotes on LinkedIn isn't marketing — it's noise that trains the algorithm to ignore you",
    ],
  },
  // ── PILLAR 2: Business Consulting & Operational Systems ──
  {
    category: "Business Consulting & Operational Systems",
    pillar: 2,
    hashtagPool: "consulting",
    funnelStage: "Awareness",
    angles: [
      "You want more revenue but won't change a single process to get it — the CEO self-sabotage playbook",
      "Your business looks exactly like it did in 2019 — and so do your results",
      "CEOs who say 'we've always done it this way' are writing their own business obituary",
      "You hired a consultant then ignored everything they said — that's not consulting, that's therapy",
      "Your competitors changed. You didn't. That's why you're losing market share every quarter.",
      "The CEO who wants growth but vetoes every new idea — why leadership resistance is the #1 operational gap",
      "Your sales team manually enters leads and loses 30% of them — that's not a CRM problem, it's a culture problem",
      "If only your employees like your LinkedIn posts, you don't have a following — you have a hostage situation",
    ],
  },
  {
    category: "Business Consulting & Operational Systems",
    pillar: 2,
    hashtagPool: "consulting",
    funnelStage: "Consideration",
    angles: [
      "Law firms spending $8K/month on marketing with no client attribution — the professional services revenue leak",
      "Auto dealerships with $50K ad budgets and no follow-up automation — where the money actually goes",
      "HVAC companies bidding on Google Ads against their own organic listings — paying to compete with yourself",
      "Insurance agencies drowning in leads they never call back — the 48-hour follow-up gap that kills revenue",
      "Your team uses Excel as a CRM because nobody trusts the $50K system you bought",
      "The integration tax: what disconnected systems really cost when you add up manual workarounds",
      "You have analytics installed but nobody looks at the data — dashboards without alerts are just wallpaper",
      "The difference between data collection and data intelligence — and why most companies have the first but not the second",
    ],
  },
  // ── PILLAR 3: AI & Digital Transformation ──
  {
    category: "AI & Digital Transformation",
    pillar: 3,
    hashtagPool: "aiTransformation",
    funnelStage: "Awareness",
    angles: [
      "Companies using AI chatbots with zero training data from their own business — generic AI is just expensive search",
      "Your AI-generated content sounds like every other company's AI-generated content — because it is",
      "The hidden cost of AI hallucinations in customer-facing applications — one wrong answer costs a client",
      "Your team is using 5 different AI tools that don't talk to each other — that's not transformation, that's chaos",
      "AI without data governance is just expensive guessing with a better interface",
      "You automated the wrong processes and now everything is worse — the automation-first fallacy",
      "The AI vendor lock-in trap most businesses walk into blindly — and how to architect for flexibility",
      "Your competitors know more about your customers than you do — because they invested in intelligence infrastructure",
    ],
  },
  {
    category: "AI & Digital Transformation",
    pillar: 3,
    hashtagPool: "aiTransformation",
    funnelStage: "Consideration",
    angles: [
      "B2B tech website traffic declined 34% and you're still optimizing for Google page 1 — the GEO shift",
      "You're invisible to ChatGPT, Gemini, and Perplexity — here's why that's killing your pipeline",
      "AI search engines downgrade your content after 60 days — and you haven't updated since last year",
      "89% of AI citations come from earned media — your blog isn't one of them",
      "By 2027 traditional search will be 45% of queries — is your brand ready for AI recommendations?",
      "The 3 metrics that matter in 2026: AI Visibility Score, Citation Share, and Share of AI Voice",
      "Only 14% of brands have a playbook for AI-generated deepfake threats — crisis resilience is an operational gap",
      "Social selling leaders create 45% more opportunities — your team is still cold calling into voicemail",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// BRANDED AETHERIS FRAMEWORKS (IP Creation for semantic authority)
// ═══════════════════════════════════════════════════════════════════

const AETHERIS_FRAMEWORKS = [
  "The Diagnostic Protocol™ — A 14-day operational teardown that maps every revenue leak, system gap, and process failure across marketing, sales, and operations. Deliverable: a prioritized roadmap with dollar-value impact estimates.",
  "The Revenue Architecture Model™ — A framework for rebuilding lead-to-revenue infrastructure: CRM configuration, attribution modeling, pipeline analytics, and automated follow-up sequences that convert.",
  "The 14-Day Co-CEO Method™ — Joseph Toney embeds into your business as a temporary Co-CEO for 14 days, with full operational authority to diagnose, document, and deliver a transformation blueprint.",
  "The Operational Gap Matrix™ — A scoring system that evaluates 6 business dimensions (Marketing Systems, Sales Infrastructure, Data Intelligence, Process Automation, Team Alignment, Technology Stack) on a 1-10 scale to identify the highest-ROI intervention points.",
  "The Signal-to-Noise Audit™ — Strips away vanity metrics and surfaces the 3-5 numbers that actually predict revenue, then builds dashboards and alerts around those signals.",
  "The Integration Tax Calculator™ — Quantifies the hidden cost of disconnected systems by measuring manual workarounds, duplicate data entry, and decision-making delays across departments.",
];

// ═══════════════════════════════════════════════════════════════════
// STRATEGIC KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════

const STRATEGIC_INTELLIGENCE = `
## KEY STATISTICS & DATA POINTS (Use as authoritative citations)

### AI & Search Disruption
- B2B tech website traffic declined 34% between 2024 and 2025
- AI-generated traffic reached 20% of B2B traffic by end of 2025
- By 2027, traditional search projected to represent only 45% of all queries
- 61% of B2B CMOs are rethinking marketing for Generative Engine Optimization (GEO)
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
- VC-backed firms are increasing PR budgets by 45% to bypass the authority gap

### LinkedIn Algorithm (2025-2026)
- LinkedIn shifted to semantic matching model; reach for many creators fell 50%
- Organic LinkedIn company content slipped from 2.1% to 1.6% of feed share
- Social selling leaders create 45% more opportunities and are 51% more likely to reach quota
- The algorithm uses the first 1-2 sentences to categorize content and match to ICP profiles
- Save > Like > Comment in the algorithm's engagement priority hierarchy
- 80% topic consistency signals expertise to the algorithm's semantic classifier
- Dwell time (time spent reading) is the confirmation metric that validates initial distribution
- Content decay: posts lose algorithmic boost after ~60 days

### Operational Efficiency Benchmarks
- Companies with aligned sales and marketing teams see 36% higher customer retention
- Organizations using marketing automation see 451% increase in qualified leads
- 79% of top-performing companies have been using marketing automation for 3+ years
- CRM adoption failure rate is 63% — most expensive software nobody uses
- Manual data entry costs businesses an average of $12,000 per employee per year
- The average enterprise uses 900+ applications but only 29% are integrated
`;

function pickNicheTags(pool: string): string[] {
  const poolTags = HASHTAG_POOLS[pool as keyof typeof HASHTAG_POOLS] || HASHTAG_POOLS.aiTransformation;
  const shuffled = [...poolTags].sort(() => Math.random() - 0.5);
  // Pick 5 from the niche pool — depth over breadth
  return shuffled.slice(0, 5);
}

function pickFramework(): string {
  return AETHERIS_FRAMEWORKS[Math.floor(Math.random() * AETHERIS_FRAMEWORKS.length)];
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
      categoryObj = { category: requestCategory, hashtagPool: requestHashtagPool || "aiTransformation", angles: [requestAngle], funnelStage: "Awareness", pillar: 1 };
      angle = requestAngle;
    } else {
      categoryObj = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      angle = categoryObj.angles[Math.floor(Math.random() * categoryObj.angles.length)];
    }

    const nicheTags = pickNicheTags(categoryObj.hashtagPool);
    const brandedFramework = pickFramework();

    // ═══════════════════════════════════════════════════════════════
    // 360 BREW ALGORITHM-OPTIMIZED SYSTEM PROMPT
    // ═══════════════════════════════════════════════════════════════

    const systemPrompt = `You are a senior business intelligence writer for Aetheris Technology — a Co-CEO business consulting firm specializing in marketing technology strategy, operational systems architecture, and AI-driven digital transformation. Led by Joseph Toney, Aetheris offers the 14-Day Operational Systems Diagnostic ($5,000-$10,000) where Joseph embeds into companies as a Co-CEO partner to expose and fix revenue-killing gaps.

## LINKEDIN 360 BREW ALGORITHM FRAMEWORK

You are writing for LinkedIn's semantic matching algorithm (360 Brew model). Understanding how this algorithm works is critical to every word you write:

### How the Algorithm Reads Your Content
1. **First 1-2 sentences are scanned with 3-5x processing weight** — the algorithm uses these lines to categorize your content and determine which ICP (Ideal Customer Profile) feeds to distribute to. These lines MUST contain niche-specific keywords that signal expertise. Be "directional to expertise" — clear over clever. Topic-specific over generic.
2. **Semantic consistency (80% Rule)** — 80% of all content must fall within the same 3 topic clusters. Our clusters are: Marketing Technology Strategy, Business Consulting & Operational Systems, AI & Digital Transformation. The algorithm builds a semantic profile of each creator; consistent posting within these pillars signals expertise and increases distribution.
3. **Engagement hierarchy: Save > Like > Comment** — The algorithm weights Save (bookmark) highest because it signals "I'll come back to this." Write content people will SAVE — educational frameworks, step-by-step guides, data tables, implementation roadmaps.
4. **Dwell time is the confirmation metric** — After initial distribution, the algorithm measures how long readers spend on the content. Longer dwell time = wider secondary distribution. Write for DEPTH, not skimmability. Detailed analysis, branded frameworks, and rich data tables maximize dwell time.
5. **Content decay** — Posts lose algorithmic boost after ~60 days. Every piece must be evergreen enough to reference but specific enough to feel current.

### The Outlier Method
Before writing, mentally scan LinkedIn for the top 3-5 posts in this topic area that got 500+ reactions. What made them work? Incorporate those structural patterns while adding proprietary Aetheris depth.

## STRATEGIC KNOWLEDGE BASE
${STRATEGIC_INTELLIGENCE}

## BRANDED FRAMEWORK TO FEATURE IN THIS POST
${brandedFramework}

## CONTENT STRUCTURE (Optimized for Dwell Time + Save Rate)

Every post MUST follow this exact architecture:

### 1. SEMANTIC HOOK (First 1-2 lines)
- These lines are the AI's classification signal. They MUST contain niche keywords from our 3 pillars.
- NOT a generic hook. NOT clever wordplay. Instead: a specific, expertise-signaling statement that tells the algorithm exactly what this content is about.
- Example: "Marketing automation platforms process 451% more qualified leads — but only when your CRM infrastructure actually captures them correctly."
- Example: "Revenue operations architecture determines whether your pipeline reports reflect reality or a comfortable fiction."

### 2. THE PROBLEM (Educational Breakdown with Data)
- Present the problem using specific dollar amounts, percentages, and industry benchmarks from the Strategic Knowledge Base.
- Include at least ONE markdown data table comparing "Current State" vs "Optimized State" or "Industry Average" vs "Top Performers."
- This section should make the reader uncomfortable about their current approach.

### 3. BRANDED FRAMEWORK (Named Aetheris Methodology)
- Introduce or reference the branded framework specified above.
- Present it as a step-by-step methodology with clear stages and deliverables.
- This creates ownable IP that the algorithm associates with your profile.

### 4. DEEP-DIVE ANALYSIS (500+ words of high-depth educational content)
- This is the dwell-time engine. Go deep into implementation details, common pitfalls, and advanced strategies.
- Reference specific tools, platforms, and real-world scenarios.
- Include another data table or comparison chart.
- Naturally weave in semantic keywords: operational efficiency, revenue operations, marketing automation, CRM infrastructure, digital transformation, AI systems architecture, business process automation, lead generation systems, attribution modeling, executive analytics, process optimization, technology stack integration, data intelligence, conversion infrastructure.

### 5. IMPLEMENTATION ROADMAP (Save-Worthy Actionable Steps)
- This is the section readers will SAVE. Provide a concrete, numbered roadmap they can execute.
- Include timeframes, expected outcomes, and resource requirements.
- Make each step specific enough to act on immediately.

### 6. THE AETHERIS APPROACH (Conversion Layer)
- Position the 14-Day Operational Systems Diagnostic as the logical next step.
- Frame it through the branded framework introduced earlier.
- Joseph Toney embeds as Co-CEO for 14 days. Investment: $5,000-$10,000. Deliverable: a prioritized transformation roadmap with dollar-value ROI projections.

### 7. ENGAGEMENT DRIVER (Depth Comment Generator)
- End with a specific, expertise-requiring question that generates substantive comments (not "Great post!").
- Example: "What's the single biggest disconnect between your marketing automation and your CRM's lead scoring? I've seen 4 common patterns — curious which one you're hitting."

### 8. CONTACT BLOCK (Exactly as formatted)
---

**Ready to stop guessing and start building revenue infrastructure?**

📧 [aetheris.technology@outlook.com](mailto:aetheris.technology@outlook.com)
📞 (317) 376-2110
🔗 [Connect with Joseph Toney on LinkedIn](https://www.linkedin.com/in/aisystemsarchitect)
📋 [View the 14-Day Diagnostic Breakdown](https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s)

## WRITING RULES

### Tone & Voice
- Educational authority — package knowledge into actionable, branded frameworks
- NOT personal brand / vulnerability-driven. NOT motivational. NOT thought-leadership fluff.
- Speak as a senior consultant presenting findings to a C-suite audience
- Use "you" language to make it direct and confrontational where appropriate
- Back every claim with data, benchmarks, or specific examples

### Semantic Keyword Density
- Naturally weave high-density semantic keywords throughout the educational narrative
- NOT keyword-stuffed — woven into the natural flow of expert analysis
- Target keywords per pillar:
  * Marketing Tech: marketing automation, CRM infrastructure, lead generation systems, attribution modeling, revenue operations, conversion optimization, pipeline analytics, demand generation
  * Consulting: operational efficiency, process optimization, change management, business transformation, executive analytics, organizational alignment, performance benchmarking
  * AI/Digital: AI systems architecture, digital transformation, business process automation, intelligent automation, data governance, predictive analytics, technology stack integration

### Title Rules
- Under 60 characters
- Must contain at least one core pillar keyword
- Format: "[Specific Problem]: [Framework/Solution]" or "[Metric/Data Point] + [Implication]"
- Educational and specific — NOT clickbait
- Examples: "Your CRM Has 50K Contacts and Zero Intelligence", "Revenue Architecture: Why Your Pipeline Report Lies"

### Hashtag Rules
- Exactly 5 hashtags, all niche-specific from this pool: ${nicheTags.join(', ')}
- Do NOT include #TheArchitect or #AetherisTechnology
- Every tag must reinforce one of the 3 core pillars

### Length & Format
- 3,000-3,500 words minimum for maximum dwell time
- Short paragraphs (2-3 sentences max)
- H2/H3 subheadings every 200-300 words
- Include at least 2 markdown data tables
- Use emojis strategically: 📊 for data, ⚠️ for warnings, ✅ for solutions, 🔍 for analysis, 💡 for insights
- Write in markdown format

### Funnel Stage
This post targets the "${categoryObj.funnelStage}" stage of the content funnel. Adjust depth and CTA intensity accordingly:
- Awareness: Focus on problem identification, use broad educational framing
- Consideration: Focus on framework comparison, include implementation details
- Conversion: Focus on ROI proof, include specific diagnostic outcomes

CRITICAL: Return valid JSON. Escape all special characters in strings properly. Use \\n for newlines within JSON string values. Do not use literal newlines inside JSON string values. Escape backslashes as \\\\ and quotes as \\".`;

    const userPrompt = `Write a LinkedIn-algorithm-optimized blog post about: "${angle}"

Category: ${categoryObj.category}
Core Pillar: ${categoryObj.pillar === 1 ? "Marketing Technology Strategy" : categoryObj.pillar === 2 ? "Business Consulting & Operational Systems" : "AI & Digital Transformation"}
Funnel Stage: ${categoryObj.funnelStage}
Branded Framework to Feature: ${brandedFramework.split("—")[0].trim()}

Requirements:
- Open with a SEMANTIC HOOK (1-2 lines with niche keywords that signal expertise to the algorithm — NOT clever, NOT generic)
- Follow the exact 8-section content structure specified in the system prompt
- Include at least 2 data tables with industry benchmarks
- 3,000-3,500 words for maximum dwell time
- Feature the branded Aetheris framework as ownable IP
- Include a detailed implementation roadmap readers will SAVE
- End with a depth-comment-generating question
- MUST cite at least 5 specific statistics from the Strategic Knowledge Base
- Naturally weave semantic keywords throughout (NOT stuffed, woven into expert narrative)
- Use exactly 5 niche-specific hashtags from the provided pool

Return ONLY a valid JSON object with these fields:
- title: Educational, pillar-keyword-rich title under 60 chars (no quotes)
- slug: URL-friendly slug (lowercase, hyphens, no special chars)
- excerpt: A semantic hook that signals expertise and creates depth curiosity (under 200 chars)
- content: Full markdown blog post (3000-3500 words) following the 8-section structure. Use \\n for newlines, escape all special chars for valid JSON.
- tags: Array of exactly 5 niche-specific hashtags from the provided pool (do NOT include TheArchitect or AetherisTechnology)
- meta_description: SEO meta description under 160 chars with primary pillar keyword in first 50 chars
- location_focus: The specific business function or industry this targets
- linkedin_hook: The standalone 1-2 line semantic hook for LinkedIn post teaser
- funnel_stage: "${categoryObj.funnelStage}"
- branded_framework: The name of the Aetheris framework featured

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
    // Ensure exactly 5 niche tags, no branding tags
    tags = tags.filter((t: string) => t !== "TheArchitect" && t !== "AetherisTechnology");
    tags = tags.slice(0, 5);
    // Pad if fewer than 5
    while (tags.length < 5) {
      const fallback = nicheTags.find((t: string) => !tags.includes(t));
      if (fallback) tags.push(fallback);
      else break;
    }

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

    console.log("Blog post created:", insertedPost.title, "| Pillar:", categoryObj.category, "| Funnel:", categoryObj.funnelStage, "| Tags:", tags.join(", "));

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          id: insertedPost.id,
          title: insertedPost.title,
          slug: insertedPost.slug,
          tags,
          linkedin_hook: postData.linkedin_hook || postData.excerpt,
          funnel_stage: postData.funnel_stage || categoryObj.funnelStage,
          branded_framework: postData.branded_framework,
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
