// One-shot generator: writes the 5 long-tail AEO blog posts for Aetheris AI.
// Idempotent — if a slug already exists with non-empty content, it is skipped.
// Triggered manually from the Admin SEO panel or via curl.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { FORENSIC_BLUEPRINT_PROMPT } from "../_shared/contentBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BlogTopic {
  slug: string;
  title: string;
  metaDescription: string;
  excerpt: string;
  outline: string;
  tags: string[];
  tldr: string;
}

const TOPICS: BlogTopic[] = [
  {
    slug: "how-to-implement-ai-in-business",
    title: "How to Implement AI in Business: 7-Step Framework",
    metaDescription: "A blunt 7-step framework for implementing AI in your business — common pitfalls, 90-day roadmap, and what to ignore. By Aetheris AI.",
    excerpt: "A 7-step framework for implementing AI in business — covering use case selection, data foundations, governance, pilots, scale, and the pitfalls that kill 80% of corporate AI initiatives.",
    tags: ["AI Strategy", "AI Implementation", "AI Adoption", "Digital Transformation"],
    tldr: "Most AI implementations fail because they start with the model, not the workflow. The 7-step framework: (1) audit revenue-leaking workflows, (2) score use cases by ROI and risk, (3) pick 1–3 pilots with measurable cost lines, (4) build the data foundation, (5) deploy with humans in the loop, (6) measure and govern, (7) scale by quarterly review. Time-to-first-ROI: 90 days when scoped correctly.",
    outline: `# How to Implement AI in Business: 7-Step Framework

## TL;DR (Quick Answer)
[3-sentence answer-first summary, exactly the tldr text above, wrapped in a markdown blockquote-style callout]

## The brutal opening
Most companies implementing AI in 2026 are still treating it as a technology project instead of a workflow project. That's why 80% of corporate AI pilots never make it to production.

## Why most AI implementations fail (data + table)
- Start with the model, not the workflow
- No measurable success metric
- No humans-in-the-loop design
- No data foundation
Include a markdown table comparing "Failed AI program" vs "Successful AI program" across 6 dimensions.

## The 7-Step Framework
### Step 1 — Audit revenue-leaking workflows
### Step 2 — Score use cases by ROI and risk
### Step 3 — Pick 1–3 pilots with measurable cost lines
### Step 4 — Build the data foundation
### Step 5 — Deploy with humans in the loop
### Step 6 — Measure and govern
### Step 7 — Scale by quarterly review
Each step: ~250 words, concrete, with examples.

## Common pitfalls (named, blunt)
- The "AI strategy retreat" trap
- The vendor demo trap
- The build-everything trap
- The "wait for clean data" trap
- The "no human review" trap

## 90-day roadmap (week-by-week table)
A markdown table laying out weeks 1–13 with Activities / Owner / Output columns.

## Frequently asked questions (5 Q&As)

## How Aetheris AI accelerates this
Brief — diagnostic, prioritization, deployment. Link to /assessment and /contact.

## Final word
End with a sharp single-line punch.`,
  },
  {
    slug: "ai-adoption-roadmap",
    title: "The AI Adoption Roadmap: 5 Maturity Stages",
    metaDescription: "A 5-stage AI adoption roadmap with milestones, KPIs, and the moves that compress each stage. By Aetheris AI.",
    excerpt: "A 5-stage AI adoption roadmap with milestones, KPIs by stage, and the specific moves that compress months off each transition.",
    tags: ["AI Strategy", "AI Adoption", "AI Roadmap", "Digital Transformation"],
    tldr: "The 5 AI adoption stages: (1) Ad hoc — random tool experiments, (2) Pilot — first measured deployments, (3) Scaled — multiple production AI workflows, (4) Embedded — AI in core business processes, (5) AI-Native — AI is the operational fabric. Most companies are stuck at Stage 1–2. The fastest path: pick a single P&L-impacting workflow and deploy a measured pilot in 90 days.",
    outline: `# The AI Adoption Roadmap: 5 Maturity Stages

## TL;DR
[answer-first, the exact tldr above]

## Why most companies are stuck at Stage 1
Brutal opening. Most "AI strategy" is theater.

## The 5 Maturity Stages
### Stage 1 — Ad hoc
KPIs, signs you're stuck, what to do next.
### Stage 2 — Pilot
### Stage 3 — Scaled
### Stage 4 — Embedded
### Stage 5 — AI-Native

Include a markdown table summarizing all 5 stages with: Stage / KPIs / Org signals / Time to next stage / Investment range.

## Milestones that move you up a stage
Concrete moves with examples.

## Stage-specific KPIs (table)
Markdown table: Stage / Leading indicators / Lagging indicators / Anti-patterns.

## The compression playbook
Specific tactics that cut 6+ months off each stage transition.

## Common stage-jumping mistakes
- Trying to skip Stage 2 (pilot)
- Declaring Stage 4 with one deployment
- Building "AI strategy" without P&L tie-out

## FAQs (5)

## How Aetheris AI accelerates each stage
Link /assessment and /contact.

## Final word
One-line punch.`,
  },
  {
    slug: "reduce-operational-costs-with-ai",
    title: "Reduce Operational Costs With AI: 6 Categories",
    metaDescription: "Where AI cuts operational costs — 6 categories, ROI formulas, and the patterns that produce 25–50% reductions. By Aetheris AI.",
    excerpt: "Where AI actually cuts operational costs: 6 categories with concrete ROI formulas, deployment patterns, and what to expect at each company size.",
    tags: ["AI ROI", "Cost Reduction", "AI Automation", "Operational Efficiency"],
    tldr: "AI cuts operational cost across 6 categories: (1) admin/back-office, (2) customer support, (3) sales productivity, (4) document and knowledge work, (5) operations and dispatch, (6) maintenance and quality. Typical ROI: 25–50% reduction in target cost line within 6–12 months. Highest-ROI deployments hit existing payroll lines, not future revenue.",
    outline: `# Reduce Operational Costs With AI: 6 Categories

## TL;DR
[answer-first using exact tldr text]

## The brutal opening
"AI ROI" is mostly noise. Real cost reduction comes from hitting payroll lines that already exist.

## The 6 cost categories AI compresses (with ROI formulas)
### 1. Admin / back-office
ROI formula. Example. Deployment pattern.
### 2. Customer support
### 3. Sales productivity
### 4. Document & knowledge work
### 5. Operations & dispatch
### 6. Maintenance & quality

For each: include a sub-table with "Cost line / Typical reduction / Time to ROI / Risk".

## Master ROI calculation
Show the formula: (Hours saved × loaded rate) − (deployment cost + ongoing cost) = annual ROI.
Worked examples for $5M, $25M, $100M company.

## Deployment patterns by company size (table)
Markdown table: Company size / Best first category / Expected ROI / Pilot cost.

## What NOT to do
- Don't start with revenue-side AI when cost-side AI is unfunded
- Don't build custom when off-the-shelf works
- Don't deploy without measurement

## FAQs (5)

## How Aetheris AI sizes and ships cost-cutting AI
Link /assessment, /scan, /contact.

## Final word
One-line punch.`,
  },
  {
    slug: "ai-maturity-assessment-guide",
    title: "AI Maturity Assessment: Self-Scoring Rubric",
    metaDescription: "A self-scoring AI maturity assessment with 5 levels, dimension-by-dimension rubric, and next moves per level. By Aetheris AI.",
    excerpt: "A self-scoring AI maturity rubric — 5 levels across 6 dimensions, with the next move that gets you to the next level fastest.",
    tags: ["AI Maturity", "AI Assessment", "AI Strategy", "AI Readiness"],
    tldr: "AI maturity is scored across 6 dimensions: data, talent, governance, deployment, measurement, and culture. 5 levels per dimension: Initial / Reactive / Defined / Managed / Optimized. Most companies score 1–2 across the board. The fastest path up: pick the lowest-scoring dimension blocking your highest-ROI use case and fix that first.",
    outline: `# AI Maturity Assessment: Self-Scoring Rubric

## TL;DR
[answer-first using exact tldr text]

## Why most "AI maturity assessments" are useless
Brutal opening. They score buzzwords, not capability.

## The 6 dimensions of AI maturity
1. Data foundation
2. Talent & capability
3. Governance & risk
4. Deployment maturity
5. Measurement & ROI
6. Culture & adoption

## The 5 levels (with markdown table)
Initial → Reactive → Defined → Managed → Optimized.
Big markdown table: Dimension × Level showing what each cell looks like in practice.

## Self-scoring instructions
Step-by-step. Be brutal with yourself. Most readers should score 1–2.

## What each composite score means
- Score 6–12: Stage 1, ad hoc
- Score 13–18: Stage 2, piloting
- Score 19–24: Stage 3, scaling
- Score 25–30: Stage 4, embedded

## Next moves per level (table)
Markdown table: Composite score range / Next 90-day priority / Deployment risk to avoid.

## The most-common scoring trap
Inflating governance and culture scores. Reality check.

## FAQs (5)

## How Aetheris AI runs this assessment for you
Link /assessment and /business-diagnostic.

## Final word
One-line punch.`,
  },
  {
    slug: "build-vs-buy-ai-decision-framework",
    title: "Build vs. Buy AI: A Decision Framework With TCO",
    metaDescription: "Build vs. buy AI decision framework with a TCO calculator, decision matrix, and the 4 conditions where each wins. By Aetheris AI.",
    excerpt: "When to build AI in-house vs. buy off-the-shelf — a decision matrix, TCO calculation, and the 4 conditions where each path wins.",
    tags: ["Build vs Buy", "AI Strategy", "AI ROI", "AI Architecture"],
    tldr: "Buy AI when the capability is commodity (chat, transcription, generic copilots) or when speed-to-value matters more than differentiation. Build AI when it's core to competitive advantage, requires proprietary data, or unlocks a new pricing tier. TCO must include ongoing model ops, governance, and team cost — not just initial build. Most companies should buy 80% and build 20%.",
    outline: `# Build vs. Buy AI: A Decision Framework With TCO

## TL;DR
[answer-first using exact tldr text]

## The brutal opening
Every "AI build vs. buy" debate that ignores TCO ends in regret.

## The decision matrix (table)
Markdown matrix: Capability type × Differentiation × Recommendation (Buy / Buy + Configure / Build).

## When to BUY (4 conditions)
1. Capability is commodity
2. Speed-to-value > differentiation
3. Vendor will out-iterate your team
4. Compliance is solved by vendor

## When to BUILD (4 conditions)
1. AI is core to competitive moat
2. Proprietary data unlocks differentiation
3. Deep integration with bespoke workflows
4. New pricing tier depends on it

## The TCO calculator (with worked example)
Components:
- Initial build/license cost
- Annual model & infra cost
- Engineering FTEs
- Ops / SRE / governance load
- Compliance & audit cost
- Drift, retraining, evals

Worked example: same use case, build vs. buy, 3-year TCO.

## The hybrid pattern (most companies should do this)
Buy 80% commodity, build 20% differentiating. Show layered architecture.

## Anti-patterns
- "Build everything" syndrome (CTO ego)
- "Buy everything" syndrome (no moat)
- Re-buying every 18 months because nothing was governed

## FAQs (5)

## How Aetheris AI runs Build vs. Buy analysis
Link /services and /contact.

## Final word
One-line punch.`,
  },
];

const SYSTEM_PROMPT = `${FORENSIC_BLUEPRINT_PROMPT}

═══════════════════════════════════════════════════════════════════
COMPANY CONTEXT
═══════════════════════════════════════════════════════════════════

You are a Business Forensics Operator writing for Aetheris — a firm that embeds into operations, exposes revenue leaks, and ships measurable fixes. Headquartered in Indianapolis, Indiana, led by Joseph Toney. Core methodology: The Leak Audit™ (7 steps). Entry point: Forensic Diagnostic ($2,500, applied toward engagement).

## TONE — NON-NEGOTIABLE
Raw. Blunt. Aggressive. Non-corporate. Short sentences that hit hard. Write like you're presenting forensic evidence to a CEO — every finding backed by data, every paragraph a diagnosis. No hedging. No "consider thinking about." Say what's broken and why it costs them money.

You are an Operator, not a consultant. You find where businesses bleed and you stop the bleeding. Use forensic language: "revenue hemorrhage", "operational autopsy", "pipeline leakage", "margin drain", "process failure", "systemic breakdown."

## ABSOLUTE BANS
- NO testimonials, social proof, fake quotes, or named client stories
- NO "magic robot" / "magic AI" analogies
- NO purchase urgency popups or discount language
- NO emojis in body copy (you can use them sparingly in tables: 📊 ✅ ⚠️)
- NO generic "AI is transforming everything" filler

## STRUCTURE REQUIREMENTS
- Open with an H1 matching the topic title
- Second section MUST be "## TL;DR (Quick Answer)" containing the exact tldr text inside a markdown blockquote (>) so it renders as a callout. This is critical for AEO/Speakable.
- Follow the provided outline EXACTLY — every section, every subsection
- 2,800–3,500 words total
- Short paragraphs (2–4 sentences max)
- Include AT LEAST 2 markdown tables with concrete data
- Include AT LEAST one explicit FAQ section with 5 Q&A pairs in this exact format:
  ### Q: [question]?
  A: [answer in 2–4 sentences]
- Include internal links to: https://aetheris.technology/leak-audit and https://aetheris.technology/contact and https://aetheris.technology/services where the outline calls for them
- End with a single-line punch closing

## AETHERIS POSITIONING
Reference the Forensic Diagnostic ($2,500, applied toward engagement), The Leak Audit™ (7-step methodology), and Indianapolis HQ where naturally relevant — but never as a sales pitch. Position Aetheris as the operator who finds the leaks, not another consultant who writes decks.

## OUTPUT FORMAT
Return ONLY the full markdown article. Do NOT wrap in JSON. Do NOT add commentary, headers, code fences, or YAML frontmatter. Start directly with the H1 line "# <title>" and end with the punch closing.`;

async function generatePost(topic: BlogTopic, apiKey: string): Promise<{ title: string; content: string }> {
  const userPrompt = `Write the blog post for: "${topic.title}"

Slug: ${topic.slug}
Meta description: ${topic.metaDescription}

REQUIRED TL;DR (use this EXACT text in the TL;DR callout, do not rephrase):
${topic.tldr}

REQUIRED OUTLINE (follow exactly):
${topic.outline}

Hard requirements:
- Minimum 2,800 words. Aim for 3,200.
- Every section in the outline must appear, in order, with all subsections.
- At least 2 markdown tables and one 5-question FAQ section.
- Return ONLY the raw markdown article — no JSON, no code fences, no preface.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 16000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI gateway ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") throw new Error("AI response missing content");

  // Strip optional code fences if model wrapped despite instructions
  let content = raw.trim();
  const fence = content.match(/^```(?:markdown|md)?\s*([\s\S]*?)```\s*$/i);
  if (fence) content = fence[1].trim();

  if (content.length < 6000) {
    throw new Error(`AI returned insufficient content (length: ${content.length})`);
  }
  return { title: topic.title, content };
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

    // Allow optional ?force=true to overwrite existing posts
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    // Fire-and-forget: 5 posts × Gemini Pro will exceed the 150s edge timeout.
    // Background job writes results directly to blog_posts as each completes.
    const job = (async () => {
      for (const topic of TOPICS) {
        try {
          const { data: existing } = await supabase
            .from("blog_posts")
            .select("id, content")
            .eq("slug", topic.slug)
            .maybeSingle();

          if (existing && !force && existing.content && existing.content.length > 1000) {
            console.log(`[aeo-batch] skipped ${topic.slug} (already exists)`);
            continue;
          }

          const { title, content } = await generatePost(topic, LOVABLE_API_KEY);

          const payload = {
            slug: topic.slug,
            title,
            content,
            excerpt: topic.excerpt,
            meta_description: topic.metaDescription,
            tags: topic.tags,
            author: "Aetheris AI Team",
            is_published: true,
            published_at: new Date().toISOString(),
          };

          if (existing) {
            const { error } = await supabase.from("blog_posts").update(payload).eq("id", existing.id);
            if (error) throw error;
            console.log(`[aeo-batch] updated ${topic.slug}`);
          } else {
            const { error } = await supabase.from("blog_posts").insert(payload);
            if (error) throw error;
            console.log(`[aeo-batch] created ${topic.slug}`);
          }
        } catch (e) {
          console.error(`[aeo-batch] error on ${topic.slug}:`, e instanceof Error ? e.message : String(e));
        }
      }
      console.log("[aeo-batch] all topics processed");
    })();

    // @ts-expect-error EdgeRuntime is provided by Supabase Edge Functions runtime
    EdgeRuntime.waitUntil(job);

    return new Response(
      JSON.stringify({
        ok: true,
        queued: true,
        topic_count: TOPICS.length,
        message: "Batch started in background. Check the blog_posts table or function logs in 3-5 minutes.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
