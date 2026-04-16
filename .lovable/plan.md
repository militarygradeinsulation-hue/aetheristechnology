

# Smart Monthly Subscription: Personal AI Consultant System

## What We're Building

Transform each monthly subscription from a static recurring charge into an **adaptive AI consultant** that learns about the subscriber's business over time and automatically delivers personalized content, reports, and recommendations each month -- without your involvement.

## How It Works

```text
Month 1: Subscriber buys "Social Content Pack Monthly"
  → Onboarding questionnaire captures business profile
  → AI generates first month's content tailored to their inputs

Month 2+: System auto-runs before renewal
  → Pulls subscriber's history (past deliveries, feedback)
  → AI analyzes what worked, what didn't
  → Generates next month's package with improvements
  → Emails subscriber their delivery automatically
```

## Architecture

```text
┌─────────────────────────┐
│   subscriber_profiles   │  ← business info, goals, preferences
│   subscriber_feedback   │  ← thumbs up/down on deliveries
│   subscription_deliveries│ ← what was generated each month
└──────────┬──────────────┘
           │
    ┌──────▼──────┐
    │  Edge Func: │
    │  monthly-   │  ← triggered by Stripe invoice.paid webhook
    │  delivery   │     OR a cron-style scheduled function
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Lovable AI │  ← reads profile + past deliveries + feedback
    │  Gateway    │     generates personalized output
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Email via  │  ← sends delivery to subscriber
    │  send-email │
    └─────────────┘
```

## Implementation Steps

### 1. Database Tables (3 new tables via migration)

- **`subscriber_profiles`** -- business name, industry, target audience, tone, goals, website URL, notes. Linked to `subscriptions.id`. Updated by subscriber via a portal page or onboarding form.
- **`subscription_deliveries`** -- each month's generated output (JSON), delivery date, subscription ID, feedback score.
- **`subscriber_feedback`** -- per-delivery thumbs up/down + free-text, used by AI to improve next month.

### 2. Onboarding Flow (new component)

After a monthly subscription checkout completes, redirect to a **Subscriber Onboarding** page:
- Business name, industry, website URL
- Target audience description
- Tone preference (aggressive, professional, casual, etc.)
- Top 3 goals for the subscription
- Any specific instructions

This data goes into `subscriber_profiles` and seeds the AI's first delivery.

### 3. Edge Function: `monthly-delivery` 

Triggered when Stripe fires `invoice.paid` for a recurring subscription:
1. Look up subscriber profile + past deliveries + feedback
2. Build an AI prompt that includes their history and what worked/didn't
3. Call Lovable AI to generate the month's personalized package
4. Store the output in `subscription_deliveries`
5. Email the delivery to the subscriber

The AI prompt includes context like: "Last month you generated 10 LinkedIn posts. The subscriber rated 3 as 'great' and flagged 2 as 'too aggressive.' Adjust tone accordingly."

### 4. Subscriber Portal Page

A `/my-subscription` page where subscribers can:
- View past deliveries and download them
- Rate each delivery (thumbs up/down + notes)
- Update their business profile and preferences
- See what's coming next month

### 5. Webhook Enhancement

Update `payments-webhook/index.ts` to trigger `monthly-delivery` on `invoice.paid` events for recurring subscriptions.

### 6. Self-Teaching Logic

The AI prompt engineering handles the "learning" aspect:
- Each delivery includes a summary of what changed vs. last month and why
- Feedback is weighted: recent feedback matters more
- The system tracks patterns (e.g., "subscriber always edits CTAs to be shorter") and adapts
- After 3+ months, the AI generates a "Business Intelligence Brief" alongside the regular delivery

## Service-Specific Monthly Deliveries

| Subscription | Monthly Auto-Delivery |
|---|---|
| Social Content Pack | 25 new posts tuned to what got engagement last month |
| Content Calendar | 30-day plan adapted to seasonal trends + past performance |
| Sales Script Pack | Refreshed scripts based on industry shifts + feedback |
| Follow-Up Plan | Updated cadence based on what closed deals |
| Strategy Blueprint | Monthly strategic update with new recommendations |
| Full Website Report | Re-scan + delta report showing what improved/degraded |
| Brand Contradiction Finder | Re-audit with progress tracking |
| Friction Vocabulary Audit | Re-scan with improvement tracking |
| Strategic Question Engine | New questions based on business evolution |

## Technical Details

- **No cron needed** -- Stripe's `invoice.paid` webhook is the trigger for each renewal
- **AI model**: `google/gemini-2.5-flash` for cost efficiency on monthly bulk generation
- **Email delivery**: Uses existing `send-transactional-email` infrastructure
- **Auth required**: Subscribers must be logged in to access their portal
- **RLS**: All new tables scoped to authenticated users viewing their own data

