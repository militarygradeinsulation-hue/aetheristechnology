

# Tune Outlook Drip for 100 Emails/Day

## Current State
- Cron runs every 4 hours (6 runs/day)
- Batch limit: 30 per run
- Delay: 2 seconds between sends
- Max capacity: 180/day — already enough

## Changes Needed

### 1. `process-drip/index.ts` — Smart daily cap
Add a daily send counter that checks how many emails were already sent today before processing more. Cap at 100/day.

- Query `drip_emails` where `sent_at >= today midnight` and `status = 'sent'` to get today's count
- Calculate remaining: `100 - already_sent_today`
- Set `.limit()` to `Math.min(remaining, 25)` per run
- If already at 100, return early with "Daily limit reached"
- Keep 2-second delay between sends (safe spacing)

### 2. Migration — Adjust cron to every 2 hours
Change from every 4 hours to every 2 hours for smoother distribution throughout the day:
- `0 */2 * * *` (12 runs/day × ~8-9 emails per run = 100/day spread out naturally)

This distributes sends more evenly, which looks more natural to email providers and reduces throttling risk.

### Files modified
- **`supabase/functions/process-drip/index.ts`** — Add daily cap logic (100/day)
- **New migration** — Update cron schedule to every 2 hours

