// try-tool-sandbox — Public runner for the Chaos Ecosystem tools.
// Runs a real, full-depth pass of any catalog tool using ONLY the caller's
// input. No database reads/writes. No client data, no rep codes, no portal
// state, no secrets echoed back. Output is comprehensive — same engine we
// use internally, just without the persistent memory + client context.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Per-IP rate limit — 20 real runs / hour. Prevents pure-abuse loops but
// lets a serious prospect exercise the whole ecosystem in one sitting.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 20;
const rateHits: Map<string, number[]> = new Map();
function rateLimited(ip: string) {
  const now = Date.now();
  const arr = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) { rateHits.set(ip, arr); return true; }
  arr.push(now); rateHits.set(ip, arr);
  return false;
}

// Shared voice — every tool answers like an Aetheris operator: blunt,
// forensic, dollar-quantified, non-corporate. Long-form when useful.
const VOICE = `
You are an Aetheris Business Forensics Operator producing a client-ready PDF report.
Voice: blunt, forensic, non-corporate. Never "as an AI". Never hedge.

OUTPUT DISCIPLINE — read carefully:
- This is a REPORT, not an essay. Think one-page executive PDF, not a blog post.
- HARD CEILING: 450 words TOTAL across the entire response. Prefer 300.
- Use ONLY the exact H2 sections the user template specifies. No extras. No preamble. No sign-off.
- Under each H2, use 3-6 tight bullets OR a short markdown table. NO paragraphs longer than 2 lines.
- Bullets: max ~14 words each. Cut adjectives. Cut throat-clearing.
- Every bullet quantifies (dollars, %, hours, days) when plausible. Use "~" for estimates.
- Tables are preferred over prose whenever comparing items. Keep tables to 5 rows max.
- NEVER invent client names, rep codes, or internal system details. Work only from user input.
- NEVER include a "Conclusion", "Summary", "Disclaimer", or "About" section unless asked.
`.trim();

const PROMPTS: Record<string, { system: string; userWrap: (input: string) => string; title: string; inputLabel: string; inputHint: string; }> = {
  "website-scanner": {
    title: "Website Leak Scanner",
    inputLabel: "Website URL", inputHint: "https://example.com",
    system: `${VOICE}\n\nYou are running a full forensic web audit. Cover: positioning, hero, offer clarity, CTA architecture, trust/proof, funnel friction, SEO signals, performance, mobile, and messaging drift.`,
    userWrap: (i) => `Target: ${i}\n\nProduce a full audit:\n\n## Snapshot\n(3-line diagnosis)\n\n## Top 10 Revenue Leaks\n(numbered, each with: what it is, why it costs money, estimated impact band, one-line fix)\n\n## Positioning Read\n\n## Offer & CTA Read\n\n## Trust / Proof Read\n\n## Funnel Friction Map\n\n## SEO & Visibility Read\n\n## 30-Day Fix Priority\n(ordered list, 5 items, each with owner + expected lift)`,
  },
  "brand-contradictions": {
    title: "Brand Contradictions",
    inputLabel: "Brand or URL", inputHint: "brand.com or a tagline",
    system: `${VOICE}\n\nYou surface the gap between what a brand claims and what it likely does.`,
    userWrap: (i) => `Subject: ${i}\n\nProduce:\n\n## Diagnosis\n(4 lines)\n\n## 8 Contradictions\nFor each: **Claim** → **Likely Reality** → **Evidence a buyer would notice** → **Revenue cost band** → **Repair move**.\n\n## The One Contradiction to Fix First\n(with the exact copy/asset change)`,
  },
  "friction-audit": {
    title: "Friction Audit",
    inputLabel: "Funnel or URL", inputHint: "Describe the buyer path or drop a URL",
    system: `${VOICE}\n\nYou map every friction point in a buyer's path and quantify the leak.`,
    userWrap: (i) => `Funnel: ${i}\n\nProduce:\n\n## Buyer Path (reconstructed)\n(stage-by-stage)\n\n## Friction Log\nTable: Stage · Friction · Why it kills the deal · Estimated drop-off · Fix\n\n## The Compound Leak\n(estimate cumulative % of ready-to-buy traffic lost)\n\n## 7-Day Repair Plan\n(concrete moves, owners, and the single metric that proves it worked)`,
  },
  "strategic-questions": {
    title: "Strategic Questions",
    inputLabel: "Company / role", inputHint: "e.g. 'Series A SaaS CEO'",
    system: `${VOICE}\n\nYou generate the hard boardroom questions leadership is quietly avoiding.`,
    userWrap: (i) => `Subject: ${i}\n\nProduce 20 strategic questions, grouped:\n\n## Revenue Truth\n## Customer Truth\n## Team Truth\n## Product Truth\n## Founder / Operator Truth\n\nEach question: one sentence, blunt, unanswerable with a slide. End with:\n\n## The 3 questions to open the next leadership meeting with\n(and why)`,
  },
  "detective-mode": {
    title: "Detective Mode",
    inputLabel: "Business + URL", inputHint: "e.g. 'Acme Co · acme.com'",
    system: `${VOICE}\n\nYou write like a case-file detective — evidence, suspects, motive, next moves.`,
    userWrap: (i) => `Case subject: ${i}\n\nProduce a full case file:\n\n## Case Opener\n(120 words, noir tone, forensic — not cute)\n\n## Suspected Leak Sources (Top 8)\nEach: name, evidence a stranger could verify, motive (what it protects), dollar/time cost band.\n\n## Chain of Evidence\n(how the leaks feed each other)\n\n## Next Moves — first 72 hours\n(numbered, concrete, no meetings-about-meetings)`,
  },
  "forensic-scan-all": {
    title: "Forensic Scan (All Layers)",
    inputLabel: "Website URL", inputHint: "https://example.com",
    system: `${VOICE}\n\nYou run the all-layer forensic scan: positioning, offer, proof, funnel, SEO, ops signals.`,
    userWrap: (i) => `Target: ${i}\n\nProduce:\n\n## Executive Diagnosis (5 lines)\n\n## Layer Reads\n### Positioning\n### Offer\n### Proof\n### Funnel\n### SEO & Discoverability\n### Ops / Follow-up signals\n\nEach layer: 4-6 bullets, blunt, dollar-quantified where possible.\n\n## The Biggest Single Unlock\n(with the exact first move)\n\n## 30-Day Sequenced Repair (Weeks 1-4)`,
  },
  "all-in-one": {
    title: "All-In-One Content",
    inputLabel: "Topic", inputHint: "e.g. 'AI-powered onboarding'",
    system: `${VOICE}\n\nYou turn a topic into a full, ready-to-ship content set.`,
    userWrap: (i) => `Topic: ${i}\n\nProduce the full pack:\n\n## Positioning Angle (the one contrarian take)\n\n## Blog Post (600-800 words, publishable)\n\n## LinkedIn Post (150 words, operator voice)\n\n## X/Twitter Thread (7 posts)\n\n## Email (180 words, forwardable)\n\n## Cold DM Opener (2 sentences, pattern break)\n\n## 3 Hook Variants for A/B testing`,
  },
  "content-calendar": {
    title: "Content Calendar Builder",
    inputLabel: "Niche", inputHint: "e.g. 'B2B fintech'",
    system: `${VOICE}\n\nYou build a 30-day content calendar that compounds authority.`,
    userWrap: (i) => `Niche: ${i}\n\nProduce a full 30-day calendar as a markdown table:\nDay · Format (post/email/video/blog) · Angle Type (contrarian/case-file/framework/callout) · Working Hook · Primary CTA.\n\nThen:\n\n## Weekly Themes (Wk 1-4)\n## The 3 flagship pieces to over-invest in\n## Repurposing Tree (how one flagship spawns 8 assets)`,
  },
  "playbook-generator": {
    title: "Playbook Generator",
    inputLabel: "Function or goal", inputHint: "e.g. 'Outbound SDR playbook'",
    system: `${VOICE}\n\nYou write operator playbooks that a new hire can run day one.`,
    userWrap: (i) => `Playbook subject: ${i}\n\nProduce a full playbook:\n\n## Purpose (2 lines)\n## Trigger (the exact signal that starts the play)\n## Roles & Owners\n## Step-by-Step (8-12 steps, each with: action, owner, tool, time-box, output, KPI)\n## Escalation Path\n## Kill-Switch Criteria\n## Metrics Dashboard (5 KPIs, target ranges)\n## Common Failure Modes (5) and how to catch them early`,
  },
  "social-content": {
    title: "Social Content Studio",
    inputLabel: "Topic", inputHint: "e.g. 'why 90% of audits are theater'",
    system: `${VOICE}\n\nYou write punchy operator-voice social. Blunt. Non-corporate.`,
    userWrap: (i) => `Topic: ${i}\n\nProduce:\n\n## 5 LinkedIn Posts (each 120-180 words, distinct angle: contrarian, case-file, framework, callout, story)\n## 3 X/Twitter Threads (5 posts each)\n## 5 One-Line Hooks\n## 3 Comment-Bait Questions\n\nEvery post: hook line on its own, then body, then a hard CTA line.`,
  },
  "content-engine": {
    title: "Content Engine",
    inputLabel: "Core idea", inputHint: "The one insight to expand",
    system: `${VOICE}\n\nYou run the full pipeline: one insight becomes an entire content week.`,
    userWrap: (i) => `Core idea: ${i}\n\nProduce:\n\n## Long-form Article Outline (7 sections with 2-3 bullets each)\n## Publishable 700-word article draft based on the outline\n## 4 Short-form Spinoffs (LinkedIn, X, email teaser, DM)\n## Repurposing Map (how to squeeze 12 assets from this one idea over 30 days)`,
  },
  "image-studio": {
    title: "Image Studio Brief",
    inputLabel: "Scene", inputHint: "e.g. 'operator at forensic desk'",
    system: `${VOICE}\n\nYou write production-grade briefs an art director could hand to any generator or shoot.`,
    userWrap: (i) => `Scene: ${i}\n\nProduce a full image brief:\n\n## Concept (3 lines)\n## Subject & Composition\n## Palette (with hex approximations)\n## Lighting & Mood\n## Camera / Lens Direction\n## Styling & Wardrobe\n## Environment Details\n## Negative Prompt (what to exclude)\n## 3 Variant Directions (safe / bold / metaphorical)\n## Ready-to-paste generator prompt (one paragraph, no line breaks)`,
  },
  "creation-studio": {
    title: "Creation Studio",
    inputLabel: "Asset request", inputHint: "e.g. 'launch kit for Q4'",
    system: `${VOICE}\n\nYou plan mixed-media launch kits — every asset with a purpose.`,
    userWrap: (i) => `Request: ${i}\n\nProduce a full launch kit plan:\n\n## Objective & Success Metric\n## Asset Inventory (table): Asset · Format · Length · Channel · Purpose · Priority · Owner\n(minimum 12 assets)\n## Production Sequence (week-by-week, 4 weeks)\n## Distribution Plan\n## The 3 assets that must ship even if everything else slips`,
  },
  "easy-mode": {
    title: "Easy Mode",
    inputLabel: "One-line goal", inputHint: "e.g. 'get 10 booked calls this month'",
    system: `${VOICE}\n\nYou reduce a goal to the shortest actionable path a solo operator can start today.`,
    userWrap: (i) => `Goal: ${i}\n\nProduce:\n\n## The One-Sentence Strategy\n## The 7-Day Execution Plan (day by day, one big move per day)\n## Daily Scorecard (3 numbers only)\n## What to Refuse this Week (3 things — say no to protect the plan)\n## The Kill-Switch (the metric that means abandon and pivot)`,
  },
  "tool-generator": {
    title: "Tool Generator",
    inputLabel: "Tool brief", inputHint: "e.g. 'calculator for pipeline leak $'",
    system: `${VOICE}\n\nYou scope micro-tools that make the buyer smarter and warmer.`,
    userWrap: (i) => `Brief: ${i}\n\nProduce a full product spec:\n\n## Concept (3 lines)\n## Target user + moment of use\n## Inputs (fields + validation)\n## Core Formula / Logic (explicit)\n## Output (what the user sees + how it's framed)\n## UI Copy (headline, sub, button, empty state, result state)\n## Email-gate copy after first free run\n## Upsell path to the $40 lifetime license\n## 5 growth loops the tool naturally creates`,
  },
};

async function callGateway(system: string, user: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("Sandbox unavailable");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system + "\n\nPUBLIC-RUN GUARDRAIL: Do not reference any internal company, client, rep, or system by name. Work only from the user's input. But do produce the FULL depth of analysis — this is not a preview, this is the real tool without the persistent memory layer." },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    if (r.status === 429) throw new Error("Model rate-limited. Try again in a moment.");
    if (r.status === 402) throw new Error("AI credits exhausted. Contact Aetheris to top up.");
    throw new Error(`AI error ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) return json({ error: "Rate limit: 20 runs per hour. Buy a tool for unlimited." }, 429);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const toolId = String(body?.toolId || "").trim();
  const input = String(body?.input || "").trim().slice(0, 2000);
  const cfg = PROMPTS[toolId];
  if (!cfg) return json({ error: "Unknown tool" }, 400);
  if (!input) return json({ error: `${cfg.inputLabel} is required` }, 400);

  try {
    const output = await callGateway(cfg.system, cfg.userWrap(input));
    return json({
      ok: true,
      toolId,
      title: cfg.title,
      output,
    });
  } catch (e: any) {
    return json({ error: e?.message || "Sandbox failed" }, 500);
  }
});

export const TRY_TOOL_META = Object.fromEntries(
  Object.entries(PROMPTS).map(([k, v]) => [k, { title: v.title, inputLabel: v.inputLabel, inputHint: v.inputHint }])
);
