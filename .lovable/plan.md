

## What I found

You have **174 failed drip emails** sent through the Outlook connector (separate from the Lovable email system, which is healthy — 0 failures there). Pattern:

- **All failures are concentrated in 3 batches**: Apr 16 (75), Apr 17 (24), Apr 19 (75) at the same hour
- **93% of failures are free/personal email domains** (gmail/yahoo/hotmail/att/icloud/etc.) — 161 of 174
- **Step 1 follow-ups dominate the most recent failure batch** (75 of today's 75 are step_index=1)
- **Prospect status is still "active"** for all of them — they were not bounced/unsubscribed; the send itself was rejected by the Outlook Graph API
- **No error_message was stored** — the current `process-drip` function only logs to console, it doesn't persist the Outlook error body, so we can't see exact rejection reasons retroactively

Most likely root cause given the pattern (large batch of personal-domain recipients failing at the same minute): **Outlook/Graph throttling or recipient-rejection in bulk** — Microsoft is increasingly aggressive about flagging outbound mail to free webmail providers as suspicious, especially when sent in tight bursts.

## What I'll do (READ-ONLY tasks → require default mode)

### 1. Generate the failed-contacts report (CSV)
Export all 174 failed contacts to `/mnt/documents/failed-drip-contacts.csv` with columns:
`email, business_name, subject, step_index, scheduled_for, batch_date, email_provider_type (free/business)`

Plus a second sheet/section: summary by batch hour and by email provider.

### 2. Add error capture to `process-drip` so this never happens blind again
Update `supabase/functions/process-drip/index.ts` to:
- Persist the actual Outlook error body + status code to a new `error_message` column on `drip_emails`
- Auto-mark prospect as `bounced` when Outlook returns a hard rejection (4xx with recipient-rejected indicators)
- Add a tiny retry counter so a transient 429/5xx doesn't immediately mark the email failed

### 3. One-time DB migration
- Add `error_message TEXT` and `attempt_count INT DEFAULT 0` columns to `drip_emails`
- Add a "Requeue failed" admin action: SQL helper to flip `status='failed'` rows back to `pending` with a fresh `scheduled_for` (you trigger it from the admin UI when you want to retry a cleaned list)

### 4. Surface in admin UI
Add a "Failed Sends" tab in `CampaignControlCenter.tsx` showing:
- Count + breakdown by reason once errors are captured
- Download CSV button
- Bulk "Mark as bounced" / "Requeue" actions

## What I will NOT do
- Won't auto-resend the 174 failures right now — they're mostly free-mail addresses that just failed in a burst, and immediately retrying would make Microsoft throttle harder
- Won't change the 2-second send delay (that's already conservative)
- Won't change daily_limit (100/day is fine)

## Files touched
- New: `/mnt/documents/failed-drip-contacts.csv` (the report you asked for)
- `supabase/functions/process-drip/index.ts` — error capture + retry counter + auto-bounce
- New migration: add `error_message`, `attempt_count` columns
- `src/components/admin/CampaignControlCenter.tsx` — Failed Sends tab + CSV download + requeue

## Recommendation after the report
Once you see the CSV, the highest-leverage move is to **filter the prospect list to business domains only** — your business-domain success rate is dramatically higher (14 sent / 13 failed = ~52%) vs personal-domain (55 sent / 161 failed = ~25%). Microsoft Graph is the wrong tool for cold-emailing free webmail at scale.

