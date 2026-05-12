# Restore 4 regressed rep portal features

Dean's report is accurate — three of these have measurably regressed in the codebase, and inbox attach was never finished on the compose side. Here's what I'll restore.

## 1. Draggable tabs (browser-tab style)

Today `PortalPage.tsx` only supports drag-reorder for the **Widgets** layout (line 597 `draggable={!isPinned}` on widget headers). The **Tabs** layout shows the tab strip with no drag handlers, which is what Dean was using.

Fix:
- Add `draggable`, `onDragStart`, `onDragOver`, `onDrop` to each tab pill in the tab strip.
- Reuse the existing `tabOrder` state + per-rep persistence (already in place for widgets) so order survives reload and is scoped to the rep's code.
- Same behavior in `AdminDashboard.tsx` tab strip so it works in your admin too.

## 2. Sales Coach knows the 21-Day Revenue Diagnostic

`supabase/functions/rep-assistant/index.ts` still says `14-Day Forensic Diagnostic $2,900`. The earlier fix only updated catalog text — the COACH_PROMPT block (lines 14–62) was missed.

Fix the COACH_PROMPT to anchor on:
- **21-Day Revenue Diagnostic — $18,500 one-time** (rep cut $5,000)
- **Implementation Retainer — $15,000/mo, 3-month minimum** (rep cut $4,000/mo)
- **Forensic Diagnostic / Leak Audit — $2,500** entry offer, applied toward upgrade
- Update objection handling, free→paid path, and delivery timeline lines to match.

Also update PARTNER_ADDENDUM with the fixed-dollar split + bonus structure so Brandon's coach is consistent.

## 3. Inbox compose: attach files

`InboxTab.tsx` already renders inbound attachments but the compose dialog has no attach UI. The `rep-email-attachments` storage bucket already exists.

Fix in compose dialog:
- Paperclip button → hidden file input (multi-select).
- Show selected files as removable chips below the body.
- On send: upload each file to `rep-email-attachments/{repCode}/{uuid}-{filename}`, get signed URLs, pass them as `attachments: [{name, url, size, mime}]` into `repMailbox.send`.
- Update `portal-mailbox` send handler to forward attachments to the outbound email payload.
- 10MB per-file, 25MB total cap with toast on overflow.

## 4. Commission panel — restore fixed-dollar split + bonuses

`FlagshipCommissionPanel.tsx` regressed back to the locked **70/15/15** split (line 8). Per project memory and the chat history (msg #2179, #2186), the correct model is:

| Offer | Total | Company | Rep | Partner |
|---|---|---|---|---|
| 21-Day Revenue Diagnostic | $18,000 | $10,000 | **$5,000** | $3,000 |
| Implementation Retainer (per month) | $15,000 | $8,000 | **$4,000** | $3,000 |
| Forensic Diagnostic (Leak Audit) | $2,500 | tiered 50/30/20 | tiered | tiered |

Plus the bonus stack Dean is missing (the "new recruit stuff"):
- **Volume bonus**: +$1,000 / +$2,500 / +$5,000 at 2 / 3 / 5 monthly flagship sales.
- **Retention bonus**: +$1,000 / +$2,500 / +$5,000 at 3 / 6 / 12 month client extension.
- **Referral bonus**: $500 onboard + $7,000 first-close + $500/sale override for 12 months.

Fix:
- Replace the `SPLIT` constant with a `flagshipFixedSplit()` table matching `payments-webhook`.
- Rewrite the three flagship cards to show fixed-dollar amounts, not percentages.
- Add a new **Bonus Stack** section under the cards (volume / retention / referral cards).
- Keep the existing `audience` prop: reps see only their own cut + bonuses they qualify for; partner/admin see the full table.
- Update the "Full-stack close" math at the bottom: Diagnostic + 12mo Retainer = $18,000 + $180,000 = $198,000 → Rep $5,000 + ($4,000×12) = **$53,000/client/yr**.

## Technical notes (where things live)

```
src/pages/PortalPage.tsx              — tab strip drag handlers
src/pages/AdminDashboard.tsx          — same drag handlers on admin tab strip
supabase/functions/rep-assistant/     — COACH_PROMPT + PARTNER_ADDENDUM rewrite
src/components/portal/InboxTab.tsx    — attach UI in ComposeDialog
supabase/functions/portal-mailbox/    — accept attachments[] in send payload
src/lib/repMailbox.ts                 — pass attachments through
src/components/portal/FlagshipCommissionPanel.tsx — fixed-$ split + bonus stack
```

No DB migrations needed — the `rep-email-attachments` bucket already exists and commissions math is all client-side display (the webhook side is already correct per memory).