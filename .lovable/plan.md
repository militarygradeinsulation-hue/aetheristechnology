

## Status check first

Two things stand out before planning Phase 2:

**1. The build error in your message is a Cloudflare R2 hiccup** ("StatusCode: 429 — Reduce your concurrent request rate"). That's a transient infra error on Lovable's deploy pipeline, not a code bug. The fix is to click **Publish** again — it will retry and succeed. No code change required.

**2. The verification steps you listed are manual checks** — view-source, disable-JS, Rich Results Test, LinkedIn Post Inspector, Search Console submit, Bing submit. Those are operator tasks for you, not build tasks for me. I can't open Search Console or LinkedIn Inspector for you. I'll list them at the end as your homework.

So the actual build work in your message is the **Phase 2 prerender system**, scoped to the conversion-critical pages you flagged. That's the plan below.

---

## Phase 2 — Crawler-targeted edge-function prerender

### How it works

```
Crawler request → Cloudflare → React app
   ↓ (User-Agent matches bot)
   ↓
Edge Function: render-for-crawler
   ↓
   1. Check prerender_cache table for { route, html, generated_at }
   2. If fresh (< 7 days) → return cached HTML
   3. If stale or missing → fetch route's data from DB,
      assemble static HTML server-side from a route-specific template,
      cache it, return it
   ↓
Crawler gets fully-rendered HTML with hero, copy, JSON-LD baked in
Real users get the SPA as normal (their UA doesn't match the bot list)
```

**Important constraint:** Lovable's hosting is Cloudflare in front of the Vite SPA. We cannot intercept requests at the CDN edge to swap responses based on User-Agent — Lovable doesn't expose Cloudflare Workers config. So the crawler-facing URL will be a **separate edge-function endpoint** (`https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/render-for-crawler?path=/business-diagnostic`) rather than transparent UA-sniffing on the main domain.

**That means:** to actually serve the prerendered HTML to crawlers on `aetheris.technology`, we need Cloudflare Worker-level UA routing — which only you can configure in your Cloudflare dashboard for the custom domain. I'll provide the Worker script and exact setup instructions.

If you don't want to touch Cloudflare, the fallback is: keep Phase 1 hardening + submit each prerendered URL to Google/Bing manually as static snapshots. Less elegant but zero-infra.

### Scope — only the conversion tier

Your priority list, locked in:

| Page | Priority | Build |
|---|---|---|
| `/` | DONE | Skip — Phase 1 covers it |
| `/business-diagnostic` | CRITICAL | ✅ Build |
| `/about` | HIGH | ✅ Build |
| `/leak-audit` | HIGH | ✅ Build |
| `/services` | HIGH | ✅ Build (since LinkedIn posts will mention pricing) |
| `/blog/:slug` (all published posts) | HIGH | ✅ Build (case-file content = LLM training fuel) |
| `/contact`, `/terms`, `/privacy` | LOW | Skip |
| Industry/vertical pages | LOW | Skip for now |

`/case-files` doesn't exist yet — separate build (see "What I'd ship in parallel" below).

### What gets built

**Database**
- New table `prerender_cache`: `route` (PK), `html` (text), `generated_at` (timestamptz), `etag` (text). RLS off — service-role only.

**Edge function: `render-for-crawler`**
- Accepts `?path=/some-route`.
- Looks up cache. Returns cached HTML if `generated_at > now() - 7 days`.
- On miss: dispatches to a route-specific renderer (one function per template — homepage, business-diagnostic, about, leak-audit, services, blog-post). Each renderer:
  - Pulls data from Supabase if needed (blog post body, FAQ overrides from `seo_overrides`, etc.)
  - Assembles a self-contained HTML document: full `<head>` (title, meta, OG, canonical, JSON-LD), `<body>` with the hero, the body copy, the FAQ, the CTAs, and a `<link rel="canonical">` pointing back at `aetheris.technology/<route>`.
  - Stores the rendered HTML in `prerender_cache`.
- Returns `text/html` with `Cache-Control: public, max-age=3600`.

**Edge function: `prerender-cache-warmer` (scheduled, nightly cron)**
- Iterates the route list (5 marketing pages + every published `blog_posts.slug`).
- Calls `render-for-crawler` for each, forcing regeneration.
- Logs success/failure count.

**Cloudflare Worker (you deploy this in your CF dashboard)**
- Single ~30-line script. On each request:
  - Inspect `User-Agent` against a bot list (`GPTBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `LinkedInBot`, `facebookexternalhit`, `Twitterbot`, `Slackbot`, `Bingbot`, `Googlebot`).
  - Bot? Fetch from `https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/render-for-crawler?path=<request.path>` and return its body.
  - Real user? Pass through to the Lovable origin untouched.
- I'll provide the exact script + step-by-step CF dashboard instructions in the final message.

### Files touched

**Database**
- New migration: `prerender_cache` table

**Created**
- `supabase/functions/render-for-crawler/index.ts` — main dispatcher + cache layer
- `supabase/functions/render-for-crawler/templates/homepage.ts`
- `supabase/functions/render-for-crawler/templates/business-diagnostic.ts`
- `supabase/functions/render-for-crawler/templates/about.ts`
- `supabase/functions/render-for-crawler/templates/leak-audit.ts`
- `supabase/functions/render-for-crawler/templates/services.ts`
- `supabase/functions/render-for-crawler/templates/blog-post.ts`
- `supabase/functions/render-for-crawler/templates/_shared.ts` — common head builder, JSON-LD helpers
- `supabase/functions/prerender-cache-warmer/index.ts`
- `supabase/config.toml` — add `[functions.render-for-crawler] verify_jwt = false` (public crawler endpoint)

**Edited**
- None in the React app. Zero touch to user-facing code.

### Validation

After build:
- `curl "https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/render-for-crawler?path=/business-diagnostic"` → returns full HTML with hero, 20-question intro, JSON-LD, OG tags. No JS.
- Same for `/about`, `/leak-audit`, `/services`, `/blog/<slug>`.
- After you wire the Cloudflare Worker: `curl -A "GPTBot" https://aetheris.technology/business-diagnostic` returns prerendered HTML; `curl -A "Mozilla/5.0..." https://aetheris.technology/business-diagnostic` returns the SPA.
- `prerender_cache` table fills with 5 + N rows after first warmer run.

---

## What's NOT in this build

- **Case Files page** — doesn't exist yet, separate build. I'll plan it next if you want.
- **Leak Audit PDF** — separate build.
- **Anonymized case-study page** — separate build.
- **Sitemap regeneration** — already a function, fine as-is.
- **Verification/recrawl tasks** — your homework, not buildable.

---

## Your homework after I ship Phase 2

These are the operator checks you listed — I can't do these for you:

1. **Re-publish** to clear the R2 429 error.
2. **View-source `aetheris.technology/`** — confirm Phase 1 metadata, JSON-LD, and noscript hero copy are in the raw HTML.
3. **Disable JS, reload `/`** — confirm hero copy renders.
4. **Google Rich Results Test** on `/`, `/business-diagnostic`, `/about` (after Phase 2 ships).
5. **`/llms.txt` + `/llms-full.txt`** — visit directly, confirm forensics positioning.
6. **LinkedIn Post Inspector** on `/` — confirm OG card.
7. **Submit to Google Search Console + Bing Webmaster Tools.**
8. **Wire the Cloudflare Worker** in your CF dashboard using the script + instructions I'll deliver after the build.

---

## One question before I build

Phase 2 only delivers value if crawlers actually hit the prerender endpoint. Two paths:

**A. Build everything including the Cloudflare Worker script + instructions for you to deploy in your CF dashboard.** Crawlers hit `aetheris.technology` directly and transparently get prerendered HTML. Real fix. Requires you to do ~5 min of CF dashboard config.

**B. Build the prerender endpoint only, no CF Worker. Add the prerendered URLs directly to the sitemap and submit to Google/Bing.** No CF config needed, but crawlers hitting the canonical aetheris.technology URLs still see the SPA — only crawlers that follow sitemap-listed prerender URLs see the rendered HTML. Weaker fix.

Default if you don't reply: **A**. It's the only one that actually solves the problem.

