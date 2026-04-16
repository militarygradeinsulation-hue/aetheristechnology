

# Import 18,000 Leads from XLSX into Drip Pipeline

## What We Know
- The spreadsheet has ~18,000 rows with columns: **Client Name**, **Email**, **Phone**
- Target table: `drip_prospects` (email, business_name, industry, location, status)
- Each prospect needs a drip sequence with 6 personalized emails queued in `drip_emails`

## The Problem
18,000 contacts is too many to generate personalized 6-email sequences for all at once. That would be 18,000 AI calls. We need a staged approach.

## Plan

### Step 1 — Parse and bulk-insert prospects
- Copy the xlsx to `/tmp`, read with openpyxl
- Extract Client Name → `business_name`, Email → `email`, Phone → store in `scraped_data` JSON
- Dedup against existing `drip_prospects` by email
- Batch insert into `drip_prospects` with `status = 'imported'` (new status to distinguish from scraped leads)
- Skip rows with empty/invalid emails

### Step 2 — Create a batch email generation edge function
- New function: `generate-drip-batch` that picks N prospects (default 50) with `status = 'imported'` and no drip emails yet
- For each, generates 6 emails using the same prompt style from `scrape-leads`
- Queues them into `drip_emails` with staggered `scheduled_for` dates
- Updates prospect status to `'queued'`
- Can be invoked repeatedly (manually or via cron) to process the backlog in chunks

### Step 3 — Invoke the import
- Run the parsing script to load all 18,000 contacts into `drip_prospects`
- Kick off the first batch of 50 email generations
- The existing `process-drip` cron handles sending at 100/day

### Why This Approach
- **No AI cost explosion**: Generate emails in batches of 50, not all 18,000 at once
- **Daily capacity**: At 100 emails/day, 18,000 contacts × 6 emails = 108,000 emails = ~3 years of sends. We should prioritize and batch intelligently.
- **Controllable**: You can run `generate-drip-batch` whenever you want more emails queued

## Technical Details
- Migration: none needed (reusing existing tables, `status` is already a text field)
- New edge function: `supabase/functions/generate-drip-batch/index.ts`
- Script: Python one-off to parse xlsx and insert via Supabase REST API
- Files modified: 1 new edge function, 1 temp script

