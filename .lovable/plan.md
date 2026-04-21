

# Site Self-Sufficiency Audit

## Current State: What IS Automated (works without you)

| Flow | Status | How it works |
|------|--------|-------------|
| Free tools (Scanner, Diagnostic, Strategic Questions, Brand Contradictions, Friction Audit, Social Content, Sales Scripts, Content Calendar, Follow-Up Plan) | COMPLETE | AI generates results client-side or via edge functions instantly |
| Monthly subscriptions | COMPLETE | Stripe invoice.paid webhook triggers `monthly-delivery` edge function, which generates AI content and delivers automatically |
| Subscriber onboarding | COMPLETE | Post-subscription checkout redirects to onboarding form that captures business context |
| Custom playbook purchases | COMPLETE | Webhook triggers `generate-custom-playbook` edge function, PDF generated and stored automatically |
| Blog / Playbook content | COMPLETE | Auto-generated via admin tools, published to public pages |
| Auth (signup, login, Google OAuth) | COMPLETE | Standard flow with email verification |

## The Gap: What Is NOT Automated

**Most one-time paid services fall through to a dead end.** When someone buys any of these, the checkout return page shows:

> "Payment Complete! We'll be in touch within 24 hours."

That means **you have to manually follow up** for these purchases:

| Service | Price | What should happen | What actually happens |
|---------|-------|-------------------|----------------------|
| Full Website Report | $49 | Auto-generate full scan PDF | Generic "we'll be in touch" |
| Digital Snapshot | $125 | Auto-generate snapshot PDF | Generic "we'll be in touch" |
| Strategy Blueprint | $299 | Auto-generate blueprint | Generic "we'll be in touch" |
| Social Content Pack | $29 | Auto-generate 25 posts | Generic "we'll be in touch" |
| Sales Script Pack | $49 | Auto-generate scripts | Generic "we'll be in touch" |
| Content Calendar | $29 | Auto-generate calendar | Generic "we'll be in touch" |
| Follow-Up Plan | $49 | Auto-generate cadence | Generic "we'll be in touch" |
| Strategic Question Engine | $79 | Auto-generate questions | Generic "we'll be in touch" |
| Brand Contradiction Finder | $99 | Auto-generate audit | Generic "we'll be in touch" |
| Friction Vocabulary Audit | $69 | Auto-generate audit | Generic "we'll be in touch" |
| Website Evaluation | $500 | Includes a strategy call | Needs manual intervention (by design) |
| Strategic Discovery Audit | $500 | Multi-system audit | Needs manual intervention (by design) |
| 14-Day Diagnostic | $2,500 | Operator-led engagement | Needs manual intervention (by design) |
| Fractional CTO/CMO | $5,000/mo | Ongoing human engagement | Needs manual intervention (by design) |

**The irony**: The free tools already generate the same content (social posts, scripts, calendars, questions, contradictions, friction audits) for free. Paying customers get LESS than free users -- they get a "we'll be in touch" message instead of instant results.

## Also: Bundle checkout is not automated

The "Mix & Match Bundle" bar links to `/contact?bundle=...` -- it sends the user to a contact form instead of Stripe checkout. No automated payment or delivery.

## Recommended Fix

### Services that CAN be fully automated (the AI already exists)

For these 10 services, the free tool versions already generate the output. The fix is:

1. **In the webhook** (`payments-webhook`): detect each `priceId`, trigger the corresponding AI generation edge function, store the result, and email the customer a download link.
2. **On the checkout return page**: poll for the generated result (like the playbook flow already does) and show a download button when ready.
3. **Bundle checkout**: Route bundles through Stripe checkout (not the contact form) using a combined line-item session, then auto-generate all items.

### Services that SHOULD stay manual

Website Evaluation ($500), Strategic Discovery Audit ($500), 14-Day Diagnostic ($2,500), Fractional CTO/CMO ($5,000/mo), Visual Rendering, and Custom Implementation all involve human operator work. These are correct as-is -- payment triggers a notification to you.

### Implementation plan

**Step 1 -- Create a `purchase_deliverables` table** to track what was purchased and its generation status (pending/generating/ready/failed) with a `file_url` column.

**Step 2 -- Update `payments-webhook`**: On `checkout.session.completed` for automatable price IDs, insert a row into `purchase_deliverables` and invoke the corresponding generation edge function.

**Step 3 -- Create a `generate-purchase-delivery` edge function** that takes a deliverable ID, runs the appropriate AI tool (reusing existing generation logic), stores output as PDF/JSON in the `playbooks` storage bucket, updates the row with `file_url`, and sends a delivery email.

**Step 4 -- Update `CheckoutReturn.tsx`**: For automatable purchases, poll `purchase_deliverables` for status and show a download button when ready (same pattern as the playbook flow).

**Step 5 -- Fix bundle checkout**: Replace the contact form link with a Stripe checkout session that includes all selected line items, then auto-generate all deliverables post-payment.

**Step 6 -- Add email delivery**: Send the customer an email with download links so they don't have to stay on the return page.

### Files to modify/create

| File | Change |
|------|--------|
| New migration | Create `purchase_deliverables` table |
| `supabase/functions/payments-webhook/index.ts` | Add auto-delivery triggers for 10 price IDs |
| New: `supabase/functions/generate-purchase-delivery/index.ts` | Unified delivery generator |
| `src/pages/CheckoutReturn.tsx` | Add polling + download for deliverable purchases |
| `src/components/ServicesPricing.tsx` | Fix bundle bar to use Stripe checkout instead of contact form |

This is a significant build. Shall I proceed?

