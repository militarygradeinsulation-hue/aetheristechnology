// try-tool-sandbox — Public, stateless demo runner for the Chaos Ecosystem.
// Runs a single sandboxed pass of any catalog tool using ONLY the caller's
// input. No database reads/writes. No client data, no rep codes, no portal
// state, no secrets echoed back. Each request is independent — nothing is
// saved server-side and the frontend does not persist any output.
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

// Per-IP rate limit — 6 sandbox runs / hour. Prevents free-tier abuse.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 6;
const rateHits: Map<string, number[]> = new Map();
function rateLimited(ip: string) {
  const now = Date.now();
  const arr = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) { rateHits.set(ip, arr); return true; }
  arr.push(now); rateHits.set(ip, arr);
  return false;
}

// Sandbox prompts — one per tool. Kept generic. NO Aetheris client data,
// NO internal playbooks, NO rep/partner context. Watermarked as a demo.
const PROMPTS: Record<string, { system: string; userWrap: (input: string) => string; title: string; inputLabel: string; inputHint: string; }> = {
  "website-scanner":      { title: "Website Leak Scanner (demo)",     inputLabel: "Website URL",       inputHint: "https://example.com", system: "You are a forensic web auditor. Given a URL, list 5 likely revenue leaks (CTA weakness, friction, trust gaps, SEO holes, messaging drift). Be concrete. No fluff.", userWrap: (i) => `URL: ${i}\n\nReturn a markdown list of 5 leaks with a 1-line fix each.` },
  "brand-contradictions": { title: "Brand Contradictions (demo)",     inputLabel: "Brand or URL",      inputHint: "brand.com or a tagline", system: "You are a brand forensics operator. Find contradictions between what a brand claims and what it likely does.", userWrap: (i) => `Subject: ${i}\n\nList 5 probable contradictions. Format: **Claim** → **Reality**.` },
  "friction-audit":       { title: "Friction Audit (demo)",           inputLabel: "Funnel or URL",     inputHint: "Describe the buyer path or drop a URL", system: "You are a conversion forensics operator. List concrete friction points that cost deals.", userWrap: (i) => `Funnel: ${i}\n\nList 6 friction points, ranked by revenue impact.` },
  "strategic-questions":  { title: "Strategic Questions (demo)",      inputLabel: "Company / role",    inputHint: "e.g. 'Series A SaaS CEO'", system: "You are a boardroom operator. Generate the hard questions leadership is avoiding.", userWrap: (i) => `Subject: ${i}\n\nProduce 8 strategic questions grouped by category.` },
  "detective-mode":       { title: "Detective Mode (demo)",           inputLabel: "Business + URL",    inputHint: "e.g. 'Acme Co · acme.com'", system: "You are a detective-mode forensic operator. Write a short case-file opener + 5 investigative leads.", userWrap: (i) => `Case subject: ${i}\n\nWrite the case-file opener (60 words), then 5 investigative leads.` },
  "forensic-scan-all":    { title: "Forensic Scan All (demo)",        inputLabel: "Website URL",       inputHint: "https://example.com", system: "You are a forensic operator running a mini all-in-one scan.", userWrap: (i) => `URL: ${i}\n\nReturn: 3 SEO leaks, 3 UX leaks, 3 brand leaks, 3 offer leaks. One line each.` },
  "all-in-one":           { title: "All-In-One Content (demo)",       inputLabel: "Topic",             inputHint: "e.g. 'AI-powered onboarding'", system: "You are a content operator. Turn a topic into a mini content set.", userWrap: (i) => `Topic: ${i}\n\nProduce: 1 blog hook (title + 60-word intro), 1 LinkedIn post (120 words), 1 email subject line.` },
  "content-calendar":     { title: "Content Calendar (demo)",         inputLabel: "Niche",             inputHint: "e.g. 'B2B fintech'", system: "You are a content strategist.", userWrap: (i) => `Niche: ${i}\n\nReturn 7 days of content ideas as a table: Day · Platform · Hook.` },
  "playbook-generator":   { title: "Playbook Generator (demo)",       inputLabel: "Function or goal",  inputHint: "e.g. 'Outbound SDR playbook'", system: "You are an operator writing crisp playbooks.", userWrap: (i) => `Playbook subject: ${i}\n\nReturn a 6-step playbook with owner + KPI per step.` },
  "social-content":       { title: "Social Content Studio (demo)",    inputLabel: "Topic",             inputHint: "e.g. 'why 90% of audits are theater'", system: "You are a voice-locked social operator. Punchy, blunt, non-corporate.", userWrap: (i) => `Topic: ${i}\n\nWrite 3 LinkedIn posts, each 90-140 words.` },
  "content-engine":       { title: "Content Engine (demo)",           inputLabel: "Core idea",         inputHint: "The one insight to expand", system: "You are a content pipeline operator.", userWrap: (i) => `Core idea: ${i}\n\nProduce: 1 long-form outline (5 sections) and 3 short-form spinoffs.` },
  "image-studio":         { title: "Image Studio Brief (demo)",       inputLabel: "Scene",             inputHint: "e.g. 'operator at forensic desk'", system: "You are a creative director for on-brand imagery.", userWrap: (i) => `Scene: ${i}\n\nReturn a production brief: subject, palette, lighting, mood, composition, negative prompt. No image generation — text brief only.` },
  "creation-studio":      { title: "Creation Studio (demo)",          inputLabel: "Asset request",     inputHint: "e.g. 'launch kit for Q4'", system: "You are a mixed-media asset planner.", userWrap: (i) => `Request: ${i}\n\nList 6 assets to produce, format, purpose, and priority.` },
  "easy-mode":            { title: "Easy Mode (demo)",                inputLabel: "One-line goal",     inputHint: "e.g. 'get 10 booked calls this month'", system: "You are the operator's one-prompt shortcut.", userWrap: (i) => `Goal: ${i}\n\nReturn a 5-step plan a solo operator can start today.` },
  "tool-generator":       { title: "Tool Generator (demo)",           inputLabel: "Tool brief",        inputHint: "e.g. 'calculator for pipeline leak $'", system: "You are a product operator scoping micro-tools.", userWrap: (i) => `Brief: ${i}\n\nReturn: inputs, formula/logic, output, one-line UI copy.` },
};

async function callGateway(system: string, user: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("Sandbox unavailable");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system + "\n\nSTRICT: This is a public demo. Do not reference any internal company, client, rep, or system. Output must stand alone from user input only." },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AI error ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) return json({ error: "Rate limit: 6 sandbox runs per hour. Buy a tool for unlimited." }, 429);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const toolId = String(body?.toolId || "").trim();
  const input = String(body?.input || "").trim().slice(0, 800);
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
      watermark: "Aetheris Sandbox · demo run · nothing saved",
    });
  } catch (e: any) {
    return json({ error: e?.message || "Sandbox failed" }, 500);
  }
});

export const TRY_TOOL_META = Object.fromEntries(
  Object.entries(PROMPTS).map(([k, v]) => [k, { title: v.title, inputLabel: v.inputLabel, inputHint: v.inputHint }])
);
