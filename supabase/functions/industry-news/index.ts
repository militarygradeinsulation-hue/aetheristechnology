// Live industry news aggregator. Pulls public RSS/Atom feeds (no auth needed),
// parses, dedupes, and caches into industry_news_cache. Public read endpoint.
// Auto-refreshes if cache older than 30 minutes.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FEEDS: { url: string; source: string; label: string; category: string }[] = [
  // AI
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "techcrunch", label: "TechCrunch AI", category: "ai" },
  { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "verge_ai", label: "The Verge · AI", category: "ai" },
  { url: "https://venturebeat.com/category/ai/feed/", source: "venturebeat_ai", label: "VentureBeat AI", category: "ai" },
  { url: "https://www.technologyreview.com/feed/", source: "mit_tech_review", label: "MIT Technology Review", category: "ai" },
  { url: "https://openai.com/blog/rss.xml", source: "openai", label: "OpenAI Blog", category: "ai" },
  { url: "https://blog.google/technology/ai/rss/", source: "google_ai", label: "Google AI Blog", category: "ai" },
  { url: "https://www.anthropic.com/rss.xml", source: "anthropic", label: "Anthropic News", category: "ai" },
  // Business / Startups
  { url: "https://techcrunch.com/feed/", source: "techcrunch_main", label: "TechCrunch", category: "business" },
  { url: "https://www.wired.com/feed/category/business/latest/rss", source: "wired_business", label: "WIRED Business", category: "business" },
  { url: "https://feeds.hbr.org/harvardbusiness", source: "hbr", label: "Harvard Business Review", category: "business" },
  { url: "https://feeds.feedburner.com/entrepreneur/latest", source: "entrepreneur", label: "Entrepreneur", category: "business" },
  // Marketing / Sales
  { url: "https://blog.hubspot.com/marketing/rss.xml", source: "hubspot_marketing", label: "HubSpot Marketing", category: "marketing" },
  { url: "https://blog.hubspot.com/sales/rss.xml", source: "hubspot_sales", label: "HubSpot Sales", category: "sales" },
  { url: "https://moz.com/posts/rss/blog", source: "moz", label: "Moz Blog", category: "marketing" },
  // Cybersecurity
  { url: "https://www.bleepingcomputer.com/feed/", source: "bleeping", label: "BleepingComputer", category: "security" },
  { url: "https://krebsonsecurity.com/feed/", source: "krebs", label: "Krebs on Security", category: "security" },
  { url: "https://thehackernews.com/feeds/posts/default", source: "hackernews_security", label: "The Hacker News", category: "security" },
  // Industry verticals
  { url: "https://www.healthcareitnews.com/home/feed", source: "healthcare_it", label: "Healthcare IT News", category: "healthcare" },
  { url: "https://www.constructiondive.com/feeds/news/", source: "construction_dive", label: "Construction Dive", category: "construction" },
  { url: "https://www.manufacturingdive.com/feeds/news/", source: "manufacturing_dive", label: "Manufacturing Dive", category: "manufacturing" },
  { url: "https://www.supplychaindive.com/feeds/news/", source: "supplychain_dive", label: "Supply Chain Dive", category: "logistics" },
  { url: "https://www.americanbanker.com/feed", source: "american_banker", label: "American Banker", category: "finance" },
];

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function pick(xml: string, tag: string): string | null {
  // CDATA-aware
  const re = new RegExp(String.raw`<${tag}(?:\s[^>]*)?>([\s\S]*?)<\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  let v = m[1].trim();
  const cdata = v.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) v = cdata[1];
  return v.trim();
}
function pickAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(String.raw`<${tag}\b[^>]*\s${attr}="([^"]+)"[^>]*\/?>`, "i");
  const m = xml.match(re); return m ? m[1] : null;
}
function extractImage(xml: string): string | null {
  // common patterns
  const enclosure = pickAttr(xml, "enclosure", "url"); if (enclosure) return enclosure;
  const media = pickAttr(xml, "media:content", "url"); if (media) return media;
  const thumb = pickAttr(xml, "media:thumbnail", "url"); if (thumb) return thumb;
  const img = xml.match(/<img[^>]+src="([^"]+)"/i); if (img) return img[1];
  return null;
}

interface Item {
  title: string; link: string; summary: string; image_url: string | null; author: string | null; published_at: string | null;
  source: string; source_label: string; category: string;
}

async function fetchFeed(feed: typeof FEEDS[number]): Promise<Item[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(feed.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; AetherisNewsBot/1.0)", "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) { console.warn("feed err", feed.source, res.status); return []; }
    const xml = await res.text();
    const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
    console.log("feed fetch", feed.source, "bytes", xml.length, "atom", isAtom);
    const itemBlocks = isAtom
      ? Array.from(xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)).map(m => m[0])
      : Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).map(m => m[0]);
    const items: Item[] = [];
    for (const b of itemBlocks.slice(0, 12)) {
      const title = stripHtml(pick(b, "title") || "");
      let link = "";
      if (isAtom) {
        link = pickAttr(b, "link", "href") || stripHtml(pick(b, "link") || "");
      } else {
        link = stripHtml(pick(b, "link") || "") || pickAttr(b, "link", "href") || "";
      }
      if (!title || !link) continue;
      const desc = pick(b, isAtom ? "summary" : "description") || pick(b, "content:encoded") || "";
      const summary = stripHtml(desc).slice(0, 320);
      const pub = pick(b, isAtom ? "updated" : "pubDate") || pick(b, "published") || pick(b, "dc:date");
      let published_at: string | null = null;
      if (pub) { const d = new Date(pub); if (!isNaN(d.getTime())) published_at = d.toISOString(); }
      const author = stripHtml(pick(b, isAtom ? "author" : "dc:creator") || pick(b, "author") || "") || null;
      items.push({ title, link, summary, image_url: extractImage(b), author, published_at, source: feed.source, source_label: feed.label, category: feed.category });
    }
    console.log("feed ok", feed.source, "items", items.length);
    return items;
  } catch (e) {
    console.warn("fetch fail", feed.source, (e as Error).message);
    return [];
  }
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AetherisNewsBot/1.0)", "Accept": "text/html" },
      signal: ctrl.signal, redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    // Only read first 80kb — og:image lives in <head>
    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = ""; let bytes = 0;
    while (bytes < 80000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytes += value.length;
      if (html.includes("</head>")) break;
    }
    try { await reader.cancel(); } catch { /* ignore */ }
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    ];
    for (const p of patterns) { const m = html.match(p); if (m && m[1]) return m[1]; }
    return null;
  } catch { return null; }
}

async function enrichImages(items: { link: string; image_url: string | null }[]): Promise<void> {
  const concurrency = 8;
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      const it = items[i];
      const img = await fetchOgImage(it.link);
      if (img) it.image_url = img;
    }
  });
  await Promise.all(workers);
}

async function refresh(supabase: ReturnType<typeof createClient>) {
  const all: Item[] = [];
  // Fetch in parallel, capped concurrency
  const chunks = 6;
  for (let i = 0; i < FEEDS.length; i += chunks) {
    const slice = FEEDS.slice(i, i + chunks);
    const r = await Promise.all(slice.map(fetchFeed));
    r.forEach(arr => all.push(...arr));
  }
  if (all.length === 0) return 0;
  // Normalize + dedupe by link (unique constraint). Strip tracking params and fragments.
  const normalize = (u: string): string => {
    try {
      const url = new URL(u);
      url.hash = "";
      const drop = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid","mc_cid","mc_eid","ref","ref_src"];
      drop.forEach(k => url.searchParams.delete(k));
      return url.toString();
    } catch { return u; }
  };
  const seen = new Map<string, typeof all[number]>();
  for (const i of all) {
    const key = normalize(i.link);
    const existing = seen.get(key);
    if (!existing) { seen.set(key, { ...i, link: key }); continue; }
    // Prefer one with image, then with published_at, then longer summary
    const score = (x: typeof i) => (x.image_url ? 2 : 0) + (x.published_at ? 1 : 0) + Math.min((x.summary?.length || 0) / 100, 2);
    if (score(i) > score(existing)) seen.set(key, { ...i, link: key });
  }
  // Enrich missing images by fetching og:image from article pages (capped + parallel)
  const needImg = Array.from(seen.values()).filter(i => !i.image_url).slice(0, 60);
  await enrichImages(needImg);
  const rows = Array.from(seen.values()).map(i => ({
    source: i.source, source_label: i.source_label, category: i.category,
    title: i.title.slice(0, 500), link: i.link, summary: i.summary,
    image_url: i.image_url, author: i.author, published_at: i.published_at, fetched_at: new Date().toISOString(),
  }));
  // Chunked upsert so a single bad row doesn't kill everything
  let saved = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from("industry_news_cache").upsert(chunk, { onConflict: "link", ignoreDuplicates: false });
    if (error) { console.error("upsert err", error.message); }
    else saved += chunk.length;
  }
  console.log("refresh saved", saved, "of", rows.length);
  // Trim to most recent 1000
  const { data: trimRows } = await supabase.from("industry_news_cache").select("id").order("published_at", { ascending: false, nullsFirst: false }).range(1000, 9999);
  if (trimRows && trimRows.length > 0) {
    await supabase.from("industry_news_cache").delete().in("id", trimRows.map((r: { id: string }) => r.id));
  }
  await supabase.from("industry_news_meta").upsert({ key: "last_refresh", value: { at: new Date().toISOString(), fetched: all.length, deduped: rows.length, saved }, updated_at: new Date().toISOString() });
  return saved;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    if (action === "refresh") {
      const n = await refresh(supabase);
      return json(200, { ok: true, ingested: n });
    }

    if (action === "list") {
      // Auto-refresh if stale (>30 min) or empty
      const { data: meta } = await supabase.from("industry_news_meta").select("value").eq("key", "last_refresh").maybeSingle();
      const last = meta?.value?.at ? new Date(meta.value.at).getTime() : 0;
      const ageMin = (Date.now() - last) / 60000;
      if (ageMin > 30 || last === 0) {
        // Fire and (mostly) wait — keep within edge timeout by capping
        try { await Promise.race([refresh(supabase), new Promise(r => setTimeout(r, 9000))]); } catch (e) { console.warn(e); }
      }
      const limit = Math.min(Number(body.limit) || 60, 200);
      const category = body.category ? String(body.category) : null;
      let q = supabase.from("industry_news_cache").select("*").order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
      if (category && category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return json(200, { items: data || [], last_refresh: meta?.value?.at || null });
    }

    if (action === "fetch_article") {
      const url = String(body.url || "");
      if (!url || !/^https?:\/\//i.test(url)) return json(400, { error: "Invalid url" });
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; AetherisNewsBot/1.0; +https://aetheris.technology)",
            "Accept": "text/html,application/xhtml+xml",
          },
          signal: ctrl.signal,
          redirect: "follow",
        });
        clearTimeout(t);
        if (!res.ok) return json(200, { ok: false, status: res.status, content: null });
        const html = await res.text();

        // Try to find <article> or main content; fall back to <body>
        let region = "";
        const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
        if (articleMatch) region = articleMatch[0];
        else {
          const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
          region = mainMatch ? mainMatch[0] : html;
        }

        // Pull paragraphs and headings
        const blocks: string[] = [];
        const regex = /<(p|h[1-3]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(region)) !== null) {
          const tag = m[1].toLowerCase();
          const inner = m[2]
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
            .replace(/\s+/g, " ")
            .trim();
          if (inner.length < 20 && tag === "p") continue;
          if (inner.length === 0) continue;
          blocks.push(JSON.stringify({ tag, text: inner }));
        }
        // Cap and parse
        const parsed = blocks.slice(0, 80).map(b => JSON.parse(b));
        // Hero image
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        const hero = ogImg ? ogImg[1] : null;
        const siteName = (html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) || [])[1] || null;
        return json(200, { ok: true, blocks: parsed, hero_image: hero, site_name: siteName });
      } catch (e) {
        return json(200, { ok: false, error: (e as Error).message });
      }
    }

    if (action === "aetheris_take") {
      const title = String(body.title || "").slice(0, 400);
      const summary = String(body.summary || "").slice(0, 2000);
      const source = String(body.source_label || "");
      const category = String(body.category || "");
      if (!title) return json(400, { error: "Missing title" });
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return json(500, { error: "AI not configured" });
      const system = `You are the operator behind Aetheris — a Business Forensics Operator. Tone: blunt, forensic, non-corporate. You speak in first person ("I"). Connect news to operational reality: where business leaks happen — funnel, follow-up, ops handoff, pricing, retention. Avoid hype words ("game-changer", "revolutionary", "leverage synergies"). No bullet lists longer than 4 items. Around 140-200 words. End with one short directive line for the operator-reader.`;
      const user = `Article (${source} · ${category}):\nTitle: ${title}\nSummary: ${summary}\n\nGive me the Aetheris Take: what this actually means for an operator running a real business right now. What's the leak this exposes or the leverage point most people will miss? Speak from my POV.`;
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
          }),
        });
        if (!r.ok) {
          const t = await r.text();
          console.error("aetheris_take ai err", r.status, t);
          if (r.status === 429) return json(429, { error: "Rate limited. Try again in a moment." });
          if (r.status === 402) return json(402, { error: "AI credits exhausted." });
          return json(500, { error: "AI request failed" });
        }
        const j = await r.json();
        const text = j?.choices?.[0]?.message?.content || "";
        return json(200, { ok: true, take: text });
      } catch (e) {
        return json(500, { error: (e as Error).message });
      }
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("industry-news error", e);
    return json(500, { error: (e as Error).message || "Server error" });
  }
});
