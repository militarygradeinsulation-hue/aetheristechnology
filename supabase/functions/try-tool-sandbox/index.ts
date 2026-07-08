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

// Every prompt is engineered to output a PDF-style report: tight sections,
// bullets/tables, under ~400 words. No walls of prose.
const PROMPTS: Record<string, { system: string; userWrap: (input: string) => string; title: string; inputLabel: string; inputHint: string; }> = {
  "website-scanner": {
    title: "Website Leak Scanner",
    inputLabel: "Website URL", inputHint: "https://example.com",
    system: `${VOICE}\n\nYou are a forensic web auditor. Output like a one-page PDF audit.`,
    userWrap: (i) => `Target: ${i}\n\nOutput EXACTLY these sections, nothing else:\n\n## Snapshot\n(3 bullets, max 12 words each — diagnosis, biggest risk, biggest opportunity)\n\n## Top 5 Revenue Leaks\nMarkdown table: # · Leak · Est. $ Impact · One-line Fix\n\n## Positioning & Offer\n(4 bullets)\n\n## Funnel & Trust\n(4 bullets)\n\n## 30-Day Fix Priority\n(numbered list, 5 items — action + expected lift)`,
  },
  "brand-contradictions": {
    title: "Brand Contradictions",
    inputLabel: "Brand or URL", inputHint: "brand.com or a tagline",
    system: `${VOICE}\n\nYou surface the gap between what a brand claims and what it does.`,
    userWrap: (i) => `Subject: ${i}\n\nOutput EXACTLY:\n\n## Diagnosis\n(3 bullets)\n\n## 5 Contradictions\nTable: # · Claim · Likely Reality · Buyer Signal · Cost Band\n\n## Fix First\n(1 bullet: the exact copy/asset change, and why)`,
  },
  "friction-audit": {
    title: "Friction Audit",
    inputLabel: "Funnel or URL", inputHint: "Describe the buyer path or drop a URL",
    system: `${VOICE}\n\nYou map friction and quantify the leak.`,
    userWrap: (i) => `Funnel: ${i}\n\nOutput EXACTLY:\n\n## Buyer Path\n(4-5 bullets — one per stage)\n\n## Friction Log\nTable: Stage · Friction · Est. Drop-off % · Fix\n\n## Compound Leak\n(1 bullet — cumulative % of ready-to-buy traffic lost)\n\n## 7-Day Repair\n(numbered, 5 moves — action + metric that proves it worked)`,
  },
  "strategic-questions": {
    title: "Strategic Questions",
    inputLabel: "Company / role", inputHint: "e.g. 'Series A SaaS CEO'",
    system: `${VOICE}\n\nYou generate hard boardroom questions leadership is avoiding.`,
    userWrap: (i) => `Subject: ${i}\n\nOutput EXACTLY 15 questions, 3 per section:\n\n## Revenue Truth\n## Customer Truth\n## Team Truth\n## Product Truth\n## Founder Truth\n\nEach question: one sentence, blunt, unanswerable with a slide.\n\n## Open the Next Meeting With\n(the 3 sharpest of the 15, listed again, no explanation)`,
  },
  "detective-mode": {
    title: "Detective Mode",
    inputLabel: "Business + URL", inputHint: "e.g. 'Acme Co · acme.com'",
    system: `${VOICE}\n\nCase-file detective. Evidence, motive, next moves. Never cute.`,
    userWrap: (i) => `Case subject: ${i}\n\nOutput EXACTLY:\n\n## Case Opener\n(3 bullets, noir, forensic — 12 words each)\n\n## Suspected Leaks\nTable: # · Suspect · Evidence · Motive · Cost Band\n(5 rows)\n\n## Chain of Evidence\n(3 bullets — how the leaks feed each other)\n\n## First 72 Hours\n(numbered, 5 moves)`,
  },
  "forensic-scan-all": {
    title: "Forensic Scan (All Layers)",
    inputLabel: "Website URL", inputHint: "https://example.com",
    system: `${VOICE}\n\nAll-layer forensic scan across positioning, offer, proof, funnel, SEO, ops.`,
    userWrap: (i) => `Target: ${i}\n\nOutput EXACTLY:\n\n## Executive Diagnosis\n(3 bullets)\n\n## Layer Reads\nTable: Layer · Grade (A-F) · Biggest Leak · Fix\nRows: Positioning, Offer, Proof, Funnel, SEO, Ops\n\n## Biggest Single Unlock\n(1 bullet — exact first move)\n\n## 30-Day Repair\n(4 bullets — one per week)`,
  },
  "all-in-one": {
    title: "All-In-One Content",
    inputLabel: "Topic", inputHint: "e.g. 'AI-powered onboarding'",
    system: `${VOICE}\n\nOne topic → a compact publishable content set. Under 450 words TOTAL.`,
    userWrap: (i) => `Topic: ${i}\n\nOutput EXACTLY:\n\n## Angle\n(1 sentence — the contrarian take)\n\n## LinkedIn Post\n(~90 words, operator voice)\n\n## Email\n(~90 words, forwardable, subject line on first line)\n\n## X Thread\n(5 posts, each ≤ 240 chars)\n\n## 3 Hook Variants\n(bullets)`,
  },
  "content-calendar": {
    title: "Content Calendar Builder",
    inputLabel: "Niche", inputHint: "e.g. 'B2B fintech'",
    system: `${VOICE}\n\n14-day content calendar. Compact, table-driven.`,
    userWrap: (i) => `Niche: ${i}\n\nOutput EXACTLY:\n\n## 14-Day Calendar\nTable: Day · Format · Angle · Hook · CTA\n(14 rows, hooks ≤ 10 words)\n\n## Weekly Themes\n(2 bullets — Wk1, Wk2)\n\n## 2 Flagship Pieces\n(2 bullets — what and why)`,
  },
  "playbook-generator": {
    title: "Playbook Generator",
    inputLabel: "Function or goal", inputHint: "e.g. 'Outbound SDR playbook'",
    system: `${VOICE}\n\nOperator playbook a new hire can run day one.`,
    userWrap: (i) => `Playbook subject: ${i}\n\nOutput EXACTLY:\n\n## Purpose & Trigger\n(2 bullets)\n\n## Steps\nTable: # · Action · Owner · Time-box · Output\n(7 rows)\n\n## KPIs\nTable: KPI · Target · Kill-Switch\n(4 rows)\n\n## Top Failure Modes\n(3 bullets)`,
  },
  "social-content": {
    title: "Social Content Studio",
    inputLabel: "Topic", inputHint: "e.g. 'why 90% of audits are theater'",
    system: `${VOICE}\n\nPunchy operator-voice social. No fluff.`,
    userWrap: (i) => `Topic: ${i}\n\nOutput EXACTLY:\n\n## 3 LinkedIn Posts\n(each ~80 words — distinct angles: contrarian, case-file, framework. Hook line on its own line, then body, then CTA line.)\n\n## 1 X Thread\n(5 posts, ≤ 240 chars each)\n\n## 5 Hooks\n(bullets, ≤ 12 words)`,
  },
  "content-engine": {
    title: "Content Engine",
    inputLabel: "Core idea", inputHint: "The one insight to expand",
    system: `${VOICE}\n\nOne insight → a compact content week.`,
    userWrap: (i) => `Core idea: ${i}\n\nOutput EXACTLY:\n\n## Article Outline\n(6 H3-style bullets — each ≤ 12 words)\n\n## Lead Section\n(~120 words — the opening the article commits to)\n\n## Spinoffs\nTable: Channel · Format · Hook\n(4 rows — LinkedIn, X, email, DM)\n\n## Repurposing Map\n(3 bullets — how 1 idea → 8 assets in 14 days)`,
  },
  "image-studio": {
    title: "Image Studio Brief",
    inputLabel: "Scene", inputHint: "e.g. 'operator at forensic desk'",
    system: `${VOICE}\n\nProduction-grade brief. Tight, unambiguous.`,
    userWrap: (i) => `Scene: ${i}\n\nOutput EXACTLY:\n\n## Concept\n(1 bullet)\n\n## Spec\nTable: Field · Direction\nRows: Subject, Composition, Palette (hex), Lighting, Lens, Wardrobe, Environment, Negative Prompt\n\n## Ready Prompt\n(one paragraph, no line breaks, generator-ready)`,
  },
  "creation-studio": {
    title: "Creation Studio",
    inputLabel: "Asset request", inputHint: "e.g. 'launch kit for Q4'",
    system: `${VOICE}\n\nMixed-media launch kit plan.`,
    userWrap: (i) => `Request: ${i}\n\nOutput EXACTLY:\n\n## Objective\n(1 bullet — success metric attached)\n\n## Asset Inventory\nTable: Asset · Format · Channel · Purpose · Priority\n(8 rows)\n\n## 4-Week Sequence\n(4 bullets — one per week)\n\n## Must-Ships\n(3 bullets — assets that ship even if everything slips)`,
  },
  "easy-mode": {
    title: "Easy Mode",
    inputLabel: "One-line goal", inputHint: "e.g. 'get 10 booked calls this month'",
    system: `${VOICE}\n\nShortest actionable path for a solo operator. No jargon.`,
    userWrap: (i) => `Goal: ${i}\n\nOutput EXACTLY:\n\n## Strategy in One Sentence\n(1 bullet)\n\n## 7-Day Plan\nTable: Day · Move · Time Needed · Proof it Worked\n(7 rows)\n\n## Daily Scorecard\n(3 bullets — the only 3 numbers that matter)\n\n## Refuse This Week\n(3 bullets)\n\n## Kill-Switch\n(1 bullet — the metric that means pivot)`,
  },
  "tool-generator": {
    title: "Tool Generator",
    inputLabel: "Tool brief", inputHint: "e.g. 'calculator for pipeline leak $'",
    system: `${VOICE}\n\nMicro-tool product spec.`,
    userWrap: (i) => `Brief: ${i}\n\nOutput EXACTLY:\n\n## Concept\n(2 bullets — what + who + when-used)\n\n## Spec\nTable: Field · Detail\nRows: Inputs, Core Formula, Output, Empty State, Result State\n\n## UI Copy\n(4 bullets — headline, sub, button, post-run CTA)\n\n## Growth Loops\n(3 bullets)`,
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
        { role: "system", content: system + "\n\nPUBLIC-RUN GUARDRAIL: Do not name any real company, client, or rep. Work only from user input. FOLLOW THE OUTPUT DISCIPLINE STRICTLY — this must read like a one-page PDF report, not a wall of text. Under 450 words total. No preamble." },
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
