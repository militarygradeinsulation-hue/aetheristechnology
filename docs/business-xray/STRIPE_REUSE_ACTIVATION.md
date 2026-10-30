# Business X-Ray / reuse existing Aetheris Stripe setup

Status: CODE PREPARED; NOT LIVE. Checkout stays disabled unless VITE_XRAY_CHECKOUT_ENABLED=true is explicitly configured AFTER required backend deployment and sandbox payment tests.

## Existing infrastructure discovered
- Front end already has Stripe Embedded Checkout in src/components/StripeEmbeddedCheckout.tsx.
- Server uses create-checkout, payment catalog lookup keys, and the _shared/stripe.ts Lovable Stripe connection gateway.
- payments-webhook verifies signatures and claims Stripe events for idempotency.
- The original Supabase project ref is `ihdjpxhcaiaixmqxyqoe`, in supabase/config.toml. This project is NOT accessible through the current Supabase connector (do not accidentally deploy to the separate project called aetheristechnology).
- The repository deploy-buyer-intent-edge workflow recently failed with missing SUPABASE_ACCESS_TOKEN. GitHub merge does NOT deploy Edge Functions automatically.

## Offers / checkout
- `business_xray_verified_once`: USD 199.00, one-time
- `business_xray_roadmap_once`: USD 599.00, one-time
- The same Stripe account already connected to the website is reused. There is NO second merchant.
- Existing Stripe account must have ACTIVE matching one-time prices with exact lookup keys, USD amounts and active products. The server refuses mismatches and must not create arbitrary products from browser input.
- Checkout is embedded on `/business-xray/checkout`. By default it shows a safe email fallback instead of pretending payments are ready.
- Return screen deliberately shows confirmation processing, NOT payment complete.
- Existing webhook should receive checkout.session.completed and checkout.session.async_payment_succeeded and verify payment status/amount before manual fulfillment.
- The $199 and $599 offers are MANUAL services, not automated report generation and do not grant CRM/Golden Report access.
- Existing commission logic for sales applies to new purchases too; review rep/partner implications before launch.

## Required activation
1. Confirm the connected Lovable Stripe merchant account is the intended business account and has live payout readiness.
2. Create both lookup keys on that same Stripe account with exact one-time USD amounts. Confirm in separate sandbox first.
3. Deploy updated `create-checkout`, `payments-webhook`, and shared files to Supabase project `ihdjpxhcaiaixmqxyqoe`, not `xcjvcmdehyybyhkwnnhs`. Requires the correct owner connection or a valid GitHub Actions `SUPABASE_ACCESS_TOKEN` secret; never commit a key.
4. Confirm both Stripe webhook delivery and webhook signatures in sandbox and live; no UI redirect should fulfill an order.
5. Exercise successful paid session, delayed-method paid event, failed payment and duplicate event cases. Verify the existing `sales` and activity log and human fulfillment queue.
6. Set VITE_XRAY_CHECKOUT_ENABLED=true in the Aetheris website deployment environment and deploy. Test final public UI.
7. Link checkout buttons from free Business X-Ray only after deployment and successful payment verification. No live payment links hard-coded.
8. Review refunds, disputes, customer notifications, consent to share records and any taxes owed with business advisors. No automatic_tax was enabled in code.

## Security work worth doing independently
The existing checkout supports arbitrary catalog lookup keys and accepts client metadata. This patch overrides metadata for X-Ray, but broader payment parameter hardening and event retries remain a separate systemwide review. Existing webhook's duplicate-event claim handling is not a global service entitlement guarantee. Stripe secrets remain server-side only.
