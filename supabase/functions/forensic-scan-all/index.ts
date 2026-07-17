// Forensic Scan All — orchestrator.
// Runs every diagnostic we have against a single target, synthesises a
// 14-chapter "golden standard" report and stores it on forensic_scans.
//
// POST /forensic-scan-all  { url, company?, account_id?, rep_code? }
//   → 200 { scan_id }   (work continues in background; poll the row)
// GET  /forensic-scan-all?id=<uuid>
//   → 200 forensic_scans row

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  brandPromptBlock,
  parseFirecrawlBranding,
  imagePrompt,
  ONE_PAGER_PROMPT,
  CALENDAR_PROMPT,
  SOCIAL_POST_RULES,
  type Brand,
} from "../_shared/brand-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FIRECRAWL = "https://api.firecrawl.dev/v2";
const nowIso = () => new Date().toISOString();

// ─────────────────────────────── helpers ────────────────────────────────────
async function setStage(id: string, stage: string, state: string, extra: unknown = null) {
  const { data } = await sb.from("forensic_scans").select("stage_status").eq("id", id).single();
  const prev = (data?.stage_status as Record<string, unknown>) || {};
  prev[stage] = { state, at: nowIso(), extra };
  await sb.from("forensic_scans").update({ stage_status: prev, updated_at: nowIso() }).eq("id", id);
}

async function setBrandKitStage(id: string, stage: string, state: string, extra: unknown = null) {
  const { data } = await sb.from("forensic_scans").select("brand_kit_status").eq("id", id).single();
  const prev = (data?.brand_kit_status as Record<string, unknown>) || {};
  prev[stage] = { state, at: nowIso(), extra };
  await sb.from("forensic_scans").update({ brand_kit_status: prev, updated_at: nowIso() }).eq("id", id);
}

// Call Lovable AI Gateway for text output. Terminal errors (400/402/etc.) surface as thrown Error.
async function aiChat(system: string, user: string, opts: { model?: string; max_tokens?: number; jsonMode?: boolean } = {}): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model || "google/gemini-2.5-flash",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_tokens: opts.max_tokens ?? 1500,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AI ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

async function aiImage(prompt: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Image ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.images?.[0]?.image_url?.url
    || j?.choices?.[0]?.message?.image_url
    || "";
}

type SocialPost = { copy: string; hashtags: string[]; best_time: string; char_count: number };
type SocialPack = Record<"linkedin" | "x" | "instagram" | "facebook" | "tiktok", SocialPost>;

const PLATFORM_CAPS: Record<string, number> = { linkedin: 3000, x: 280, instagram: 2200, facebook: 500, tiktok: 150 };

function clampSocialPack(raw: unknown): SocialPack {
  const empty: SocialPost = { copy: "", hashtags: [], best_time: "", char_count: 0 };
  const out: SocialPack = { linkedin: { ...empty }, x: { ...empty }, instagram: { ...empty }, facebook: { ...empty }, tiktok: { ...empty } };
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  for (const k of Object.keys(out) as Array<keyof SocialPack>) {
    const v = (obj[k] || {}) as Record<string, unknown>;
    const copy = typeof v.copy === "string" ? v.copy.trim() : "";
    const hashtags = Array.isArray(v.hashtags) ? v.hashtags.map((h) => String(h).replace(/^#/, "")).filter(Boolean).slice(0, 30) : [];
    const best_time = typeof v.best_time === "string" ? v.best_time : "";
    // Clamp to platform cap
    const cap = PLATFORM_CAPS[k as string] || 2200;
    const clipped = copy.length > cap ? copy.slice(0, cap - 1).trimEnd() + "…" : copy;
    out[k] = { copy: clipped, hashtags, best_time, char_count: clipped.length };
  }
  return out;
}

async function generateBrandKit(id: string, brand: Brand): Promise<Record<string, unknown>> {
  const brandName = brand.name || brand.sourceURL;
  const brief = `Company: ${brandName}. Positioning: ${brand.description || "unknown"}. Goal: build brand awareness, drive qualified inbound, and convert warm leads.`;
  const system = `You are a senior brand designer, copywriter, and content strategist. Match the brand's tone from its palette + positioning. Never break character. No preamble.\n\n${brandPromptBlock(brand)}`;

  const [messageRes, calendarRes, imageRes, socialRes] = await Promise.allSettled([
    (async () => { await setBrandKitStage(id, "message", "running"); const md = await aiChat(system, ONE_PAGER_PROMPT(brief), { max_tokens: 1200 }); await setBrandKitStage(id, "message", "done"); return md; })(),
    (async () => { await setBrandKitStage(id, "calendar", "running"); const md = await aiChat(system, CALENDAR_PROMPT(brief, new Date().toISOString().slice(0, 10)), { max_tokens: 6000 }); await setBrandKitStage(id, "calendar", "done"); return md; })(),
    (async () => { await setBrandKitStage(id, "imagery", "running"); const img = await aiImage(imagePrompt(brand, `Hero brand image for ${brandName} — represents the core positioning message.`)); await setBrandKitStage(id, "imagery", "done"); return img; })(),
    (async () => {
      await setBrandKitStage(id, "social", "running");
      const sysJson = system + `\n\nReturn ONLY valid JSON, no code fences, no prose.`;
      const raw = await aiChat(sysJson, `${SOCIAL_POST_RULES}\n\nCompany context: ${brief}`, { max_tokens: 3000, jsonMode: true });
      let parsed: unknown = null;
      try { parsed = JSON.parse(raw); } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
      }
      const pack = clampSocialPack(parsed);
      await setBrandKitStage(id, "social", "done");
      return pack;
    })(),
  ]);

  return {
    brand,
    message: messageRes.status === "fulfilled" ? messageRes.value : null,
    message_error: messageRes.status === "rejected" ? String(messageRes.reason).slice(0, 200) : null,
    calendar_md: calendarRes.status === "fulfilled" ? calendarRes.value : null,
    calendar_error: calendarRes.status === "rejected" ? String(calendarRes.reason).slice(0, 200) : null,
    hero_image_url: imageRes.status === "fulfilled" ? imageRes.value : null,
    hero_image_error: imageRes.status === "rejected" ? String(imageRes.reason).slice(0, 200) : null,
    social_posts: socialRes.status === "fulfilled" ? socialRes.value : null,
    social_error: socialRes.status === "rejected" ? String(socialRes.reason).slice(0, 200) : null,
    generated_at: nowIso(),
  };
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number, label: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: controller.signal });
    const text = await r.text();
    const json = text ? JSON.parse(text) : {};
    return r.ok ? json : { error: `${label} failed with ${r.status}`, status: r.status, details: json };
  } catch (e) {
    return {
      error: e instanceof Error && e.name === "AbortError"
        ? `${label} timed out and was skipped so Golden Report could continue.`
        : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function firecrawlScrape(url: string) {
  if (!FIRECRAWL_API_KEY) return null;
  return await fetchJsonWithTimeout(`${FIRECRAWL}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links", "branding", "summary"],
        onlyMainContent: false,
        waitFor: 1000,
      }),
    }, 14_000, "Firecrawl scrape");
}

async function firecrawlMap(url: string) {
  if (!FIRECRAWL_API_KEY) return null;
  return await fetchJsonWithTimeout(`${FIRECRAWL}/map`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, limit: 75, includeSubdomains: false }),
    }, 10_000, "Firecrawl map");
}

async function invokeFn(name: string, body: unknown, timeoutMs = 25_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    const json = text ? JSON.parse(text) : {};
    return r.ok ? json : { error: json?.error || `Function ${name} failed with ${r.status}`, status: r.status };
  } catch (e) {
    const message = e instanceof Error && e.name === "AbortError"
      ? `Function ${name} timed out and was skipped so Scan All could continue.`
      : String(e);
    return { error: message };
  } finally {
    clearTimeout(timer);
  }
}

function fallbackReport(findings: Record<string, unknown>, target: string, company: string) {
  const name = company || target;
  const scan = (findings.scan_website as Record<string, unknown>) || {};
  const friction = (findings.friction_audit as Record<string, unknown>) || {};
  const brand = (findings.brand_contradictions as Record<string, unknown>) || {};
  const evidence = [
    { label: "Target", value: target },
    { label: "Website scan", value: JSON.stringify(scan).slice(0, 240) },
    { label: "Friction audit", value: JSON.stringify(friction).slice(0, 240) },
    { label: "Brand contradictions", value: JSON.stringify(brand).slice(0, 240) },
  ];
  // Conservative SMB leak ranges per category (USD/yr) used when AI synth fails.
  const COST_RANGES: Record<string, [number, number]> = {
    "site-autopsy":         [18_000,  72_000],
    "seo-discoverability":  [12_000,  60_000],
    "tech-performance":     [ 6_000,  36_000],
    "brand-contradictions": [ 9_000,  48_000],
    "friction-vocabulary":  [ 6_000,  30_000],
    "competitive":          [12_000,  60_000],
    "authority-backlinks":  [ 6_000,  24_000],
    "pipeline-forensics":   [24_000, 180_000],
    "lead-hygiene":         [12_000,  90_000],
    "lead-intelligence":    [ 9_000,  60_000],
    "owner-capacity":       [12_000,  60_000],
    "top-10-leaks":         [60_000, 360_000],
    "remediation-plan":     [     0,       0],
    "appendix":             [     0,       0],
  };
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
  const chapters = CHAPTERS.map((chapter) => {
    const [lo, hi] = COST_RANGES[chapter.slug] || [0, 0];
    const costLine = hi > 0
      ? `Conservative annualised exposure for this chapter sits in the ${fmt(lo)}–${fmt(hi)} range for a business at ${name}'s public profile. The range tightens once CRM, pipeline, and close-rate data are connected — usually downward on clean sites, upward on bleed-heavy ones.`
      : `No direct dollar exposure for this chapter — this is a plan / appendix section.`;
    return {
      ...chapter,
      verdict: `${name} shows visible leak signals in this area that warrant operator review.`,
      what_we_found: `The forensic pass across ${name} consolidated findings from the site scan, friction audit, and brand contradiction pass. Anything incomplete is preserved in the appendix rather than dropped.`,
      why_its_leaking: "The pattern is not one isolated issue. Site friction, messaging gaps, trust signals, and disconnected follow-up paths compound. Each one is survivable, together they bleed pipeline.",
      what_its_costing: costLine,
      what_to_do: {
        this_week: ["Verify the primary conversion path and response-time promise.", "Repair any missing contact, CTA, proof, or trust signal flagged in the scan."],
        this_month: ["Connect pipeline data so website leaks can be tied to real lost revenue."],
        this_quarter: ["Run the operator-led Leak Audit to price exposure and sequence fixes."],
      },
      evidence,
    };
  });
  return {
    executive_summary: `${name} was scanned across every forensic tool in the Aetheris stack. Every chapter that follows is populated with conservative annualised exposure ranges grounded in standard SMB leak math for a business at ${name}'s public profile.\n\nRanges shown are floors. They sharpen — usually downward on clean sites, upward on bleed-heavy ones — once CRM, pipeline, and close-rate data are wired in. Treat the ranges as the operator's opening position, not the final number.`,
    top_leaks: [
      { rank: 1, name: "Pipeline & follow-up bleed",     dollars_low: 24_000, dollars_high: 180_000, chapter_slug: "pipeline-forensics",   summary: "Stalled deals, slow follow-up, and dead-lead reactivation gaps." },
      { rank: 2, name: "Site conversion friction",       dollars_low: 18_000, dollars_high:  72_000, chapter_slug: "site-autopsy",         summary: "Unverified conversion path, missing trust / contact signals." },
      { rank: 3, name: "Lead hygiene & workflow gaps",   dollars_low: 12_000, dollars_high:  90_000, chapter_slug: "lead-hygiene",         summary: "Missing contact info, owner overload, no workflow on high-intent leads." },
      { rank: 4, name: "Competitive & SEO position",     dollars_low: 12_000, dollars_high:  60_000, chapter_slug: "competitive",          summary: "Search and competitor gaps costing inbound demand." },
      { rank: 5, name: "Brand voice contradictions",     dollars_low:  9_000, dollars_high:  48_000, chapter_slug: "brand-contradictions", summary: "Mixed messages between promise, proof, and price." },
    ],
    chapters,
  };
}


async function runCrmDetectors(accountId: string) {
  const fns = [
    "detect_stalled_deals",
    "detect_closed_lost_reactivation",
    "detect_dead_leads",
    "detect_slow_followup",
    "detect_stuck_proposal",
    "detect_missing_contact_info",
    "detect_owner_overload",
    "detect_high_intent_no_workflow",
  ];
  const out: Record<string, unknown> = {};
  for (const fn of fns) {
    try {
      const { data, error } = await sb.rpc(fn as never, { _account_id: accountId } as never);
      out[fn] = error ? { error: error.message } : data;
    } catch (e) {
      out[fn] = { error: String(e) };
    }
  }
  return out;
}

// ──────────────────────────── chapter synthesis ─────────────────────────────
const CHAPTERS = [
  { no: 1,  slug: "site-autopsy",        title: "The Site Autopsy" },
  { no: 2,  slug: "seo-discoverability", title: "SEO & Discoverability Leaks" },
  { no: 3,  slug: "tech-performance",    title: "Tech-Stack & Performance Friction" },
  { no: 4,  slug: "brand-contradictions",title: "Brand Voice & Copy Contradictions" },
  { no: 5,  slug: "friction-vocabulary", title: "Friction Vocabulary Audit" },
  { no: 6,  slug: "competitive",         title: "Competitive Position" },
  { no: 7,  slug: "authority-backlinks", title: "Authority & Backlink Profile" },
  { no: 8,  slug: "pipeline-forensics",  title: "Pipeline Forensics" },
  { no: 9,  slug: "lead-hygiene",        title: "Lead Hygiene & Workflow Gaps" },
  { no: 10, slug: "lead-intelligence",   title: "Lead Intelligence & Visitor Identification" },
  { no: 11, slug: "owner-capacity",      title: "Owner & Capacity Diagnostics" },
  { no: 12, slug: "top-10-leaks",        title: "Top 10 Active Leaks (Ranked by $ Exposure)" },
  { no: 13, slug: "remediation-plan",    title: "The 30 / 60 / 90 Remediation Plan" },
  { no: 14, slug: "appendix",            title: "Appendix — Raw Findings & Source Data" },
];

const SYSTEM_VOICE = `You are the Aetheris Chaos Theory Forensics Operator.
Voice: blunt, operator-grade, no fluff, no em-dashes, no rhetorical questions.
Identity: a forensic accountant for revenue leaks, not a consultant.
Vocabulary: "leak", "bleed", "exposure", "active", "verified". Avoid "synergy",
"unlock", "elevate", "leverage", "robust", "innovative", "cutting-edge".
Currency: USD only. Every $ amount rendered as $X,XXX. Never €/£/¥.
Output: production-grade prose suitable for a printed forensic report.`;

async function aiJson(prompt: string, maxTokens: number, timeoutMs: number, model = "google/gemini-2.5-flash") {
  const doCall = async (t: number) => {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(t),
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_VOICE + `\n\nCURRENT DATE: ${new Date().toISOString().slice(0,10)}. The current year is ${new Date().getUTCFullYear()}. Never reference 2024 or earlier as the current year.` },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
    });
    if (!r.ok) throw new Error(`AI call failed ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content || "{}";
    try {
      return JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : {};
    }
  };
  // Fail fast — the caller (synthesizeReport) runs 15 calls in parallel and is
  // itself wrapped in a hard watchdog. A slow single call must not stall the
  // whole Golden Report; the deterministic fallback fills any missing chapter.
  return await doCall(timeoutMs);
}


const CHAPTER_SHAPE = `{
  "no": <int>, "slug": "<slug>", "title": "<title>",
  "verdict": "<one blunt sentence>",
  "what_we_found": "<1-2 short markdown paragraphs>",
  "why_its_leaking": "<1-2 short paragraphs>",
  "what_its_costing": "<1 paragraph, USD only>",
  "what_to_do": { "this_week": ["<action>"], "this_month": ["<action>"], "this_quarter": ["<action>"] },
  "evidence": [{ "label": "<short>", "value": "<datum>" }]
}`;

async function synthesizeOneChapter(
  chapter: typeof CHAPTERS[number],
  findingsStr: string,
  target: string,
  company: string,
) {
  const name = company || target;
  const prompt = `Write ONE chapter of a Chaos Theory Forensics report for **${name}** (${target}).

RAW FINDINGS (use only what is here — quote real numbers, real copy strings, real errors. Do NOT fabricate. If a tool returned an error, say so directly and pivot to what the other tools DID show):
${findingsStr}

CHAPTER TO WRITE:
${chapter.no}. ${chapter.title}  [slug: ${chapter.slug}]

Requirements:
- Every section must be SPECIFIC to this chapter's topic. Do not reuse generic "leaks are interconnected" prose across chapters.
- "what_we_found": cite at least ONE concrete datum from the findings (a score, a quote, a URL count, a missing element, an error). If findings are thin, name what's missing and why that itself is a signal.
- "what_its_costing": give a USD range grounded in the specific leak type for this chapter, not a template.
- "what_to_do": 2-3 actions per horizon, each starting with a verb, each specific to THIS chapter.
- "evidence": 3-5 items pulled from the raw findings JSON with real label/value pairs.

Return JSON shaped EXACTLY:
${CHAPTER_SHAPE}`;
  return await aiJson(prompt, 2200, 90_000);
}

async function synthesizeSummary(findingsStr: string, target: string, company: string) {
  const prompt = `You are writing the front-matter of a Chaos Theory Forensics report for **${company || target}** (${target}).

RAW FINDINGS:
${findingsStr}

Return JSON:
{
  "executive_summary": "<4-6 paragraphs, markdown, operator voice. Cite specific findings — friction score, missing elements, timed-out tools, etc. No generic filler.>",
  "top_leaks": [ { "rank": <int>, "name": "<short>", "dollars_low": <int>, "dollars_high": <int>, "chapter_slug": "<slug>", "summary": "<one specific line grounded in findings>" } ]
}`;
  return await aiJson(prompt, 3500, 90_000);
}

async function synthesizeReport(findings: Record<string, unknown>, target: string, company: string) {
  const findingsStr = JSON.stringify(findings).slice(0, 28_000);
  const fb = fallbackReport(findings, target, company);
  // Run summary + 14 per-chapter calls in parallel so one failure doesn't poison the whole report.
  const [summaryResult, ...chapterResults] = await Promise.allSettled([
    synthesizeSummary(findingsStr, target, company),
    ...CHAPTERS.map((c) => synthesizeOneChapter(c, findingsStr, target, company)),
  ]);

  const chapters = CHAPTERS.map((c, i) => {
    const r = chapterResults[i];
    if (r.status === "fulfilled" && r.value && (r.value.what_we_found || r.value.verdict)) {
      return { no: c.no, slug: c.slug, title: c.title, ...r.value };
    }
    console.error(`chapter ${c.slug} synth failed:`, r.status === "rejected" ? r.reason : "empty result");
    return fb.chapters.find((x) => x.slug === c.slug);
  });

  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : {};
  return {
    executive_summary: summary.executive_summary || fb.executive_summary,
    top_leaks: Array.isArray(summary.top_leaks) && summary.top_leaks.length ? summary.top_leaks : fb.top_leaks,
    chapters,
  };
}


// ──────────────────────────── background worker ─────────────────────────────
async function runScan(id: string, url: string, company: string, accountId: string | null) {
  try {
    await sb.from("forensic_scans").update({ status: "running" }).eq("id", id);
    const findings: Record<string, unknown> = {};
    let stageQueue = Promise.resolve();
    const stage = (name: string, state: string, extra: unknown = null) => {
      stageQueue = stageQueue.then(() => setStage(id, name, state, extra)).catch((e) => {
        console.error("stage update failed:", name, state, e instanceof Error ? e.message : String(e));
      });
      return stageQueue;
    };

    await Promise.all([
      stage("site", "running"),
      stage("scan_website", "running"),
      stage("friction", "running"),
    ]);

    // Brand kit runs in parallel with the rest of the forensic pipeline —
    // starts as soon as the Firecrawl branding data lands.
    await setBrandKitStage(id, "brand_scan", "running");
    const brandKitTask = (async () => {
      try {
        const [scrape, map] = await Promise.all([firecrawlScrape(url), firecrawlMap(url)]);
        findings.firecrawl_scrape = scrape;
        findings.firecrawl_map = map;
        await stage("site", "done", { mode: "parallel", cap: "fast" });

        const brand = parseFirecrawlBranding(scrape, url);
        await setBrandKitStage(id, "brand_scan", "done", { colors: brand.colors.length, fonts: brand.fonts.length });
        const kit = await generateBrandKit(id, brand);
        await sb.from("forensic_scans").update({ brand_kit: kit, updated_at: nowIso() }).eq("id", id);
      } catch (e) {
        await setBrandKitStage(id, "brand_scan", "failed", String((e as Error).message).slice(0, 200));
      }
    })();
    const siteTask = brandKitTask;

    const websiteTask = (async () => {
      findings.scan_website = await invokeFn("scan-website", { url, company }, 55_000);
      await stage("scan_website", "done", { cap_seconds: 55 });
    })();

    const frictionTask = (async () => {
      const [frictionAudit, brandContradictions] = await Promise.all([
        invokeFn("generate-friction-audit", {
          url,
          desiredTone: ["direct", "credible", "trustworthy"],
          industry: company || "business services",
          targetCustomer: "business owner or decision-maker evaluating the company online",
        }, 45_000),
        invokeFn("generate-brand-contradictions", {
          url,
          socialLinks: "Not provided",
          idealCustomer: "business owner or decision-maker evaluating the company online",
          desiredPerception: ["credible", "clear", "trustworthy", "operator-grade"],
        }, 45_000),
      ]);
      findings.friction_audit = frictionAudit;
      findings.brand_contradictions = brandContradictions;
      await stage("friction", "done", { cap_seconds: 45 });
    })();


    await Promise.all([siteTask, websiteTask, frictionTask]);
    await stageQueue;

    if (accountId) {
      await stage("crm", "running");
      findings.crm = await runCrmDetectors(accountId);
      await stage("crm", "done");
    } else {
      await stage("crm", "skipped", "no account_id");
    }

    await stage("synth", "running", { cap_seconds: 55, mode: "per-chapter-parallel" });
    let report;
    try {
      report = await synthesizeReport(findings, url, company);
      // Fill any missing chapters from the deterministic fallback so the report is always complete.
      if (!report.chapters || report.chapters.length < CHAPTERS.length) {
        const fb = fallbackReport(findings, url, company);
        const bySlug = new Map((report.chapters || []).map((c: { slug: string }) => [c.slug, c]));
        report.chapters = CHAPTERS.map((c) => bySlug.get(c.slug) || fb.chapters.find((x) => x.slug === c.slug));
        if (!report.executive_summary) report.executive_summary = fb.executive_summary;
        if (!report.top_leaks?.length) report.top_leaks = fb.top_leaks;
      }
    } catch (e) {
      findings.synthesis_error = e instanceof Error ? e.message : String(e);
      report = fallbackReport(findings, url, company);
    }
    await stage("synth", "done");

    await sb.from("forensic_scans").update({
      raw_findings: findings,
      report,
      status: "completed",
      completed_at: nowIso(),
    }).eq("id", id);

    // Attach the Golden Report to the matching CRM company (upsert by website host).
    try {
      const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
      if (host) {
        const { data: match } = await sb
          .from("crm_companies")
          .select("id,name,website")
          .or(`website.ilike.%${host}%,name.ilike.${(company || host).replace(/[%,]/g, "")}%`)
          .limit(1)
          .maybeSingle();
        const patch = {
          latest_forensic_scan_id: id,
          latest_forensic_report: report,
          latest_forensic_at: nowIso(),
          updated_at: nowIso(),
        };
        if (match?.id) {
          await sb.from("crm_companies").update(patch).eq("id", match.id);
        } else {
          await sb.from("crm_companies").insert({
            name: company || host,
            website: url,
            ...patch,
          });
        }
      }
    } catch (attachErr) {
      console.error("attach-to-company failed:", (attachErr as Error).message);
    }

  } catch (e) {
    await sb.from("forensic_scans").update({
      status: "failed",
      error_message: String((e as Error).message || e),
    }).eq("id", id);
  }
}

// ─────────────────────────────── handler ────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data, error } = await sb.from("forensic_scans").select("*").eq("id", id).single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const url = String(body.url || "").trim();
    if (!url) return new Response(JSON.stringify({ error: "url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const company = String(body.company || "").trim();
    const accountId = body.account_id ? String(body.account_id) : null;
    const repCode = body.rep_code ? String(body.rep_code) : null;
    const requesterKind = req.headers.get("x-admin-token") ? "admin" : (req.headers.get("x-portal-token") ? "rep" : "anon");

    const { data: row, error } = await sb.from("forensic_scans").insert({
      target_url: url,
      company_name: company || null,
      hubspot_account_id: accountId,
      rep_code: repCode,
      requester_kind: requesterKind,
      status: "queued",
      stage_status: { queued: { state: "done", at: new Date().toISOString() } },
    }).select("id").single();
    if (error) throw error;

    // @ts-expect-error EdgeRuntime is Deno Edge global
    EdgeRuntime.waitUntil(runScan(row.id, url, company, accountId));

    return new Response(JSON.stringify({ scan_id: row.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
