## Goal

Write the commission structure clearly inside the Rep Portal commission area so reps know exactly what they earn on every product. Make it fair, sustainable, and aligned to the actual prices and the 10% rate already stored in the database. Fix the outdated Careers page table so it stops contradicting reality.

## Current state (audited)

- `rep_codes` table: all 10 active reps are at **10% flat** (`commission_rate = 0.10`).
- Memory / Stripe products: full price ladder from **$29 Playbook Unlock → $5,900/mo Fractional CTO/CMO**, with the **$2,900 14-Day Diagnostic** as the core entry point.
- Rep Portal (`src/pages/RepPortalPage.tsx`) currently shows just a "Commission Rate: 10%" tile — no breakdown, no examples, no payout terms.
- Careers page (`src/pages/CareersPage.tsx`) still shows an old tiered table (25% on Snapshots, 12% on Diagnostic, 8–10% on Implementation, $125 / $500 / $2,500 prices). This is stale and inflates expectations the business cannot sustainably honor.

## The structure to display (fair to reps + business + owner)

**Flat 10% on every closed sale tied to your rep code.** No tiers, no clawbacks on completed work, no caps. Paid within 7 days of the client's payment clearing.

Why it works for everyone:
- **Reps**: predictable, easy math on every product — no guessing which tier applies.
- **Business**: margin protected so we can keep delivering quality and stay profitable as we scale.
- **Owner**: one rule, no exceptions to manage, no disputes about which tier a deal fell into.

## Changes

### 1. `src/pages/RepPortalPage.tsx` — expand the commission area

Below the existing 4 stat cards, add a **"Your Commission Structure"** card containing:

**(a) The rule, in plain language**
> You earn **10%** of every sale tied to your rep code. Paid within 7 days of the client's payment clearing. No clawbacks on completed work.

**(b) Per-product table** (Service · Price · Your Cut), built from a single source-of-truth array so it stays in sync with pricing:

| Product | Price | Your Cut |
|---|---|---|
| Playbook Unlock | $29 | $2.90 |
| Social Content Pack | $39 | $3.90 |
| Content Calendar | $39 | $3.90 |
| Sales Script Pack | $59 | $5.90 |
| Follow-Up Plan | $59 | $5.90 |
| Full Website Report | $59 | $5.90 |
| Friction Vocabulary Audit | $79 | $7.90 |
| Strategic Question Engine | $99 | $9.90 |
| Brand Contradiction Finder | $119 | $11.90 |
| Digital Snapshot | $149 | $14.90 |
| Strategy Blueprint | $349 | $34.90 |
| Website Evaluation | $599 | $59.90 |
| Strategic Discovery Audit | $599 | $59.90 |
| **14-Day Diagnostic** | **$2,900** | **$290** |
| Fractional CTO/CMO (recurring) | $5,900/mo | **$590/mo** while client stays |

Subscription tiers (e.g. $25/mo, $39/mo, $49/mo, $69/mo, $99/mo, $249/mo, $419/mo, $1,990/mo) row right below: **10% of every monthly invoice for as long as the subscription stays active**.

**(c) Realistic month examples** (replace the inflated old earnings table):
- **Light month** (5 small unlocks + 1 Snapshot): ≈ $40
- **Solid month** (3 Snapshots + 2 Strategy Blueprints + 1 Website Eval): ≈ $164
- **Strong month** (1 × 14-Day Diagnostic + 2 Snapshots + 1 Fractional retainer signed): **$290 + $30 + $590 recurring = $910 first month, $590/mo recurring after**
- **Heavy month** (2 Diagnostics + 1 Fractional retainer): **$580 + $590 recurring = $1,170 first month**

**(d) Payout terms** (small print under the table):
- Paid via the same channel they invoice us through (PayPal, ACH, Stripe Connect — pick one at signup).
- Tracked automatically when the client uses your 6-digit code at checkout. Visible live in this dashboard.
- Recurring products keep paying for as long as the client stays subscribed.

### 2. `src/pages/CareersPage.tsx` — replace the outdated commission + earnings sections

- Replace the "Your Commission" table with the same flat-10% rule and the per-product table.
- Replace the "Sample Monthly Earnings" table with the realistic monthly examples above.
- Update the hero subtext from `"Earn 8–25% per deal"` and `"8–25% Commission"` chip → `"Earn 10% on every deal — including recurring revenue."`
- Keep the "Commission paid within 7 days of client payment clearing. No clawbacks on completed work." line.

### 3. Single source-of-truth helper (clean code)

Add a small `REP_PRODUCTS` constant at the top of `RepPortalPage.tsx` (and reuse on CareersPage via shared file `src/lib/repProducts.ts`) that lists `{ name, priceCents, recurring }` so the commission table renders from one place. The rep's actual `commission_rate` from the DB is used to compute the cut, so if a specific rep is later given a custom rate, their personal table updates automatically.

### 4. Memory update

Update `mem://business/pricing` to remove the stale "8–25%" Careers narrative and lock in: "Reps earn flat 10% on every closed sale, including recurring monthly invoices for the lifetime of the subscription. Stored as `commission_rate` in `rep_codes`; default 0.10."

## Files touched

- `src/pages/RepPortalPage.tsx` — expand commission area (new card + table + examples + payout terms)
- `src/pages/CareersPage.tsx` — replace outdated commission + earnings tables, fix hero copy
- `src/lib/repProducts.ts` — new shared product/price list (single source of truth)
- `mem://business/pricing` — record the locked-in 10% flat rule

## Out of scope

- No changes to Stripe products, prices, or webhook commission math (already correct at 10%).
- No changes to the rep_codes table or the increment_rep_sales function.
- No new payment flows.
