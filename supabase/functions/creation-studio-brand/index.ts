// creation-studio-brand
// Two actions:
//  1) scan: scrapes a URL via Firecrawl `branding` format and returns the extracted brand kit
//  2) generate: uses the brand kit + a brief to produce either a marketing image
//     (google/gemini-2.5-flash-image) or a piece of branded marketing copy
//
// Public sandbox — no auth, per-IP rate limit only. No DB writes.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY   = Deno.env.get("LOVABLE_API_KEY");

// Simple per-IP limiter
const WIN = 60 * 60 * 1000, MAX = 20;
const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WIN);
  if (arr.length >= MAX) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr); return false;
};

type Brand = {
  name?: string;
  description?: string;
  colors: { role: string; hex: string }[];
  fonts: string[];
  logo?: string;
  favicon?: string;
  ogImage?: string;
  colorScheme?: string;
  sourceURL: string;
};

async function firecrawlBranding(url: string): Promise<Brand> {
  if (!FIRECRAWL_API_KEY) throw new Error("Brand scanner unavailable");
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["branding", "summary"], onlyMainContent: true }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Scan failed (${r.status})`);
  const b = j?.data?.branding ?? j?.branding ?? {};
  const meta = j?.data?.metadata ?? j?.metadata ?? {};
  const colorsObj = b?.colors || {};
  const colors: { role: string; hex: string }[] = Object.entries(colorsObj)
    .filter(([, v]) => typeof v === "string" && /^#?[0-9a-f]{3,8}$/i.test(String(v)))
    .map(([role, v]) => ({ role, hex: String(v).startsWith("#") ? String(v) : `#${v}` }));
  const fonts: string[] = Array.isArray(b?.fonts)
    ? b.fonts.map((f: any) => f?.family).filter(Boolean)
    : Object.values(b?.typography?.fontFamilies || {}).filter(Boolean) as string[];
  return {
    name: meta?.title || meta?.ogTitle,
    description: j?.data?.summary || j?.summary || meta?.description,
    colors,
    fonts: Array.from(new Set(fonts)).slice(0, 4),
    logo: b?.images?.logo || b?.logo,
    favicon: b?.images?.favicon,
    ogImage: b?.images?.ogImage,
    colorScheme: b?.colorScheme,
    sourceURL: meta?.sourceURL || url,
  };
}

function brandPromptBlock(brand: Brand) {
  const palette = brand.colors.length
    ? brand.colors.map(c => `${c.role}:${c.hex}`).join(", ")
    : "none extracted (use tasteful neutral palette)";
  const fonts = brand.fonts.length ? brand.fonts.join(", ") : "clean modern sans-serif";
  return [
    `BRAND: ${brand.name || brand.sourceURL}`,
    brand.description ? `POSITIONING: ${brand.description}` : "",
    `PALETTE: ${palette}`,
    `TYPOGRAPHY: ${fonts}`,
    `SCHEME: ${brand.colorScheme || "auto"}`,
  ].filter(Boolean).join("\n");
}

async function generateCopy(brand: Brand, brief: string, kind: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("AI unavailable");
  const today = new Date().toISOString().slice(0, 10);
  const templates: Record<string, string> = {
    "one-pager": `Produce a one-page marketing PDF outline for: ${brief}\n\nOutput EXACTLY:\n## Headline (max 8 words)\n## Sub-headline (1 line)\n## 3 Value Bullets\n## Proof Line\n## CTA Button Copy\n## Footer Line\n\nUnder 180 words total. Reference brand palette + fonts in a "Design Notes" H2 at the end (2 bullets).`,
    "social-pack": `Produce a branded social pack for: ${brief}\n\nOutput EXACTLY:\n## Instagram Caption (~80 words, brand-voice)\n## LinkedIn Post (~90 words)\n## X Post (≤240 chars)\n## Story Overlay Text (3 lines, 6 words each)\n## Hashtags (5)`,
    "email":      `Produce a branded marketing email for: ${brief}\n\nOutput EXACTLY:\n## Subject Line (2 variants)\n## Preheader\n## Body (~120 words, brand-voice)\n## CTA Button Copy\n## PS Line`,
    "calendar":   `Produce a **30-day custom marketing calendar** for this brand.\nContext / goals: ${brief}\n\nStart date: ${today}. Produce 30 consecutive daily entries. Mix channels (LinkedIn, Instagram, X, Email, Blog, TikTok/Reel) based on what fits this brand. Include the best posting time for each channel. Every entry must be usable as-is — no placeholders.\n\nOutput EXACTLY this structure — no preamble:\n\n## Strategy Summary\n- Audience: <one line>\n- Voice: <one line>\n- Core themes (3): <comma list>\n- Weekly rhythm: <one line>\n\n## Calendar\n\nA markdown table with columns exactly: | Day | Date | Time | Channel | Theme | Post Copy | Image / Visual Concept | CTA |\n\nRules:\n- 30 rows, one per day, dates in YYYY-MM-DD starting ${today}.\n- "Post Copy" = the finished caption/hook (30–60 words, brand voice, no placeholders).\n- "Image / Visual Concept" = concrete art direction (subject, composition, palette hex references, on-brand style). One sentence.\n- "Time" = specific clock time like "8:30 AM" tuned to that channel's best window.\n- "CTA" = short and specific.\n- No lorem ipsum. No brackets like [Brand]. No "TBD".\n\n## Asset Checklist\n- List 6 hero images/videos to pre-produce this month. Each: one-line art-direction prompt referencing brand palette.`,
  };
  const userTemplate = templates[kind] || templates["one-pager"];
  const system = `You are a senior brand designer, copywriter, and content strategist. Match the brand's tone from its palette + positioning. Markdown only. No preamble.\n\n${brandPromptBlock(brand)}`;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: userTemplate }],
      max_tokens: kind === "calendar" ? 6000 : 1500,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    if (r.status === 429) throw new Error("Model rate-limited. Try again shortly.");
    if (r.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI error ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

async function generateImage(brand: Brand, brief: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("AI unavailable");
  const prompt = [
    `Design a polished on-brand marketing image.`,
    `Concept: ${brief}`,
    ``,
    brandPromptBlock(brand),
    ``,
    `Rules:`,
    `- Compose like a professional brand designer (magazine-grade).`,
    `- Use ONLY the palette above. Backgrounds & accents pull from those hex values.`,
    `- Typography must feel like the listed fonts (or a close visual match).`,
    `- Clean, high-end, no stock-photo cheese, no watermarks, no lorem ipsum.`,
    `- If a logo is implied, keep space for it top-left — do not fabricate a fake logo.`,
    `- Square 1:1 composition unless the brief demands otherwise.`,
  ].join("\n");

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
    if (r.status === 429) throw new Error("Image model rate-limited. Try again shortly.");
    if (r.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Image error ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  // Gateway returns image URL/base64 in message.images[0].image_url.url
  const img = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url
           || j?.choices?.[0]?.message?.image_url
           || "";
  if (!img) throw new Error("No image returned");
  return img;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (limited(ip)) return json({ error: "Rate limit: 20 runs/hour. Buy the tool for unlimited." }, 429);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const action = String(body?.action || "").trim();
  try {
    if (action === "scan") {
      const url = String(body?.url || "").trim();
      if (!/^https?:\/\//i.test(url)) return json({ error: "Enter a full URL (https://...)" }, 400);
      const brand = await firecrawlBranding(url);
      return json({ ok: true, brand });
    }
    if (action === "generate") {
      const brand = body?.brand as Brand;
      const brief = String(body?.brief || "").trim().slice(0, 800);
      const kind = String(body?.kind || "one-pager");
      if (!brand?.sourceURL) return json({ error: "Scan a brand first" }, 400);
      if (!brief) return json({ error: "Describe what to create" }, 400);
      if (kind === "image") {
        const image = await generateImage(brand, brief);
        return json({ ok: true, image });
      }
      const markdown = await generateCopy(brand, brief, kind);
      return json({ ok: true, markdown });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message || "Request failed" }, 500);
  }
});
