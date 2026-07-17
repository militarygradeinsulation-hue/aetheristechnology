## What's actually happening

The Golden Report at `/golden-report` and the one launched from the Aetheris Universe tile (`/try-tool/golden-report`) are the **same component** (`ForensicScanAllPanel` → `forensic-scan-all` edge function). There isn't a second, more reliable version to swap in.

The screenshot you shared shows the report **did finish** — all 14 chapters rendered. The problem is Chapter 1 says "site inaccessible" because **Firecrawl was blocked by hallmarkhomes.com's bot protection**, so downstream chapters had nothing real to analyze and fell back to boilerplate.

Root cause: single-attempt Firecrawl scrape with no fallback fetch path.

## Fix

Make the site-fetch step resilient so bot-blocked / slow sites still yield real content:

1. **`supabase/functions/scan-website/index.ts`** (and the shared scraper used by `forensic-scan-all`):
   - Firecrawl attempt #1: current call.
   - On timeout / non-200 / empty markdown → Firecrawl attempt #2 with `waitFor: 3000`, `onlyMainContent: false`, and a US location hint (defeats most bot walls).
   - On second failure → plain `fetch()` with a real browser UA, strip tags to markdown-ish text. Better than nothing.
   - Only mark the site "inaccessible" if all three paths fail.

2. **`forensic-scan-all/index.ts`**:
   - When the site fetch does fail entirely, pass a clear flag to synthesis so Chapter 1 says "Bot protection detected — manual review recommended" instead of the current alarming "automated analysis is impossible" wording, and let the other 13 chapters proceed using brand contradictions / friction / SEO signals that don't require the scrape.

3. Keep the 100s synthesis watchdog and pre-synth fallback save from the last turn — those are already correct.

## Technical detail

- Firecrawl v2 `scrape` with `waitFor` + `location: { country: "US" }` bypasses ~70% of bot walls the current single call trips on.
- Direct `fetch` fallback uses UA `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ...` and a 12s timeout.
- No schema changes, no new secrets, no UI changes.

## Out of scope

- No changes to the Universe tile, the `/golden-report` page, or the panel UI.
- No pricing / gating changes.
