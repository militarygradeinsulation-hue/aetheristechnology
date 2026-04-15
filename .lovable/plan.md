

# Tiered Scanner Paywall + Smart UX Upgrade

## What We're Building

Transform the existing website scanner from a simple "show 2 gaps, blur the rest" model into a **conversion machine** with animated progress, red-highlighted problems, "Fix This" buttons, and a 3-tier paywall with Stripe checkout.

## Pricing Tiers

| Tier | Price | What They Get |
|------|-------|---------------|
| **Free** | $0 | Score, grade, 2 visible gaps (blurred rest), preview PDF |
| **Full Report** | $49 | All gaps unlocked, revenue estimates, roadmap, ROI table, competitive brief — downloadable PDF |
| **Strategy Blueprint** | $299 | Everything above + CRM plan, system blueprint, content calendar, "Fix This" action items with implementation specs |

Two new Stripe products: `scan_full_report` ($49) and `scan_strategy_blueprint` ($299).

## Smart UX Upgrades

### 1. Animated Progress Bar Loading
Replace the current spinner with a multi-phase progress bar:
- "Scraping website..." (0-30%)
- "Analyzing SEO structure..." (30-50%)
- "Evaluating messaging & CTAs..." (50-70%)
- "Calculating revenue leaks..." (70-90%)
- "Generating diagnostic report..." (90-100%)

Uses a `Progress` component with timed intervals. Feels like real work happening.

### 2. Red-Highlighted Problem Cards
- Critical gaps: red border, red icon, pulsing red dot
- Warning gaps: amber/gold border
- Each gap shows "Est. Annual Leak" in bold red text
- Add a summary banner: "We found **$47,000–$92,000** in annual revenue leaks"

### 3. "Fix Available" / "Fix This For Me" Buttons
Every visible gap card gets a "Fix Available" badge. Clicking it:
- If free tier → opens the tier upgrade overlay
- If paid tier → triggers contact/checkout for consulting

### 4. Blurred Results + Gated Overlay (Enhanced)
- Free users see 2 gaps clearly, rest heavily blurred
- Revenue total is shown but individual amounts blurred
- Roadmap section title visible but content blurred
- Overlay with tier comparison cards + CTAs

### 5. Post-Purchase Unlock Flow
After Stripe payment completes:
- Store `scan_id` + `tier` in a new `scan_purchases` table
- Return page polls for completion, then redirects back to `/scan` with unlocked results
- Full results rendered inline OR downloadable as comprehensive PDF

## Technical Implementation

### Database
- New `scan_purchases` table: `id`, `user_id`, `scan_id` (refs website_scans), `tier`, `stripe_session_id`, `created_at`
- RLS: users see own purchases, service_role manages all

### Edge Function Updates
- `scan-website/index.ts`: No changes needed — already returns full data. Gating is client-side.

### Frontend Changes (Primary)
- **`src/components/WebsiteScanner.tsx`** — Major rewrite:
  - Replace spinner with animated progress bar + phase labels
  - Add revenue leak summary banner after score
  - Style critical gaps with red highlights + pulsing indicators
  - Add "Fix Available" badges on each gap card
  - "Fix This For Me" button → opens tier selector or contact
  - Enhanced blur overlay with 2-tier pricing cards
  - Stripe checkout integration for both tiers
  - Unlock state management (check `scan_purchases` for current scan)

### New Stripe Products
- `scan_full_report` / `scan_full_report_once` — $49
- `scan_strategy_blueprint` / `scan_strategy_blueprint_once` — $299

### Files Changed/Created
1. **Migration**: `scan_purchases` table + RLS
2. **New Stripe products**: 2 products, 2 prices
3. **`src/components/WebsiteScanner.tsx`**: Major UX overhaul (progress bar, red highlights, fix buttons, tier overlay, Stripe checkout)
4. **`src/pages/CheckoutReturn.tsx`**: Handle scan purchase returns

