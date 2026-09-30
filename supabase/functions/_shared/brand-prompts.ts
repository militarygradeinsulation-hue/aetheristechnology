// Shared brand prompt module — used by both `creation-studio-brand` and
// `forensic-scan-all` so the voice/rules stay identical across every surface
// that generates branded copy or imagery from a scanned brand kit.

export type BrandColor = { role: string; hex: string };
export type Brand = {
  name?: string;
  description?: string;
  colors: BrandColor[];
  fonts: string[];
  logo?: string;
  favicon?: string;
  ogImage?: string;
  colorScheme?: string;
  sourceURL: string;
};

export function brandPromptBlock(brand: Brand): string {
  const palette = brand.colors.length
    ? brand.colors.map((c) => `${c.role}:${c.hex}`).join(", ")
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

// Platform length rules stated in the prompt (not enforced by schema — we
// clamp/validate in code). Keep short: LinkedIn ≤3000, X ≤280, IG ≤2200 (+30
// hashtags), Facebook ≤500, TikTok caption ≤150.
export const SOCIAL_POST_RULES = `
Produce ONE ready-to-post social post per platform, PERFECTLY on-brand:

- linkedin: 900–1600 chars. Professional, insight-driven, 3–5 short paragraphs, 1 line break between. 3–5 targeted hashtags at the end. Hook first line.
- x: ≤ 260 chars total (leave room). Punchy, 1–2 lines, 2–3 hashtags max.
- instagram: 300–1200 chars caption. Emotive hook line, story-driven body, clear CTA, then 15–25 targeted hashtags on a new line.
- facebook: 250–500 chars. Conversational, one clear CTA link/action, 0–2 hashtags.
- tiktok: caption ≤ 140 chars, energetic/hook-first, 3–5 trend-relevant hashtags.

Rules for ALL platforms:
- Write AS the scanned brand speaking to its own audience. These are its ready-to-publish posts, not Aetheris commenting on the brand or describing a scan.
- Use only the observed company positioning. Never invent an offer, result, review, client, price or guarantee. Direct readers to this brand, not Aetheris.
- Voice must match the brand's positioning + palette (formal vs playful, technical vs mass-market — infer from BRAND block).
- No em-dashes as filler. No "In today's fast-paced world". No emoji spam (0–2 max where appropriate to brand tone).
- Return ONLY the JSON object with keys linkedin, x, instagram, facebook, tiktok.
- Each platform value = { copy: string, hashtags: string[], best_time: string }.
- "best_time" = one specific clock time tuned to that platform's peak window (e.g. "Tue 8:30 AM ET").
- Do NOT include the hashtags inline in "copy" — they live only in the hashtags array.
`;

export const CALENDAR_PROMPT = (brief: string, today: string) => `Produce a **30-day custom marketing calendar** for this brand.
Context / goals: ${brief}

Start date: ${today}. Produce 30 consecutive daily entries. Mix channels (LinkedIn, Instagram, X, Email, Blog, TikTok/Reel) based on what fits this brand. Include the best posting time for each channel. Every entry must be usable as-is — no placeholders.

Output EXACTLY this structure — no preamble:

## Strategy Summary
- Audience: <one line>
- Voice: <one line>
- Core themes (3): <comma list>
- Weekly rhythm: <one line>

## Calendar

A markdown table with columns exactly: | Day | Date | Time | Channel | Theme | Post Copy | Image / Visual Concept | CTA |

Rules:
- 30 rows, one per day, dates in YYYY-MM-DD starting ${today}.
- "Post Copy" = the finished caption/hook (30–60 words, brand voice, no placeholders).
- "Image / Visual Concept" = concrete art direction (subject, composition, palette hex references, on-brand style). One sentence.
- "Time" = specific clock time like "8:30 AM" tuned to that channel's best window.
- "CTA" = short and specific.
- No lorem ipsum. No brackets like [Brand]. No "TBD".

## Asset Checklist
- List 6 hero images/videos to pre-produce this month. Each: one-line art-direction prompt referencing brand palette.`;

export const ONE_PAGER_PROMPT = (brief: string) => `Produce a one-page marketing positioning brief for: ${brief}

Output EXACTLY:
## Headline (max 8 words)
## Sub-headline (1 line)
## Positioning Message (2–3 sentences — the one thing this brand should say to everyone, forever)
## 3 Value Bullets
## Proof Line
## CTA Button Copy
## Design Notes (2 bullets referencing palette + fonts)

Under 180 words total.`;

export function imagePrompt(brand: Brand, brief: string): string {
  return [
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
}

// Extract a Brand from a Firecrawl `branding` payload. Shared so both edge
// functions parse the same shape.
export function parseFirecrawlBranding(payload: unknown, fallbackUrl: string): Brand {
  const j = (payload || {}) as Record<string, unknown>;
  const data = ((j as { data?: unknown }).data ?? j) as Record<string, unknown>;
  const b = ((data.branding ?? (j as { branding?: unknown }).branding) || {}) as Record<string, unknown>;
  const meta = ((data.metadata ?? (j as { metadata?: unknown }).metadata) || {}) as Record<string, unknown>;
  const colorsObj = (b.colors as Record<string, unknown>) || {};
  const colors: BrandColor[] = Object.entries(colorsObj)
    .filter(([, v]) => typeof v === "string" && /^#?[0-9a-f]{3,8}$/i.test(String(v)))
    .map(([role, v]) => {
      const s = String(v);
      return { role, hex: s.startsWith("#") ? s : `#${s}` };
    });
  const rawFonts = b.fonts;
  const fonts: string[] = Array.isArray(rawFonts)
    ? (rawFonts as Array<Record<string, unknown>>).map((f) => (f?.family as string) || "").filter(Boolean)
    : Object.values(((b.typography as Record<string, unknown>)?.fontFamilies as Record<string, unknown>) || {}).filter(Boolean) as string[];
  const images = (b.images as Record<string, unknown>) || {};
  return {
    name: (meta.title as string) || (meta.ogTitle as string) || undefined,
    description: (data.summary as string) || (j.summary as string) || (meta.description as string) || undefined,
    colors,
    fonts: Array.from(new Set(fonts)).slice(0, 4),
    logo: (images.logo as string) || (b.logo as string) || undefined,
    favicon: (images.favicon as string) || undefined,
    ogImage: (images.ogImage as string) || undefined,
    colorScheme: (b.colorScheme as string) || undefined,
    sourceURL: (meta.sourceURL as string) || fallbackUrl,
  };
}
