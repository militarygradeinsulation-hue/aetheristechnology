
# In-Portal Email Inboxes for Reps

Each rep gets a real working address like `zakiya@aetheris.technology` that they read, write, and reply to **inside the portal** — no Gmail, no Zoho, no per-user license fees. Inbound mail lands in our database via a Cloudflare Email Worker. Outbound mail sends through the existing Lovable Cloud email infrastructure.

---

## What the user will see

### Admin (`/admin` → new "Mailboxes" tab)
- Table of every active rep with: assigned address, status (active/disabled), forwarding target (optional), last activity, message count
- "Generate mailbox" button per rep — auto-suggests `firstname@aetheris.technology`, with conflict handling (`firstname2@…`)
- Bulk "Generate for all reps without a mailbox"
- Edit address, disable mailbox, optional auto-forward to personal email, set canned auto-reply

### Rep (`/portal` → new "Inbox" tab)
- Three-pane layout: folder list (Inbox / Sent / Drafts / Trash), message list, reading pane
- Unread count badge on the tab
- Compose button (To / Cc / Bcc / Subject / Body / signature auto-appended)
- Reply / Reply all / Forward
- Search across own messages
- Edit own signature, optional auto-forward toggle, vacation auto-reply
- Mobile-responsive (stack panes on small viewports)

---

## DNS setup (one-time, you do this)

You'll add these to aetheris.technology's DNS — I'll show you exact values when we implement, but the plan is:

1. **MX records** → Cloudflare Email Routing (free service)
2. **SPF / DKIM** for sending — either reuse the existing `notify.aetheris.technology` setup, or extend sending to the root domain. **Caveat:** if we keep the existing `notify` subdomain as the only verified sender, outgoing replies will appear from `rep@aetheris.technology` but be DKIM-signed by `notify.aetheris.technology`. That works in Gmail/Outlook but isn't ideal. We'll decide together at implementation time.
3. A single **Cloudflare Email Worker** that catches mail to `*@aetheris.technology` and POSTs it (with an HMAC signature) to our `inbound-email-webhook` edge function

---

## Technical section

### New tables (single migration)

- **`rep_mailboxes`** — one row per rep address
  - `code` (FK → rep_codes), `address` (unique, lowercase), `signature`, `forwarding_to` (nullable), `auto_reply_enabled`, `auto_reply_body`, `is_active`, timestamps
  - RLS: service-role only (accessed exclusively via edge functions)

- **`rep_email_messages`**
  - `mailbox_address`, `direction` (`inbound`|`outbound`), `from_address`, `to_addresses` (text[]), `cc_addresses`, `bcc_addresses`, `subject`, `body_text`, `body_html`, `message_id` (RFC 5322), `in_reply_to`, `thread_id` (derived), `folder` (`inbox`|`sent`|`drafts`|`trash`), `is_read`, `is_starred`, `attachments` (jsonb: array of `{name, size, mime, storage_path}`), `raw_mime_path` (for forensic recovery), `created_at`
  - Indexes on `(mailbox_address, folder, created_at desc)` and `thread_id`
  - RLS: service-role only

- **Storage bucket `rep-email-attachments`** (private) — for inbound + outbound attachments

### New edge functions

- **`inbound-email-webhook`** (no JWT, validates `x-inbound-secret` HMAC header from the Cloudflare Worker)
  - Parses MIME (using `https://esm.sh/postal-mime`), extracts headers + parts
  - Looks up matching `rep_mailboxes.address` (case-insensitive); if none, drops or routes to a catch-all admin inbox
  - Stores attachments in storage, inserts message row in `inbox` folder
  - If `forwarding_to` set, also forwards to that address via Lovable Cloud Email
  - Sends auto-reply if enabled and not a loop (check `Auto-Submitted` / `List-Id` headers)
  - Threads by `In-Reply-To` chain or normalized subject

- **`portal-mailbox`** (gated by existing portal HMAC token)
  - Actions: `list_messages` (folder + paging), `get_message`, `send` (composes RFC 5322, queues via existing `send-transactional-email` with `purpose: "transactional"`, stores copy in `sent`), `save_draft`, `mark_read`, `move_to_trash`, `update_settings` (signature / forwarding / auto-reply), `unread_count`
  - Validates rep can only access their own mailbox by joining `rep_mailboxes.code` to the token's code

- **`admin-mailboxes`** (gated by admin token OR partner token)
  - Actions: `list`, `create` (auto-suggest address with conflict handling), `update`, `disable`, `bulk_generate_for_all_reps`, `delete`

### New frontend files

- `src/lib/repMailbox.ts` — typed wrappers around `portal-mailbox`
- `src/lib/adminMailboxes.ts` — typed wrappers around `admin-mailboxes`
- `src/components/portal/InboxTab.tsx` — three-pane inbox (uses `react-resizable-panels` already in shadcn)
- `src/components/portal/InboxComposer.tsx` — compose / reply modal
- `src/components/portal/InboxMessageView.tsx` — reading pane with sanitized HTML
- `src/components/portal/InboxSettings.tsx` — signature / forwarding / auto-reply controls
- `src/components/admin/AdminMailboxesPanel.tsx` — admin management table
- Add "Inbox" tab to `src/pages/PortalPage.tsx` (with unread badge)
- Add "Mailboxes" tab to `src/pages/AdminDashboard.tsx`

### Outbound sending

Reuses the existing Lovable Cloud email queue (`enqueue_email` → `process-email-queue`). The rep's `from` is the rep's mailbox address; `Reply-To` and `Return-Path` are set so replies come back through the inbound webhook. Every outbound message is also written to `rep_email_messages` with `folder='sent'` so it appears in the rep's Sent folder immediately.

### Security guardrails

- Reps can only read/send from their own assigned mailbox (enforced server-side by joining `rep_mailboxes.code` to the portal token's `code`)
- Inbound webhook requires HMAC header — rejected silently otherwise
- HTML bodies sanitized with `dompurify` before rendering
- Attachments served via signed URLs (not public)
- Outbound respects the existing `suppressed_emails` table (no sending to bounced/complained recipients)
- Rate limit per mailbox (e.g. 100 outbound/day) to prevent abuse if a rep code leaks

### What stays out of scope (call-outs)

- No IMAP/POP — reps can't add the address to their phone's Mail app (you chose in-portal only)
- No real-time push beyond a 30-second poll for unread count (can add Supabase Realtime later)
- Calendaring, contacts, labels/folders beyond the four basics — future iterations

---

## Build order

1. Migration: tables + storage bucket + RLS
2. `inbound-email-webhook` edge function + Cloudflare Worker setup instructions
3. `admin-mailboxes` edge function + Admin UI panel — generate addresses for all 13 active reps
4. `portal-mailbox` edge function + Inbox tab in portal
5. Compose / reply / settings UI
6. End-to-end test: send to `bradon@aetheris.technology` from an outside Gmail, see it land in Bradon's portal Inbox, reply from the portal, confirm Gmail receives the reply

