# Full-Site Audit & CRM Hardening Plan

Goal: every button/flow works, every sale and purchase is captured to the backend like a real CRM, and admin has complete visibility.

## 1. Audit Pass (read-only sweep)

Walk every surface and log defects to fix in step 2:

- **Public site**: `/`, `/leak-audit`, blog, playbooks, contact, scanner, diagnostic — verify routes, CTAs, forms submit, edge functions return 2xx.
- **Stripe / Checkout**: products + prices in sandbox, `create-checkout` returns `clientSecret`, embedded checkout mounts, return URL works, `payments-webhook` (sandbox + live) verifies signature, writes to DB, fires commission split (70/15/15 with Brandon at 15%).
- **Admin Dashboard** tabs: Analytics, Leads, Reps, Partners, Trainings, Calendars, Daily Hustle, Workspace preview, Subscriptions, Sales — confirm each loads with `x-admin-token`.
- **Rep/Partner Portal** tabs: Dashboard, Leads, Calendar, Daily Hustle, Trainings, Workspace, AI Coach, Time Clock — confirm `x-portal-token` flows.
- **Edge functions**: list every function, hit each via curl, scan logs for errors over last 24h.
- **DB schema**: confirm tables exist for `sales`, `purchases`, `commissions`, `leads`, `customers`, `subscriptions`, `rep_codes`, `payouts`, `activity_log`.

## 2. CRM Data Capture (the core ask)

Make the backend behave like a real CRM. Add/verify:

- **`customers` table** — created on every checkout (email, name, phone, stripe_customer_id, source, rep_code, partner_code, first_seen, last_seen).
- **`sales` table** — one row per `checkout.session.completed` and per `invoice.paid` (amount, currency, product, price_id, customer_id, rep_code, partner_code, environment, stripe_session_id, stripe_invoice_id, status, created_at).
- **`commissions` table** — one row per sale per recipient (company 70 / rep 15 / partner 15), status pending → paid, payout_id.
- **`activity_log` table** — every meaningful event (lead captured, scan run, diagnostic completed, checkout started, checkout completed, subscription renewed, refund, training assigned, calendar event, etc.) with actor, entity, metadata.
- **Webhook expansion** in `payments-webhook`: handle `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `customer.subscription.created/updated/deleted`. Each writes to `sales` + `commissions` + `activity_log` and updates `rep_codes.total_sales_cents`.
- **Lead → Customer linking**: when a lead converts (checkout email matches lead email), stamp `customer_id` on the lead and log conversion event.

## 3. Admin CRM Views

- **Sales tab**: live feed of every sale with rep/partner, amount, product, environment toggle (sandbox/live), CSV export.
- **Customers tab**: searchable customer list with lifetime value, sales history, linked leads, linked rep.
- **Commissions tab**: per-rep + per-partner ledger, pending vs paid, mark-as-paid action, monthly statement export.
- **Activity feed**: global timeline filtered by rep, customer, or event type.

## 4. Fix Pass

For every defect found in step 1, apply fixes in priority order: payment capture → admin visibility → portal UX → public site polish. Re-test each after fix.

## 5. Verification

- Run a sandbox checkout end-to-end with a rep code → verify row appears in `sales`, 3 rows in `commissions`, `rep_codes.total_sales_cents` increments, activity logged, admin Sales tab shows it.
- Run a subscription renewal simulation → verify recurring commission row created.
- Run a refund → verify reversal row + status update.
- Run linter + security scan, fix criticals.

## Technical notes

- All new tables get RLS: admins via `is_admin()`, reps via `rep_code` match through portal token claims, service role for webhook writes.
- Webhook is idempotent via `onConflict: stripe_event_id` on a new `processed_webhook_events` table — Stripe retries won't double-book commissions.
- `price_id` (human-readable, via `lovable_external_id`) is the join key for tier mapping, never the internal `prod_xxx`.
- Sandbox vs live stays separated by `environment` column on every payment table.

## Deliverable

A defect log of what was broken, the fixes applied, and a confirmation that a test sale flows cleanly from checkout → webhook → sales/commissions/activity → admin dashboard.