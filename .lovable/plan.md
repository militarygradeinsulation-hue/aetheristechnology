

## Goal
Ship the highest-ROI content expansion: 5 long-tail AEO blog posts + 6 vertical landing pages + an `/industries` hub. All inherit the existing schema/AEO machinery (FAQ, HowTo, Speakable, breadcrumbs, weekly auto-optimizer).

## Part 1: Long-Tail Blog Posts (5)

Generate via the existing `generate-blog` edge function pattern, but with **forced topics** (currently it picks from playground industry — these need AI consulting topics). Insert directly into `blog_posts` table.

**Posts (each ~3,000 words, with TL;DR card, FAQ schema, HowTo schema, Article schema):**
1. `how-to-implement-ai-in-business` — 7-step framework, common pitfalls, 90-day roadmap
2. `ai-adoption-roadmap` — Maturity stages, milestones, KPIs by stage
3. `reduce-operational-costs-with-ai` — Cost categories, ROI formulas, case patterns
4. `ai-maturity-assessment-guide` — 5 maturity levels, self-scoring rubric, next steps per level
5. `build-vs-buy-ai-decision-framework` — Decision matrix, TCO calc, when each wins

**Approach:** Create a one-shot edge function `generate-aeo-blog-batch` that takes a list of topics + outlines and writes 5 posts in one run using Lovable AI (Gemini 2.5 Pro). Brand voice locked. Each post stored with `is_published=true` so they go live immediately and get picked up by sitemap/auto-optimizer.

## Part 2: Vertical Landing Pages (6) + Hub

**Routes:**
- `/industries` — hub page with 6 vertical cards
- `/ai-for-healthcare`
- `/ai-for-finance`
- `/ai-for-logistics`
- `/ai-for-construction`
- `/ai-for-manufacturing`
- `/ai-for-saas`

**Single reusable template** `VerticalLandingPage.tsx` driven by config — keeps code clean. Each page has:
- Hero with industry-specific pain hook (aggressive, blunt — per brand voice)
- TL;DR "Quick Answer" card (Speakable schema)
- 4 industry-specific use cases (Strategy / Governance / Tech / Marketing — mapped from approved keyword taxonomy)
- ROI angle section with industry stats
- 5 industry-specific FAQs (FAQPage schema)
- "How AI transforms [industry]" 5-step section (HowTo schema)
- Service schema with `areaServed` + industry context
- Breadcrumbs
- CTA to `/assessment` + `/contact`

**Content config:** `src/config/verticals.ts` — single source of truth per vertical (hero, pains, use cases, FAQs, HowTo steps, stats). Easy to extend later.

## Part 3: Wiring

- `App.tsx` — register 7 new routes
- `Navbar.tsx` — add "Industries" dropdown (mirrors existing nav style)
- `Footer.tsx` — link to /industries hub
- `public/sitemap.xml` — add 7 routes with `lastmod`
- `public/llms-full.txt` — add industries section so LLMs cite verticals
- `src/lib/schemas.ts` — small `industryServiceSchema()` helper if needed (probably reuses `serviceSchema`)
- Auto-optimizer already targets static routes — these get included automatically next Sunday (or via "Run now")

## Files

**New:**
- `supabase/functions/generate-aeo-blog-batch/index.ts` — one-shot blog generator
- `src/pages/IndustriesPage.tsx` — hub
- `src/pages/VerticalLandingPage.tsx` — reusable template
- `src/config/verticals.ts` — content config for all 6 verticals

**Edited:**
- `src/App.tsx` — 7 new routes
- `src/components/Navbar.tsx` — Industries nav entry
- `src/components/Footer.tsx` — Industries link
- `public/sitemap.xml` — 7 new entries
- `public/llms-full.txt` — industries section

**One-time action after deploy:**
- Invoke `generate-aeo-blog-batch` once to create the 5 blog posts (admin can also re-run from a button — optional, can add to admin dashboard SEO tab)

## Out of Scope
- Per-industry case studies with named clients (you have no testimonials per brand rules)
- Industry-specific pricing pages
- Spanish/multi-language versions

