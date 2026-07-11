// try-resume-fit — Public sandbox for Resume Forensics.
// User uploads a resume (PDF/DOCX/TXT as base64) + provides a company URL.
// We scrape the company with Firecrawl and do a full multimodal fit analysis
// using Gemini 2.5 Pro. Returns a deep, operator-grade comparison report.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";

// Per-IP rate limit — 10 runs / hour (heavier than text-only tools).
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 10;
const rateHits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const arr = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) { rateHits.set(ip, arr); return true; }
  arr.push(now); rateHits.set(ip, arr);
  return false;
}

function normalizeUrl(input: string): string | null {
  try {
    const t = input.trim();
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname === "/" ? "" : u.pathname}`;
  } catch { return null; }
}

async function firecrawlMap(url: string): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, limit: 40 }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const raw = (j?.links || j?.data?.links || []) as any[];
    return raw.map((l) => (typeof l === "string" ? l : l?.url || l?.href || "")).filter(Boolean);
  } catch { return []; }
}

async function firecrawlScrape(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return (j?.data?.markdown || j?.markdown || "").slice(0, 8000);
  } catch { return ""; }
}

async function buildCompanyCorpus(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  if (!normalized) return "";
  const wanted = ["about", "career", "job", "team", "value", "mission", "culture", "people", "why"];
  const links = await firecrawlMap(normalized);
  const targets = [normalized];
  const seen = new Set([normalized.toLowerCase()]);
  for (const l of links) {
    if (targets.length >= 5) break;
    const lower = l.toLowerCase();
    if (!lower.startsWith(normalized.toLowerCase())) continue;
    if (seen.has(lower)) continue;
    if (wanted.some(k => lower.includes(k))) {
      targets.push(l);
      seen.add(lower);
    }
  }
  const scraped = await Promise.all(targets.map(async (u) => {
    const md = await firecrawlScrape(u);
    return md ? `### ${u}\n\n${md}` : "";
  }));
  return scraped.filter(Boolean).join("\n\n---\n\n").slice(0, 30000);
}

const SYSTEM = `You are an Aetheris Business Forensics Operator specializing in candidate-to-company fit analysis.
Voice: blunt, forensic, quantified, non-corporate. Never "as an AI". Never hedge.

You will receive:
- A candidate's resume (as a PDF file, or extracted text)
- Extracted markdown from the target company's website

Produce a comprehensive, client-grade fit report. NO word limit — go deep. Aim 1,800–3,500 words.

Use ONLY these H2 sections IN ORDER:

## Fit Verdict
2 bullets — STRONG / MODERATE / WEAK fit, the single biggest reason, the single biggest risk. Include a numeric fit score X/100.

## Candidate Snapshot
3–5 bullets — years of experience, domain, standout wins (with numbers pulled from the resume), current gap.

## Company Read
4–6 bullets — what the company actually does, stage, hiring posture, stated values (quote them), inferred culture signals from tone/copy on their site. Cite pages.

## Fit Scorecard
Markdown table with columns: Dimension · Company Need · Candidate Evidence (from resume) · Score /10
Rows (mandatory): Domain Match, Skills Match, Stage Fit (startup vs enterprise), Culture Fit, Impact Track Record, Communication Signal, Longevity Signal

## Strengths Working For You Here
5 bullets — the specific wins/skills that map directly to what THIS company needs. Quote the resume line and quote the company line it maps to.

## Gaps & Risks
5 bullets — the exact resume-vs-role gaps this hiring manager will flag. Rank by severity.

## ATS Diagnosis
4 bullets — keyword gaps vs. what a company like this would filter for, format risks, tone issues, length.

## Rewritten Summary (Targeted)
~90 words, first-person, quantified, rewritten specifically for THIS company. Ready to paste.

## Bullet Rewrites (8 rows)
Table: Section · Original (weak) · Rewritten (strong, targeted here) · Metric Anchored · Why It Lands With This Company

## Keywords to Inject
Bullets, grouped: must-have (from company signals) · nice-to-have · avoid (red flags for this culture).

## Interview Prep
5 bullets — the questions THIS company is likely to ask, the trap in each, and the framing that wins. Include one "landmine" question with the exact answer.

## Cover-Note Opener
~100 words — a 3-sentence cold note to the hiring manager here. Ready to paste.

## Do This Monday Morning
Numbered, 6–8 items — the exact sequence to run: resume edits, LinkedIn tweaks, outreach targets at the company (which titles), and the first proof-of-work asset to send.

RULES:
- Cite the resume verbatim when quoting ("Resume line: 'Led team of…'").
- Cite the company site verbatim when quoting ("Their /about page says: 'We move fast and…'").
- Every claim quantifies where possible ($, %, years, headcount).
- Do NOT invent employers, dates, or metrics that aren't in the resume.
- Do NOT be diplomatic — this is a forensic fit report, not a compliment.`;

async function callGeminiWithPdf(pdfBase64: string, pdfMime: string, textPrompt: string, companyCorpus: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("Sandbox unavailable — missing AI key");

  const userContent: any[] = [
    { type: "text", text: textPrompt },
    { type: "text", text: `\n\n---\n\n## COMPANY WEBSITE (scraped markdown)\n\n${companyCorpus || "(No company content could be scraped — proceed with resume analysis and a URL-only inference of the company.)"}` },
  ];

  // Attach resume as a file part when it's a PDF, or as text if it's plain text.
  if (pdfMime === "text/plain") {
    // decode base64 to plain text
    try {
      const decoded = atob(pdfBase64);
      userContent.unshift({ type: "text", text: `## RESUME (plain text)\n\n${decoded.slice(0, 20000)}` });
    } catch {
      userContent.unshift({ type: "text", text: `## RESUME\n\n(Could not decode)` });
    }
  } else {
    userContent.unshift({
      type: "file",
      file: {
        filename: "resume." + (pdfMime.includes("pdf") ? "pdf" : "bin"),
        file_data: `data:${pdfMime};base64,${pdfBase64}`,
      },
    });
    userContent.unshift({ type: "text", text: "## RESUME (attached as file — read every page)" });
  }

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    if (r.status === 429) throw new Error("Model rate-limited. Try again in a moment.");
    if (r.status === 402) throw new Error("AI credits exhausted. Contact Aetheris to top up.");
    throw new Error(`AI error ${r.status}: ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) return json({ error: "Rate limit: 10 runs per hour. Buy the tool for unlimited." }, 429);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const companyUrl = String(body?.companyUrl || "").trim().slice(0, 500);
  const resumeBase64 = String(body?.resumeBase64 || "");
  const resumeMime = String(body?.resumeMime || "application/pdf").slice(0, 100);
  const resumeName = String(body?.resumeName || "resume.pdf").slice(0, 200);
  const targetRole = String(body?.targetRole || "").trim().slice(0, 300);
  const notes = String(body?.notes || "").trim().slice(0, 1000);

  if (!companyUrl) return json({ error: "Enter the company URL" }, 400);
  if (!/^https?:\/\//i.test(companyUrl)) return json({ error: "Company URL must start with https://" }, 400);
  if (!resumeBase64) return json({ error: "Upload a resume file" }, 400);
  // Payload sanity — cap base64 at ~10MB (~ 7.5MB file)
  if (resumeBase64.length > 10 * 1024 * 1024) return json({ error: "Resume file too large (max ~7MB)" }, 413);

  try {
    const companyCorpus = await buildCompanyCorpus(companyUrl);

    const textPrompt = [
      `## TARGET COMPANY URL\n${companyUrl}`,
      targetRole && `## TARGET ROLE\n${targetRole}`,
      notes && `## CANDIDATE NOTES / GOALS\n${notes}`,
      `## RESUME FILE\nFilename: ${resumeName} (${resumeMime})`,
    ].filter(Boolean).join("\n\n");

    const output = await callGeminiWithPdf(resumeBase64, resumeMime, textPrompt, companyCorpus);

    return json({
      ok: true,
      toolId: "resume-forensics",
      title: "Resume Forensics — Candidate ↔ Company Fit",
      contextUsed: Boolean(companyCorpus),
      output,
    });
  } catch (e: any) {
    console.error("try-resume-fit error:", e);
    return json({ error: e?.message || "Sandbox failed" }, 500);
  }
});
