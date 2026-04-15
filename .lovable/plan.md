

# Build Out Remaining AI Tools — Batch Plan

## Overview

Eight remaining tools to build, all following the same pattern: user inputs business info → AI generates output → free preview → paid full version. Each gets its own route. We'll build them in two batches.

## Batch 1 (This Implementation)

These four are highest-impact and most differentiated:

### 1. AI Social Content Generator (`/content-generator`)
- User enters their website URL (reuse Firecrawl scraping from scanner)
- AI generates: 10 LinkedIn posts, 10 Facebook posts, 5 ad hooks
- **Free**: Show 2 LinkedIn + 2 Facebook posts fully visible, blur the rest
- **Paid ($29)**: Unlock full pack, copy-to-clipboard buttons on each
- Edge function: `generate-social-content/index.ts`
- New Stripe product: `social_content_pack` / $29

### 2. Sales Script Generator (`/sales-scripts`)
- User fills in: industry, product/service, target customer, common objections
- AI generates: call script, 3 follow-up text templates, objection handling guide
- **Free**: See the call script opening + 1 objection response
- **Paid ($49)**: Full scripts + all objections + SMS/email follow-ups
- Edge function: `generate-sales-scripts/index.ts`
- New Stripe product: `sales_script_pack` / $49

### 3. Content Calendar Generator (`/content-calendar`)
- User enters: industry, goals, platforms they use
- AI generates: 30-day calendar with daily post ideas, hooks, topics, best times
- **Free**: See first 7 days
- **Paid ($29)**: Full 30-day calendar as downloadable PDF
- Edge function: `generate-content-calendar/index.ts`
- New Stripe product: `content_calendar` / $29

### 4. Follow-Up System Plan (`/follow-up-plan`)
- User enters: business type, sales cycle length, current tools
- AI generates: Day 0–14 follow-up flow with email + SMS + call cadences
- **Free**: See Day 0–3
- **Paid ($49)**: Full 14-day system with templates for every touchpoint
- Edge function: `generate-follow-up-plan/index.ts`
- New Stripe product: `follow_up_plan` / $49

## Batch 2 (Next Round)
- AI 101 Playbooks (add educational topics to the existing playbook browser)
- Pricing Strategy Fix
- "If You Fix This" Simulator
- AI Chatbot Script Generator

## Shared Architecture

Each tool follows the same component pattern:

```text
┌─────────────────────────────────┐
│  Input Form (business details)  │
├─────────────────────────────────┤
│  Animated Progress Bar          │
│  (reuse SCAN_PHASES pattern)    │
├─────────────────────────────────┤
│  Free Preview (partial results) │
│  Blurred Remaining Content      │
│  ┌───────────────────────────┐  │
│  │  Upgrade Overlay          │  │
│  │  Price + "Unlock Now"     │  │
│  │  → Stripe Checkout Modal  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## Technical Implementation

### Database
- New `tool_generations` table: `id`, `user_id` (nullable for anon), `tool_type` (enum: social_content, sales_scripts, content_calendar, follow_up_plan), `input_data` (jsonb), `output_data` (jsonb), `tier` (free/paid), `stripe_session_id`, `created_at`
- RLS: users see own generations, service_role manages all

### Edge Functions (4 new)
Each follows the same structure:
1. Accept input params
2. Call Lovable AI (gemini-2.5-flash) with a specialized prompt
3. Return structured JSON output
4. No PDF generation needed — results rendered in-browser, copy-to-clipboard

For the Social Content Generator specifically — reuse Firecrawl to scrape the site first (same pattern as `scan-website`).

### Frontend (4 new page components + 4 new tool components)
- `src/pages/ContentGeneratorPage.tsx` + `src/components/SocialContentGenerator.tsx`
- `src/pages/SalesScriptsPage.tsx` + `src/components/SalesScriptGenerator.tsx`
- `src/pages/ContentCalendarPage.tsx` + `src/components/ContentCalendarGenerator.tsx`
- `src/pages/FollowUpPlanPage.tsx` + `src/components/FollowUpPlanGenerator.tsx`

### Stripe Products (4 new)
- `social_content_pack` — $29
- `sales_script_pack` — $49
- `content_calendar` — $29
- `follow_up_plan` — $49

### Routing + Navigation
- Add 4 new routes to `App.tsx`
- Add 4 new cards to `FreeTools.tsx` grid
- Add 4 new service cards to `ServicesPricing.tsx`

### Files Changed/Created
1. **Migration**: `tool_generations` table + RLS
2. **4 Stripe products**: social_content_pack, sales_script_pack, content_calendar, follow_up_plan
3. **4 Edge functions**: generate-social-content, generate-sales-scripts, generate-content-calendar, generate-follow-up-plan
4. **8 Frontend files**: 4 pages + 4 components
5. **`App.tsx`**: 4 new routes
6. **`FreeTools.tsx`**: 4 new tool cards
7. **`ServicesPricing.tsx`**: 4 new service entries
8. **`supabase/config.toml`**: 4 new function entries

