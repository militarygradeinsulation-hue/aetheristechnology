---
name: CRM data capture
description: Sales, customers, commissions, activity_log tables + idempotent payments-webhook
type: feature
---
Every Stripe event flows through `payments-webhook` (idempotent via `processed_webhook_events`) and writes to:
- `customers` — upserted by email via `upsert_customer_with_sale` RPC; bumps lifetime_value_cents + total_purchases.
- `sales` — one row per checkout/invoice/refund; unique on session_id and invoice_id.
- `commissions` — 70/15/15 split (company / rep / partner). Partner override skipped if rep IS the partner.
- `activity_log` — global timeline of every meaningful event.

Admin dashboard "💵 Sales & Customers" tab (SalesCrmPanel) shows all four with env filter (sandbox/live/all), search, CSV export, and mark-paid action via `admin-data` action `mark_commission_paid`.
