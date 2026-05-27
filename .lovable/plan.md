# AEO/GEO Optimization Blueprint Implementation

The site already has a strong baseline (canonical, OG, Organization + FAQ JSON-LD, llms.txt, llms-full.txt). The blueprint wants a stricter decoupled crawler policy, richer machine-readable directories, schema upgrades, and citation-optimized on-page content.

## What I'll change

### 1. Decoupled `public/robots.txt`
Rewrite to match the blueprint:
- **Allow** real-time fetchers: `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`, `Claude-SearchBot`, `Googlebot`, `Bingbot`, `Applebot`, `DuckAssistBot`, plus social previewers (`Twitterbot`, `facebookexternalhit`, `LinkedInBot`).
- **Disallow** training/scraping crawlers: `GPTBot`, `ClaudeBot`, `anthropic-ai`, `Claude-Web`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `Bytespider`, `Amazonbot`, `cohere-ai`, `meta-externalagent`.
- Keep `/admin`, auth, checkout-return, unsubscribe disallowed across all UAs.
- Keep `Sitemap:` directive + `llms.txt` / `llms-full.txt` reference comments.

### 2. `public/llms.txt` — restructure to spec
Rewrite to a tighter, spec-compliant directory:
- H1 + blockquote summary (Business Forensics Operator pitch).
- `## Methodology` (Leak Audit + steps), `## Engagements` (Diagnostic, 14-Day, Retainer), `## Free Tools` (scanner, assessment, diagnostic, friction audit, etc.), `## Field Notes` (blog), `## About`, `## Contact`.
- `## Optional` section for lower-priority legacy tools.
- Keep canonical URLs on `https://aetheris.technology`.

### 3. `public/llms-full.txt` — extend
Append blueprint-aligned sections:
- "What AI Engines Cite Us For" (entity-dense paragraph naming Joseph Toney, Indianapolis, the 7 leak categories, pricing).
- "Frequently Cited Statistics" block (operator-led, $2,500 Diagnostic, 14-day SLA, 7-step methodology) so engines have copy-ready facts.
- "Direct Answers" block: 8–10 Island-Test paragraphs (Direct Answer ≤60w → Statistic → Source anchor → Implication) for the top buyer prompts ("what is a business forensics operator", "how much does the diagnostic cost", "what's in the Leak Audit", "Indianapolis AI consultant", "how to find revenue leaks", etc.).
- "Last updated" line with today's date for freshness.

### 4. `index.html` — schema upgrades
- Add `dateModified` (today) to existing `Organization` and `FAQPage` JSON-LD blocks.
- Add a new `Service` JSON-LD block describing the Forensic Diagnostic ($2,500) and 14-Day Operational Diagnostic ($7,500) with `provider`, `areaServed`, `offers.price`.
- Add `ProfessionalService` / `LocalBusiness` JSON-LD with Indianapolis address, `sameAs` to LinkedIn, geo coordinates (consolidating existing geo meta tags into structured data).
- Add a `BreadcrumbList` baseline for the homepage.

### 5. Landing page — one Island-Test "AI Answer" section
Add a compact, citation-optimized section to `src/pages/LeakLanderPage.tsx` (below the deck carousel, above the footer): a "Frequently Cited Facts" block of 4 Island-Test paragraphs styled in the existing dark/amber forensic system. Each paragraph: bold direct answer → stat → source anchor (Gartner / Princeton GEO / internal) → implication. Uses semantic tokens, no new colors. Renders as plain HTML so AI crawlers extract it cleanly.

## Out of scope (call out, don't build)

- **G2 / Capterra / Reddit footprints** — off-site, requires user action.
- **Server-Side Rendering** — project is Vite SPA. Real SSR migration is a large architectural change; I'll flag it but not attempt in this pass. The llms.txt + llms-full.txt + JSON-LD work mitigates most of the SPA citation gap because all critical facts are now in raw HTML/markdown that crawlers fetch directly.
- **Citation/Share-of-Voice tracking dashboards** — would need a separate admin tool + scheduled job; out of scope for this pass.
- **30/90-day refresh automation** — recommend later as a cron edge function once content cadence is decided.

## Files touched

- `public/robots.txt` (rewrite)
- `public/llms.txt` (rewrite)
- `public/llms-full.txt` (extend)
- `index.html` (add/update JSON-LD blocks)
- `src/pages/LeakLanderPage.tsx` (add Frequently Cited Facts section)
