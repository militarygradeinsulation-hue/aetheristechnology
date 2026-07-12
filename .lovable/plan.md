# Golden Report ↔ Creation Studio: One URL, Two Outputs

## Goal
When a user enters a URL in the Golden Report on the home page, it should trigger **both**:
1. The existing 14-chapter forensic company report (already works).
2. A new **Branded Creation Kit**: brand message, hero imagery, 30-day content schedule, and per-platform social posts (LinkedIn, X, Instagram, Facebook, TikTok) with correct length + hashtags + tone matched to the company's real brand voice.

Both run from the same submit — no extra button, no second URL.

## What the user will see
On `/golden-report` after submitting a URL:
- Existing stage progress (site crawl → forensics → synth) — unchanged.
- **New second progress lane** below it: `Brand Kit → Message → Imagery → Schedule → Social Posts`.
- When both finish, page shows:
  - The existing "Download Smart PDF" report button.
  - A new **Branded Creation Kit** panel with tabs:
    - **Brand** — extracted colors, fonts, logo, one-line positioning message.
    - **Imagery** — hero image generated in the brand's style.
    - **Schedule** — 30-day calendar table (date, channel, theme, post, visual, CTA).
    - **Posts** — one card per platform showing the post copy, character count vs platform limit, hashtag block, and best-time-to-post note.
  - "Download Kit" button that bundles the above into a second PDF/zip.

## Implementation

### 1. Edge function: extend `forensic-scan-all`
Add a new pipeline stage `brand_kit` that runs after the existing `branding` stage (we already crawl the site there — reuse that output; do not double-scan). It calls the same underlying logic as `creation-studio-brand` `generate` action for each `kind` in parallel:
- `one-pager` → stores as `report.brand.message`
- `image` → stores as `report.brand.hero_image_url` (Gemini 2.5 flash image)
- `calendar` → stores as `report.brand.calendar_md`
- New `kind: "social-posts"` → returns structured JSON: `{ linkedin: {copy, hashtags[], char_count}, x: {...}, instagram: {...}, facebook: {...}, tiktok: {...} }` with platform-specific length rules baked into the prompt (LinkedIn ≤3000, X ≤280, IG ≤2200 + 30 hashtags, FB ≤500, TikTok ≤150 caption).

Persist on the same `forensic_scans` row under a new `brand_kit` JSONB column and a `brand_kit_status` column mirroring `stage_status`.

### 2. Shared brand-prompt module
Extract the `brandPromptBlock` + per-platform templates from `creation-studio-brand` into `supabase/functions/_shared/brand-prompts.ts` so both `forensic-scan-all` and the existing `creation-studio-brand` edge function use the same voice rules. No behavior change to the existing public sandbox.

### 3. Client: `ForensicScanAllPanel.tsx`
- Add a second `STAGES` array for the brand kit lane.
- Polling already returns the full row — read `brand_kit_status` and `brand_kit` alongside `report`.
- Render new `<BrandedCreationKit kit={row.brand_kit} />` component below the existing report actions when `brand_kit_status.all === "done"`.

### 4. New component: `src/components/BrandedCreationKit.tsx`
Tabs (Brand / Imagery / Schedule / Posts) built with existing shadcn `Tabs`. Post cards show live character-count vs platform cap in amber/crimson if over. "Copy" button per post. "Download Kit" hits a new small client-side PDF generator (mirrors `generateForensicGoldenPdf.ts` style).

### 5. Home page CTA copy
`HomeToolShopGrid` — update the Golden Report card subtitle to: *"One URL. Full company report + fully branded content kit ready to post."*

## Technical notes
- Model choice: text kinds → `google/gemini-2.5-flash` (fast, cheap, already used by `creation-studio-brand`). Image → `google/gemini-2.5-flash-image`. All via Lovable AI Gateway — no new secrets.
- Structured output for social posts: use `Output.object` with a small Zod schema (5 platforms × {copy, hashtags, char_count}); include the length rules in the prompt text, not as schema bounds, per the AI SDK constraint rules.
- DB migration: `ALTER TABLE public.forensic_scans ADD COLUMN brand_kit jsonb, ADD COLUMN brand_kit_status jsonb;` — existing GRANTs cover it.
- No new tables, no new auth, no new secrets. Runs on the same anonymous scan flow as the current Golden Report.
- Cost per URL roughly doubles (5 extra text calls + 1 image). Acceptable given this is the hero tool.

## Out of scope
- Saving the kit into `admin_library` / `rep_library` — the Golden Report itself doesn't save there today; keeping symmetry. Can be added later as a separate ask.
- Auto-posting to social networks.
- Editing the generated posts in-app (v1 is copy-out).

Ready to build on approval.