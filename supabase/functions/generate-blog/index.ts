import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { FORENSIC_BLUEPRINT_PROMPT } from "../_shared/contentBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════════
// HASHTAG POOLS — B2B FORENSICS & GROWTH
// ═══════════════════════════════════════════════════════════════════

const HASHTAG_POOLS = {
  revenueForensics: [
    "RevenueLeaks", "BusinessForensics", "LeakAudit", "PipelineDiagnostic",
    "CRMAutopsy", "RevenueRecovery", "SalesLeakage", "OperationalWaste",
    "ProfitDrain", "RevenueIntelligence",
  ],
  operationalIntel: [
    "OperationalForensics", "ProcessAutopsy", "VendorStackAudit",
    "AutomationROI", "EfficiencyDiagnostic", "BusinessOperations",
    "OperationalExcellence", "SystemsThinking", "WorkflowOptimization",
    "CostLeakage",
  ],
  aiTransformation: [
    "AIStrategy", "AIImplementation", "AIAdoption", "GEOStrategy",
    "AutonomousWorkforce", "AIforBusiness", "AITransformation",
    "MarTechAI", "PredictiveAnalytics", "AIConsulting",
  ],
  b2bGrowth: [
    "B2BMarketing", "LinkedInGrowth", "B2BSales", "DemandGeneration",
    "HighTicketSales", "B2BStrategy", "SalesEnablement",
    "MarketingStrategy", "LeadGeneration", "GrowthStrategy",
  ],
};

// ═══════════════════════════════════════════════════════════════════
// TOPICS — LINKEDIN GROWTH FRAMEWORK × BUSINESS FORENSICS
// ═══════════════════════════════════════════════════════════════════

const TOPICS = [
  // ── BRANDJACKING — Analyze brand decisions through the revenue leak lens ──
  {
    category: "Brandjacking",
    hashtagPool: "revenueForensics",
    funnelStage: "Awareness",
    growthFormat: "brandjack",
    angles: [
      "Salesforce just laid off 10% of their workforce while their CRM adoption rate sits at 26% — the tool isn't the problem, the implementation is the leak",
      "HubSpot's free CRM is the most expensive software you'll ever use — here's the hidden revenue drain nobody talks about",
      "McKinsey charges $500K for a strategy deck. We charge $2,500 for a Forensic Diagnostic that finds the actual leaks. Here's why the results are the same.",
      "Stripe just raised prices and nobody noticed because they buried it in 'platform fees' — this is exactly how your vendors are bleeding you dry",
      "Shopify's 'build your empire' marketing created a generation of businesses with beautiful storefronts and zero operational infrastructure",
      "Monday.com and Asana are in a feature war while their users can't answer one question: is this tool making us money or costing us money?",
    ],
  },
  // ── NEWSJACKING — Industry shifts through the Leak Audit lens ──
  {
    category: "Newsjacking",
    hashtagPool: "aiTransformation",
    funnelStage: "Awareness",
    growthFormat: "newsjack",
    angles: [
      "AI just replaced 4,000 customer service jobs at Klarna — but the real story is the 60% of businesses still running manual processes that AI could fix tomorrow",
      "Google's AI Overviews are destroying organic traffic — if your entire pipeline depends on SEO, you have a single point of failure that's about to break",
      "The SaaS pricing crisis of 2026: every tool you use raised prices 15-30% this year and your ops team didn't even notice the margin compression",
      "Remote work didn't kill productivity — it exposed that most businesses never had operational systems in the first place",
      "The AI consulting bubble is about to pop — 90% of 'AI consultants' have never shipped a production deployment",
      "LinkedIn just changed its algorithm again and your content strategy is still built on a 2023 playbook — here's what the data actually shows",
    ],
  },
  // ── NAMEJACKING — Reference figures the ICP follows ──
  {
    category: "Namejacking",
    hashtagPool: "b2bGrowth",
    funnelStage: "Awareness",
    growthFormat: "namejack",
    angles: [
      "Alex Hormozi says 'offer is everything' — he's wrong. Your offer doesn't matter if your delivery system leaks 40% of the value before the client sees it",
      "Satya Nadella turned Microsoft around by killing the 'know-it-all' culture — most B2B companies have the same disease but can't diagnose it because they're too busy selling",
      "Dharmesh Shah built HubSpot on inbound marketing and then admitted most companies execute it wrong — the leak isn't the strategy, it's the operational layer beneath it",
      "Sam Altman keeps saying AI will replace most jobs — what he's not saying is that most businesses can't even automate their invoicing yet",
      "Grant Cardone sells 10X thinking but never mentions the 10X operational waste that comes with scaling without systems",
      "Patrick Campbell sold ProfitWell to Paddle and proved that pricing intelligence is worth $200M — yet most B2B companies haven't audited their pricing in 3 years",
    ],
  },
  // ── HOT TAKES — Contrarian positions that force a side ──
  {
    category: "Hot Takes",
    hashtagPool: "operationalIntel",
    funnelStage: "Consideration",
    growthFormat: "hottake",
    angles: [
      "Your CRM is a liability, not an asset — and the $50K you spent on it is the least expensive part of the damage",
      "Most business consultants sell comfort, not change — that's why nothing improves after they leave",
      "Your marketing isn't broken. Your operations are. You just can't see it because you're measuring the wrong things.",
      "The reason your sales team misses quota isn't motivation or training — it's that 35% of their pipeline leaks out before it reaches a proposal",
      "AI won't save your business. Knowing where you're bleeding will. AI is just the tourniquet.",
      "If your business can't survive without you for 2 weeks, you don't have a business — you have a job with overhead",
    ],
  },
  // ── AUTHORITY / DEEP-DIVE — Forensic methodology posts ──
  {
    category: "Authority Deep-Dive",
    hashtagPool: "revenueForensics",
    funnelStage: "Consideration",
    growthFormat: "authority",
    angles: [
      "The 7-Step Leak Audit: exactly how we find the revenue your business is losing — step by step, with the diagnostic framework behind each one",
      "We ran forensic diagnostics on 50 businesses last year. Here are the 5 leaks that showed up in every single one.",
      "The anatomy of a $200K revenue leak: how one missing follow-up sequence cost a B2B company more than their entire marketing budget",
      "Why your P&L looks healthy but your cash flow is dying — the operational forensics behind margin compression",
      "The Forensic Diagnostic vs. a strategy session: what you actually get for $2,500 and why it pays for itself in the first finding",
      "Most businesses have 3-7 active revenue leaks running right now. Here's how to find yours in 48 hours without hiring a consultant.",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// BRANDED AETHERIS FRAMEWORKS — BUSINESS FORENSICS
// ═══════════════════════════════════════════════════════════════════

const AETHERIS_FRAMEWORKS = [
  "The Leak Audit™ — A 7-step forensic methodology that systematically identifies every point where revenue, margin, or operational capacity is being lost. From pipeline analysis to vendor stack audits, each step exposes a specific category of business hemorrhage.",
  "The Forensic Diagnostic ($2,500) — A 14-day deep-dive into your business operations that produces a prioritized map of every revenue leak, operational bottleneck, and margin drain. The fee is applied toward any engagement, making the diagnosis free when you fix the problem.",
  "The Revenue Autopsy Framework™ — Post-mortem analysis of lost deals, churned clients, and missed targets to identify the systemic operational failures that caused each loss. Not what went wrong — why the system allowed it to happen.",
  "The Operational X-Ray™ — A rapid diagnostic that maps the gap between what your business claims to do and what it actually does, exposing the process failures, data gaps, and human bottlenecks that create revenue leakage.",
];

// ═══════════════════════════════════════════════════════════════════
// STRATEGIC KNOWLEDGE BASE — B2B OPERATIONAL FORENSICS
// ═══════════════════════════════════════════════════════════════════

const STRATEGIC_INTELLIGENCE = `
## B2B OPERATIONAL & REVENUE FORENSICS DATA

### CRM & Sales Infrastructure
- CRM adoption rate across enterprises: 26% (Salesforce's own research, 2024)
- 68% of CRM implementations fail to meet objectives (Merkle Group)
- Average B2B company loses 35% of pipeline to preventable process failures
- Sales reps spend only 28% of their time actually selling (Salesforce State of Sales)
- Companies responding to leads within 5 minutes are 9x more likely to convert (InsideSales.com)
- 80% of sales require 5+ follow-ups, but 44% of salespeople give up after 1 (Brevet Group)

### Marketing & Revenue Attribution
- 65% of B2B marketers cannot attribute revenue to specific campaigns (Demand Gen Report)
- Average B2B company wastes 26% of marketing budget on channels with no measurable ROI
- Only 22% of businesses are satisfied with their conversion rates (Econsultancy)
- B2B companies with aligned sales and marketing teams see 36% higher retention (MarketingProfs)
- The average cost of a bad hire in B2B sales: $115,000 (DePaul University)

### Operational Waste & Process Failures
- Knowledge workers spend 60% of their time on "work about work" — not actual value creation (Asana)
- The average mid-market company has 137 SaaS subscriptions, 30% unused (Zylo)
- Manual data entry costs businesses $878B annually in the US alone (IDC)
- Process inefficiency costs organizations 20-30% of revenue annually (IDC)
- 73% of businesses have no documented operational playbook for their core revenue process

### AI Adoption & Transformation
- 83% of companies say AI is a top priority, but only 23% have deployed it in production (McKinsey)
- Companies with successful AI deployments see 3-15% revenue increase within 12 months
- 87% of AI projects never make it past the POC stage (Gartner)
- Average time from AI pilot to production: 9-18 months (most companies never get there)
- Businesses using AI for sales forecasting improve accuracy by 50% (Harvard Business Review)

### Consulting & Professional Services
- The global management consulting market: $330B (2025)
- Average consulting engagement: $150K-$500K with no measurable outcome guarantee
- 70% of change management initiatives fail to achieve their goals (McKinsey)
- Companies that measure consulting ROI within 90 days see 4x better outcomes
- The Forensic Diagnostic at $2,500 with fee applied toward engagement converts at 72%
`;

function pickNicheTags(pool: string): string[] {
  const poolTags = HASHTAG_POOLS[pool as keyof typeof HASHTAG_POOLS] || HASHTAG_POOLS.revenueForensics;
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
      categoryObj = { category: requestCategory, hashtagPool: requestHashtagPool || "revenueForensics", angles: [requestAngle], funnelStage: "Awareness", growthFormat: "authority" };
      angle = requestAngle;
    } else {
      categoryObj = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      angle = categoryObj.angles[Math.floor(Math.random() * categoryObj.angles.length)];
    }

    const nicheTags = pickNicheTags(categoryObj.hashtagPool);
    const brandedFramework = pickFramework();

    // Determine day-of-week content format guidance
    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
    const dayFormats: Record<number, string> = {
      1: "Growth format: Brandjack or Newsjack. Goal: New audience acquisition. Write for maximum reach — borrow the gravity of the brand/event to anchor your forensic insight.",
      2: "Authority format: Deep-dive. Goal: Trust with existing followers. Go deep on methodology, show the forensic rigor.",
      3: "Case Study format: Forensic Report. Goal: Social proof. Use anonymized before/after scenarios with specific metrics.",
      4: "Growth format: Namejack or Hot Take. Goal: Scale visibility. Force a reaction — the reader must agree or disagree.",
      5: "Niche Expertise format: Q&A / methodology. Goal: Engagement and retention. Answer the question your ICP is too embarrassed to ask.",
    };
    const dayGuidance = dayFormats[dayOfWeek] || "Authority format: default to forensic methodology deep-dive.";

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM PROMPT — BUSINESS FORENSICS OPERATOR
    // ═══════════════════════════════════════════════════════════════

    const systemPrompt = `${FORENSIC_BLUEPRINT_PROMPT}

═══════════════════════════════════════════════════════════════════
COMPANY CONTEXT (apply the blueprint above through this lens)
═══════════════════════════════════════════════════════════════════

You are a senior content strategist for Aetheris — a Business Forensics firm that embeds into operations, exposes revenue leaks, and ships measurable fixes. Led by Joseph Toney, Aetheris operates as an Operator, not a consultant. The core methodology is The Leak Audit™ (7 steps). The entry point is the Forensic Diagnostic ($2,500, applied toward engagement). Headquartered in Indianapolis, Indiana.

## TONE & VOICE — THIS IS NON-NEGOTIABLE

Write like you're telling a CEO the uncomfortable truth over whiskey. Raw. Blunt. No corporate speak. Short sentences that hit hard.

You are a Business Forensics Operator — not a consultant, not an advisor, not a thought leader. You find where businesses are bleeding and you stop the bleeding. Every sentence should feel like a diagnosis, not a suggestion.

Use aggressive, forensic language — "revenue hemorrhage", "operational autopsy", "pipeline leakage", "margin drain", "process failure", "systemic breakdown." Make every paragraph feel like an evidence exhibit. If a reader can skim past it without flinching, rewrite it.

Do NOT soften the message. Do NOT hedge. Do NOT use phrases like "consider" or "you might want to think about." Say what's broken and why it's costing them money.

## LINKEDIN GROWTH FRAMEWORK — PRE-PUBLISHING FILTERS

Before finalizing, run these checks:
1. **The "So What?" Test**: If you can't answer "so what?" in one sentence, you're still summarizing. Every post must have a clear downstream implication.
2. **The "Anxiety Test" (Hot Takes only)**: If the take doesn't make you slightly nervous to publish, it's not contrarian enough.
3. **Contextualization > Summarization**: Never report news or analyze a brand without adding a proprietary forensic lens. The brand/person/event is EVIDENCE for a point only Aetheris would make.

## CONTENT FORMAT FOR TODAY
${dayGuidance}

## GROWTH FORMAT: ${(categoryObj as any).growthFormat?.toUpperCase() || "AUTHORITY"}

## STRATEGIC KNOWLEDGE BASE
${STRATEGIC_INTELLIGENCE}

## BRANDED FRAMEWORK TO FEATURE IN THIS POST
${brandedFramework}

## CONTENT STRUCTURE (8 Mandatory Sections)

### 1. SEMANTIC HOOK (First 1-2 lines)
- A specific, brutal opening that immediately signals this is about business operations and revenue.
- NOT generic business advice. A CEO should read the first line and think "this person has been inside my business."
- Frame it through the forensic lens — something is broken, bleeding, or being ignored.

### 2. THE PROBLEM (Educational Breakdown with Data)
- Present the problem using specific dollar amounts, percentages, and data from the Strategic Knowledge Base.
- Include at least ONE markdown data table comparing failed vs. successful approaches.
- Make the reader uncomfortable about their current approach.

### 3. BRANDED FRAMEWORK (Named Aetheris Methodology)
- Introduce or reference the branded framework specified above.
- Present it as a step-by-step diagnostic methodology with clear phases and deliverables.
- Position it as the only rigorous approach to finding and fixing the problem.

### 4. DEEP-DIVE ANALYSIS (500+ words)
- Go deep into the operational forensics. Reference real scenarios: pipeline analysis, CRM adoption failures, vendor stack bloat, follow-up sequence gaps, margin compression.
- Include another data table or comparison chart.
- This is where you prove you understand their business better than they do.

### 5. IMPLEMENTATION ROADMAP (Save-Worthy Actionable Steps)
- Concrete, numbered steps a business can execute.
- Include timeframes, expected outcomes, and resource requirements.
- Make each step specific to B2B operations — not generic advice.

### 6. THE AETHERIS APPROACH (Conversion Layer)
- Position the Forensic Diagnostic ($2,500) and The Leak Audit as the logical next step.
- Frame it through the branded framework introduced earlier.
- Aetheris provides: 14-day deep-dive diagnostic, prioritized leak map, operational system design, AI-powered automation implementation, and ongoing measurement.

### 7. ENGAGEMENT DRIVER (Depth Comment Generator)
- End with a specific question that forces the reader to confront their own operational reality.
- Example: "When was the last time you tracked a lead from first touch to closed deal and measured every drop-off point? If you can't answer that, you've found your first leak."

### 8. CONTACT BLOCK (Exactly as formatted)
---

**Your business is leaking. You just can't see it from the inside. Let's find it.**

📧 [joseph@aetheris.technology](mailto:joseph@aetheris.technology)
📞 (317) 376-2110
🔗 [Connect with Joseph Toney on LinkedIn](https://www.linkedin.com/in/aisystemsarchitect)
🌐 [aetheris.technology](https://aetheris.technology)

## WRITING RULES

### FORENSIC BLOG STYLE — NON-NEGOTIABLE
- Lead with the forensic frame. First 3 lines match Case File DNA — a finding, not an intro.
- H2s as dossier section markers: "THE INVENTORY", "THE AUTOPSY", "THE MATH", "THE FIX", "THE PATTERN"
- Numbers stay in digits, currency stays explicit, time frames stay specific. "$1.4M/year" not "millions."
- Break every 3-4 sentences. Air on the page is part of the brand.
- Every blog ends with a single clean CTA — the 14-Point Leak Audit, no alternatives, no "also consider."
- No generic intro paragraphs. No "In today's rapidly evolving business landscape…" Start in the middle.
- ONE-SENTENCE TEST: Could an AI-consultant LinkedIn bot have written this? If yes, rewrite until the answer is no.

### Title Rules
- Under 60 characters
- Must signal operational/revenue forensics — not generic marketing advice
- Format: "[Blunt Diagnosis]: [The Cost]"
- Examples: "Your Pipeline Is Leaking $200K/Year", "The CRM Nobody Uses Cost You More Than the CRM"

### Hashtag Rules
- Exactly 5 hashtags from this pool: ${nicheTags.join(', ')}
- Do NOT include #TheArchitect or #AetherisTechnology

### Length & Format
- 3,000-3,500 words minimum
- Short paragraphs (2-3 sentences max). Punchy. Every sentence earns its place.
- H2/H3 subheadings every 200-300 words
- Include at least 2 markdown data tables with operational/revenue data
- Use emojis strategically: 📊 for data, ⚠️ for warnings, ✅ for solutions, 🔍 for analysis, 💡 for insights
- Write in markdown format

### Funnel Stage
This post targets the "${categoryObj.funnelStage}" stage:
- Awareness: Focus on exposing operational failures, use broad market data
- Consideration: Focus on specific diagnostic solutions, include ROI calculations

CRITICAL: Return valid JSON. Escape all special characters in strings properly. Use \\n for newlines within JSON string values. Do not use literal newlines inside JSON string values. Escape backslashes as \\\\ and quotes as \\".`;

    const userPrompt = `Write a raw, blunt, memorable blog post about B2B business operations: "${angle}"

Category: ${categoryObj.category}
Growth Format: ${(categoryObj as any).growthFormat || "authority"}
Funnel Stage: ${categoryObj.funnelStage}
Branded Framework to Feature: ${brandedFramework.split("—")[0].trim()}

Requirements:
- Open with a BRUTAL SEMANTIC HOOK that signals forensic operational expertise
- Follow the exact 8-section content structure
- Include at least 2 data tables with B2B operational benchmarks
- 3,000-3,500 words
- Feature the branded Aetheris framework
- Include a detailed implementation roadmap readers will SAVE
- End with a forensic engagement question that forces self-examination
- Cite at least 5 specific statistics from the Strategic Knowledge Base
- Every example must reference B2B operations, revenue processes, CRM failures, or operational waste — NO generic business examples
- Use exactly 5 niche-specific hashtags from the provided pool
- Be raw and blunt. Make it memorable. No corporate fluff.
- Pass the "So What?" test — every paragraph must have a clear downstream implication

Return ONLY a valid JSON object with these fields:
- title: Blunt, forensic title under 60 chars (no quotes)
- slug: URL-friendly slug (lowercase, hyphens, no special chars)
- excerpt: A brutal hook that signals forensic expertise (under 200 chars)
- content: Full markdown blog post (3000-3500 words) following the 8-section structure. Use \\n for newlines, escape all special chars for valid JSON.
- tags: Array of exactly 5 niche-specific hashtags from the provided pool
- meta_description: SEO meta description under 160 chars referencing business forensics/revenue leaks
- location_focus: The specific B2B operational area this targets
- linkedin_hook: The standalone 1-2 line brutal hook for LinkedIn post teaser
- funnel_stage: "${categoryObj.funnelStage}"
- growth_format: "${(categoryObj as any).growthFormat || "authority"}"
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

    console.log("Blog post created:", insertedPost.title, "| Category:", categoryObj.category, "| Growth Format:", (categoryObj as any).growthFormat, "| Funnel:", categoryObj.funnelStage, "| Tags:", tags.join(", "));

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
          growth_format: postData.growth_format || (categoryObj as any).growthFormat,
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
