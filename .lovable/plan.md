

## Goal
Add the full SEO keyword/service taxonomy (Strategy, Governance, Technology, Marketing/Ops + long-tail B2B/ROI/vertical terms) across the site so we rank for high-intent AI consulting searches.

## Where Each Keyword Cluster Lands

**1. `index.html` — global meta + schema**
- Expand `<meta name="keywords">` with all 4 service clusters + long-tail phrases ("AI consulting for healthcare", "AI adoption roadmap", "reduce operational costs with AI", etc.)
- Expand `<noscript>` block with keyword-rich H1/H2 copy bots can read without JS
- Upgrade Organization JSON-LD with `hasOfferCatalog` listing all 24 service offerings as `OfferCatalog` → `Service` items

**2. `src/components/SEOHead.tsx` — per-page keywords prop**
- Add optional `keywords?: string` prop → emits `<meta name="keywords">`
- Add `og:image:alt` + `hreflang="en-us"`
- Smart title suffix (only append " | Aetheris AI" when title has room)

**3. New section: `src/components/ServiceCapabilities.tsx`**
A 4-column visible section on Home + Services pages showing:
- **Strategy & Consulting** — AI Strategy, Digital Transformation, Use Case Prioritization, AI Maturity Assessment, Build vs. Buy, ROI Analysis
- **Governance & Ethics** — Responsible AI, AI Ethics, GDPR/EU AI Act, Bias Mitigation, XAI, Risk Management
- **Technology & Applications** — Generative AI, ML, NLP, LLMs, AI Agents, Computer Vision
- **Marketing & Operations** — Automation Strategy, AI Agents, Workflow Automation, Data Analytics, Performance Optimization, Conversational AI

This gives bots crawlable keyword-rich H2/H3/list content (not just meta tags — actual indexed body copy) while reinforcing positioning to humans. Dark glass cards, amber accents, matches existing visual identity.

**4. Per-page keyword targeting (SEOHead `keywords` prop)**
- Home: B2B AI consulting + Indianapolis + ROI cluster
- `/services` + `/solutions`: full taxonomy
- `/ai-consultant`: "AI consultant Indianapolis", "AI strategy consulting", "AI maturity assessment"
- `/marketing-strategist`: "AI marketing automation", "conversational AI"
- `/sales-compass`: "AI sales automation", "workflow automation"
- `/assessment`: "AI readiness assessment", "AI maturity audit"
- `/diagnostic-quiz`: "business diagnostic", "operational efficiency AI"
- `/scan`: "AI website analysis", "digital transformation audit"
- Vertical pages (when applicable): "AI for healthcare", "AI for logistics", "AI for construction", etc.

**5. Long-tail blog hook (no new posts, just schema)**
Add `Article` + `BreadcrumbList` JSON-LD to `BlogPostPage` if not already present, with keyword-aware description fallback.

## Files Changed
- **Edit:** `index.html` (keywords, noscript, OfferCatalog schema)
- **Edit:** `src/components/SEOHead.tsx` (keywords prop, og:image:alt, hreflang)
- **New:** `src/components/ServiceCapabilities.tsx` (4-cluster visible section)
- **Edit:** `src/pages/Home.tsx` (mount ServiceCapabilities)
- **Edit:** `src/pages/ServicesPage.tsx` (mount ServiceCapabilities)
- **Edit:** ~8 page files to pass `keywords` prop to SEOHead (AI Consultant, Marketing Strategist, Sales Compass, Assessment, Diagnostic, Scan, Solutions, About)
- **Edit:** `src/pages/BlogPostPage.tsx` (Article + BreadcrumbList schema if missing)

No DB, no edge functions, no new dependencies.

## Out of Scope
- Writing new blog posts targeting each long-tail term (separate request)
- Vertical landing pages per industry (e.g., dedicated `/ai-for-healthcare` page) — can follow up

