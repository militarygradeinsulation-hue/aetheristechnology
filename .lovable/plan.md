

# Add Monthly Subscription Options to Solution Store

## Concept

Every service that currently has a one-time "Buy" button will also get a monthly subscription option at a discounted rate. This gives you recurring revenue and gives customers ongoing access to refreshed content/data each month.

## Pricing Structure

Each service gets a monthly price at roughly 60-70% of the one-time cost (so the subscription pays for itself after ~2 months, incentivizing commitment):

| Service | One-Time | Monthly Sub |
|---------|----------|-------------|
| Full Website Report | $49 | $29/mo |
| Digital Snapshot | $125 | $79/mo |
| Strategy Blueprint | $299 | $199/mo |
| Social Content Pack | $29 | $19/mo |
| Sales Script Pack | $49 | $29/mo |
| Content Calendar | $29 | $19/mo |
| Follow-Up Plan | $49 | $29/mo |
| Website Evaluation | $500 | $349/mo |
| Full Analytics Package | $500 | $349/mo |
| 14-Day Diagnostic | $2,500 | $1,750/mo |
| Strategic Question Engine | $79 | $49/mo |
| Brand Contradiction Finder | $99 | $59/mo |
| Friction Vocabulary Audit | $69 | $39/mo |

Fractional CTO/CMO is already monthly. Visual Rendering and Custom Implementation remain contact-only.

## Implementation Steps

### 1. Create Stripe subscription products (13 new monthly prices)
Use `batch_create_product` to create monthly recurring prices for each service using IDs like `scan_full_report_monthly`, `digital_snapshot_monthly`, etc.

### 2. Update ServicesPricing component
- Add `monthlyPriceId` and `monthlyPricing` fields to `ServiceTile` interface
- Add a toggle on each tile (or a global toggle) to switch between "One-Time" and "Monthly" pricing views
- Show the monthly discount percentage (e.g., "Save 40%/mo")
- The "Buy" button switches to "Subscribe" when monthly is selected

### 3. UI changes
- Add a global "One-Time / Monthly" toggle at the top of the pricing grid
- Monthly prices show with a "per month" label and a small "save X%" badge
- Subscribe button uses the monthly priceId and opens the same Stripe Embedded Checkout (Stripe handles recurring automatically)

## Technical Details

- Monthly prices use `recurring_interval: "month"` in Stripe — the existing `create-checkout` edge function already handles recurring vs one-time mode detection
- The webhook handler already processes `customer.subscription.created/updated/deleted` events
- No database migration needed — the existing `subscriptions` table captures everything
- No new edge functions needed

