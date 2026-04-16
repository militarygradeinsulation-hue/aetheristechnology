

The user wants the 7 paid AI tools available for free inside the admin dashboard as personal tools (no paywall, no checkout).

Let me confirm what these tools are by checking the codebase.
<lov-tool-use id="toolu_vrtx_01UMVxh9tEfjxisY3gPrmcFh" name="code--search_files" integration-id="code" data="{\"query\": \"priceId.*social_content|priceId.*sales_script|priceId.*content_calendar|priceId.*follow_up|priceId.*strategic|priceId.*brand_contradiction|priceId.*friction\", \"include_patterns\": \"*.tsx,*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01ABoHrfsfupaDLyhoj3VsXW" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/AdminDashboard.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JdjcvK3KHHmgpLm5oAhVKo" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Q82rfzkZZYrumshGS8tWCX" name="code--search_files" integration-id="code" data="{\"query\": \"priceId=|tool_type\", \"include_patterns\": \"src/components/*Generator*.tsx,src/components/*Audit*.tsx,src/components/*Finder*.tsx,src/components/*Engine*.tsx,src/components/SalesScript*.tsx,src/components/SocialContent*.tsx,src/components/ContentCalendar*.tsx,src/components/FollowUp*.tsx,src/components/Strategic*.tsx,src/components/Brand*.tsx,src/components/Friction*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0174pMjzV8LFfT7359Na9ikq" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/AdminDashboard.tsx\", \"lines\": \"1-100\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0184wcYksSULVeNTvRyuUDUn" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/AdminDashboard.tsx\", \"lines\": \"100-220\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01L9vrfprxqYiiaQJtaHkUqP" name="code--view" integration-id="code" data="{\"file_path\": \"src/App.tsx\"}">
</lov-tool-use>
I have enough context. Each tool component has a paywall that gates the full results behind `unlocked` state. I'll bypass it when the admin session is active.

<lov-plan>

## Goal
Inside the admin dashboard, give you free, unrestricted access to all 7 generator tools so you can use them as your personal toolkit (no paywall, no Stripe checkout).

## What I'll Build

**1. New "Tools" tab in `/admin`**

Add a 5th tab "🛠 My Tools" alongside Overview / Leads / Activity / Insights. Inside it, a clean grid of 7 cards, one per tool. Click a card → it expands inline (or opens in a modal) and renders the existing component fully unlocked.

Tools included:
- Social Content Generator
- Sales Script Generator
- 30-Day Content Calendar
- Follow-Up System Plan
- Strategic Question Engine
- Brand Contradiction Finder
- Friction Vocabulary Audit

**2. Bypass the paywall when used by admin**

Each tool component currently uses an `unlocked` boolean to gate results. I'll add an optional `adminMode?: boolean` prop to all 7 components. When `true`:
- `unlocked` defaults to `true`
- The "Unlock Now / $29" CTA and Stripe checkout modal don't render
- All blur overlays and lock icons are hidden
- Copy buttons work on every result

Public tool pages stay exactly as they are (paywall intact). Only the admin dashboard passes `adminMode={true}`.

**3. Auth guard**

Already gated: `/admin` requires `sessionStorage.admin_authenticated === 'true'` (set via the 9822 passcode). No new auth needed.

## Files Changed
- `src/pages/AdminDashboard.tsx` — add Tools tab + tool launcher grid
- `src/components/SocialContentGenerator.tsx` — add `adminMode` prop
- `src/components/SalesScriptGenerator.tsx` — add `adminMode` prop
- `src/components/ContentCalendarGenerator.tsx` — add `adminMode` prop
- `src/components/FollowUpPlanGenerator.tsx` — add `adminMode` prop
- `src/components/StrategicQuestionEngine.tsx` — add `adminMode` prop
- `src/components/BrandContradictionFinder.tsx` — add `adminMode` prop
- `src/components/FrictionVocabularyAudit.tsx` — add `adminMode` prop

No DB changes, no new edge functions, no schema work. The edge functions already exist and produce the full output (the paywall is purely client-side blur).

