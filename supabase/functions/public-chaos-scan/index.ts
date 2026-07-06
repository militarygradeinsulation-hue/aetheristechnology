// public-chaos-scan — Public version of chaos-scan for the homepage URL box.
// Same golden-report pipeline (Firecrawl + AI Gateway synthesis) as chaos-scan,
// without the admin token gate, plus a simple in-memory IP rate limit to keep
// costs predictable. Never expose internal keys.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

// Very light per-IP rate limit: 4 scans per hour, sliding window.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 4;
const rateHits: Map<string, number[]> = new Map();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    rateHits.set(ip, arr);
    return true;
  }
  arr.push(now);
  rateHits.set(ip, arr);
  return false;
}

function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // block private/loopback hosts
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function fcScrape(url: string, formats: any[], timeoutMs = 25_000): Promise<any | null> {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats, onlyMainContent: true }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data ?? j ?? null;
  } catch (e) {
    console.warn("fc scrape failed", url, e);
    return null;
  }
}

async function fcMap(url: string): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/map", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, limit: 120, includeSubdomains: false }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const links: string[] = j?.links ?? j?.data?.links ?? [];
    return Array.isArray(links) ? links : [];
  } catch {
    return [];
  }
}

async function rawFetchReadable(url: string): Promise<{ title: string; markdown: string }> {
  let html = "";
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AetherisChaosScan/1.0; +https://aetheris.technology)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    html = await r.text();
  } catch (e) {
    console.warn("raw fetch failed", e);
  }
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title, markdown: stripped.slice(0, 8000) };
}

function scoreLink(u: string, rootHost: string): number {
  try {
    const url = new URL(u);
    if (url.hostname !== rootHost && !url.hostname.endsWith("." + rootHost)) return -1;
    const p = url.pathname.toLowerCase();
    if (p === "/" || p === "") return -1;
    const buckets: Array<[RegExp, number]> = [
      [/\b(pricing|plans|packages|rates|cost)\b/, 100],
      [/\b(services?|solutions?|offerings?|what-we-do|products?)\b/, 85],
      [/\b(about|company|who-we-are|story|mission)\b/, 80],
      [/\b(contact|schedule|book|demo|call|consult)\b/, 75],
      [/\b(team|people|leadership|founders?|staff)\b/, 65],
      [/\b(case-?studies?|clients?|portfolio|work|results?)\b/, 60],
      [/\b(faq|help|support|policies?|terms|refund)\b/, 45],
      [/\b(careers?|jobs?|hiring)\b/, 40],
      [/\b(blog|insights?|resources?|guides?|articles?)\b/, 25],
    ];
    let score = 0;
    for (const [rx, v] of buckets) if (rx.test(p)) score = Math.max(score, v);
    const depth = p.split("/").filter(Boolean).length;
    if (depth > 4) score -= 20;
    if (/\bpage[-/]?\d+\b/.test(p)) score -= 40;
    if (/\.(pdf|jpg|jpeg|png|gif|webp|mp4|zip)$/.test(p)) score -= 100;
    return score;
  } catch { return -1; }
}
function pickTopLinks(links: string[], rootHost: string, limit = 4): string[] {
  const seen = new Set<string>();
  const scored: Array<{ u: string; s: number }> = [];
  for (const raw of links) {
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    const s = scoreLink(raw, rootHost);
    if (s > 0) scored.push({ u: raw, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.u);
}

const SYSTEM = `You are the Business Forensics Operator running a Golden-Report Chaos Map.
You have been handed a full evidence bundle: the target page, branding, an AI summary, structured business facts, sitemap coverage, and readable copy from the highest-signal pages (pricing / services / about / contact / team / case studies / blog).
Your job is to expose the hidden interconnections between symptoms and pinpoint the ONE upstream source that feeds them all.
Voice: blunt, forensic, operator — never corporate. Plain, concrete words. USD only ($).
Ground every symptom in something from the evidence — quote or reference a specific page.`;

function buildBundle(
  url: string, title: string, mainMarkdown: string, summary: string,
  branding: any, extracted: any, siteLinks: string[],
  pages: Array<{ url: string; title: string; markdown: string }>,
) {
  const brandingBlock = branding
    ? `BRANDING SIGNALS:
- Color scheme: ${branding.colorScheme ?? "?"}
- Primary color: ${branding.colors?.primary ?? "?"}
- Fonts: ${(branding.fonts || []).map((f: any) => f.family).filter(Boolean).join(", ") || "?"}
- Logo: ${branding.images?.logo ?? branding.logo ?? "?"}`
    : "BRANDING SIGNALS: (unavailable)";
  const extractedBlock = extracted
    ? `STRUCTURED BUSINESS FACTS (auto-extracted):\n${JSON.stringify(extracted).slice(0, 2500)}`
    : "STRUCTURED BUSINESS FACTS: (unavailable)";
  const sitemapBlock = `SITEMAP COVERAGE (${siteLinks.length} URLs discovered, sample):
${siteLinks.slice(0, 40).join("\n")}`;
  const pagesBlock = pages
    .map((p, i) => `--- PAGE ${i + 1}: ${p.title || p.url}
URL: ${p.url}
COPY (truncated):
${p.markdown.slice(0, 3000)}`)
    .join("\n\n");

  return `TARGET URL: ${url}
PAGE TITLE: ${title}

AI SUMMARY OF HOMEPAGE:
${summary || "(none)"}

${brandingBlock}

${extractedBlock}

${sitemapBlock}

DEEP-SCRAPE OF HIGH-SIGNAL PAGES:
${pagesBlock || "(none)"}

HOMEPAGE COPY (truncated):
"""
${mainMarkdown.slice(0, 5000)}
"""

Read this like a detective. Infer business model, buyer, pricing posture, operational maturity, and where money is leaking. Cross-reference the pages against each other for contradictions.

Return STRICT JSON of shape:
{
  "company": "short human name of the business",
  "vertical": "1-3 word industry label",
  "url": "${url}",
  "source": {
    "label": "2-4 word name of the single upstream cause feeding every symptom",
    "chaos": "one blunt sentence: what it costs them today.",
    "sealed": "one blunt sentence: what changes when it's closed.",
    "dollar_leak": "$X.Xk-$X.Xk / mo estimated bleed range",
    "evidence": "one specific quote or URL from the bundle that proves this is the root cause"
  },
  "operators": [
    { "id": "scan",  "label": "Scan",  "body": "one sentence: what a forensic audit would surface on THIS specific business." },
    { "id": "price", "label": "Price", "body": "one sentence: how the leaks would be quantified in dollars for THIS business." },
    { "id": "fix",   "label": "Fix",   "body": "one sentence: what the first fix ships for THIS business." }
  ],
  "symptoms": [
    {
      "id": "kebab-case-id",
      "label": "2-4 word symptom name",
      "icon": "ghost | trending-down | unplug | wallet | flame | zap | alert | eye-off | phone-off | receipt | clock | scale",
      "anchor": "scan | price | fix",
      "chaos": "one blunt sentence naming the specific pain on THIS business.",
      "fixed": "one blunt sentence naming what changes once the source is sealed.",
      "dollar_leak": "$X.Xk-$X.Xk / mo estimated bleed range for THIS symptom",
      "cascade": [
        "30-day downstream consequence — one blunt sentence with a $ number.",
        "90-day downstream consequence — one blunt sentence with a $ number.",
        "12-month compounding failure — one blunt sentence with a $ number."
      ],
      "evidence": { "source_url": "URL from the bundle this was inferred from", "quote": "short quote (<=200 chars) or a specific observation" },
      "connections": ["other-symptom-id", "other-symptom-id"]
    }
  ],
  "contradictions": [
    "one-sentence contradiction the site reveals, referencing which page vs which page.",
    "another contradiction",
    "another"
  ],
  "intel": {
    "positioning": "one sentence: how they position themselves publicly.",
    "buyer": "one sentence: who they are actually selling to.",
    "pricing_posture": "one sentence: transparent / gated / absent / negotiable — with the evidence.",
    "operational_maturity": "one sentence: what the site reveals about their ops maturity.",
    "quick_wins": ["3-5 short, blunt tactical wins they could ship in <30 days"],
    "estimated_total_monthly_leak": "$X.Xk-$X.Xk / mo — sum-of-symptoms rough band"
  }
}

RULES:
- Return 6-8 symptoms grounded in the evidence bundle. No generic filler.
- Each symptom MUST include a dollar_leak, a 3-item cascade, an evidence object, and 1-3 connections.
- Distribute anchors across scan / price / fix (roughly balanced).
- "source.label" must be ONE root cause, not a list.
- 2-4 contradictions.
- Output JSON only. No prose, no markdown fences.`;
}

async function synthesize(prompt: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(75_000),
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`AI gateway ${r.status}: ${body}`);
  }
  const j = await r.json();
  const raw = j.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "unknown";

    if (rateLimited(ip)) {
      return json({ error: "Rate limit exceeded. Try again in an hour." }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const raw = String(body?.url || "").trim().slice(0, 500);
    if (!raw) return json({ error: "Missing url" }, 400);
    const url = normalizeUrl(raw);
    if (!url) return json({ error: "Invalid or unsupported URL" }, 400);
    const rootHost = new URL(url).hostname.replace(/^www\./, "");

    const businessSchema = {
      type: "object",
      properties: {
        company_name: { type: "string" },
        one_liner: { type: "string" },
        industry: { type: "string" },
        offerings: { type: "array", items: { type: "string" } },
        target_customer: { type: "string" },
        pricing_visible: { type: "boolean" },
        pricing_notes: { type: "string" },
        contact_channels: { type: "array", items: { type: "string" } },
        social_links: { type: "array", items: { type: "string" } },
        team_size_hint: { type: "string" },
        differentiators: { type: "array", items: { type: "string" } },
        proof_points: { type: "array", items: { type: "string" } },
        red_flags: { type: "array", items: { type: "string" } },
      },
    };

    const [deep, siteLinks] = await Promise.all([
      fcScrape(url, [
        "markdown",
        "links",
        "branding",
        "summary",
        { type: "json", schema: businessSchema },
      ]),
      fcMap(url),
    ]);

    let title = deep?.metadata?.title || "";
    let mainMarkdown: string = deep?.markdown || "";
    const summary: string = deep?.summary || "";
    const branding = deep?.branding || null;
    const extracted = deep?.json || null;
    const pageLinks: string[] = deep?.links || [];

    if (!mainMarkdown) {
      const raw2 = await rawFetchReadable(url);
      title = title || raw2.title;
      mainMarkdown = raw2.markdown;
    }

    const allLinks = Array.from(new Set([...(siteLinks || []), ...(pageLinks || [])]));
    const top = pickTopLinks(allLinks, rootHost, 4);

    const pages: Array<{ url: string; title: string; markdown: string }> = [];
    if (top.length && FIRECRAWL_API_KEY) {
      const results = await Promise.all(top.map((u) => fcScrape(u, ["markdown"])));
      results.forEach((res, i) => {
        if (!res) return;
        pages.push({
          url: top[i],
          title: res?.metadata?.title || top[i],
          markdown: res?.markdown || "",
        });
      });
    }

    const prompt = buildBundle(url, title || rootHost, mainMarkdown, summary, branding, extracted, allLinks, pages);
    const map = await synthesize(prompt);

    return json({
      ok: true,
      url,
      domain: rootHost,
      title: title || rootHost,
      map,
      intel_meta: {
        firecrawl_used: !!FIRECRAWL_API_KEY,
        sitemap_urls: allLinks.length,
        pages_analyzed: pages.length + 1,
        analyzed_urls: [url, ...pages.map((p) => p.url)],
        model: "google/gemini-2.5-pro",
      },
    });
  } catch (e) {
    console.error("public-chaos-scan error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
