## Goal
Notify you (Joseph) whenever someone opens or interacts with a Golden Report, filtering out reps/internal users as best we can.

## Tracked events
All four signals you selected, logged to one table `golden_report_events`:
1. **`scan_completed`** — a new Golden Report was generated (from `forensic-scan-all`).
2. **`page_view`** — someone loads `/golden-report?scan=…` or `/report/:scanId/ask` (fired from `GoldenReportPage` + `ForensicReportAskPage` on mount).
3. **`email_open`** — 1×1 tracking pixel `GET /functions/v1/golden-report-track?scan=…&evt=open&t=…` injected into drip email HTML (`generate-drip-batch`).
4. **`link_click`** — email report link goes through `…/golden-report-track?scan=…&evt=click&t=…` which 302-redirects to the real report URL.
5. **`pdf_download`** — fired when the "Download PDF" button in `ForensicScanAllPanel` is clicked.

Each row stores: `scan_id`, `company_name`, `event_type`, `recipient_email` (if known from scan/drip), `ip`, `country/region/city` (from Cloudflare `cf-ipcountry` / IP geo), `user_agent`, `referrer`, `is_internal` (bool), `rep_code` (if identified), `created_at`.

## Rep / internal filter (best-effort)
`is_internal = true` when any of:
- Request carries a valid rep code cookie/param, OR
- `recipient_email` matches a row in `rep_codes.rep_email` / `rep_mailboxes.address` / admin emails, OR
- IP is in a small `internal_ips` allowlist stored in `admin_kv` (you can add your home/office IP), OR
- User-Agent matches a known scanner bot list.
All notifications and the admin feed **exclude `is_internal = true` by default**, with a toggle to show them.

## Notification delivery (all three)
- **Email to you** — `send-transactional-email` with new `golden-report-opened` template. Rate-limited: max 1 email per (scan_id, event_type) per hour; a nightly digest rolls up anything suppressed.
- **Admin dashboard feed** — new `AdminGoldenOpensPanel.tsx` in `/admin` showing a live list (company, event, when, city/country, open count, recipient, rep-filter toggle) with 15s polling + Realtime subscription.
- **Browser push** — while `/admin` is open, use the browser Notifications API to pop a toast when a new external open arrives via the Supabase Realtime channel on `golden_report_events`.

## Backend pieces
- Migration: `golden_report_events` table (+ GRANTs, RLS admin-only, Realtime publication add), plus `internal_ips` seed in `admin_kv`.
- New edge function `golden-report-track` (public, `verify_jwt = false`) — accepts `evt=open` (returns 1×1 gif), `evt=click` (302), `evt=view`, `evt=download`; writes the event row, does rep/internal detection, invokes email notifier when non-internal.
- `forensic-scan-all` — emit `scan_completed` event on success.
- `generate-drip-batch` — wrap report link with tracker and inject open-pixel.

## Frontend pieces
- `GoldenReportPage` + `ForensicReportAskPage`: `useEffect` beacon → `golden-report-track?evt=view`.
- `ForensicScanAllPanel` PDF button: beacon → `evt=download`.
- New `src/components/admin/AdminGoldenOpensPanel.tsx` mounted in `AdminDashboard`.

## Out of scope
- Deanonymizing anonymous email opens beyond IP geo (Gmail image proxy will show as US-based Google IPs — labeled clearly in the UI).
- Deep bot-open filtering beyond a UA blocklist.

## Technical notes
- Tracking pixel returns cached 1×1 gif with `Cache-Control: no-store` so Gmail proxy re-fetches per open.
- Event dedupe key: `hash(scan_id + evt + ip + ua + 10-min bucket)` to prevent double-count from prefetchers, but `open_count` on the UI shows raw count too.
- Email notifications go through the existing app-email queue; template `golden-report-opened` shows company, event, location, total opens so far, and a deep link to the admin panel.
