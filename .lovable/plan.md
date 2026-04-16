

# Minimize Credits & Cloud Cost: Batch Pre-Generate All Emails

## The Problem

Current architecture makes **1 AI call per email at send time**. For 100 prospects × 6 steps = **600 AI calls**. Plus hourly cron jobs hitting edge functions 24/7.

## The Solution: Pre-Generate at Intake

When a prospect is added via `scrape-leads`, generate **all 6 emails in a single AI call** and store them directly in `drip_emails`. The `process-drip` function becomes a dumb sender — no AI, just picks up pre-written emails and sends via Outlook.

**Cost reduction:**
- AI calls drop from **6 per prospect** to **1 per prospect** (6x reduction)
- Use `gemini-2.5-flash-lite` instead of `gemini-2.5-flash` (cheapest model, fine for short emails)
- `process-drip` becomes pure send logic — faster execution, lower cloud compute
- Reduce cron from hourly to **every 4 hours** (6x fewer invocations)
- `check-drip-replies` from every 6 hours to **every 12 hours**

## Changes

### 1. `scrape-leads/index.ts` — Generate all emails at intake

After inserting a prospect and finding the active sequence, make **one AI call** that returns all 6 emails as a JSON array. Insert all 6 into `drip_emails` with pre-filled `subject` and `body_html`, status `pending`, and correct `scheduled_for` dates.

Single prompt: "Write all 6 emails for this prospect" → returns `[{subject, body_html}, ...]`

Model: `gemini-2.5-flash-lite` (cheapest available)

### 2. `process-drip/index.ts` — Strip out AI entirely

Remove the AI generation logic. The function just:
1. Queries `drip_emails` where `scheduled_for <= now()` and `status = pending` and `body_html IS NOT NULL`
2. Sends via Outlook Gateway
3. Marks as sent

No AI calls. No model. Just a sender.

### 3. Reduce cron frequency via migration

- `process-drip`: change from `0 * * * *` (hourly) to `0 */4 * * *` (every 4 hours)
- `check-drip-replies`: change from `0 */6 * * *` to `0 */12 * * *` (every 12 hours)

### 4. Files modified

- **`supabase/functions/scrape-leads/index.ts`** — Add batch email generation after prospect insert
- **`supabase/functions/process-drip/index.ts`** — Remove AI, become pure sender
- **New migration** — Update cron schedules

## Cost Summary

| Item | Before | After |
|------|--------|-------|
| AI calls per prospect | 6 (one per send) | 1 (at intake) |
| AI model | gemini-2.5-flash | gemini-2.5-flash-lite |
| process-drip cron | 24/day | 6/day |
| check-replies cron | 4/day | 2/day |
| Edge function compute per send | AI generation + send | Send only |

