

## Goal
Make the 6 new vertical landing pages and the 5 long-tail blog posts get auto-optimized by the weekly SEO/AEO loop — same brand-locked AI rewrites the rest of the site already gets.

## Current Gap
The `seo-weekly-optimize` edge function has a hardcoded `ROUTES` array of 12 paths. The new pages aren't in it, so:
- Vertical pages (`/ai-for-healthcare`, etc.) get their **static** SEO from `verticals.ts` only — no weekly AI rewrites
- Blog posts get their **static** title/description from the DB — no weekly schema/FAQ refresh
- The `useSEOOverride` hook on these pages does nothing because no override row exists

The schema/FAQ/Speakable/HowTo machinery on these pages **is** working — it's just frozen. The auto-optimizer never touches it.

## Fix

### 1. Extend static route list (vertical pages)
In `seo-weekly-optimize/index.ts`, add the 7 new static routes to `ROUTES`:
- `/industries`
- `/ai-for-healthcare`, `/ai-for-finance`, `/ai-for-logistics`, `/ai-for-construction`, `/ai-for-manufacturing`, `/ai-for-saas`

Each with an industry-specific `intent` string to guide the AI.

### 2. Dynamic blog route inclusion
At runtime inside the function, query `blog_posts` where `is_published = true` and append each as `{ path: "/blog/<slug>", intent: "Long-form blog — <title>" }`. This keeps it future-proof — any new blog posts get optimized automatically without code changes.

### 3. Token-cost guardrail
- Cap dynamic blog routes at 25 newest posts per run (prevents runaway cost as blog grows)
- Keep the existing per-route try/catch so one failure doesn't kill the run

### 4. Brand rules tweak for blogs vs verticals
Add a tiny conditional in the optimizer prompt: if path starts with `/ai-for-` add "industry vertical landing page — keep industry name + Indianapolis in title/desc"; if path starts with `/blog/` add "long-form blog — title stays close to original H1, FAQ section is highest priority for AEO citations."

### 5. Admin dashboard reflection
The existing `SEOOptimizer.tsx` already lists all routes from the override/log tables — it'll auto-show the new ones once the optimizer runs. No UI changes needed.

## Files

**Edited (one file):**
- `supabase/functions/seo-weekly-optimize/index.ts` — add 7 static routes, dynamic blog query, intent-aware prompt addendum

**Optional one-time action after deploy:**
- Click "Run Full Optimization Now" in the admin SEO panel to immediately optimize the 18+ routes (rather than waiting for Sunday cron)

## Out of Scope
- Changing how the optimizer applies overrides (already works via `seo_overrides` table)
- A/B variants per route (logged for future)
- Optimizing legal/utility pages like `/terms`, `/login` (intentionally excluded)

