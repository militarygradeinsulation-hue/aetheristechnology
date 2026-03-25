

# Website Scanner with Gated Results

## Overview
Add a "Scan Your Website" tool to the homepage. A visitor enters their URL, the system scrapes it via Firecrawl and analyzes it with AI to identify business/digital gaps. The first 2-3 findings display clearly, then the remaining results fade to transparent with a gradient overlay and a "Contact us to see your full report" CTA.

## Prerequisites
- **Firecrawl connector** must be linked to the project (you have 3 connections available, we'll link one)

## What We'll Build

### 1. Edge Function: `scan-website`
- Accepts a URL from the frontend
- Calls Firecrawl scrape API (formats: `markdown`, `branding`, `links`) to pull the site's content, brand assets, and link structure
- Sends the scraped data to the Lovable AI gateway (Gemini Flash) with a prompt that produces a structured JSON analysis:
  - **Overall Score** (0-100)
  - **6-8 gap findings**, each with: category (SEO, CTA, Messaging, Mobile, Speed, Brand Consistency), severity (critical/warning/info), title, and description
- Returns the structured analysis to the frontend

### 2. New Component: `WebsiteScanner.tsx`
- URL input field with "Scan My Website" button
- Loading state with animated progress indicators
- Results display:
  - Overall score (circular gauge)
  - Gap cards in a vertical list
  - **First 3 gaps**: fully visible
  - **Remaining gaps**: rendered but covered by a CSS gradient fade (from visible to transparent white/dark overlay)
  - Over the faded area: a locked overlay with "Unlock Your Full Report" CTA linking to `/contact` or opening the contact modal
- Tracks scan events via `useTrackEvent`

### 3. Database: `website_scans` table
- Stores: id, url, score, gaps (jsonb), created_at
- RLS: anonymous insert allowed (lead capture without auth)
- Captures scan data for the admin dashboard

### 4. Homepage Integration
- Insert `WebsiteScanner` between `Hero` and `ServicesPricing` on `Home.tsx`
- Wrapped in `RevealOnScroll` for consistent animation

## Technical Details

**Fade effect** (CSS gradient overlay):
```text
┌─────────────────────────┐
│  Gap 1: Missing CTAs    │  ← fully visible
│  Gap 2: Weak SEO meta   │  ← fully visible  
│  Gap 3: No mobile CTA   │  ← fully visible
│░░Gap░4:░Brand░incons░░░░│  ← fading
│░░░░░░░░░░░░░░░░░░░░░░░░░│
│   🔒 Unlock Full Report │  ← overlay CTA
│   [Contact Us to See]   │
│░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────┘
```

Implemented via a `relative` container with an `absolute` gradient div (`bg-gradient-to-b from-transparent to-background`) starting at ~40% height.

**Files created**: `supabase/functions/scan-website/index.ts`, `src/components/WebsiteScanner.tsx`
**Files modified**: `src/pages/Home.tsx`
**Migration**: New `website_scans` table

