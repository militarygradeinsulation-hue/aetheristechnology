

# Build 3 New Premium Tools — Executive Clarity Suite

## Overview

Three new AI-powered tools that form a "Clarity Suite" — each addressing a different layer of business weakness. Same architecture pattern as existing tools (input form, AI generation, free preview, paid unlock).

## Tools

### 1. Strategic Question Engine (`/strategic-questions`)
- **Input form**: Industry, company size, years in business, main product/service, growth stage, biggest frustration, pressure area (multi-select), revenue range (optional), goal (grow/stabilize/rebuild/scale)
- **AI generates**: Question map organized by 8 categories (Leadership, Sales, Marketing, Operations, Hiring, Pricing, Customer Journey, Growth)
- **Free**: Top 10 critical questions + first 2 categories
- **Paid ($79)**: Full report with all categories, urgency rankings, explanations, "Questions you're probably not asking," workshop prompts
- **Edge function**: `generate-strategic-questions/index.ts`

### 2. Brand Contradiction Finder (`/brand-contradictions`)
- **Input form**: Website URL, social links (optional), ideal customer description, desired perception (multi-select: premium, trustworthy, fast, innovative, etc.)
- **Uses Firecrawl** to scrape site + branding data
- **AI generates**: Contradiction analysis across 5 layers (message vs visual, tone vs audience, offer vs pricing, promise vs process, emotion vs trust)
- **Free**: Contradiction Score + top 2 contradictions with explanations
- **Paid ($99)**: All 5+ contradictions, emotional impact, buyer perception, recommended fixes, before/after positioning
- **Edge function**: `generate-brand-contradictions/index.ts`

### 3. Friction Vocabulary Audit (`/friction-audit`)
- **Input form**: Website URL, desired brand tone (multi-select), industry, target customer
- **Uses Firecrawl** to scrape site content
- **AI generates**: Scan of all copy for vague language, corporate filler, weak emotional language, risky wording, flat CTAs
- **Free**: Friction score + top 5 flagged phrases with explanations
- **Paid ($69)**: Full audit with all flagged phrases, replacements, tone alignment, stronger CTAs, optional page rewrite upgrade path
- **Edge function**: `generate-friction-audit/index.ts`

## Database Changes

1. **Alter `tool_type` enum** — add `strategic_questions`, `brand_contradictions`, `friction_audit`

## Stripe Products (3 new)

- `strategic_question_engine` — $79
- `brand_contradiction_finder` — $99
- `friction_vocabulary_audit` — $69

## Edge Functions (3 new)

Each follows existing pattern: CORS headers, validate input, call Firecrawl (tools 2 & 3), call Lovable AI Gateway with specialized prompt, return structured JSON.

- `supabase/functions/generate-strategic-questions/index.ts`
- `supabase/functions/generate-brand-contradictions/index.ts`
- `supabase/functions/generate-friction-audit/index.ts`

## Frontend (6 new files)

- `src/pages/StrategicQuestionsPage.tsx` + `src/components/StrategicQuestionEngine.tsx`
- `src/pages/BrandContradictionsPage.tsx` + `src/components/BrandContradictionFinder.tsx`
- `src/pages/FrictionAuditPage.tsx` + `src/components/FrictionVocabularyAudit.tsx`

Each component: multi-field input form → animated progress phases → results with free preview + blurred paid section → Stripe checkout overlay on unlock.

## Existing File Updates

- **`App.tsx`**: 3 new routes
- **`FreeTools.tsx`**: 3 new tool cards (will need 3 new thumbnail images generated)
- **`ServicesPricing.tsx`**: 3 new service tiles with full deliverables/value props + a "Clarity Suite" bundle callout
- **`supabase/config.toml`**: 3 new `[functions.*]` entries with `verify_jwt = false`

## Suite Packaging

Add a visual callout/banner in ServicesPricing that groups the three tools as the **"Executive Clarity Suite"** with a combined discount price (e.g., all 3 for $199 instead of $247).

## Thumbnail Generation

Use Lovable AI image generation to create 3 matching thumbnail images for the FreeTools grid.

## Implementation Order

1. DB migration (enum update)
2. Create 3 Stripe products
3. Build 3 edge functions
4. Build 3 frontend components + pages
5. Update App.tsx routes
6. Update FreeTools.tsx + ServicesPricing.tsx
7. Generate thumbnail images
8. Update config.toml

