---
name: Pricing & Business Model
description: Public offers, bundles, flagship fixed splits, tiered commission, rep-portal alignment
type: feature
---

## Public offers (the ONLY paths surfaced on the public site)

### Operator-led bundles (`/catalog`) — three sealed pairings, no à la carte
1. **Signal Pack — $2,500 one-time.** ~6 hrs operator time. Website Report + Brand Contradiction Finder + Friction Vocabulary Audit + Leak Findings memo + 30-min walkthrough.
2. **Revenue Pack — $5,000 one-time.** ~14 hrs. Signal Pack + Sales Script Pack + Follow-Up Plan + Strategic Question Engine + 30-Day Content Calendar + two 45-min sessions. "Most operators pick this".
3. **Operator Suite — $10,000 one-time.** ~30 hrs over 3 weeks. Revenue Pack + Strategy Blueprint + Social Content Pack + Digital Snapshot + Lead-Nurture Automation + Tech Suite access. Credits 1:1 toward Retainer.

All three CTA "Talk to an operator" → ContactModal. **No public Buy/checkout button on bundles.** Operator qualifies, sends Stripe link.

### Flagships (sales-led only)
- **21-Day Revenue Diagnostic — $18,500.** Fit call required.
- **Implementation Retainer — $15,000/mo, 3-month minimum.** Diagnostic clients only.

### Leak Ecosystem Tool Shop (`/tools-shop`) — self-serve, lifetime unlocks
Public shop with 3 free runs per tool (email-gated), then buy a lifetime code. Codes unlock unlimited runs + persistent AI memory per tool. Bundle: buy 3, get 1 free is baked into the 3-Tool price.
- **Single Tool — $40 one-time (lifetime).** Tier 1 → Co $20 / Rep $12 / Partner $8.
- **3-Tool Bundle — $100 one-time (lifetime, mix & match).** Tier 2 → Co $60 / Rep $25 / Partner $15.
- **All Access — $1,000 one-time (lifetime, every current + future tool).** Tier 3 → Co $700 / Rep $200 / Partner $100.

Stripe lookup_keys: `tool_single_lifetime`, `tool_triple_lifetime`, `tool_unlimited_lifetime`. Webhook mints a `LEAK-XXXX-XXXX` code on `checkout.session.completed` when `metadata.shop === "tools"` and emails it via the `tool-shop-license` template. Redeem at `/tools-shop/redeem`.


## Commission math — TWO models (source of truth)

### Model A — Tiered % (bundles + legacy catalog)
Defined in `src/lib/repProducts.ts` TIER_RATES + `ratesForAmount()` in `payments-webhook`.
- T1 ($29–$59, ≤5900¢): Company 50 / Rep 30 / Partner 20
- T2 ($79–$349, ≤34900¢): Company 60 / Rep 25 / Partner 15
- T3 ($599+, incl. all 3 bundles): Company 70 / Rep 20 / Partner 10

Bundle splits (all T3):
- Signal $2,500 → Co $1,750 / Rep $500 / Partner $250
- Revenue $5,000 → Co $3,500 / Rep $1,000 / Partner $500
- Operator Suite $10,000 → Co $7,000 / Rep $2,000 / Partner $1,000

### Model B — Flagship fixed-dollar
Defined in `FLAGSHIP_SPLITS` (src/lib/repProducts.ts) and `FLAGSHIP_FIXED_SPLITS` / `flagshipFixedSplit()` (payments-webhook). Mapped by Stripe price lookup_key:
- `diagnostic_21day_once` → Co $10,500 / Rep $5,000 / Partner $3,000  (sum = $18,500)
- `implementation_retainer` → Co $8,000 / Rep $4,000 / Partner $3,000 (every month client stays)

Webhook precedence: `flagshipFixedSplit(priceId)` wins; otherwise falls back to `ratesForAmount()`.

### Bonuses (stack on top of base commission)
- Volume: +$1k/$2.5k/$5k at 2/3/5 monthly flagship sales
- Retention: +$1k/$2.5k/$5k at 3/6/12-month retainer extension
- Referral: $500 onboard + $7k first-close + $500/sale 12-mo override

## Rep portal alignment (CareersPage, FlagshipCommissionPanel, onboardingCurriculum, Rep-Operator-Playbook.md)
All four surfaces show the SAME five offers and the SAME numbers above. The 21 legacy à la carte tools live on in `REP_PRODUCTS` with `legacy: true` for internal/direct rep sales only — never promoted publicly. Fractional CTO/CMO retired from active rep panels.

## Legacy / internal Stripe products
Routes still resolve so existing rep-portal links and direct purchases keep working but are hidden from public nav. Tracked in `REP_PRODUCTS` with `legacy: true`.

## Required reading
Public training doc: `public/Rep-Operator-Playbook.md` (full pitch + math + rules).
