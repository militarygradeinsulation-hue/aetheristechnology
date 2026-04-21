

# Rep Commission Codes + Price Increase

## Overview
Create a rep referral code system (10 six-digit codes) and raise all product prices ~15-20% to absorb the 10% commission. When a customer enters a rep code at checkout, the sale is tracked to that rep for commission payouts.

## New Prices (raised ~15-20%, rounded to clean price points)

| Service | Current | New Price | 10% Commission | Your Net |
|---------|---------|-----------|----------------|----------|
| Social Content Pack | $29 | $39 | $3.90 | $35.10 |
| Content Calendar | $29 | $39 | $3.90 | $35.10 |
| Sales Script Pack | $49 | $59 | $5.90 | $53.10 |
| Follow-Up Plan | $49 | $59 | $5.90 | $53.10 |
| Full Website Report | $49 | $59 | $5.90 | $53.10 |
| Friction Vocabulary Audit | $69 | $79 | $7.90 | $71.10 |
| Strategic Question Engine | $79 | $99 | $9.90 | $89.10 |
| Brand Contradiction Finder | $99 | $119 | $11.90 | $107.10 |
| Digital Snapshot | $125 | $149 | $14.90 | $134.10 |
| Strategy Blueprint | $299 | $349 | $34.90 | $314.10 |
| Website Evaluation | $500 | $599 | $59.90 | $539.10 |
| Strategic Discovery Audit | $500 | $599 | $59.90 | $539.10 |
| 14-Day Diagnostic | $2,500 | $2,900 | $290 | $2,610 |
| Fractional CTO/CMO | $5,000/mo | $5,900/mo | $590/mo | $5,310/mo |
| Playbook Unlock | $25 | $29 | $2.90 | $26.10 |

Monthly subscription prices will also be raised proportionally.

## Database: `rep_codes` Table

New table with columns:
- `id` (uuid, PK)
- `code` (text, unique, 6 digits)
- `rep_name` (text) -- assigned later when you pair codes to reps
- `rep_email` (text, nullable)
- `commission_rate` (numeric, default 0.10)
- `is_active` (boolean, default true)
- `total_sales_cents` (integer, default 0)
- `total_commission_cents` (integer, default 0)
- `created_at` (timestamptz)

RLS: Admin-only read/write. Service role full access.

Pre-populate 10 random 6-digit codes (unassigned, ready for you to name later).

## Database: Add `rep_code` column to `purchases` table

Add a nullable `rep_code` text column so every purchase records which rep (if any) referred it.

## Checkout Flow Changes

1. **`StripeEmbeddedCheckout`** -- Add an optional "Rep Code" input field above the Stripe form. When a valid 6-digit code is entered, it's validated against `rep_codes` and passed as metadata.

2. **`create-checkout` edge function** -- Accept `repCode` in the request body, pass it into `session.metadata.rep_code`.

3. **`payments-webhook`** -- On `checkout.session.completed`, if `metadata.rep_code` exists:
   - Save it to the `purchases.rep_code` column
   - Update `rep_codes.total_sales_cents` and `rep_codes.total_commission_cents`

## Stripe Product Price Updates

Recreate all prices with the new amounts using `batch_create_product` (new prices with same lookup keys automatically replace old ones).

## UI: ServicesPricing.tsx

Update all `priceRaw` and `pricing` display values to match the new prices.

## Admin Visibility

Add a "Rep Performance" section to your admin dashboard showing each code, assigned rep, total sales, and commissions owed.

## Technical Details

- 10 codes generated server-side via migration INSERT
- Codes are 6-digit numeric strings (e.g., "482917")
- Commission calculated as `amount_total * commission_rate` on each completed purchase
- Rep code input is optional -- customers without a code check out normally
- No discount is applied to the customer -- the code is purely for tracking

## Files Changed

| File | Change |
|------|--------|
| New migration | Create `rep_codes` table, add `rep_code` to `purchases`, insert 10 codes |
| `src/components/StripeEmbeddedCheckout.tsx` | Add rep code input field |
| `src/components/ServicesPricing.tsx` | Update all prices |
| `supabase/functions/create-checkout/index.ts` | Pass rep_code metadata |
| `supabase/functions/payments-webhook/index.ts` | Track rep attribution on purchase |
| `src/pages/AdminDashboard.tsx` | Add rep performance panel |
| Stripe products | Recreate all prices at new amounts |

