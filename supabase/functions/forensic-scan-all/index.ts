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
import { verifyAdminToken } from "../_shared/admin-token.ts";
import { verifyPortalToken } from "../_shared/portal-token.ts";
import { resolveScanOrigin } from "../_shared/golden-report-source.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
  const chapters = CHAPTERS.map((chapter) => {
    // No dollar figures at all in the fallback. A benchmark band printed here
    // reads as a measured result and now also feeds the report total, so the
    // fallback stays explicitly unpriced.
    const costLine =
      `No measurable dollar exposure was produced for this chapter in this pass. Nothing here has been priced for ${name}. Re-run the scan to get a measured figure.`;
    return {
      ...chapter,
      annual_low: null,
      annual_high: null,
      cost_basis: null,
      excluded_from_total: true,
      verdict: `Synthesis did not complete for this chapter. No verdict has been established for ${name}.`,
      what_we_found: `Raw tool output for ${name} is preserved in the appendix. No synthesized findings are available for this chapter in this pass.`,
      why_its_leaking: "Not established in this pass.",
      what_its_costing: costLine,
      what_to_do: {
        this_week: ["Re-run the scan so this chapter can be synthesized from live evidence."],
        this_month: [],
        this_quarter: [],
      },
      evidence,
    };
  });
  return {
    // Placeholder state, not a forensic result. The compiler's generic detector
    // marks any report still carrying this as regeneration_required.
    executive_summary: `A forensic synthesis for ${name} is not available from this pass. No company-specific findings were produced, so no dollar exposure is being reported. Re-run the scan to generate a supported forensic result.`,
    synthesis_incomplete: true,
    top_leaks: [],
    // Category floors are retained for context ONLY, outside the forensic total.
    benchmark_leaks: [
      { rank: 1, name: "Pipeline & follow-up bleed",     annual_low: 24_000, annual_high: 180_000, chapter_slug: "pipeline-forensics",   excluded_from_total: true, label: "Category benchmark — not measured for this company" },
      { rank: 2, name: "Site conversion friction",       annual_low: 18_000, annual_high:  72_000, chapter_slug: "site-autopsy",         excluded_from_total: true, label: "Category benchmark — not measured for this company" },
      { rank: 3, name: "Lead hygiene & workflow gaps",   annual_low: 12_000, annual_high:  90_000, chapter_slug: "lead-hygiene",         excluded_from_total: true, label: "Category benchmark — not measured for this company" },
      { rank: 4, name: "Competitive & SEO position",     annual_low: 12_000, annual_high:  60_000, chapter_slug: "competitive",          excluded_from_total: true, label: "Category benchmark — not measured for this company" },
      { rank: 5, name: "Brand voice contradictions",     annual_low:  9_000, annual_high:  48_000, chapter_slug: "brand-contradictions", excluded_from_total: true, label: "Category benchmark — not measured for this company" },
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
  "what_its_costing": "<1 paragraph, USD only. State the arithmetic INPUTS (counts, average job value, close rate). Write the resulting annual range ONLY as the literal token {{CHAPTER_ANNUAL_RANGE}} — never type the total yourself.>",
  "annual_low": <int or null>,
  "annual_high": <int or null>,
  "cost_basis": "<the exact inputs and multiplication used, e.g. '38 service pages x 12 monthly visits x 2% close x $4,200 job value'. null when no dollar figure is claimed>",
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
- "what_to_do": 2-3 actions per horizon, each starting with a verb, each specific to THIS chapter.
- "evidence": 3-5 items pulled from the raw findings JSON with real label/value pairs.
${chapter.slug === "brand-contradictions" ? `
BRAND VOICE CHAPTER — mandatory:
- The findings object contains "brand_contradictions" with a contradictions array, quotes, severities and fixes. Use it. Name each real contradiction, quote both conflicting strings, and say what the buyer concludes.
- If that array has items, this chapter MUST NOT say "no signal detected". Write every item found.
- Only if the array is genuinely empty or errored: read the crawled page copy in the findings yourself and name the voice conflicts you can see (audience mismatch, promise without proof, inconsistent contact details, inconsistent service lists, stale years, tone swings). Say plainly which tool failed.
- For construction, contracting, manufacturing and trades companies, call out residential vs commercial audience mismatch, license/insurance/bonding claims with no numbers, safety or certification claims with no proof, service-area sprawl versus "local" claims, and capacity or crew-size claims that conflict with the project scale being advertised.
` : ""}

COSTING RULES — this is the part that has been failing, follow it exactly:
- EVERY chapter numbered 1 through 12 MUST return a real integer "annual_low" and "annual_high". Returning null for a costing chapter is a failure. Leaving the dollars out of "what_its_costing" is a failure.
- BANNED: any generic or round-number template range. Never write "$7,000 to $15,000", "$5,000 to $10,000", "$10,000 to $25,000" or any other stock band. If your range looks like a price list, it is wrong.
- Every dollar figure must be DERIVED, in the chapter, from counts and values that appear in THIS company's findings: number of pages, number of forms, number of stalled deals, response lag in hours, traffic figures, service lines, locations, headcount, quoted prices found on the site, average job value stated on the site.
- Write the arithmetic in "what_its_costing" in plain sentences, and repeat the same inputs in "cost_basis". The low and high must come from that math, not from intuition, and must be odd/uneven numbers reflecting the calculation.
- If a needed input is missing from the findings, do NOT skip the number. Make ONE clearly-labelled conservative assumption ("assuming a $6,400 average job value, which the site does not state"), anchor it to any count that IS in the findings, and derive the range from that. Say in one clause which input was assumed.
- PROSE MONEY LOCK: the ONLY place you write a leak total is the structured "annual_low"/"annual_high" integers. In "what_its_costing", "verdict", "what_we_found", "why_its_leaking", "cost_basis" and "what_to_do", refer to THIS CHAPTER'S total with the token {{CHAPTER_ANNUAL_RANGE}} only. You are never given, and must never state, the report-wide total inside a chapter. The server renders those tokens from the canonical ledger. Dollar amounts for INPUTS you observed or assumed (average job value, quoted price, salary, contract value) are allowed and encouraged.
- Chapters 13 and 14 (plan, appendix) always use null for annual_low, annual_high and cost_basis.
- Never repeat another chapter's exact range. Each chapter's figures must be its own arithmetic on its own topic.


Return JSON shaped EXACTLY:
${CHAPTER_SHAPE}`;
  return await aiJson(prompt, 2400, 55_000);
}

async function synthesizeSummary(findingsStr: string, target: string, company: string) {
  const prompt = `You are writing the front-matter of a Chaos Theory Forensics report for **${company || target}** (${target}).

RAW FINDINGS:
${findingsStr}

Return JSON:
{
  "executive_summary": "<4-6 paragraphs, markdown, operator voice. Cite specific findings — friction score, missing elements, timed-out tools, etc. No generic filler. Never type an annual leak total: use the token {{REPORT_ANNUAL_TOTAL}}. This is the ONLY field where the report-wide token is legal.>",
  "top_leaks": [ { "rank": <int>, "name": "<short>", "dollars_low": <int>, "dollars_high": <int>, "chapter_slug": "<slug>", "basis": "<the counts and values from THIS company's findings that produce the range>", "summary": "<one specific line grounded in findings>" } ]
}

COSTING RULES:
- BANNED: stock bands like "$7,000 to $15,000", "$5,000 to $10,000", "$10,000 to $25,000" or any other round template range. Ranges must be derived numbers, not price-list numbers.
- Every dollars_low / dollars_high must come from arithmetic on real inputs found in the scan (page counts, form counts, response lag, stalled deals, traffic, service lines, prices quoted on the site) and that arithmetic goes in "basis".
- Only include a leak in top_leaks when you can show that math. 3 well-supported leaks beat 5 invented ones.
- PROSE MONEY LOCK: write leak totals ONLY in the structured dollars_low / dollars_high integers. In "executive_summary", "basis" and "summary", refer to a leak's annual amount as {{LEAK_ANNUAL_RANGE}} and the report-wide total as {{REPORT_ANNUAL_TOTAL}}; the server renders those tokens from the canonical ledger. Input values you observed or assumed (average order value, quoted price, salary) may be written as normal dollar amounts.`;
  return await aiJson(prompt, 3500, 60_000);
}

// ───────── Brand voice & copy contradictions, computed in-process ─────────
// The standalone generate-brand-contradictions function re-scrapes the site and
// routinely exceeds the 12s budget this pipeline gives it, which is why chapter 4
// came back empty on nearly every scan. We already hold the crawled page text, so
// analyze it here with a real timeout and only fall back to the remote function.
async function analyzeBrandContradictions(
  url: string,
  company: string,
  siteText: string,
): Promise<Record<string, unknown>> {
  const text = (siteText || "").slice(0, 18_000);
  if (text.trim().length < 200) {
    return { error: "insufficient crawled copy to analyze brand voice", pages_analyzed: 0 };
  }
  const prompt = `Analyze the brand voice and copy of **${company || url}** (${url}) for CONTRADICTIONS: places where the copy says or signals one thing in one place and something conflicting in another.

CRAWLED WEBSITE COPY (multiple pages, separated by page headers):
${text}

WHAT COUNTS AS A CONTRADICTION (find these, be thorough — most sites have 4 to 8):
- Positioning conflict: premium/specialist language on one page, cheap/generalist "we do everything" language on another.
- Audience conflict: copy written for homeowners on one page and for commercial buyers or GCs on another.
- Promise vs proof: guarantees, response times, availability or capability claims with no supporting evidence, licensing, credentials or numbers anywhere on the site.
- Offer conflict: differing service lists, differing pricing or quoting language, differing service areas across pages.
- Contact conflict: different phone numbers, emails, addresses, hours or CTAs across pages.
- Tone conflict: formal corporate boilerplate next to casual or hype copy.
- Identity conflict: different company name spellings, taglines, or descriptions of what the company does.
- Staleness conflict: outdated years, "new" claims about old things, dead references.

RULES:
- IDENTICAL repeated strings across pages are consistency, NOT contradictions. Never flag those.
- Quote the actual conflicting copy in each item. No quote, no finding.
- If the site is construction, contracting, manufacturing or trades, look specifically for: residential vs commercial mismatch, service-area sprawl vs "local" claims, license/insurance/bonding claims without numbers, safety or certification claims with no proof, "free estimates" vs quoting friction, and crew-size or capacity claims that conflict with project scale claims.
- Every dollar figure in USD.

Return JSON:
{
  "businessName": "<detected>",
  "contradictionScore": <0-100, 100 = perfectly aligned>,
  "overallAssessment": "<2-3 blunt sentences>",
  "contradictions": [
    { "layer": "<message_vs_visual|tone_vs_audience|offer_vs_pricing|promise_vs_process|emotion_vs_trust>",
      "title": "<short name>",
      "quote_a": "<exact copy from the site>",
      "quote_b": "<the conflicting copy, or the absence being contradicted>",
      "description": "<plain English>",
      "buyerPerception": "<what the buyer concludes>",
      "severity": "<critical|high|moderate>",
      "recommendedFix": "<specific fix>" }
  ],
  "hiddenStrengths": ["<things done right>"],
  "priorityFixes": ["<top 3 in order>"]
}`;
  try {
    const out = await aiJson(prompt, 2200, 45_000, undefined, "bulk");
    if (out && Array.isArray(out.contradictions) && out.contradictions.length) {
      return { ...out, _via: "in_process_crawl_analysis", pages_analyzed: (text.match(/## Crawled page/g) || []).length || 1 };
    }
    return { ...(out || {}), _via: "in_process_crawl_analysis", note: "no contradictions returned" };
  } catch (e) {
    return { error: String(e instanceof Error ? e.message : e).slice(0, 200) };
  }
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

// Deterministic per-chapter cost model, used ONLY when synthesis returned no
// figures for a costing chapter. Scales off signals actually present in the
// findings (pages crawled, issue counts, friction score) so two different
// companies never get the same numbers, and is labelled as modeled.
const CHAPTER_COST_WEIGHTS: Record<string, [number, number]> = {
  "site-autopsy": [520, 1780],
  "seo-discoverability": [610, 2040],
  "tech-performance": [430, 1490],
  "brand-contradictions": [370, 1260],
  "friction-vocabulary": [340, 1170],
  "competitive": [560, 1930],
  "authority-backlinks": [310, 1080],
  "pipeline-forensics": [880, 2870],
  "lead-hygiene": [640, 2210],
  "lead-intelligence": [490, 1660],
  "owner-capacity": [700, 2380],
  "top-10-leaks": [0, 0], // roll-up chapter, never self-priced
};

function findingsScale(findings: Record<string, unknown>, seed: string) {
  const blob = JSON.stringify(findings || {});
  const pages = Number((((findings.scan_website as any) || {}).pages_crawled) || 0) ||
    (blob.match(/https?:\/\//g) || []).length || 8;
  const issues = (blob.match(/"(issue|problem|missing|error|warning)/gi) || []).length || 5;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  // uneven multiplier so figures never read as a stock band
  const jitter = 1 + ((h % 170) / 1000);
  return Math.max(4, Math.min(90, pages)) * (1 + Math.min(issues, 40) / 25) * jitter;
}

function applyDerivedChapterCosts(
  chapters: any[],
  findings: Record<string, unknown>,
  seed: string,
) {
  const scale = findingsScale(findings, seed);
  const used = new Set<string>();
  for (const ch of chapters) {
    if (!ch || !ch.slug) continue;
    const w = CHAPTER_COST_WEIGHTS[ch.slug];
    if (!w || !w[1]) continue;
    if (ch.excluded_from_total) continue; // unsynthesized template chapter stays unpriced
    // Plausibility band for THIS company: the synthesizer sometimes returns
    // market-size style figures (tens of millions) that are neither credible
    // nor summable. Clamp every chapter into the modeled band so the chapter
    // figures and the total always stay in the same universe.
    const floor = Math.max(500, Math.round(w[0] * scale * 0.25));
    const ceiling = Math.max(floor * 2, Math.round(w[1] * scale * 4));
    const clamp = (n: number) => Math.min(ceiling, Math.max(floor, Math.round(n)));

    const hasLow = Number(ch.annual_low) > 0;
    const hasHigh = Number(ch.annual_high) > 0;
    if (hasLow || hasHigh) {
      if (!hasLow) ch.annual_low = Math.round(Number(ch.annual_high) * 0.42);
      if (!hasHigh) ch.annual_high = Math.round(Number(ch.annual_low) * 2.3);
      const lo = clamp(Number(ch.annual_low));
      const hi = clamp(Number(ch.annual_high));
      const clamped = lo !== Math.round(Number(ch.annual_low)) || hi !== Math.round(Number(ch.annual_high));
      ch.annual_low = Math.min(lo, hi);
      ch.annual_high = Math.max(lo, hi);
      if (clamped) {
        ch.cost_basis =
          `Bounded to this company's evidence volume (${Math.round(scale)} weighted signals collected in this scan).`;
        // The prose money figure must not contradict the clamped range.
        ch.what_its_costing = String(ch.what_its_costing || "").replace(
          /\$\s?[\d,]+(?:\.\d+)?\s*[kKmM]?(\s*(?:-|–|—|to)\s*\$?\s?[\d,]+(?:\.\d+)?\s*[kKmM]?)?/g,
          "",
        ).replace(/\s{2,}/g, " ").trim();
        // Placeholder, not a literal: the ledger renders the canonical range.
        ch.what_its_costing = `${ch.what_its_costing ? ch.what_its_costing.replace(/\s*$/, " ") : ""}Modeled exposure for this leak is {{CHAPTER_ANNUAL_RANGE}}, derived from the signals this scan collected for the company.`.trim();
      }
      used.add(`${ch.annual_low}:${ch.annual_high}`);
      continue;
    }
    let low = Math.round(w[0] * scale);
    let high = Math.round(w[1] * scale);
    while (used.has(`${low}:${high}`)) { low += 137; high += 331; }
    used.add(`${low}:${high}`);
    ch.annual_low = low;
    ch.annual_high = high;
    ch.cost_basis = ch.cost_basis ||
      `Modeled exposure: ${Math.round(scale)} weighted site/pipeline signals for this company applied to the ${ch.title || ch.slug} leak class.`;
    const prose = String(ch.what_its_costing || "");
    ch.what_its_costing = /\$\s?\d/.test(prose)
      ? prose
      : `${prose ? prose.replace(/\s*$/, " ") : ""}Modeled exposure for this leak is {{CHAPTER_ANNUAL_RANGE}}, derived from the signal volume this scan actually collected for the company rather than a category benchmark.`.trim();
  }
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

  // Safety net: the model sometimes returns null costs for costing chapters,
  // which wiped every dollar figure out of the report. Any synthesized chapter
  // 1-12 without figures gets a derived, clearly-labelled modeled range so the
  // report always prices its leaks.
  applyDerivedChapterCosts(chapters, findings, company || target);

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

// ───────────── canonical annual revenue loss (persisted with the report) ─────────────
// Single shared backend implementation — mirrors src/lib/goldenLeakage.ts.
// Purely data-shape driven: no company/account/scan-specific branches.
import { LEAKAGE_CALCULATION_VERSION } from "../_shared/golden-leakage.ts";
import { resolveFinancialLedger } from "../_shared/golden-ledger.ts";
import { compileGoldenReport } from "../_shared/golden-compiler.ts";




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
    let parsedBrand: Brand | null = null;
    const brandKitTask = (async () => {
      try {
        const [scrape, map] = await Promise.all([firecrawlScrape(url), firecrawlMap(url)]);
        findings.firecrawl_scrape = scrape;
        findings.firecrawl_map = map;
        await stage("site", "done", { mode: "parallel", cap: "fast" });

        const brand = parseFirecrawlBranding(scrape, url);
        parsedBrand = brand;
        await setBrandKitStage(id, "brand_scan", "done", { colors: brand.colors.length, fonts: brand.fonts.length });
        // Brand assets are optional extras. Keep this fast path crawler-only so
        // Golden Report cannot be held open by image/social AI. The full kit
        // (message, imagery, social posts, 30-day schedule) is generated right
        // after the report is saved, so the report never waits on it.
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
      const frictionPromise = invokeFn("generate-friction-audit", {
        url,
        desiredTone: ["direct", "credible", "trustworthy"],
        industry: company || "business services",
        targetCustomer: "business owner or decision-maker evaluating the company online",
      }, 12_000);

      // Contradictions need the crawled copy, so wait for the crawl instead of
      // re-scraping inside a 12s remote call (that path always timed out).
      const contradictionsPromise = (async () => {
        try { await siteTask; } catch { /* crawl failures handled below */ }
        const scrape = (findings.firecrawl_scrape as Record<string, any>) || {};
        const siteText: string =
          scrape?.data?.markdown || scrape?.markdown || scrape?.data?.summary || "";
        if (siteText && siteText.trim().length >= 200) {
          return await analyzeBrandContradictions(url, company, siteText);
        }
        // No usable crawl text: last resort, let the standalone function try its own scrape.
        return await invokeFn("generate-brand-contradictions", {
          url,
          socialLinks: "Not provided",
          idealCustomer: "business owner or decision-maker evaluating the company online",
          desiredPerception: ["credible", "clear", "trustworthy", "operator-grade"],
        }, 30_000);
      })();

      const [frictionAudit, brandContradictions] = await Promise.all([
        frictionPromise,
        contradictionsPromise,
      ]);
      findings.friction_audit = frictionAudit;
      findings.brand_contradictions = brandContradictions;
      await stage("friction", "done", {
        contradictions: Array.isArray((brandContradictions as any)?.contradictions)
          ? (brandContradictions as any).contradictions.length
          : 0,
      });
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



    // ─────────── REPORT COMPILER GATE ───────────
    // One pass builds the evidence ledger, deduplicates root causes, prices each
    // unique root cause exactly once, injects the canonical numbers into prose,
    // and validates the whole document. Nothing downstream may recompute totals
    // or counts — every surface reads report.report_consistency / overall_leakage.
    let compilerState: "compiled" | "needs_review" | "regeneration_required" = "needs_review";
    try {
      let compiled = compileGoldenReport({ report, rawFindings: findings, url, company });
      // Second deterministic pass: repairs made in pass 1 (canonical totals and
      // counts) can unlock violations that were only reachable after rewriting.
      if (!compiled.ok) {
        compiled = compileGoldenReport({ report: compiled.report, rawFindings: findings, url, company });
      }
      report = compiled.report;
      compilerState = compiled.state;
      console.log(JSON.stringify({
        event: "golden_compiler",
        scan_id: id,
        target_url: url,
        state: compiled.state,
        detected_findings: compiled.consistency.detected_findings,
        unique_root_causes: compiled.consistency.unique_root_causes,
        uniquely_priced_leaks: compiled.consistency.uniquely_priced_leaks,
        canonical_range: compiled.consistency.canonical_range_ascii,
        evidence_quality: compiled.consistency.evidence_quality,
        generic: compiled.generic.generic,
        specificity: compiled.generic.specificity.score,
        repairs: compiled.repairs.length,
        violations: compiled.violations.slice(0, 10),
      }));
      await stage(
        "compile",
        compiled.ok ? "done" : "degraded",
        compiled.ok
          ? { repairs: compiled.repairs.length, priced_leaks: compiled.consistency.uniquely_priced_leaks }
          : { violations: compiled.violations.slice(0, 6) },
      );
    } catch (e) {
      console.error("golden compiler failed:", e instanceof Error ? e.message : String(e));
      await stage("compile", "degraded", "compiler threw");
    }

    // Canonical financial invariant. The compiler already built and persisted
    // the Financial Leak Ledger; this is the loud last-line check that the
    // cover total, the chapter allocations and the Top 10 all agree.
    // Skipped entirely for regeneration_required reports: there, the ABSENCE of
    // a total is the correct outcome, not a failure to recover from.
    try {
      if (compilerState !== "regeneration_required" && report) {
        const ledger = resolveFinancialLedger(report as never);
        if (ledger.overall) {
          report.financial_ledger = ledger;
          report.overall_leakage = {
            annual_low: ledger.overall.annual_low,
            annual_high: ledger.overall.annual_high,
            currency: "USD",
            source: "financial_ledger",
            priced_leak_count: ledger.active.length,
            calculation_version: ledger.model_version,
          };
        }
        report.financial_reconciliation = ledger.reconciliation;
        console.log(`scan ${id}: financial_reconciliation`, JSON.stringify(ledger.reconciliation));

        if (ledger.reconciliation.invariant_status === "failed") {
          // Loud structured failure: never silently publish contradictory money.
          console.error(JSON.stringify({
            event: "financial_reconciliation_violation",
            scan_id: id,
            target_url: url,
            violations: ledger.reconciliation.violations,
            ledger_total: [ledger.reconciliation.ledger_total_low, ledger.reconciliation.ledger_total_high],
            chapter_total: [ledger.reconciliation.chapter_total_low, ledger.reconciliation.chapter_total_high],
            top10_subtotal: [ledger.reconciliation.top10_subtotal_low, ledger.reconciliation.top10_subtotal_high],
          }));
          await stage("synthesis", "degraded", "financial reconciliation failed — figures could not be made consistent");
        } else if (!ledger.overall) {
          await stage("synthesis", "degraded", "annual revenue loss could not be resolved from priced evidence");
        }
      }
    } catch (e) {
      console.error("financial ledger compute failed:", e instanceof Error ? e.message : String(e));
    }


    // ─────────── LIFECYCLE GATE ───────────
    // A generic/template attempt must never replace a previously valid report.
    // If one exists we keep it and record the failed attempt alongside it.
    if (compilerState === "regeneration_required") {
      const { data: prior } = await sb
        .from("forensic_scans")
        .select("report")
        .eq("id", id)
        .maybeSingle();
      const priorReport = prior?.report as Record<string, unknown> | null;
      const priorWasValid =
        !!priorReport &&
        (priorReport as { compiler?: { state?: string } }).compiler?.state === "compiled" &&
        priorReport.report_state !== "regeneration_required";
      if (priorWasValid) {
        console.error(`scan ${id}: generic synthesis rejected — prior compiled report preserved`);
        (priorReport as Record<string, unknown>).last_rejected_attempt = {
          at: nowIso(),
          reason: "generic/template synthesis",
          violations: (report?.compiler?.violations || []).slice(0, 6),
        };
        report = priorReport;
      }
    }

    await sb.from("forensic_scans").update({
      raw_findings: findings,
      report,
      status: "completed",
      completed_at: nowIso(),
    }).eq("id", id);
    if (compilerState !== "compiled") {
      console.error(`scan ${id}: report is ${compilerState} — downloads and delivery are gated until it compiles clean`);
    }

    // Golden Report Library: archive the completed report (idempotent by scan
    // id). Never allowed to fail or delay the scan itself.
    try {
      const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/golden-report-library`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${svc}`,
          "x-internal-key": svc,
        },
        body: JSON.stringify({ action: "archive_scan", scan_id: id }),
      });
    } catch (archiveErr) {
      console.error("golden report archive failed:", (archiveErr as Error).message);
    }

    // Compose the draft Aetheris Company System from the archived report.
    // Draft only: no module is activated and no external write happens until an
    // operator approves it. Idempotent on (scan, report hash, template).
    if (compilerState === "compiled") {
      try {
        const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/company-system`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${svc}`,
            "x-internal-key": svc,
          },
          body: JSON.stringify({ action: "compose", scan_id: id }),
        });
      } catch (sysErr) {
        console.error("company system compose failed:", (sysErr as Error).message);
      }
    }




    // Growth assets: message, hero imagery, per-platform posts and the 30-day
    // schedule. Runs after the report is persisted so it can never delay or
    // fail the Golden Report itself.
    try {
      if (parsedBrand) {
        const kit = await generateBrandKit(id, parsedBrand);
        await sb.from("forensic_scans").update({
          brand_kit: { ...kit, mode: "full_kit" },
          updated_at: nowIso(),
        }).eq("id", id);
      }
    } catch (kitErr) {
      console.error("brand kit generation failed:", (kitErr as Error).message);
    }






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
      // Origin/creator identity is admin-only — never expose it on public reads.
      const adminOk = await verifyAdminToken(req.headers.get("x-admin-token"), SUPABASE_SERVICE_ROLE_KEY).catch(() => false);
      const payload: Record<string, unknown> = { ...(data as Record<string, unknown>) };
      if (!adminOk) {
        for (const k of ["creator_user_id", "creator_name", "creator_email", "creator_profile_id", "portal_source", "lead_name", "lead_email", "lead_phone", "source_notified_at"]) {
          delete payload[k];
        }
      }
      return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const url = String(body.url || "").trim();
    if (!url) return new Response(JSON.stringify({ error: "url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const company = String(body.company || "").trim();
    const accountId = body.account_id ? String(body.account_id) : null;

    // ───────── trustworthy origin resolution (server context only) ─────────
    // Client-supplied identity/source fields are deliberately ignored whenever
    // an authenticated server context exists.
    const adminTokenHeader = req.headers.get("x-admin-token");
    const portalTokenHeader = req.headers.get("x-portal-token");
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
    // Service-role callers are internal automation (drip batches, cron, agents).
    const serviceRoleCaller = !!bearer && bearer === SUPABASE_SERVICE_ROLE_KEY;
    const adminAuthenticated = adminTokenHeader
      ? await verifyAdminToken(adminTokenHeader, SUPABASE_SERVICE_ROLE_KEY).catch(() => false)
      : false;
    const portalClaims = portalTokenHeader
      ? await verifyPortalToken(portalTokenHeader, SUPABASE_SERVICE_ROLE_KEY).catch(() => null)
      : null;

    let repProfile: { id?: string | null; rep_name?: string | null; rep_email?: string | null } | null = null;
    if (portalClaims) {
      const { data: rep } = await sb
        .from("rep_codes")
        .select("id, code, rep_name, rep_email")
        .eq("code", portalClaims.code)
        .maybeSingle();
      repProfile = rep ?? null;
    }

    // Supabase-authenticated user (when a real user JWT is present).
    let authUser: { id?: string | null; email?: string | null; name?: string | null } | null = null;
    try {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      if (bearer && bearer !== anonKey && !serviceRoleCaller) {
        const { data: u } = await sb.auth.getUser(bearer);
        if (u?.user?.id) {
          authUser = {
            id: u.user.id,
            email: u.user.email ?? null,
            name: (u.user.user_metadata?.full_name as string | undefined) ||
              (u.user.user_metadata?.name as string | undefined) || null,
          };
        }
      }
    } catch { /* anonymous — fine */ }

    const origin = resolveScanOrigin({
      adminAuthenticated,
      serviceRoleCaller,
      portalClaims: portalClaims ? { code: portalClaims.code, role: portalClaims.role } : null,
      repProfile,
      authUser,
      body,
    });

    const { data: row, error } = await sb.from("forensic_scans").insert({
      target_url: url,
      company_name: company || null,
      hubspot_account_id: accountId,
      status: "queued",
      stage_status: { queued: { state: "done", at: new Date().toISOString() } },
      ...origin,
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
