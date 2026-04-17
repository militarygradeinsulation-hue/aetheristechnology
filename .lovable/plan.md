

## Goal
Push schema/SEO + AEO (Answer Engine Optimization for ChatGPT, Perplexity, Google AI Overviews, Gemini) to maximum. Current site has solid Org/FAQ/WebSite schema — but is missing the AEO-specific signals that get cited by AI engines.

## Audit: What's Missing

**Schema gaps:**
- No `LocalBusiness` (only `ProfessionalService`) — blocks Google Maps / local pack
- No `BreadcrumbList` on any page
- No `Article` schema on blog posts (datePublished, author, wordCount, image)
- No `Service` schema on individual service/tool pages
- No `Person` schema for the founder
- No `Review` / `AggregateRating` (forbidden per memory — skip)
- No `HowTo` schema (huge AEO win for "how to implement AI" queries)
- No `Speakable` schema (voice search / Alexa / Google Assistant)
- No `VideoObject` (if any embeds)
- No `WebPage` with `mainEntity` linking page to its primary topic

**AEO-specific gaps (what ChatGPT/Perplexity/Google AI Overviews look for):**
- No `llms.txt` file (the emerging standard — like robots.txt but for LLMs, tells them what to cite)
- No question-formatted H2s on key pages (AI engines extract Q&A pairs)
- FAQ schema only in index.html — should be on every relevant page with page-specific Qs
- No clear "answer-first" content blocks (TL;DR boxes AI engines love to quote)
- No `author` + `datePublished` + `dateModified` on blog posts (AEO trust signal)
- No entity disambiguation (`sameAs` links to Wikipedia, Crunchbase, LinkedIn for brand)
- No `mentions` schema linking content to known entities (OpenAI, Google, Anthropic, etc.)

**Technical SEO gaps:**
- Sitemap is static + missing 12+ routes + no blog posts + no `lastmod`
- No image sitemap
- No `Open Graph` article tags on blog (`article:published_time`, `article:author`, `article:tag`)
- No prerendered HTML for bots (SPA limitation — partially fixed with noscript, can do more)

## What I'll Build

### 1. AEO Foundation (highest ROI — gets you cited by ChatGPT/Perplexity)

**New file: `public/llms.txt`** — emerging standard. Tells LLMs which content to cite, brand facts, contact, services. Format:
```
# Aetheris AI
> B2B AI consulting in Indianapolis...
## Services
- AI Strategy: /services
- 14-Day Diagnostic: /assessment
## Key Facts
- Founded: ...
- Phone: (317) 376-2110
```

**New file: `public/llms-full.txt`** — extended version with full service descriptions, pricing tiers, FAQ answers in plain markdown — what AI engines crawl and quote verbatim.

### 2. Page-Level Schema Upgrades

**New helper: `src/lib/schemas.ts`** — reusable JSON-LD builders:
- `breadcrumbSchema(items)` 
- `serviceSchema(name, description, price, areaServed)`
- `articleSchema(post)` — for blog
- `howToSchema(steps)` — for tool pages ("How to scan your website", "How to assess AI readiness")
- `faqSchema(qa[])` — page-specific FAQs
- `speakableSchema(cssSelectors)` — for voice
- `localBusinessSchema()` — full LocalBusiness with hours, geo, payment, sameAs

**Inject into pages:**
- `BlogPostPage` → `Article` + `BreadcrumbList` + `Speakable` (TL;DR + headings)
- `AssessmentPage`, `ScanPage`, `DiagnosticQuizPage`, `FrictionAuditPage` → `HowTo` + `SoftwareApplication` + page-specific `FAQPage`
- `ServicesPage`, `AIConsultantPage`, etc. → `Service` schema with `Offer`, `areaServed`, `provider`
- `AboutPage` → `Person` schema for founder + `Organization` `sameAs`
- All pages → `BreadcrumbList`
- `index.html` → upgrade `ProfessionalService` to `LocalBusiness` (add `openingHoursSpecification`, expand `sameAs`)

### 3. AEO Content Patterns (in existing components)

- Add **TL;DR / "Quick Answer" cards** at top of high-intent pages — AI engines extract these verbatim. Wrap in `data-speakable="true"` + `Speakable` schema.
- Convert key H2s to **question format** ("What is the 14-Day Diagnostic?", "How much does AI consulting cost?", "Who needs an AI maturity assessment?")
- Add per-page `FAQPage` schema with 3-5 questions specific to that page's intent

### 4. Sitemap Overhaul

Replace `public/sitemap.xml` with comprehensive version:
- All 25+ static routes with `lastmod`, `changefreq`, `priority`
- Image entries (`<image:image>`) for OG images
- Add `<xhtml:link rel="alternate" hreflang="en-us">`
- (Optional follow-up: wire `generate-sitemap` edge function for auto blog inclusion)

### 5. Open Graph / Article Meta

In `BlogPostPage`, add via Helmet:
- `<meta property="article:published_time">`
- `<meta property="article:modified_time">`
- `<meta property="article:author">`
- `<meta property="article:section">`
- `<meta property="article:tag">` (one per tag)

### 6. Entity Authority (`sameAs`)

Expand Org schema `sameAs` to include all known brand profiles → tells AI engines "this is the same entity":
- LinkedIn company + founder
- Crunchbase (if exists)
- GitHub org (if exists)
- Twitter/X
- ctoguy.ai

## Files Touched

**New:**
- `public/llms.txt`
- `public/llms-full.txt`
- `src/lib/schemas.ts`

**Edited:**
- `index.html` — `LocalBusiness` upgrade, expanded `sameAs`, opening hours
- `public/sitemap.xml` — full route list + lastmod + images
- `src/components/SEOHead.tsx` — accept `breadcrumbs` + `faqs` + `speakable` props, auto-emit schemas
- `src/pages/BlogPostPage.tsx` — Article schema + article:* OG tags + Speakable
- `src/pages/AssessmentPage.tsx`, `ScanPage.tsx`, `DiagnosticQuizPage.tsx`, `FrictionAuditPage.tsx` — HowTo + page FAQ + breadcrumbs
- `src/pages/ServicesPage.tsx`, `AIConsultantPage.tsx`, `MarketingStrategistPage.tsx`, `SalesCompassPage.tsx` — Service schema + breadcrumbs
- `src/pages/AboutPage.tsx` — Person schema for founder + breadcrumbs
- `src/pages/Home.tsx` — TL;DR/answer-first card, Speakable schema
- `src/components/CEOProfile.tsx` or AboutPage — `data-speakable` attributes

## Out of Scope
- True SSR (Lovable SPA limitation)
- New blog content (separate request)
- Vertical landing pages per industry (separate request)
- Backlink building (off-platform)

