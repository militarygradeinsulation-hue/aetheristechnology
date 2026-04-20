

## What you're asking

Make Aetheris **visible to AI crawlers** (ChatGPT, Claude, Perplexity, Googlebot's first pass, LinkedIn previews) — not just rendered-after-JS visible. Today the site is a Vite SPA, so anything beyond `index.html` is invisible to crawlers that don't execute JavaScript.

## Reality check on what you already have

Before listing fixes, here's what's already shipped (so I don't waste a day re-doing it):

- **`/llms.txt` and `/llms-full.txt`** — already present in `public/`, served at root. ✅
- **JSON-LD structured data** — every key page emits Organization / Service / FAQPage / BreadcrumbList / Speakable schema via `SEOHead.tsx` + `src/lib/schemas.ts`. ✅
- **Per-page `<title>`, meta description, OG, Twitter, canonical** — handled by `react-helmet-async` in `SEOHead.tsx`. ✅
- **Sitemap** — `public/sitemap.xml` + a `generate-sitemap` edge function. ✅
- **Live SEO override system** — `seo_overrides` table feeds `useSEOOverride` so titles/descriptions/FAQs update at render time. ✅

**What's actually broken:** all of the above is injected by `react-helmet-async` **after React mounts**. A non-JS crawler hitting `aetheris.technology/` sees only the static `<title>`/`<meta>` baked into `index.html` (currently generic) plus an empty `<div id="root">`. The hero copy, TL;DR, case files, FAQs, JSON-LD — none of it ships in the initial HTML response.

So the consultant's diagnosis is **correct on the symptom, partially wrong on the cause**: it's not that we lack schema or `llms.txt`. It's that the SPA never renders server-side, so the schema we already wrote never makes it into the first byte the crawler reads.

## The fix — prerendering, not migration

We do **not** need to migrate to Next.js. Vite has a battle-tested solution: **`vite-plugin-prerender`** (or `react-snap` / `vite-plugin-prerender-spa`). It runs Puppeteer at build time, hits each route in headless Chrome, captures the fully-rendered HTML (including everything `react-helmet-async` injected), and writes static `.html` files into `dist/`.

End result: a crawler hitting `/leak-audit` gets a fully-rendered HTML page with the real hero, real meta tags, real JSON-LD, real FAQ content — **zero changes to the React app, zero runtime cost, zero hosting changes**. JS still hydrates for users; crawlers just get the pre-baked snapshot.

### Phase 1 — Prerender the marketing pages (the fix)

1. **Install `vite-plugin-prerender`** and wire into `vite.config.ts`. Configure with Puppeteer, headless, and a route list of every public marketing page.
2. **Route list to prerender** (initial set — not behind auth, not dynamic-id):
   - `/`, `/about`, `/services`, `/why-us`, `/capabilities`, `/solutions`, `/industries`, `/contact`, `/careers`, `/terms`
   - `/leak-audit`, `/scan`, `/assessment`, `/diagnostic`, `/friction-audit`, `/brand-contradictions`, `/strategic-questions`, `/sales-scripts`, `/follow-up-plan`, `/content-calendar`, `/content-generator`, `/sales-compass`, `/marketing-strategist`, `/marketing-studio`, `/ai-consultant`
   - `/blog` (the index)
   - `/resources`, `/service-areas`, all `/industries/:vertical` static slugs from `src/config/verticals.ts`
3. **Blog post prerendering** — `BlogPostPage` is dynamic (`/blog/:slug`). Approach: at build time, query Supabase for all `published = true` slugs, feed that list into the prerender route array. ~174 posts → adds ~2 min to build, runs once per deploy. Acceptable.
4. **Skip prerendering** for: admin (`/admin/*`), auth (`/login`, `/signup`, `/reset-password`), checkout return, anything user-specific. Those stay SPA-only — crawlers shouldn't see them anyway.
5. **`index.html` baseline upgrade** — even with prerender, harden the static fallback:
   - Replace generic `<title>` with the homepage title
   - Add baseline `<meta name="description">`, OG image, OG title, Twitter card
   - Add the homepage `Organization` JSON-LD inline (so even pre-prerender first-load and any unprerendered route still ships brand schema)
   - Keep the existing `<noscript>` notice but rewrite it to be SEO-positive ("Aetheris — Business Forensics Operator. Indianapolis. (317) 376-2110.") instead of just "needs JavaScript"

### Phase 2 — Verify the fix actually shipped

After deploy:
- `curl -A "Mozilla/5.0 (compatible; ChatGPT-User/1.0)" https://aetheris.technology/` — should return HTML containing "Your business is leaking", the TL;DR copy, the case file numbers, and inlined JSON-LD.
- Same for `/leak-audit`, `/about`, a sample blog post.
- Run through Google Rich Results Test → all schema types should validate.
- LinkedIn Post Inspector on `/` and `/blog/[any-slug]` → should pull title + description + OG image.

### Phase 3 — Marginal AI-discoverability boosters (cheap wins)

- **Update `public/llms.txt`** to point at the now-prerendered key pages and the Forensics positioning (currently it's still on the old "AI Systems Architect" framing — confirmed via earlier file listing).
- **Regenerate `public/llms-full.txt`** with the new forensic copy + Leak Audit methodology + pricing.
- **Add `Author` + `mainEntityOfPage` schema** to blog posts (already in `articleSchema`, just confirm it's wired in `BlogPostPage`).
- **Add a `WebSite` + `SearchAction` schema** to the homepage so AI crawlers know the site is searchable.

## What I will NOT do

- **Migrate to Next.js.** Pointless cost. Prerender solves the same problem in 1 day with zero refactor.
- **Add SSR runtime** (Vite SSR mode, Vercel functions, etc.). Adds infra complexity for marketing pages that never change per-user. Static prerendered HTML is faster, cheaper, and more crawler-friendly than SSR anyway.
- **Touch the React app code.** Components, routes, state — all unchanged. The build pipeline is the only thing that changes.
- **Prerender authed pages** — admin, login, checkout, my-subscription stay SPA.

## Files touched

**Edited**
- `vite.config.ts` — add `vite-plugin-prerender` config, route list, Puppeteer options
- `package.json` — add `vite-plugin-prerender` + `puppeteer` dev deps
- `index.html` — upgrade static `<title>`, meta, OG, baseline JSON-LD, rewrite `<noscript>`
- `public/llms.txt` + `public/llms-full.txt` — refresh to forensics positioning

**Created**
- `scripts/get-prerender-routes.ts` — build-time script that fetches blog slugs + vertical slugs from Supabase and exports the full route list to the Vite plugin

## Validation

- `npm run build` completes; `dist/` contains `index.html`, `about/index.html`, `leak-audit/index.html`, `blog/[slug]/index.html` for every published post — each with fully-rendered HTML, meta tags, and JSON-LD baked in.
- `curl https://aetheris.technology/leak-audit` (no JS) returns the hero copy, the 7-step methodology section, and FAQ JSON-LD in the response body.
- Google Rich Results Test on `/`, `/about`, `/blog/[any-slug]` → all schemas valid.
- LinkedIn Post Inspector on the homepage → pulls correct title, description, OG image.
- Real users: zero visible change. Same SPA, same React Router, same hydration. Pages just feel slightly faster on first paint because HTML arrives with content.

## One decision before I build

The prerender step adds time to every deploy (≈10–15s for static pages, +~2 min if we prerender all 174 blog posts each time). Two options:

**A. Prerender everything every deploy** — simplest, always fresh, but every deploy is ~2.5 min longer.
**B. Prerender static marketing pages on every deploy; prerender blog posts on a schedule (nightly cron or post-publish trigger)** — fast deploys, slight delay before a brand-new blog post is crawler-visible (max 24h, or instant if we wire a publish webhook).

Default if you don't reply: **A**. Simpler, and a 2.5-min deploy is fine for a marketing site that ships ~daily.

