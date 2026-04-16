

# Fix Purchase Flow: Critical Bugs & Missing Functionality

## Issues Found

### Critical (purchases won't work correctly)

1. **Subscriptions never linked to users** — `ServicesPricing` opens checkout without passing `user_id` or `customerEmail`. The webhook tries to read `subscription.metadata.userId` but it's never set. Result: subscriptions table gets rows with `user_id = null`, portal page shows nothing.

2. **Onboarding page gets wrong ID** — `CheckoutReturn` passes `session_id={CHECKOUT_SESSION_ID}` (Stripe checkout session ID) as `subscription_id` to the onboarding page, but `subscriber_profiles.subscription_id` should reference the `subscriptions.id` UUID. These are completely different values.

3. **DELIVERY_MAP key mismatches** — 4 price IDs don't match between `ServicesPricing` and `monthly-delivery/index.ts`:
   - `full_analytics_package_monthly` → map has `full_analytics_monthly`
   - `strategic_question_engine_monthly` → map has `strategic_questions_monthly`  
   - `brand_contradiction_finder_monthly` → map has `brand_contradictions_monthly`
   - `friction_vocabulary_audit_monthly` → map has `friction_audit_monthly`
   
   These subscriptions would silently fail to generate monthly deliveries.

### Important (degraded experience)

4. **No monthly-delivery email template** — The delivery function enqueues a "monthly-delivery" template that doesn't exist in the template registry. Email notifications will fail silently.

5. **Bundle bar has no checkout** — "Get Bundle" just links to the contact page. There's no way to actually purchase a bundle — it should either create a multi-line-item checkout or at minimum make this clear to users.

6. **Monthly toggle doesn't affect bundle bar** — When in monthly mode, the bundle bar still shows one-time prices and totals.

## Implementation Plan

### Step 1: Pass user context to checkout
Update `ServicesPricing.tsx` to get the current user from `useAuth()` and pass `customerEmail` and `metadata: { userId }` to `StripeEmbeddedCheckout`. Update `create-checkout` to pass metadata to `subscription_data` for recurring sessions.

### Step 2: Fix subscription webhook to capture user_id
Update `handleSubscriptionCreated` and `handleCheckoutCompleted` in `payments-webhook` to:
- Extract `userId` from `subscription.metadata` (set via checkout)
- Fall back to looking up user by `customer_email` in `profiles` table

### Step 3: Fix onboarding flow
Update `CheckoutReturn` subscription path to look up the actual `subscriptions.id` from the database using the Stripe session/subscription ID, then pass that to the onboarding page.

### Step 4: Fix DELIVERY_MAP keys
Correct all 4 mismatched keys in `monthly-delivery/index.ts` to match the actual price IDs from Stripe.

### Step 5: Add monthly-delivery email template
Create the template in the transactional email template registry so delivery notifications actually send.

### Step 6: Fix bundle bar for monthly mode
When billing mode is "monthly", show monthly prices in the bundle bar and use monthly price IDs.

## Files to modify
- `src/components/ServicesPricing.tsx` — add auth context, pass user data to checkout, fix bundle bar
- `src/components/StripeEmbeddedCheckout.tsx` — already accepts metadata (no change needed)
- `supabase/functions/create-checkout/index.ts` — already handles metadata (no change needed)
- `supabase/functions/payments-webhook/index.ts` — improve user_id extraction
- `supabase/functions/monthly-delivery/index.ts` — fix 4 DELIVERY_MAP keys
- `src/pages/CheckoutReturn.tsx` — fix subscription_id lookup for onboarding
- `supabase/functions/_shared/transactional-email-templates/` — add monthly-delivery template + register it

