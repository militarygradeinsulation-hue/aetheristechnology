---
name: Smart Subscription System
description: Monthly subscriptions trigger AI-powered personalized deliveries via invoice.paid webhook
type: feature
---
- Monthly subscriptions use `*_monthly` price IDs that map to delivery types in `monthly-delivery` edge function
- `subscriber_profiles` stores business context per subscription for AI personalization
- `subscription_deliveries` archives each month's AI-generated output
- `subscriber_feedback` captures thumbs up/down ratings to teach the AI
- Webhook flow: Stripe invoice.paid → payments-webhook → monthly-delivery edge function → AI generation → email notification
- Onboarding: `/subscriber-onboarding?subscription_id=X` captures business profile after subscription checkout
- Portal: `/my-subscription` shows deliveries, feedback, and profile editing
- AI model: google/gemini-2.5-flash for cost efficiency
- After 3+ months, AI includes a "Business Intelligence Brief" section
