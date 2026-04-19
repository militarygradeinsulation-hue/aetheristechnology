import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════════
// PLAYGROUND & RECREATION INDUSTRY HASHTAG POOLS
// ═══════════════════════════════════════════════════════════════════

const HASHTAG_POOLS = {
  industryMarket: [
    "PlaygroundIndustry", "RecreationBusiness", "CommercialPlayground",
    "OutdoorRecreation", "PlayEquipment", "RecreationDesign",
    "InclusivePlay", "PlaygroundSafety", "ParkDesign", "CommunityRecreation",
  ],
  salesDigital: [
    "B2BMarketing", "HighTicketSales", "LuxuryBranding",
    "WebDesignFail", "CRMAutomation", "DigitalBrandMakeover",
    "SalesAutomation", "LeadConversion", "RecreationMarketing",
  ],
  growthTrends: [
    "EmergingMarkets", "PlaygroundTrends", "InclusiveDesign",
    "NaturePlay", "FitnessPlayground", "ADACompliance",
    "SmartPlayground", "SeniorFitness", "WaterPlay", "IndoorPlayground",
  ],
};

// ═══════════════════════════════════════════════════════════════════
// TOPICS — PLAYGROUND & RECREATION INDUSTRY ANGLES
// Raw. Blunt. Memorable.
// ═══════════════════════════════════════════════════════════════════

const TOPICS = [
  // ── Playground Industry Market Intelligence ──
  {
    category: "Playground Industry Market Intelligence",
    hashtagPool: "industryMarket",
    funnelStage: "Awareness",
    angles: [
      "The commercial playground market hit $14B globally and most manufacturers still sell like it's 2005 — static catalogs, dead websites, zero follow-up",
      "Indoor playground franchises are exploding at 12% CAGR while traditional manufacturers fight over the same municipal RFPs",
      "Nature play and adventure playgrounds are the fastest-growing segment and 90% of companies can't even explain what they sell",
      "The inclusive play equipment mandate is a $2B opportunity most companies are treating as a compliance checkbox",
      "Senior fitness parks are a $500M emerging market and nobody in the playground industry is talking about it",
      "Water play installations generate 3x the revenue per project of traditional playgrounds — yet most companies don't even list them",
    ],
  },
  // ── Digital Failures in Recreation ──
  {
    category: "Digital Failures in Recreation",
    hashtagPool: "salesDigital",
    funnelStage: "Consideration",
    angles: [
      "Your playground company website looks like it was built in 2012 because it was — and your premium products suffer for it",
      "You sell $200K custom playground systems but your social media looks like a daycare newsletter",
      "Your competitors are winning $500K municipal contracts because their website has 3D renderings and yours has blurry JPEGs from 2018",
      "Recreation companies spending $8K/month on trade shows while their Google listing has 2 reviews and wrong hours",
      "You have a $50K product line and zero email sequences — every lead that doesn't buy in 48 hours is gone forever",
      "Your sales rep closes one $300K deal a quarter but can't remember the last time a lead came from the website",
      "The playground industry trade show circuit is a $50K annual habit that produces business cards nobody follows up on",
    ],
  },
  // ── Growth & Emerging Markets ──
  {
    category: "Growth & Emerging Markets",
    hashtagPool: "growthTrends",
    funnelStage: "Awareness",
    angles: [
      "Smart playgrounds with IoT sensors and usage analytics are coming — and they'll make traditional equipment look like typewriters",
      "The Middle East and Southeast Asia are building $100M recreation mega-projects and US manufacturers are asleep",
      "Inclusive play isn't charity — ADA-compliant playground projects average 40% higher budgets than standard installations",
      "Adult fitness playgrounds are the fastest path to recurring municipal revenue and nobody's pitching them",
      "The commercial recreation industry hasn't had a real brand innovation in 20 years — everyone looks the same, sells the same, loses the same",
      "Municipalities are shifting from lowest-bid procurement to value-based selection and most playground companies don't know how to sell value",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// BRANDED AETHERIS FRAMEWORKS — RECREATION INDUSTRY
// ═══════════════════════════════════════════════════════════════════

const AETHERIS_FRAMEWORKS = [
  "The Playground Brand Overhaul™ — A complete digital repositioning: website rebuild, product photography, 3D rendering integration, and social media strategy that makes $200K systems look like $200K systems.",
  "The Recreation Revenue Engine™ — CRM automation, lead scoring, and follow-up sequences designed for long-cycle B2B playground sales where one lost deal costs $50K-$500K.",
  "The Specification Domination Strategy™ — Getting your products spec'd into architectural plans and municipal RFPs before the bid even opens. Control the spec, control the deal.",
  "The High-Ticket Visual Authority System™ — Why your competitors close bigger deals: their digital presence matches their product quality. Yours doesn't. We fix that.",
];

// ═══════════════════════════════════════════════════════════════════
// STRATEGIC KNOWLEDGE BASE — RECREATION INDUSTRY
// ═══════════════════════════════════════════════════════════════════

const STRATEGIC_INTELLIGENCE = `
## PLAYGROUND & RECREATION INDUSTRY DATA

### Global Market Size & Growth
- Global commercial playground equipment market: ~$14B (2025), projected $19B by 2030
- Indoor playground & entertainment market growing at 12% CAGR
- Nature play / adventure playground segment: fastest-growing category globally
- Water play installations average 3x revenue per project vs. traditional playground builds
- Inclusive play equipment segment: estimated $2B addressable market with 40% higher project budgets

### Emerging Markets & Segments
- Middle East & Southeast Asia: $100M+ recreation mega-projects in development
- Senior fitness parks: $500M emerging market, largely untapped by US manufacturers
- Adult outdoor fitness equipment: growing 15% annually as municipalities seek multi-generational parks
- Smart playgrounds (IoT-enabled usage tracking, safety sensors): early-stage but accelerating
- Indoor adventure parks & trampoline parks: saturating in US, booming in Asia-Pacific

### Industry Digital Gaps
- 73% of commercial playground company websites have not been redesigned in 5+ years
- Average playground manufacturer has fewer than 10 Google reviews
- Less than 15% of recreation companies use CRM automation for lead follow-up
- Trade show ROI is unmeasurable for 80% of exhibitors — $30K-$50K spent per show with no attribution
- 90% of playground companies have no email nurture sequence for inbound leads
- Municipal procurement cycles average 6-18 months — companies without automated follow-up lose 60%+ of pipeline

### Procurement & Sales Patterns
- Municipal playground budgets: $100K-$500K per project (inclusive/accessible projects trend higher)
- Specification-driven procurement: 65% of municipal contracts are won before the bid opens
- Architects and landscape designers influence 70% of commercial playground selections
- The average playground sales cycle: 9-14 months from initial contact to purchase order
- Companies that respond to RFIs within 24 hours win 3x more contracts than those responding in 72+ hours

### Digital Presence Benchmarks
- Top-performing playground companies generate 35%+ of leads from digital channels
- 3D renderings and virtual playground tours increase proposal win rates by 40%
- Companies with professional product photography close 25% more deals
- Video content (installation timelapses, product demos) increases website dwell time by 3x
- LinkedIn is the #1 B2B social platform for reaching municipal buyers and architects
`;

function pickNicheTags(pool: string): string[] {
  const poolTags = HASHTAG_POOLS[pool as keyof typeof HASHTAG_POOLS] || HASHTAG_POOLS.industryMarket;
  const shuffled = [...poolTags].sort(() => Math.random() - 0.5);
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
      categoryObj = { category: requestCategory, hashtagPool: requestHashtagPool || "industryMarket", angles: [requestAngle], funnelStage: "Awareness" };
      angle = requestAngle;
    } else {
      categoryObj = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      angle = categoryObj.angles[Math.floor(Math.random() * categoryObj.angles.length)];
    }

    const nicheTags = pickNicheTags(categoryObj.hashtagPool);
    const brandedFramework = pickFramework();

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM PROMPT — RAW, BLUNT, RECREATION INDUSTRY AUTHORITY
    // ═══════════════════════════════════════════════════════════════

    const systemPrompt = `You are a senior digital strategy writer for Aetheris Technology — a digital brand makeover and CRM automation firm built specifically for the playground and commercial recreation industry. Led by Joseph Toney, Aetheris provides complete digital repositioning for high-end playground manufacturers, commercial recreation companies, and outdoor fitness equipment brands so they can attract high-ticket clients and close sales twice as fast.

## TONE & VOICE — THIS IS NON-NEGOTIABLE

Write like you're telling a playground CEO the uncomfortable truth over whiskey. Raw. Blunt. No corporate speak. Short sentences that hit hard.

Use profanity-adjacent language — "garbage websites", "throwing money into a bonfire", "your brochure belongs in a time capsule", "your website is an embarrassment to your product." Make every paragraph memorable. If a reader can skim past it without flinching, rewrite it.

You are NOT writing generic marketing advice. You are writing specifically about the commercial playground and recreation equipment industry. Every example, every stat, every scenario should reference playground companies, recreation manufacturers, municipal buyers, architects, landscape designers, park departments, and the specific sales cycles of this industry.

Do NOT soften the message. Do NOT hedge. Do NOT use phrases like "consider" or "you might want to think about." Say what's broken and why it's costing them money.

## STRATEGIC KNOWLEDGE BASE
${STRATEGIC_INTELLIGENCE}

## BRANDED FRAMEWORK TO FEATURE IN THIS POST
${brandedFramework}

## CONTENT STRUCTURE (8 Mandatory Sections)

### 1. SEMANTIC HOOK (First 1-2 lines)
- A specific, brutal opening that immediately signals this is about the playground/recreation industry.
- NOT generic business advice. A playground CEO should read the first line and think "this person knows my industry."
- Example: "Your $200K inclusive playground system looks like a McDonald's PlayPlace on your website — and that's exactly why the architect spec'd your competitor instead."

### 2. THE PROBLEM (Educational Breakdown with Data)
- Present the problem using specific dollar amounts, percentages, and industry data from the Strategic Knowledge Base.
- Include at least ONE markdown data table comparing industry gaps.
- Make the reader uncomfortable about their current approach. Don't be polite about it.

### 3. BRANDED FRAMEWORK (Named Aetheris Methodology)
- Introduce or reference the branded framework specified above.
- Present it as a step-by-step methodology with clear stages and deliverables.
- Position it as the only serious approach to fixing the problem.

### 4. DEEP-DIVE ANALYSIS (500+ words)
- Go deep into the recreation industry specifics. Reference real scenarios: municipal RFP processes, architect specification workflows, trade show ROI calculations, playground safety certifications, ADA compliance requirements.
- Include another data table or comparison chart.
- This is where you prove you understand their business better than they do.

### 5. IMPLEMENTATION ROADMAP (Save-Worthy Actionable Steps)
- Concrete, numbered steps a playground company can execute.
- Include timeframes, expected outcomes, and resource requirements.
- Make each step specific to the recreation industry — not generic marketing advice.

### 6. THE AETHERIS APPROACH (Conversion Layer)
- Position the Digital Brand Makeover and CRM Automation System as the logical next step.
- Frame it through the branded framework introduced earlier.
- Aetheris provides: complete website rebuild with 3D rendering integration, professional product photography direction, social media strategy overhaul, CRM automation for long-cycle B2B playground sales, and specification-focused content that gets products into architectural plans.

### 7. ENGAGEMENT DRIVER (Depth Comment Generator)
- End with a specific, industry-requiring question.
- Example: "What's the last time a municipal buyer found your company through Google instead of a trade show? If you can't remember, that's the problem."

### 8. CONTACT BLOCK (Exactly as formatted)
---

**Your products deserve a digital presence that matches their quality. Let's build it.**

📧 [hello@aetheris.technology](mailto:hello@aetheris.technology)
📞 (317) 376-2110
🔗 [Connect with Joseph Toney on LinkedIn](https://www.linkedin.com/in/aisystemsarchitect)
🌐 [aetheris.technology](https://aetheris.technology)

## WRITING RULES

### Title Rules
- Under 60 characters
- Must reference the playground/recreation industry specifically
- Format: "[Blunt Problem]: [Industry Context]"
- Examples: "Your Playground Website Is Killing Your Sales", "Recreation Companies Can't Sell What They Can't Show"

### Hashtag Rules
- Exactly 5 hashtags from this pool: ${nicheTags.join(', ')}
- Do NOT include #TheArchitect or #AetherisTechnology

### Length & Format
- 3,000-3,500 words minimum
- Short paragraphs (2-3 sentences max). Punchy. Every sentence earns its place.
- H2/H3 subheadings every 200-300 words
- Include at least 2 markdown data tables with industry-specific data
- Use emojis strategically: 📊 for data, ⚠️ for warnings, ✅ for solutions, 🔍 for analysis, 💡 for insights
- Write in markdown format

### Funnel Stage
This post targets the "${categoryObj.funnelStage}" stage:
- Awareness: Focus on exposing industry-wide failures, use broad market data
- Consideration: Focus on specific solutions, include implementation details and ROI calculations

CRITICAL: Return valid JSON. Escape all special characters in strings properly. Use \\n for newlines within JSON string values. Do not use literal newlines inside JSON string values. Escape backslashes as \\\\ and quotes as \\".`;

    const userPrompt = `Write a raw, blunt, memorable blog post about the playground and recreation industry: "${angle}"

Category: ${categoryObj.category}
Funnel Stage: ${categoryObj.funnelStage}
Branded Framework to Feature: ${brandedFramework.split("—")[0].trim()}

Requirements:
- Open with a BRUTAL SEMANTIC HOOK specific to the playground/recreation industry
- Follow the exact 8-section content structure
- Include at least 2 data tables with recreation industry benchmarks
- 3,000-3,500 words
- Feature the branded Aetheris framework
- Include a detailed implementation roadmap readers will SAVE
- End with an industry-specific engagement question
- Cite at least 5 specific statistics from the Strategic Knowledge Base
- Every example must reference playground companies, recreation manufacturers, municipal buyers, or architects — NO generic business examples
- Use exactly 5 niche-specific hashtags from the provided pool
- Be raw and blunt. Make it memorable. No corporate fluff.

Return ONLY a valid JSON object with these fields:
- title: Blunt, industry-specific title under 60 chars (no quotes)
- slug: URL-friendly slug (lowercase, hyphens, no special chars)
- excerpt: A brutal hook that signals recreation industry expertise (under 200 chars)
- content: Full markdown blog post (3000-3500 words) following the 8-section structure. Use \\n for newlines, escape all special chars for valid JSON.
- tags: Array of exactly 5 niche-specific hashtags from the provided pool
- meta_description: SEO meta description under 160 chars referencing playground/recreation industry
- location_focus: The specific recreation segment or market this targets
- linkedin_hook: The standalone 1-2 line brutal hook for LinkedIn post teaser
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
    tags = tags.filter((t: string) => t !== "TheArchitect" && t !== "AetherisTechnology");
    tags = tags.slice(0, 5);
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
        author: "Aetheris AI",
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

    console.log("Blog post created:", insertedPost.title, "| Category:", categoryObj.category, "| Funnel:", categoryObj.funnelStage, "| Tags:", tags.join(", "));

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
