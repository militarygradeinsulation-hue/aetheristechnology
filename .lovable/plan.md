# Revenue Forensics Category Migration

The strategy is locked in memory. Execution happens in **3 waves over 3 turns**, then the two new builds. Each wave is one approval, one turn.

## Rename rule (applies everywhere)
- **Implementation Retainer → Active Case**
- "$15K/mo retainer" → "$15K/mo while case is open"
- "On retainer" → "Case open" · "Cancel retainer" → "Close case"
- Stripe product **IDs stay frozen** (renaming the ID breaks `payments-webhook` + commission split). Only display names + descriptions change. Commission logic untouched.

## Kill list (must not appear anywhere user-facing or in AI prompts)
SEO services · social media management · brand awareness · digital transformation · retainer (as a service line) · **agency / agencies** — anywhere, ever.

Substitutes already in our lexicon:
- "agency" → "vendor", "competitor", "the shelf you don't want to be on"
- "SEO services" → "search visibility leaks" (when describing the *leak*, not the service)
- "social media management" → drop entirely; if context requires, "distribution leaks"
- "brand awareness" → "market visibility" or drop
- "digital transformation" → drop; if context requires, "system rebuild"

---

## Wave 1 — Public surface (this turn after approval)

Every file a prospect's browser, crawler, or LLM touches. Highest leverage.

**Pages:** `src/pages/DiagnosticPage.tsx`, `ServicesPage.tsx`, `ScanPage.tsx`, `IndustriesPage.tsx`, `ImplementationPage.tsx`, `LocationPage.tsx`, `CareersPage.tsx`, `ResumeForensicsPage.tsx`, `OperatorPage.tsx`

**Components:** `ComparisonSection.tsx`, `PackageTiers.tsx`, `ServicesPricing.tsx`, `WhatYouReallyGet.tsx`, `ThisIsForYou.tsx`, `ServiceCapabilities.tsx`, `ToolsCapabilities.tsx`, `WhyUs.tsx`, `AllInOneGenerator.tsx`, `ContentCalendarGenerator.tsx`

**Crawler + SEO surface:** `supabase/functions/render-for-crawler/templates/{homepage,services,about,leak-audit}.ts`, `src/components/seo/seoContent.ts`, `src/components/seo/LeakAuditHowToSchema.tsx`, `public/llms.txt`, `public/llms-full.txt`, `public/sitemap.xml`

**Diagnostic + Implementation pages:** Rename flagship to **Active Case**, reframe as "your case stays open while we hunt and fix leaks." Update CTAs ("Open a case" / "Talk to an operator"). Add Revenue Forensics category framing above the fold on Services + Implementation.

**Stripe product display names** via `payments--create_product` update path (IDs unchanged): "Implementation Retainer" → "Active Case". `src/lib/repProducts.ts` display strings updated; product IDs frozen.

## Wave 2 — AI prompt layer (next turn)

These prompts shape every AI output the business generates. Updating them is how we stop regenerating banned vocabulary.

**Edge function prompts:**
- `supabase/functions/_shared/aetheris-knowledge.ts` — the canonical knowledge file every AI function imports. Add Revenue Forensics category block + kill list as a CATEGORY RULE that every prompt references (same pattern as the CURRENCY RULE).
- `supabase/functions/_shared/lead-scoring.ts` — strip "agency" / "SEO services" keyword weights, replace with forensic signals.
- `sales-chat/index.ts`, `rep-assistant/index.ts`, `portal-detective/index.ts`, `portal-scrape-leads/index.ts`, `admin-scrape-leads/index.ts`, `careers-test/index.ts`, `retrofit-blogs/index.ts`, `seo-discover-trends/index.ts`, `generate-aeo-blog-batch/index.ts` — reference the new CATEGORY RULE; remove inline banned vocab.

## Wave 3 — Rep / partner portal + internal docs (turn after that)

Lower customer visibility, but the rep voice has to match the category move or reps sell the old positioning.

- `public/Rep-Operator-Playbook.md` — full rewrite of pitch sections, retainer → Active Case, agency comparisons reframed as "the shelf"
- `src/components/portal/FlagshipCommissionPanel.tsx` — rename UI labels; commission math frozen
- `src/components/portal/{InterviewBriefingPanel,RepBootcamp3Day,IncentivePlan,LeadGamePlan,DetectiveContactPlan,PartnerOnboardingHub,PortalDocuments,LeadsBoard,SalesCoachChat}.tsx`
- `src/components/admin/{WarPlanSections,HireBlueprintScript,MillionDollarPathView,BriefingsPanel,BriefingChat,LeadScraperPanel}.tsx`
- `src/lib/{bootcamp6WeekCurriculum,millionDollarPath,industrySeasonality,onboardingCurriculum,repToolTips}.ts`
- Migration files in `supabase/migrations/` containing the old strings — **NOT rewritten** (migrations are immutable history). New migration if any seed data needs to update.

## After the sweep — the two structural builds

These are full features, planned separately when Wave 3 lands.

**Build A — Revenue Score (0–100, public, shareable)**
- New route: `/score/:domain` — renders the score card for any scanned domain
- Scanner emits a score (already partially computed in `extension-leak-scan`)
- Embeddable badge (`/score/badge/:domain.svg`) businesses can drop on their own site
- Public OG image generation for shareability
- Stored in `revenue_scores` table; rescanned on demand

**Build B — Industry Leak Report (proprietary aggregate)**
- New route: `/industry-leak-report` + downloadable PDF
- Aggregates anonymized scan data already in our database by industry
- Surfaces top 10 leak types, average severity, dollar-impact ranges per industry
- Citation magnet — gets footnoted by anyone writing about revenue ops

## Technical guardrails

- Never change Stripe product IDs (`prod_*`) or price `lookup_key`s
- Never rewrite existing migrations
- Never alter `payments-webhook` `flagshipFixedSplit()` math
- Display-name updates to Stripe products go via `payments--create_product`-style updates, never by editing `repProducts.ts` IDs
- Every AI prompt in Wave 2 must include the new CATEGORY RULE block referencing the kill list

## What I need from you

Approve the plan → I execute Wave 1 immediately in the next turn. Waves 2 and 3 follow on your nod each time. Builds A + B get their own plans when we get there.
