

# Redesign Homepage as a Clear Landing Page

## Goal
Simplify the homepage so any visitor instantly understands: what you do, what problem you solve, and how to take action. Replace the current dense layout with a clean landing page flow.

## New Homepage Structure (top to bottom)

### 1. Hero — Simplified
- Keep the brand quote at top: "With me you're paying for honesty & accuracy..."
- Replace the current long headline with a shorter, clearer problem statement
- Keep the 3 CTA buttons (Call, Email, Diagnostic) but make **email front and center**
- Remove the stats grid (move to About page if needed)
- Remove the trust strip at bottom (redundant with floating contact)

### 2. NEW: "3 Key Areas I Focus On" Section
Three clean cards, side by side on desktop, stacked on mobile:

| Card | Title | Description |
|---|---|---|
| 🎨 | **Digital Strategy** | I fix old graphics and outdated images hurting your brand. |
| 📢 | **Branding Message** | Social posts will have 4K quality images that make people want to buy. |
| ⚙️ | **Internal Systems** | I fix how you get leads, score them, and outreach. All increasing your conversion rate by 75%. |

Each card gets an amber icon and a short, punchy description — no jargon.

### 3. NEW: "Free Tools & Resources" Section
Four link cards in a grid pointing to existing pages:
- **Free Blog Articles** → `/blog`
- **Free Playbooks** → `/resources`
- **Free Business Diagnostic** → `/business-diagnostic`
- **Free Website Scanner** → `/scan`

Each card has an icon, title, one-line description, and a "Try It Free →" link.

### 4. Email / Contact — Front & Center
Move the existing ContactForm component up to appear right after the free tools section — prominently positioned, not buried at the bottom.

### 5. Footer
Keep as-is.

## What Gets Removed from Homepage
- **WebsiteScanner embed** (replaced by a link card pointing to `/scan`)
- **ServicesPricing** (detailed pricing tiers — keep on `/services` page)
- **ToolsCapabilities** (skills grid — keep on `/services` or `/about`)
- **Stats grid** in Hero
- **Trust strip** in Hero

## Files Modified
- `src/pages/Home.tsx` — restructured component order, remove ServicesPricing/ToolsCapabilities/WebsiteScanner
- `src/components/Hero.tsx` — simplified headline, email CTA prioritized, stats removed
- `src/components/ThreeAreas.tsx` — **new component** for the 3 key focus areas
- `src/components/FreeTools.tsx` — **new component** for resource link cards

## No Backend Changes
This is purely a frontend layout redesign. No database or edge function changes needed.

