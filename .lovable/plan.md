## Goal
When a prospect books on your HubSpot meetings link, that meeting shows up automatically in the admin area (with name, email, time, link, source rep if known).

## Approach
HubSpot exposes meetings as engagements (`/crm/v3/objects/meetings`). The cleanest, no-extra-setup path is **scheduled polling** using the existing HubSpot OAuth token — no developer app or webhook subscription required. (We can layer a webhook later if you want sub-minute latency.)

## What gets built

### 1. New table `hubspot_meetings`
Stores synced meeting records.
- `id` (uuid, pk)
- `hubspot_id` (text, unique) — meeting object id
- `title`, `meeting_link`, `location`, `outcome`, `internal_notes`
- `start_time`, `end_time` (timestamptz)
- `organizer_email`, `organizer_owner_id`
- `attendee_email`, `attendee_name`, `attendee_company`, `attendee_phone`
- `contact_hubspot_id`, `deal_hubspot_id` (when associated)
- `rep_code` (text, nullable) — matched via `customers.rep_code` lookup on attendee email
- `source` (text) — `hubspot_meeting_link`
- `raw` (jsonb) — full HubSpot payload
- `created_at`, `updated_at`, `synced_at`
- RLS: admin-only (`is_admin(auth.uid())`)

### 2. Edge function `hubspot-meetings-sync`
- Reads HubSpot OAuth token from existing `hubspot_connections` (same helper as `hubspot-sync`)
- Pulls `/crm/v3/objects/meetings/search` filtered by `hs_lastmodifieddate > last_synced_at` (incremental)
- Requests properties: `hs_meeting_title`, `hs_meeting_start_time`, `hs_meeting_end_time`, `hs_meeting_location`, `hs_meeting_external_url`, `hs_meeting_outcome`, `hs_meeting_body`, `hubspot_owner_id`, `hs_createdate`
- Includes associations to contacts → fetches contact email/name/company/phone in batch
- Filters to meetings that came through a meetings **link** (via `hs_activity_type` / `hs_meeting_source` = scheduling page) so manual log entries are skipped
- Upserts into `hubspot_meetings` on `hubspot_id`
- Matches `rep_code` by joining attendee email against `customers` table
- Pushes a `shared_notifications` row to admin so the bell pings
- Stores `last_synced_at` watermark in `app_settings` (or a small dedicated row)

### 3. Cron schedule
`pg_cron` / Supabase scheduled trigger every **5 minutes** invoking `hubspot-meetings-sync`. Manual "Sync Now" button available in the panel.

### 4. Admin panel `HubSpotMeetingsPanel`
New tool registered in `ADMIN_TOOLS` as **"Meetings (HubSpot)"**.
- Tabs: **Upcoming**, **Today**, **Past**, **All**
- Each row: time (local TZ), attendee name + company, email (mailto via existing rep mail wiring), HubSpot meeting link, source rep badge, outcome
- Actions: Open in HubSpot, Email attendee, Copy meeting link, Mark as no-show (writes back outcome via HubSpot API)
- "Sync now" button, last-synced timestamp, count badge for today's meetings

### 5. Light dashboard widget (optional, included)
Small "Today's Meetings" card on the main admin dashboard with the next 3 upcoming.

## Out of scope
- Real-time webhook (can add later — requires HubSpot developer app + signed webhook handler)
- Two-way sync of edits made in admin back to HubSpot beyond `outcome` updates
- Calendar invites / Google Calendar mirror

## Acceptance test
1. Book a meeting using your HubSpot meetings link as a fake prospect.
2. Within 5 minutes (or instantly via "Sync now"), it appears under **Admin → Meetings (HubSpot)** with attendee details, time, and a clickable HubSpot link.
3. If the booking email matches a known customer/rep, the rep badge shows up.
