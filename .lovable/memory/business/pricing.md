---
name: Pricing & Business Model
description: Public offers, bundles, legacy product status, tiered commission
type: feature
---

## Public offers (the ONLY paths surfaced on the public site)

### Operator-led bundles (`/catalog`) — three sealed pairings, no à la carte
1. **Signal Pack — $2,500 one-time.** ~6 hrs operator time. Website Report + Brand Contradiction Finder + Friction Vocabulary Audit + Leak Findings memo + 30-min walkthrough.
2. **Revenue Pack — $5,000 one-time.** ~14 hrs operator time. Signal Pack + Sales Script Pack + Follow-Up Plan + Strategic Question Engine + Content Calendar + two working sessions. Highlighted as "most operators pick this".
3. **Operator Suite — $10,000 one-time.** ~30 hrs operator time over 3 weeks. Revenue Pack + Strategy Blueprint + Social Content Pack + Digital Snapshot + Lead-Nurture Automation + Tech Suite access. Credits 1:1 toward Implementation Retainer.

All three CTA "Talk to an operator" → ContactModal. **No public Buy/checkout button on bundles.** Operator qualifies, then sends a Stripe link manually.

### Flagships (above the bundles, sales-led only)
- **21-Day Revenue Diagnostic — $18,500 fixed fee.** One-time. Book a 15-minute fit call to qualify.
- **Implementation Retainer — $15K/month, 3-month minimum.** Diagnostic clients only.

## Operator-as-product rule
Tools are never sold individually on the public site. The operator is the product; tools are the instruments. Every public CTA reads "Talk to an operator" or "Meet your operator". The `/operator` page is the canonical pitch.

## Legacy / internal Stripe products (still live, hidden from nav)
All routes still resolve so existing rep-portal links and direct purchases keep working, but they are not linked in `Navbar`, `Footer`, `Home`, or any public page. Reps still sell these via the rep portal.

- Forensic Diagnostic ($2,500), 14-Day Diagnostic ($2,900), Fractional CTO/CMO ($5,900/mo)
- Tool packs: Social Content Pack, Content Calendar, Sales Script Pack, Follow-Up Plan, Full Website Report, Friction Vocabulary Audit, Strategic Question Engine, Brand Contradiction Finder, Digital Snapshot, Strategy Blueprint, Website Evaluation, Strategic Discovery Audit, Playbook Unlock
- Subscription tiers via `smart-subscriptions`

## Tiered commission (rep program — intact but not promoted publicly)
Source of truth: `TIER_RATES` in `src/lib/repProducts.ts` and `ratesForAmount()` in `payments-webhook`.
- Tier 1 ($29–$59, ≤ 5900¢): Company 50 / Rep 30 / Partner 20
- Tier 2 ($79–$349, ≤ 34900¢): Company 60 / Rep 25 / Partner 15
- Tier 3 ($599+): Company 70 / Rep 20 / Partner 10

10 rep codes in `rep_codes`: 482917, 739254, 156843, 624781, 895326, 317469, 568192, 743058, 281637, 964523. Tracked via `metadata.rep_code` in Stripe checkout → `sales.rep_code`.

## Pilot pricing
$9,500 for the first three signed pilots — outreach scripts only, never on the site.
