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
import { routedChatCompletion, type AiTier } from "../_shared/ai-router.ts";

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
const CRAWLER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
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
async function aiChat(system: string, user: string, opts: { model?: string; max_tokens?: number; jsonMode?: boolean; tier?: AiTier } = {}): Promise<string> {
  const res = await routedChatCompletion({
    tier: opts.tier ?? "bulk",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_tokens: opts.max_tokens ?? 1500,
    response_format: opts.jsonMode ? { type: "json_object" } : undefined,
    timeoutMs: 90_000,
  });
  return res.content;
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
        ? `${label} did not respond in time, so the Golden Report continued with the internal crawler.`
        : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

function safeUrl(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function resolveHref(href: string, base: string): string | null {
  try {
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return null;
    const u = new URL(href, base);
    if (!/^https?:$/i.test(u.protocol)) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).hostname.replace(/^www\./i, "").toLowerCase() === new URL(b).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return false;
  }
}

function metaContent(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, "i"))?.[1] ||
    ""
  ).trim();
}

function extractLinks(html: string, base: string): string[] {
  const linksRaw = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi)).map((m) => m[1]);
  return Array.from(new Set(linksRaw.map((h) => resolveHref(h, base)).filter(Boolean) as string[]));
}

function scoreInternalLink(link: string): number {
  const path = (() => { try { return new URL(link).pathname.toLowerCase(); } catch { return ""; } })();
  let score = 0;
  if (/contact|quote|estimate|schedule|book|demo|consult/.test(path)) score += 50;
  if (/service|solution|product|offer|pricing|work/.test(path)) score += 35;
  if (/about|team|company|who-we-are/.test(path)) score += 25;
  if (/case|portfolio|project|review|testimonial|result/.test(path)) score += 20;
  if (/blog|news|privacy|terms|login|cart|wp-content|tag|category/.test(path)) score -= 25;
  score -= Math.min(path.length / 20, 12);
  return score;
}

async function fetchHtmlPage(url: string, timeoutMs = 6500): Promise<{ url: string; html: string; status: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(safeUrl(url), {
      signal: controller.signal,
      headers: {
        "user-agent": CRAWLER_UA,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
      },
      redirect: "follow",
    });
    const contentType = r.headers.get("content-type") || "";
    if (!r.ok || !/text\/html|application\/xhtml\+xml|text\//i.test(contentType)) return null;
    const html = await r.text();
    return html ? { url: r.url || safeUrl(url), html, status: r.status } : null;
  } catch (e) {
    console.warn("internal crawler fetch failed:", e instanceof Error ? e.message : String(e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractBranding(html: string, baseUrl: string) {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
  const description = metaContent(html, "description") || metaContent(html, "og:description");
  const logo =
    resolveHref(html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1] || "", baseUrl) ||
    resolveHref(html.match(/<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1] || "", baseUrl) ||
    "";
  const colors = Array.from(new Set(Array.from(html.matchAll(/#[0-9a-f]{6}\b/gi)).map((m) => m[0].toLowerCase()))).slice(0, 8);
  const fonts = Array.from(new Set(Array.from(html.matchAll(/font-family\s*:\s*([^;}{]+)/gi)).map((m) => m[1].replace(/["']/g, "").split(",")[0].trim()).filter(Boolean))).slice(0, 6);
  return {
    colorScheme: /dark|black|#000|#111|#0[0-9a-f]{2}/i.test(html.slice(0, 8000)) ? "dark" : "light",
    logo,
    colors: {
      primary: colors[0] || "",
      secondary: colors[1] || "",
      accent: colors[2] || "",
      background: colors[3] || "",
      textPrimary: colors[4] || "",
      textSecondary: colors[5] || "",
    },
    fonts: fonts.map((family) => ({ family })),
    typography: { fontFamilies: { primary: fonts[0] || "", heading: fonts[1] || fonts[0] || "" } },
    images: { logo },
    metadata: { title, description, sourceURL: baseUrl },
  };
}

async function internalCrawlerScrape(url: string): Promise<Record<string, unknown> | null> {
  const startUrl = safeUrl(url);
  const first = await fetchHtmlPage(startUrl, 7000);
  if (!first) return null;

  const homeLinks = extractLinks(first.html, first.url);
  const internalLinks = homeLinks
    .filter((link) => sameHost(link, first.url))
    .sort((a, b) => scoreInternalLink(b) - scoreInternalLink(a))
    .slice(0, 5);

  const pages = [first];
  for (const link of internalLinks.slice(0, 4)) {
    const page = await fetchHtmlPage(link, 4500);
    if (page && !pages.some((p) => p.url === page.url)) pages.push(page);
  }

  const markdown = pages
    .map((page, index) => {
      const title = (page.html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || page.url).trim();
      return `\n\n## Crawled page ${index + 1}: ${title}\nSource: ${page.url}\n\n${htmlToText(page.html)}`;
    })
    .join("\n\n---\n\n")
    .slice(0, 32_000);

  if (markdown.trim().length < 80) return null;
  const title = (first.html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
  const description = metaContent(first.html, "description") || metaContent(first.html, "og:description") || markdown.slice(0, 400);
  const links = Array.from(new Set([...homeLinks, ...pages.flatMap((p) => extractLinks(p.html, p.url))])).slice(0, 160);
  return {
    success: true,
    _via: "aetheris_internal_crawler",
    data: {
      markdown,
      links,
      summary: description,
      branding: extractBranding(first.html, first.url),
      metadata: { title, description, sourceURL: first.url, statusCode: first.status, pagesCrawled: pages.length },
    },
  };
}

async function internalCrawlerMap(url: string): Promise<Record<string, unknown> | null> {
  const first = await fetchHtmlPage(safeUrl(url), 6500);
  if (!first) return null;
  const links = extractLinks(first.html, first.url).filter((link) => sameHost(link, first.url)).slice(0, 75);
  return { success: true, _via: "aetheris_internal_crawler", links };
}

// Strip HTML → plain markdown-ish text for the direct-fetch fallback.
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(h[1-6])[^>]*>/gi, "\n\n# ")
    .replace(/<\/(h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Direct browser-UA fetch as a last-ditch fallback when the internal crawler and external crawler can't get through.
// Returns a Firecrawl v2-shaped envelope so downstream code doesn't need to branch.
async function directFetchFallback(url: string): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          CRAWLER_UA,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    }).finally(() => clearTimeout(timer));
    if (!r.ok) return null;
    const html = await r.text();
    if (!html) return null;
    const markdown = htmlToText(html).slice(0, 20_000);
    if (markdown.length < 80) return null;
    const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
    const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || "").trim();
    const linksRaw = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi)).map((m) => m[1]);
    const links = Array.from(new Set(linksRaw)).slice(0, 120);
    return {
      success: true,
      _via: "direct_fetch_fallback",
      data: {
        markdown,
        links,
        summary: desc || markdown.slice(0, 400),
        metadata: { title, description: desc, sourceURL: url, statusCode: r.status },
      },
    };
  } catch (e) {
    console.warn("directFetchFallback failed:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function firecrawlScrapeOnce(
  url: string,
  opts: { waitFor: number; onlyMainContent: boolean; location?: boolean },
  timeoutMs: number,
) {
  const body: Record<string, unknown> = {
    url,
    formats: ["markdown", "links", "branding", "summary"],
    onlyMainContent: opts.onlyMainContent,
    waitFor: opts.waitFor,
  };
  if (opts.location) body.location = { country: "US", languages: ["en"] };
  return await fetchJsonWithTimeout(
    `${FIRECRAWL}/scrape`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
    "External crawler scrape",
  );
}

// True on any Firecrawl payload that gave us usable page text.
function scrapeHasContent(res: unknown): boolean {
  if (!res || typeof res !== "object") return false;
  const r = res as Record<string, unknown>;
  if (r.error) return false;
  const data = ((r.data as Record<string, unknown> | undefined) ?? r) as Record<string, unknown>;
  const md = (data.markdown as string) || "";
  return typeof md === "string" && md.trim().length > 80;
}

async function firecrawlScrape(url: string) {
  // Use our own crawler first. External Firecrawl is now only a short fallback,
  // so public Golden Report scans do not stall on provider timeouts.
  const internal = await internalCrawlerScrape(url);
  if (scrapeHasContent(internal)) return internal;
  if (!FIRECRAWL_API_KEY) return await directFetchFallback(url);
  // Attempt 1: fast pass, main content only.
  let res = await firecrawlScrapeOnce(url, { waitFor: 0, onlyMainContent: true }, 8_000);
  if (scrapeHasContent(res)) return res;
  console.warn("Firecrawl attempt 1 empty/failed, retrying with waitFor+location");
  // Attempt 2: slower pass with US location + wait, keeps the whole page. Beats most bot walls.
  res = await firecrawlScrapeOnce(url, { waitFor: 1000, onlyMainContent: false, location: true }, 10_000);
  if (scrapeHasContent(res)) return res;
  console.warn("Firecrawl attempt 2 empty/failed, falling back to direct fetch");
  // Attempt 3: plain browser-UA fetch. Anything > nothing.
  const direct = await directFetchFallback(url);
  if (direct) return direct;
  // All paths failed: return the last Firecrawl envelope so downstream sees a real error.
  return res;
}


async function firecrawlMap(url: string) {
  const internal = await internalCrawlerMap(url);
  if (internal) return internal;
  if (!FIRECRAWL_API_KEY) return null;
  return await fetchJsonWithTimeout(`${FIRECRAWL}/map`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, limit: 75, includeSubdomains: false }),
    }, 6_000, "External crawler map");
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
      ? `Companion audit ${name} did not finish inside the scan window, so Golden Report continued with the core crawler.`
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
Output: production-grade prose suitable for a printed forensic report.

EVIDENCE RULES — non-negotiable, violating any of these invalidates the report:
1. FORM ERROR STRINGS ARE NOT PROOF OF A BROKEN FORM. Scraped HTML routinely contains BOTH the success message ("Thank you! Your submission has been received!") and the failure message ("Oops! Something went wrong while submitting the form") as adjacent hidden DOM blocks — this is standard Webflow / Framer / Wix behavior. JavaScript toggles which one displays at runtime. Never treat the mere presence of "Oops! Something went wrong" as a confirmed active bug or price it as a leak. If you must reference it, label it "unverified form pattern — requires live submission test", assign zero dollar exposure, and do NOT include it in top_leaks.
2. IDENTICAL STRINGS ARE NEVER CONTRADICTIONS. If two quoted snippets in the findings contain the same sentence, that is intentional messaging consistency across pages, not a brand voice conflict. Only flag a contradiction when the meaning genuinely differs (e.g. "money-back guarantee" on one page vs "all sales final" on another). Never price identical repetition as a leak.
3. DATE MATH: the current year is ${new Date().getUTCFullYear()}. A copyright year LESS THAN the current year is STALE / IN THE PAST, never "a future date". A stale copyright is a small trust signal, not a priced leak on its own.
4. DE-DUPLICATE ROOT CAUSES. Each distinct underlying issue is priced ONCE across the whole report. The top_leaks array must contain 3-5 DISTINCT root causes, no repeats of the same underlying issue with different dollar ranges. Chapters may reference a leak documented elsewhere but must not re-price it.
5. Do not invent findings. If a tool returned an error, say so and pivot to what other tools showed. Empty findings for a chapter means write "no signal detected in this pass" — not a fabricated leak.`;


async function aiJson(prompt: string, maxTokens: number, timeoutMs: number, _model?: string, tier: AiTier = "heavy") {
  const doCall = async (t: number) => {
    const res = await routedChatCompletion({
      tier,
      messages: [
        { role: "system", content: SYSTEM_VOICE + `\n\nCURRENT DATE: ${new Date().toISOString().slice(0,10)}. The current year is ${new Date().getUTCFullYear()}. Never reference 2024 or earlier as the current year.` },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      temperature: 0.4,
      timeoutMs: t,
    });
    const raw = res.content || "{}";
    try {
      return JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : {};
    }
  };
  // One retry on abort / empty before the caller falls back to template text.
  try {
    const first = await doCall(timeoutMs);
    if (first && Object.keys(first).length) return first;
    throw new Error("empty json");
  } catch (e) {
    console.warn("aiJson attempt 1 failed, retrying:", e instanceof Error ? e.message : String(e));
    return await doCall(timeoutMs);
  }
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
  return await aiJson(prompt, 2200, 55_000);
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
  return await aiJson(prompt, 3500, 60_000);
}

// ─────────────────────── growth deliverables synthesis ───────────────────────
// Four practical website deliverables generated from the SAME cleaned findings
// used by the evidence-based report: brand, imagery, posts, schedule.
// Bounded: one wave, one attempt each, hard per-call timeout. Never blocks the
// report — a failure simply leaves that section absent.

const DELIVERABLE_VOICE = `
DELIVERABLE RULES:
- Everything must be specific to this company and grounded in the scan findings. No generic agency filler, no invented statistics, awards, client names, or claims.
- Never use dashes as punctuation in public-facing copy. No em-dashes, no en-dashes, no hyphen used as a pause. Write shorter sentences instead.
- USD only for any money value.
- No emoji spam. No "in today's fast-paced world". No rhetorical questions.
- Return ONLY valid JSON in the exact shape requested.`;

async function deliverableCall(prompt: string, maxTokens: number) {
  const res = await routedChatCompletion({
    tier: "bulk",
    messages: [
      { role: "system", content: SYSTEM_VOICE + "\n" + DELIVERABLE_VOICE },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
    temperature: 0.5,
    timeoutMs: 45_000,
  });
  const raw = res.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

async function synthesizeDeliverables(
  findingsStr: string,
  target: string,
  company: string,
  topLeaks: Array<Record<string, unknown>>,
) {
  const name = company || target;
  const ctx = `COMPANY: ${name}
WEBSITE: ${target}
TOP LEAKS FOUND: ${JSON.stringify((topLeaks || []).slice(0, 5))}

SCAN FINDINGS (the only source of truth about this company):
${findingsStr.slice(0, 14_000)}`;

  const brandPrompt = `${ctx}

Write a concise BRAND BLUEPRINT for ${name}, corrected against what the scan actually found.
Return JSON:
{
 "positioning": "<2-3 sentences>",
 "target_audience": "<2-3 sentences naming who actually buys>",
 "voice": { "summary": "<1-2 sentences>", "do": ["<3-5 items>"], "dont": ["<3-5 items>"] },
 "messaging_pillars": [ { "title": "<short>", "detail": "<1-2 sentences>" } ],
 "value_proposition": "<one sentence a buyer would repeat>",
 "differentiators": ["<3-5 specific to this company>"],
 "color_guidance": { "summary": "<1-2 sentences>", "palette": [ { "role": "<primary|accent|surface|text>", "hex": "#RRGGBB", "use": "<where to use it>" } ] },
 "typography_guidance": { "headline": "<font family recommendation>", "body": "<font family recommendation>", "notes": "<1-2 sentences>" },
 "corrections": [ { "issue": "<what the scan found>", "fix": "<what to change>" } ]
}
Include 3-5 messaging_pillars and 3-6 corrections. Every correction must reference a real finding.`;

  const imageryPrompt = `${ctx}

Write an IMAGERY DIRECTION BOARD for ${name}.
Return JSON:
{
 "visual_style": "<2-3 sentences>",
 "subjects": ["<4-6 concrete subjects to photograph or render>"],
 "composition": "<2-3 sentences>",
 "lighting": "<1-2 sentences>",
 "color_treatment": "<1-2 sentences referencing real hex values>",
 "show": ["<4-6 items>"],
 "avoid": ["<4-6 items>"],
 "prompts": [ { "title": "<short label>", "prompt": "<a complete ready to paste image generation prompt, 40-80 words, naming the company context, subject, composition, lighting, palette and mood>" } ]
}
Include 4 to 6 prompts. Each prompt must be usable as-is with no placeholders.`;

  const postsPrompt = `${ctx}

Write 12 READY TO PUBLISH social posts for ${name}. Each is customized to this company and its real findings. No invented claims, no fabricated numbers, no client names.
Return JSON:
{ "posts": [ { "platform": "<LinkedIn|X|Instagram|Facebook|Email>", "hook": "<one scroll stopping line>", "body": "<60-140 words, plain sentences>", "cta": "<one short specific action>", "visual": "<one sentence describing the suggested visual>" } ] }
Exactly 12 posts. Mix the platforms. Never use dashes as punctuation.`;

  const schedulePrompt = `${ctx}

Build a practical 30 DAY PUBLISHING SCHEDULE for ${name} that assigns the kind of posts and supporting content generated for this company.
Return JSON:
{ "overview": "<2-3 sentences on cadence and goal>",
  "days": [ { "day": <1-30>, "platform": "<channel>", "time": "<e.g. 8:30 AM ET>", "purpose": "<authority|proof|offer|education|reactivation>", "topic": "<specific to this company>", "visual": "<short visual direction>" } ] }
Exactly 30 day entries, day 1 through 30, no gaps. Vary platform and purpose sensibly.`;

  const specs: Array<[string, string, number]> = [
    ["brand", brandPrompt, 2200],
    ["imagery", imageryPrompt, 2200],
    ["posts", postsPrompt, 3600],
    ["schedule", schedulePrompt, 3600],
  ];

  const results = await Promise.allSettled(specs.map(([, p, t]) => deliverableCall(p, t)));
  const out: Record<string, unknown> = {};
  results.forEach((r, i) => {
    const key = specs[i][0];
    if (r.status !== "fulfilled" || !r.value || !Object.keys(r.value).length) {
      console.error(`deliverable ${key} failed:`, r.status === "rejected" ? String(r.reason).slice(0, 160) : "empty");
      return;
    }
    if (key === "posts") {
      const posts = Array.isArray(r.value.posts) ? r.value.posts : [];
      if (posts.length) out.posts = posts;
    } else if (key === "schedule") {
      const days = Array.isArray(r.value.days) ? r.value.days : [];
      if (days.length) out.schedule = { overview: r.value.overview || "", days };
    } else {
      out[key] = r.value;
    }
  });
  if (!Object.keys(out).length) return null;
  return { ...out, generated_at: new Date().toISOString() };
}


// Run tasks in bounded waves so one gateway is never hit with 15 large
// simultaneous prompts (which is what produced timeouts + empty responses).
async function inWaves<T>(tasks: Array<() => Promise<T>>, size: number): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += size) {
    const slice = tasks.slice(i, i + size);
    out.push(...(await Promise.allSettled(slice.map((fn) => fn()))));
  }
  return out;
}

async function synthesizeReport(findings: Record<string, unknown>, target: string, company: string) {
  const cleaned = sanitizeFindingsForSynth(findings);
  const findingsStr = JSON.stringify(cleaned).slice(0, 28_000);
  const fb = fallbackReport(findings, target, company);

  const [summaryResult, ...chapterResults] = await inWaves<any>(
    [
      () => synthesizeSummary(findingsStr, target, company),
      ...CHAPTERS.map((c) => () => synthesizeOneChapter(c, findingsStr, target, company)),
    ],
    5,
  );

  const fallbackChapters: Array<{ slug: string; reason: string }> = [];
  const chapters: any[] = CHAPTERS.map((c, i) => {
    const r = chapterResults[i];
    if (r.status === "fulfilled" && r.value && (r.value.what_we_found || r.value.verdict)) {
      return { no: c.no, slug: c.slug, title: c.title, ...r.value };
    }
    const reason = r.status === "rejected" ? String((r as PromiseRejectedResult).reason).slice(0, 200) : "empty result";
    console.error(`chapter ${c.slug} synth failed:`, reason);
    fallbackChapters.push({ slug: c.slug, reason });
    return null;
  });

  let summary = summaryResult.status === "fulfilled" ? (summaryResult.value || {}) : {};

  // Rescue pass: anything that failed gets one more real attempt (small waves,
  // fresh calls) BEFORE we are ever willing to ship template prose.
  const rescueIdx = chapters.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (rescueIdx.length || !summary.executive_summary) {
    const rescueTasks: Array<() => Promise<any>> = [];
    if (!summary.executive_summary) rescueTasks.push(() => synthesizeSummary(findingsStr, target, company));
    rescueIdx.forEach((i) => rescueTasks.push(() => synthesizeOneChapter(CHAPTERS[i], findingsStr, target, company)));
    const rescued = await inWaves<any>(rescueTasks, 3);
    let cursor = 0;
    if (!summary.executive_summary) {
      const r = rescued[cursor++];
      if (r?.status === "fulfilled" && r.value?.executive_summary) summary = r.value;
    }
    rescueIdx.forEach((i) => {
      const r = rescued[cursor++];
      if (r?.status === "fulfilled" && r.value && (r.value.what_we_found || r.value.verdict)) {
        const c = CHAPTERS[i];
        chapters[i] = { no: c.no, slug: c.slug, title: c.title, ...r.value };
        const at = fallbackChapters.findIndex((f) => f.slug === c.slug);
        if (at >= 0) fallbackChapters.splice(at, 1);
      }
    });
  }

  // Only now may template text stand in for a chapter we genuinely could not write.
  CHAPTERS.forEach((c, i) => {
    if (!chapters[i]) chapters[i] = fb.chapters.find((x) => x.slug === c.slug);
  });

  const summaryFailed = !summary.executive_summary;

  const rawLeaks = Array.isArray(summary.top_leaks) && summary.top_leaks.length ? summary.top_leaks : fb.top_leaks;
  return {
    executive_summary: summary.executive_summary || fb.executive_summary,
    top_leaks: dedupeTopLeaks(rawLeaks),
    chapters,
    synth_fallback: {
      degraded: summaryFailed || fallbackChapters.length > 0,
      summary_fallback: summaryFailed,
      summary_reason: summaryResult.status === "rejected"
        ? String((summaryResult as PromiseRejectedResult).reason).slice(0, 200)
        : (summaryFailed ? "empty result" : null),
      chapters_fallback: fallbackChapters,
      chapters_total: CHAPTERS.length,
    },
  };
}


// Strip patterns that historically caused false positives before findings reach the AI.
// - Webflow / Framer / Wix dual success/failure DOM: both messages live in raw HTML,
//   JS toggles which one displays. Presence alone is NOT proof of a broken form.
// - Also collapses long repeated whitespace so the model doesn't re-emit template noise.
function sanitizeFindingsForSynth(findings: Record<string, unknown>): Record<string, unknown> {
  const FORM_NOISE_PATTERNS: RegExp[] = [
    /Thank you!\s*Your submission has been received!?\s*Oops!?\s*Something went wrong while submitting the form\.?/gi,
    /Oops!?\s*Something went wrong while submitting the form\.?\s*Thank you!\s*Your submission has been received!?/gi,
  ];
  const replaceIn = (s: string) => {
    let out = s;
    for (const re of FORM_NOISE_PATTERNS) {
      out = out.replace(re, "[form_dual_message_template — unverified, requires live submission test]");
    }
    return out;
  };
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return replaceIn(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = walk(val);
      return out;
    }
    return v;
  };
  return walk(findings) as Record<string, unknown>;
}

// Ensure top_leaks contains distinct root causes only. Prevents the same underlying
// issue being priced two/three times in the executive summary.
function dedupeTopLeaks(
  leaks: Array<{ rank?: number; name?: string; dollars_low?: number; dollars_high?: number; chapter_slug?: string; summary?: string }>,
) {
  const seen = new Map<string, typeof leaks[number]>();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const leak of leaks) {
    const key = norm(String(leak.name || "")) || norm(String(leak.summary || ""));
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, leak);
  }
  return Array.from(seen.values())
    .slice(0, 5)
    .map((leak, i) => ({ ...leak, rank: i + 1 }));
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
        // Brand assets are optional extras. Keep this fast path crawler-only so
        // Golden Report cannot be held open by image/social AI.
        await sb.from("forensic_scans").update({
          brand_kit: { brand, generated_at: nowIso(), mode: "crawler_fast_path" },
          updated_at: nowIso(),
        }).eq("id", id);
      } catch (e) {
        await setBrandKitStage(id, "brand_scan", "failed", String((e as Error).message).slice(0, 200));
      }
    })();
    const siteTask = brandKitTask;

    const websiteTask = (async () => {
      findings.scan_website = await invokeFn("scan-website", { url, company }, 14_000);
      await stage("scan_website", "done", { cap_seconds: 14 });
    })();

    const frictionTask = (async () => {
      const [frictionAudit, brandContradictions] = await Promise.all([
        invokeFn("generate-friction-audit", {
          url,
          desiredTone: ["direct", "credible", "trustworthy"],
          industry: company || "business services",
          targetCustomer: "business owner or decision-maker evaluating the company online",
        }, 12_000),
        invokeFn("generate-brand-contradictions", {
          url,
          socialLinks: "Not provided",
          idealCustomer: "business owner or decision-maker evaluating the company online",
          desiredPerception: ["credible", "clear", "trustworthy", "operator-grade"],
        }, 12_000),
      ]);
      findings.friction_audit = frictionAudit;
      findings.brand_contradictions = brandContradictions;
      await stage("friction", "done", { cap_seconds: 12 });
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

    // Save the deterministic fallback report NOW, before synthesis, so the row
    // is never left without a report even if the worker is killed mid-synth.
    const fbEarly = fallbackReport(findings, url, company);
    await sb.from("forensic_scans").update({
      raw_findings: findings,
      report: fbEarly,
      updated_at: nowIso(),
    }).eq("id", id);

    await stage("synth", "running", { cap_seconds: 150, mode: "per-chapter-waves" });
    let report: any = fbEarly;
    try {
      // Hard watchdog: whatever synthesis returns inside 150s wins; otherwise
      // we ship the fallback and mark the scan completed. Prevents the row
      // from being stuck in "running" forever if the model stalls.
      const synth = synthesizeReport(findings, url, company);
      const watchdog = new Promise<null>((resolve) => setTimeout(() => resolve(null), 150_000));
      const result = await Promise.race([synth, watchdog]);
      if (result) {
        report = result;
        if (!report.chapters || report.chapters.length < CHAPTERS.length) {
          const bySlug = new Map((report.chapters || []).map((c: { slug: string }) => [c.slug, c]));
          report.chapters = CHAPTERS.map((c) => bySlug.get(c.slug) || fbEarly.chapters.find((x) => x.slug === c.slug));
          if (!report.executive_summary) report.executive_summary = fbEarly.executive_summary;
          if (!report.top_leaks?.length) report.top_leaks = fbEarly.top_leaks;
        }
        if (report.synth_fallback?.degraded) {
          findings.synthesis_degraded = report.synth_fallback;
        }
      } else {
        findings.synthesis_error = "AI synthesis exceeded scan window; fallback report shipped.";
        report.synth_fallback = {
          degraded: true,
          summary_fallback: true,
          summary_reason: "watchdog timeout",
          chapters_fallback: CHAPTERS.map((c) => ({ slug: c.slug, reason: "watchdog timeout" })),
          chapters_total: CHAPTERS.length,
        };
      }
    } catch (e) {
      findings.synthesis_error = e instanceof Error ? e.message : String(e);
      report.synth_fallback = {
        degraded: true,
        summary_fallback: true,
        summary_reason: findings.synthesis_error,
        chapters_fallback: CHAPTERS.map((c) => ({ slug: c.slug, reason: "synthesis threw" })),
        chapters_total: CHAPTERS.length,
      };
    }
    await stage("synth", report?.synth_fallback?.degraded ? "degraded" : "done", report?.synth_fallback ?? null);

    // A report where EVERY chapter and the summary are template text is not a
    // real report. Flag it explicitly so nothing downstream can present it as one.
    const sf = report?.synth_fallback;
    if (sf?.degraded && sf.summary_fallback && (sf.chapters_fallback?.length ?? 0) >= CHAPTERS.length) {
      report.fully_generic = true;
      console.error(`scan ${id}: fully generic report — no AI chapter survived`);
    }

    // Growth assets: brand / imagery / posts / schedule, built from the same
    // cleaned findings. Hard-bounded so it can never re-open the timeout hole.
    await stage("assets", "running", { cap_seconds: 90 });
    try {
      const cleanedStr = JSON.stringify(sanitizeFindingsForSynth(findings)).slice(0, 28_000);
      const assets = await Promise.race([
        synthesizeDeliverables(cleanedStr, url, company, report?.top_leaks || []),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 90_000)),
      ]);
      if (assets) {
        report.deliverables = assets;
        await stage("assets", "done", { sections: Object.keys(assets) });
      } else {
        await stage("assets", "degraded", "growth assets unavailable this pass");
      }
    } catch (e) {
      console.error("growth assets failed:", e instanceof Error ? e.message : String(e));
      await stage("assets", "degraded", "growth assets threw");
    }


    await sb.from("forensic_scans").update({
      raw_findings: findings,
      report,
      status: "completed",
      completed_at: nowIso(),
    }).eq("id", id);


    // Log 'scan_completed' event for the Golden Report activity feed.
    try {
      await sb.functions.invoke("golden-report-track", {
        body: {
          scan_id: id,
          event_type: "scan_completed",
          recipient_email: null,
        },
      });
    } catch (e) {
      console.error("golden-report-track (scan_completed) failed:", (e as Error).message);
    }

    // Auto-issue Aetheris Universe access code to the requester (best-effort).
    try {
      const { data: row } = await sb.from("forensic_scans")
        .select("requested_by").eq("id", id).maybeSingle();
      const email = String(row?.requested_by ?? "").trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await sb.functions.invoke("universe-access", { body: { action: "issue", email } });
      }
    } catch (e) {
      console.error("universe-access auto-issue failed:", (e as Error).message);
    }

    // Attach the Golden Report to the matching CRM company (upsert by website host).
    try {
      const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, "").toLowerCase();
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
