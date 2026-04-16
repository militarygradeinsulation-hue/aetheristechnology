

# Automated Lead Scraping & Outlook Drip Campaign System

## What We're Building

A fully automated pipeline that:
1. Scrapes public business emails from targeted websites and web search results
2. Stores prospects with enrichment data
3. Sends a 5+ email nurture sequence from your Outlook account, spaced over time
4. Tracks opens/replies and auto-stops sequences when appropriate

## Architecture

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  scrape-leads    │────▶│  drip_prospects   │────▶│  process-drip    │
│  (Edge Function) │     │  drip_sequences   │     │  (Edge Function) │
│  Firecrawl +     │     │  drip_emails      │     │  Outlook Gateway │
│  AI extraction   │     │  (DB tables)      │     │  (pg_cron daily) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## Database Tables

### `drip_prospects`
Stores scraped leads. Columns: `id`, `email`, `business_name`, `website_url`, `industry`, `location`, `scraped_data` (jsonb — role, phone, context), `source_url`, `status` (new/active/replied/unsubscribed/bounced), `created_at`.

### `drip_sequences`
Defines reusable email sequences. Columns: `id`, `name`, `description`, `steps` (jsonb array — each step has `delay_days`, `subject_template`, `body_prompt`), `is_active`, `created_at`.

### `drip_emails`
Tracks every email in flight. Columns: `id`, `prospect_id` (FK), `sequence_id` (FK), `step_index`, `scheduled_for`, `sent_at`, `status` (pending/sent/failed/skipped), `subject`, `body_html`, `outlook_message_id`, `created_at`.

RLS: All tables service_role only (no public access — this is an internal system).

## Edge Functions

### 1. `scrape-leads` — Lead Discovery Engine
- Accepts: `{ industry, location, urls?: string[], searchQuery?: string }`
- Uses Firecrawl to scrape provided URLs OR search for businesses
- AI (Gemini Flash) extracts: business name, public emails, industry, contact info
- Deduplicates against existing `drip_prospects` by email
- Inserts new prospects and auto-assigns them to the default active sequence

### 2. `process-drip` — Daily Drip Processor (pg_cron)
- Runs daily via pg_cron
- Queries `drip_emails` where `scheduled_for <= now()` and `status = 'pending'`
- For each pending email:
  - Generates personalized email body using AI + prospect's `scraped_data`
  - Sends via Outlook Gateway (`POST /me/sendMail`)
  - Records `outlook_message_id` and marks as sent
  - Schedules the next step in the sequence
- Skips prospects with status `replied`, `unsubscribed`, or `bounced`
- Rate-limits to ~30 emails/hour to avoid Outlook throttling

### 3. `check-drip-replies` — Reply Detection (pg_cron, runs every 6 hours)
- Reads recent Outlook inbox via Gateway (`GET /me/messages?$filter=...`)
- Matches incoming emails against `drip_prospects` by sender address
- If a reply is found: marks prospect as `replied`, cancels remaining scheduled emails
- Logs reply data for your review

## Drip Sequence (Default 6-Email Nurture)

| Step | Delay | Purpose |
|------|-------|---------|
| 1 | Day 0 | Cold intro — personalized based on their website/business |
| 2 | Day 3 | Value drop — relevant insight about their industry |
| 3 | Day 7 | Case study / social proof angle |
| 4 | Day 12 | Pain point agitation — specific to what AI found on their site |
| 5 | Day 18 | Offer / CTA — direct pitch with clear next step |
| 6 | Day 25 | Final touch — breakup email with soft close |

Each email is AI-generated at send time using the prospect's scraped business context + your brand tone (aggressive, blunt, non-corporate).

## Sending via Outlook

All emails sent through the Microsoft Outlook connector gateway:
- `POST https://connector-gateway.lovable.dev/microsoft_outlook/me/sendMail`
- Authenticated with `LOVABLE_API_KEY` + `MICROSOFT_OUTLOOK_API_KEY`
- Emails come from your actual Outlook address
- Reply detection reads from your inbox via `GET /me/messages`

## Scheduling

Two pg_cron jobs:
1. **process-drip**: Runs every hour, sends due emails
2. **check-drip-replies**: Runs every 6 hours, scans inbox for replies

## Files to Create/Modify

- **New DB tables**: `drip_prospects`, `drip_sequences`, `drip_emails` (migration)
- **New**: `supabase/functions/scrape-leads/index.ts`
- **New**: `supabase/functions/process-drip/index.ts`
- **New**: `supabase/functions/check-drip-replies/index.ts`
- **Modify**: `supabase/config.toml` — add function entries
- **Seed**: Insert default 6-step drip sequence into `drip_sequences`

## How to Use

Invoke `scrape-leads` manually (via curl or admin dashboard) with target industries/locations/URLs. The system handles everything else automatically — generating personalized emails, sending them from your Outlook on schedule, detecting replies, and stopping sequences when prospects respond.

