## Goal

When a rep scans a lead, generate a **complete, ready-to-run outreach sequence** (every touchpoint with its date, channel, why, subject/opener, talking points, objection handles, and CTA) and automatically save **each touch as its own calendar event** on the rep's calendar — body fully populated, no thinking required.

Today the scan only seeds 4 generic reminders sharing one shared body (recommended channel + best time + the one `first_touch_script`). Touches 2–4 are blank scaffolding. This plan upgrades that to per-touch, fully written playbooks.

## What changes

### 1. Scan AI returns a `touchpoint_plan` (new field on `outreach`)

Extend the `website_diagnostic_report` tool schema in `supabase/functions/scan-website/index.ts` so the AI produces a 5-touch sequence tuned to the prospect's industry, size, timezone, and the leaks the scan just found.

Each touch in the array:

- `step` (1–5)
- `day_offset` (0, 3, 7, 14, 21)
- `channel` (`call` | `email` | `linkedin` | `voicemail` | `text`)
- `why_now` — what makes this touch land at this point in the cadence (e.g. "Day 7 bump: tie back to the broken CTA you flagged on Touch 1")
- `subject_or_opener` — exact subject line (email) or opening line (call/voicemail/LinkedIn)
- `talking_points` — 3–5 bullets tied to **specific leaks from this scan** (e.g. "lead with the $14k/yr SEO leak on /services")
- `objection_handles` — 2 likely pushbacks with one-line responses
- `cta` — the one ask
- `full_script` — ready-to-send body (email draft, voicemail script, or call talk-track)
- `best_send_window_local` — exact send window in prospect local time

The system prompt is updated to require the plan reference real leaks/gaps the scan surfaced (no generic copy).

### 2. `scheduleScanCadence` consumes `touchpoint_plan` instead of hardcoding 4 generic touches

In `supabase/functions/portal-leads/index.ts`:

- If `scan.outreach.touchpoint_plan` exists and has ≥1 item, iterate over it.
- For each touch, create a `rep_calendar_events` row with:
  - `kind` mapped from channel (`call` → `call`, `meeting` if CTA is a meeting, else `follow_up`)
  - `start_at` = anchor (tomorrow at recommended hour) + `day_offset` days, at the touch's own best send hour
  - `end_at` = +30 min
  - `title` = `Touch {step} · {Channel} — {business_name}`
  - `body` = a clean, fully assembled brief with sections: WHY NOW, SUBJECT/OPENER, TALKING POINTS (bulleted), OBJECTION HANDLES, CTA, FULL SCRIPT, BEST WINDOW, LEAKS REFERENCED
- Fallback (if AI didn't return a plan, e.g. older cached scans or AI gateway hiccup): keep the existing 4-touch generic seeder so reps never end up with an empty calendar.
- Keep the existing dedupe: delete prior `created_by='system'` events for this `lead_id`+`rep_code` before inserting fresh ones, so re-scan re-seeds cleanly.

### 3. Calendar UI surfaces the talking points in-place

`RepCalendarView` (and the admin view) already render `body`. No structural change needed — the new body is plain-text formatted with clear section headers (`WHY NOW`, `TALKING POINTS`, `FULL SCRIPT`, etc.) so it reads well in the existing event detail panel.

### 4. Toast confirmation gets sharper

After a fresh scan: `"Scan complete — 5 fully-written touchpoints added to your calendar."` (uses the count actually inserted, falls back gracefully).

## Technical notes

- No DB migration needed — `rep_calendar_events` already has `title`, `body`, `kind`, `start_at`, `lead_id`, `created_by='system'`.
- No new edge function — changes are confined to `scan-website` (schema + prompt) and `portal-leads` (cadence builder).
- The plan is generated inside the existing single AI call in `scan-website`, so there's **no extra latency or extra API cost** per scan.
- Re-scanning a lead replaces the auto-events (same dedupe as today). Rep-edited or admin-added events on the same lead are untouched (different `created_by`).
- Body uses plain text with line breaks — no markdown rendering dependency. Stays under ~3KB per event.

## Out of scope (call out if you want them next)

- Push notifications / email reminders at touch time (today the calendar just shows them).
- Auto-sending the drafted email/LinkedIn touches — this plan only **drafts** them onto the calendar; the rep still hits send.
- Backfilling old already-scanned leads — only newly-scanned (or force-rescanned) leads get the full plan.