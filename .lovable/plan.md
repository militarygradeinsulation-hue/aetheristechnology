## Goal

For every prospect in the drip campaign, scrape their company website, run a Friction Scan on it, store the result on the prospect, and weave the actual findings into the outreach emails they receive.

## How it works today

- `generate-drip-batch` pulls `imported` prospects, AI-writes follow-ups (emails 2..N), and inserts them into `drip_emails`. Email 1 is a fixed "Saw this and thought of you" template.
- `generate-friction-audit` already exists: scrapes a URL with Firecrawl + runs a Lovable AI analysis returning `frictionScore`, `flaggedPhrases`, `topPriorityFixes`, `strongerCTAs`, etc. Currently used only by the public `/friction-audit` page.
- `drip_prospects` already has `website_url` and a `scraped_data` jsonb field for storing extra data.

## Changes

### 1. New shared scan step in `generate-drip-batch`

For each prospect being processed:
1. If `website_url` is missing, derive it from the email domain (skip free providers like gmail/yahoo/outlook → mark `audit_status: 'skipped'`).
2. Call the existing friction-audit logic (extracted into a small helper) against `website_url`.
3. Store the full result on `drip_prospects.scraped_data.friction_audit` plus a top-level `audit_status` (`done` / `failed` / `skipped`) and `audit_score`.
4. Run scans with the same `chunkSize` concurrency cap already used (5 in flight) to respect Firecrawl/AI limits, with try/catch so a single failed scan doesn't kill the prospect — they just get a generic email path.

### 2. Pass audit findings into the email writer

Extend `generateFollowUpEmails` so the AI prompt receives a compact **Forensic Findings** block when an audit succeeded:

- Friction score + 1-line overall assessment
- Top 3 flagged phrases (exact text + issue + replacement)
- Top 2 priority fixes
- 1 stronger CTA suggestion

New hard rule added to the prompt: **at least one follow-up email must reference a specific finding from their site verbatim** (so it reads like an autopsy, not a template). Keeps the existing tone, length, and "no dashes / no calls" rules.

### 3. Email 1 stays untouched

The "Saw this and thought of you" opener remains verbatim — it's the soft pattern interrupt. Findings only appear from email 2 onward, where personalization is expected.

### 4. Optional: full mini-report link

Add a new `/leak-report/:prospectId` public page that renders the stored audit (score, flagged phrases, fixes) using the existing `FrictionVocabularyAudit` styling. Email 3 (the resource-offer step) links to it as "I ran a quick forensic pass on [business] — here's what I found: <link>". This gives them a real artifact without requiring them to fill out a form.

## Technical notes

- `generate-friction-audit/index.ts` logic is duplicated as an internal helper inside `generate-drip-batch` (functions can't import from each other). Truncates site content to 12k chars, uses `google/gemini-2.5-flash`.
- Add columns? No schema change needed — everything fits in `scraped_data` jsonb. We only add a public RLS read policy if we build the `/leak-report/:id` page (select by id, only when `audit_status='done'`).
- Concurrency: Firecrawl scrape + Gemini call adds ~5–10s per prospect. With 5-wide concurrency a 10-prospect wave runs in ~20s, well under edge function limits.
- Failure mode: if scan fails, prospect still gets emails but without findings (writer falls back to current generic prompt).

## Open question

Do you want option **#4 (the public `/leak-report/:id` page linked in email 3)**, or just bake the findings into the email body and skip the standalone report page?

