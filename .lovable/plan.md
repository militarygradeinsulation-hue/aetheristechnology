

## Goal
Build a self-optimizing SEO/AEO system that scans the site weekly, identifies what's ranking/trending in the AI consulting niche, and **auto-adjusts** keywords, meta descriptions, FAQ content, and schema across pages — without breaking brand voice.

## How It Works (Weekly Loop)

```text
Sunday 3am ──► [1] SEO Audit Scan ──► [2] Trend Discovery ──► [3] AI Optimizer ──► [4] Apply Changes ──► [5] Log + Notify
                  (own pages)         (Perplexity/web)        (Lovable AI)         (DB-driven)         (admin dash)
```

**1. Self-scan** — Firecrawl crawls aetheris.technology, extracts current titles/descriptions/H1s/keywords per page.

**2. Trend discovery** — Perplexity API (already a connector option) queries: "top searched AI consulting keywords this week", "trending AEO queries Indianapolis B2B", "what AI overviews are citing for [niche]". Returns ranked keyword/question lists with sources.

**3. AI optimizer** — Lovable AI (Gemini 2.5 Pro) takes (a) current page metadata, (b) trending keywords, (c) brand voice rules from memory → outputs optimized title, description, keywords, 3-5 fresh FAQ Q&As, TL;DR rewrite. Brand-locked: no forbidden phrases, keeps amber/aggressive tone.

**4. Apply** — Instead of editing source files (would require redeploy), changes are stored in a new `seo_overrides` table keyed by route. `SEOHead.tsx` reads overrides at render time and merges them with page defaults. Live in seconds, no rebuild.

**5. Log** — Every change written to `seo_optimization_log` with before/after, score delta, source trends. New "SEO Optimizer" tab in admin dashboard shows history + manual override/rollback.

## Architecture

### New DB tables
- `seo_overrides` — one row per route: `path, title, description, keywords, faqs (jsonb), tldr, applied_at, version`
- `seo_optimization_log` — `route, before, after, trends_used, ai_reasoning, score_before, score_after, run_at`
- `seo_trend_cache` — weekly Perplexity results so we don't re-query within 7 days

All RLS: admin-only read/write via existing `is_admin()` function. Public anon SELECT on `seo_overrides` only (needed for SEOHead to render).

### New edge functions
- **`seo-weekly-optimize`** (cron, Sundays 3am ET)
  - Crawls site map → for each route: Firecrawl scrape → grab current SEO state
  - Calls `seo-discover-trends` for fresh trends
  - For each route: call Lovable AI with brand rules + trends → get optimized payload
  - Upsert into `seo_overrides`, write log row
  - Send admin notification email summary
- **`seo-discover-trends`** — Perplexity `sonar-pro` queries for niche/local trends, structured JSON output, cache in `seo_trend_cache`
- **`seo-manual-optimize`** — admin-triggered single-page or full-site re-run (button in dashboard)
- **`seo-rollback`** — restore prior version from log

### Cron
`pg_cron` + `pg_net` job: every Sunday 03:00 → invoke `seo-weekly-optimize`.

### Frontend integration
- `SEOHead.tsx` — fetch override for current path on mount (cached per session), merge with passed props (override wins for title/desc/keywords/faqs)
- New admin page section `SEOOptimizer.tsx` in AdminDashboard:
  - Last run timestamp + next run countdown
  - Per-route table: current title/desc, score delta, last optimized
  - "Run now" button (full or per-route)
  - "View changes" diff modal
  - Rollback button per entry
  - Trend keywords used this cycle

### Brand safety guardrails (in AI prompt)
- Pull rules from memory: amber/gold accents, aggressive tone, no testimonials/social proof, no "magic robot", high-end positioning, Indianapolis local
- Title length 50-60 chars, desc 140-155
- Never remove "Aetheris", "Indianapolis", core service terms
- Reject output if forbidden phrases detected → retry once → fallback to existing

### Connectors needed
- **Perplexity** — for trend discovery (will prompt user to connect)
- **Firecrawl** — already connected ✓

## Files

**New:**
- `supabase/functions/seo-weekly-optimize/index.ts`
- `supabase/functions/seo-discover-trends/index.ts`
- `supabase/functions/seo-manual-optimize/index.ts`
- `supabase/functions/seo-rollback/index.ts`
- `src/components/admin/SEOOptimizer.tsx`
- `src/hooks/useSEOOverride.ts`

**Edited:**
- `src/components/SEOHead.tsx` — fetch + merge overrides
- `src/pages/AdminDashboard.tsx` — add SEO Optimizer tab
- `supabase/config.toml` — register new functions (verify_jwt false for cron, true for admin endpoints)

**DB migrations:** 3 new tables + RLS + cron job

## Out of Scope
- Editing static page source files (overrides happen at render time — keeps git clean)
- Auto-publishing new blog posts (separate feature)
- A/B testing variants (could add later — log already supports versioning)

## Approval needed for
- Connecting **Perplexity** (required for trend discovery — alternative: skip trends, just optimize from current rankings)

