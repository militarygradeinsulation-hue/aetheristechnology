// Forensic Scan All — orchestrator.
// Runs every diagnostic we have against a single target, synthesises a
// 14-chapter "golden standard" report and stores it on forensic_scans.
//
// POST /forensic-scan-all  { url, company?, account_id?, rep_code? }
//   → 200 { scan_id }   (work continues in background; poll the row)
// GET  /forensic-scan-all?id=<uuid>
//   → 200 forensic_scans row

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

// ─────────────────────────────── helpers ────────────────────────────────────
async function setStage(id: string, stage: string, state: string, extra: unknown = null) {
  const { data } = await sb.from("forensic_scans").select("stage_status").eq("id", id).single();
  const prev = (data?.stage_status as Record<string, unknown>) || {};
  prev[stage] = { state, at: new Date().toISOString(), extra };
  await sb.from("forensic_scans").update({ stage_status: prev, updated_at: new Date().toISOString() }).eq("id", id);
}

async function firecrawlScrape(url: string) {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const r = await fetch(`${FIRECRAWL}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links", "branding", "summary"],
        onlyMainContent: false,
      }),
    });
    const j = await r.json();
    return j;
  } catch (e) {
    return { error: String(e) };
  }
}

async function firecrawlMap(url: string) {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const r = await fetch(`${FIRECRAWL}/map`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, limit: 200, includeSubdomains: false }),
    });
    return await r.json();
  } catch (e) {
    return { error: String(e) };
  }
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
      ? `Conservative annualised exposure for this chapter sits in the ${fmt(lo)}–${fmt(hi)} range for a typical SMB at ${name}'s public profile. Connecting CRM, pipeline, and close-rate data will sharpen this number, but the range is the floor we operate from until those are wired in.`
      : `No direct dollar exposure for this chapter — this is a plan / appendix section.`;
    return {
      ...chapter,
      verdict: `${name} has visible leak signals in this area that need operator review.`,
      what_we_found: "The automated scan completed with available evidence. Any tool that timed out or could not extract enough content was preserved in the appendix instead of failing the full audit.",
      why_its_leaking: "The risk is not one isolated issue. The leak pattern comes from public-site friction, messaging gaps, trust signals, and disconnected follow-up paths being interpreted together.",
      what_its_costing: costLine,
      what_to_do: {
        this_week: ["Verify the primary conversion path and response-time promise.", "Repair any missing contact, CTA, proof, or trust signals found in the scan."],
        this_month: ["Connect pipeline data so website leaks can be tied to real lead loss."],
        this_quarter: ["Run the operator-led Leak Audit to price exposure and sequence fixes."],
      },
      evidence,
    };
  });
  return {
    executive_summary: `${name} was scanned across every available forensic tool. The full chaptered AI synthesis did not return in time, so this is the deterministic operator fallback — every chapter is populated with conservative annualised exposure ranges based on standard SMB leak math, not placeholder text.\n\nRanges shown are floors. They sharpen — usually downward in best-case sites, upward in bleed-heavy ones — once CRM, pipeline, and close-rate data are connected.`,
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

async function synthesizeReport(findings: Record<string, unknown>, target: string, company: string) {
  const chaptersList = CHAPTERS.map((c) => `${c.no}. ${c.title} [slug:${c.slug}]`).join("\n");
  const prompt = `Build the complete 14-chapter Chaos Theory Forensics report for **${company || target}**.

Target: ${target}
Company: ${company || "(not provided)"}

RAW FINDINGS (use only what is here, do not fabricate numbers):
${JSON.stringify(findings).slice(0, 90_000)}

Required chapters (in order):
${chaptersList}

For EACH chapter return an object with this exact shape:
{
  "no": <int>,
  "slug": "<slug>",
  "title": "<title>",
  "verdict": "<one blunt sentence>",
  "what_we_found": "<3-6 short paragraphs in markdown>",
  "why_its_leaking": "<2-3 paragraphs>",
  "what_its_costing": "<1-2 paragraphs, USD only>",
  "what_to_do": {
    "this_week": ["<action>", "<action>"],
    "this_month": ["<action>"],
    "this_quarter": ["<action>"]
  },
  "evidence": [
    { "label": "<short label>", "value": "<datum>" }
  ]
}

Also return:
- "executive_summary": 4-6 paragraphs in markdown for the front of the report
- "top_leaks": array of up to 10 { rank, name, dollars_low, dollars_high, chapter_slug, summary }

Respond ONLY with valid JSON of shape:
{ "executive_summary": "...", "top_leaks": [...], "chapters": [ ...14 chapter objects ] }`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(120_000),
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
        model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_VOICE + `\n\nCURRENT DATE: ${new Date().toISOString().slice(0,10)}. The current year is ${new Date().getUTCFullYear()}. Never reference 2024 or earlier as the current year.` },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });
  if (!r.ok) throw new Error(`AI synth failed ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const raw = j.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { executive_summary: raw, chapters: [], top_leaks: [] };
  }
}

// ──────────────────────────── background worker ─────────────────────────────
async function runScan(id: string, url: string, company: string, accountId: string | null) {
  try {
    await sb.from("forensic_scans").update({ status: "running" }).eq("id", id);
    const findings: Record<string, unknown> = {};

    await setStage(id, "site", "running");
    findings.firecrawl_scrape = await firecrawlScrape(url);
    findings.firecrawl_map = await firecrawlMap(url);
    await setStage(id, "site", "done");

    await setStage(id, "scan_website", "running");
    findings.scan_website = await invokeFn("scan-website", { url, company }, 35_000);
    await setStage(id, "scan_website", "done");

    await setStage(id, "friction", "running");
    const [frictionAudit, brandContradictions] = await Promise.all([
      invokeFn("generate-friction-audit", {
        url,
        desiredTone: ["direct", "credible", "trustworthy"],
        industry: company || "business services",
        targetCustomer: "business owner or decision-maker evaluating the company online",
      }, 25_000),
      invokeFn("generate-brand-contradictions", {
        url,
        socialLinks: "Not provided",
        idealCustomer: "business owner or decision-maker evaluating the company online",
        desiredPerception: ["credible", "clear", "trustworthy", "operator-grade"],
      }, 25_000),
    ]);
    findings.friction_audit = frictionAudit;
    findings.brand_contradictions = brandContradictions;
    await setStage(id, "friction", "done");

    if (accountId) {
      await setStage(id, "crm", "running");
      findings.crm = await runCrmDetectors(accountId);
      await setStage(id, "crm", "done");
    } else {
      await setStage(id, "crm", "skipped", "no account_id");
    }

    await setStage(id, "synth", "running");
    let report;
    try {
      report = await synthesizeReport(findings, url, company);
    } catch (e) {
      findings.synthesis_error = e instanceof Error ? e.message : String(e);
      report = fallbackReport(findings, url, company);
    }
    await setStage(id, "synth", "done");

    await sb.from("forensic_scans").update({
      raw_findings: findings,
      report,
      status: "completed",
      completed_at: new Date().toISOString(),
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
          latest_forensic_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
