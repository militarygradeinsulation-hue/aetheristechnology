

The user wants the admin Activity Log to show their full email outreach campaign — sends, timing, who's interested, and next steps. Let me check the current admin activity log and what email data is available.
<lov-tool-use id="toolu_vrtx_014GEaF6mUpP3FrbT3NHjqPo" name="code--search_files" integration-id="code" data="{\"query\": \"activity|Activity Log\", \"include_patterns\": \"src/pages/AdminDashboard.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01AdzaTB2sbekELDL6Masqxz" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/AdminDashboard.tsx\", \"lines\": \"1-100\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01XfvtPBPmW7bQJurhU6mTMT" name="code--search_files" integration-id="code" data="{\"query\": \"Activity|activity\", \"include_patterns\": \"src/pages/AdminDashboard.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GNx2bQwKVR2p5j7UG2rrgN" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/AdminDashboard.tsx\", \"lines\": \"1-120\"}">
</lov-tool-use>
I have enough context. Let me check the drip system briefly to understand campaign structure.
<lov-tool-use id="toolu_vrtx_01NsAjoGiyrg2gafa5KRyjKb" name="code--exec" integration-id="code" data="{\"command\": \"psql -c \\\"SELECT count(*) as drip_emails FROM drip_emails; SELECT count(*) as prospects FROM drip_prospects; SELECT count(*) as send_log FROM email_send_log;\\\" 2>&1 | head -30\", \"user_facing_description\": \"Checking campaign data volume\"}">
</lov-tool-use>
Good — there's a real campaign: 17,702 prospects and 636 drip emails scheduled/sent. The current Activity Log only shows `site_events`. The user wants a full campaign view.

<lov-plan>

## Goal
Replace the current narrow "Activity Log" (only site events) with a full **Campaign Activity** dashboard showing the entire outbound email campaign: prospects, sends, opens/replies, and what's queued next.

## What You'll See

The "Activity Log" tab becomes **"📨 Campaign"** with 4 stacked sections:

**1. Campaign Stats (top cards)**
- Total prospects: 17,702
- Emails sent (last 30d / all time)
- Pending sends (next 24h / next 7d)
- Replies received
- Failed / bounced

**2. Email Send Timeline**
A table of every email sent, newest first:
- Recipient + business name
- Subject line
- Step # in sequence (e.g., "Step 2 of 5")
- Sent at (timestamp)
- Status badge (sent / failed / bounced / replied)
- Filter by date range, status, sequence

**3. Hot Prospects (Interested)**
Prospects who replied OR clicked the LinkedIn/website tracking link OR submitted a contact form after receiving a drip:
- Name, business, email, location
- Last action (replied / clicked / form submit)
- Which sequence step triggered it
- Quick "Mark contacted" / "Convert" buttons

**4. Next Steps Queue**
Upcoming scheduled emails grouped by day:
- Today: 12 sends queued
- Tomorrow: 18 sends
- This week: 84 sends
- Expandable list per day showing recipient, subject, scheduled time

Plus a separate "Site Activity" sub-tab keeps the existing site_events log (page views, button clicks) so nothing is lost.

## Data Sources (already exist)
- `drip_prospects` (17,702 rows) — leads + status
- `drip_emails` (636 rows) — scheduled/sent emails with `status`, `scheduled_for`, `sent_at`, `step_index`
- `drip_sequences` — sequence names + steps
- `email_send_log` — transactional email delivery status
- `contact_submissions` — replies/form fills (cross-reference by email)

## Files Changed
- **Edit:** `src/pages/AdminDashboard.tsx` — fetch drip data, restructure the "events" tab into 4 sections + sub-tabs (Campaign / Site Activity)
- **New:** `src/components/CampaignActivity.tsx` — the 4-section campaign view (stats, send timeline, hot prospects, queue)

No DB changes, no new edge functions — all data is already there.

