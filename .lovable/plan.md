# Operator Assistant — HubSpot Co-Pilot

A chat-first command surface for your CRM. You ask, it answers or acts. Reads execute instantly; writes show a preview card and wait for one Confirm click. Every write is logged to a new `assistant_actions` table with rollback metadata, so nothing is irreversible within 24 hours.

## What it can do (capabilities)

**Read & summarize (auto-execute)**
- "Summarize my pipeline" → totals by stage, exposure, top deals, stalled count
- "Who hasn't been touched in 30 days?" → list with last-activity dates
- "Tell me about contact Sarah Chen" → profile + recent engagements + linked deals
- "What's leaking right now?" → runs your existing leak detectors and explains them in plain English
- "Compare this month vs last" → owner performance, deal velocity, conversion deltas

**Trigger app actions (single confirm)**
- Run/resume sync, run leak audit, run hygiene scan
- Approve or reject items in the Hygiene Queue by description ("approve all the email-format fixes")
- Open a specific report, navigate to a contact

**Direct HubSpot writes (preview + confirm)**
- "Update Sarah Chen's email to sarah@newco.com"
- "Move deal #4471 to closed-won"
- "Reassign John's open deals to Maria"
- "Merge these two duplicate companies"

**Bulk operations (preview + explicit confirm with row count)**
- "Mark every proposal stuck >90 days as closed-lost" → shows 47 affected deals, total value, Confirm/Cancel
- "Reassign all unassigned MQLs to Maria" → preview list, confirm
- Runs in background, streams progress back into the chat

## How it appears in the UI

Two entry points, one shared conversation:

1. **Floating panel** — amber chat-bubble FAB pinned bottom-right on every `/app/*` route. Click → slide-out 420px panel from the right. Stays open as you navigate. Quick asks, fits beside the app.
2. **Dedicated `/app/assistant` page** — full-screen chat with conversation history sidebar, saved threads, larger preview cards for bulk operations. Linked from the AppLayout sidebar with a "Co-Pilot" nav item.

Both read/write to the same `assistant_conversations` + `assistant_messages` tables, so a thread started in the floating panel can be continued on the full page.

**Visual:** amber on charcoal per the forensic identity. Mono labels on tool-call cards ("`hubspot.update_contact` · pending"). Crimson reserved for irreversible-warning states only.

## How writes are gated

When the model decides to write, it does NOT call HubSpot directly. It returns a `proposed_action` payload that the frontend renders as a confirmation card:

```text
┌─ Proposed action ─────────────────────────────┐
│ Update contact: Sarah Chen                    │
│   email: sarah@oldco.com → sarah@newco.com    │
│   updated_at: now                             │
│                                               │
│   [ Cancel ]              [ Confirm & run ]   │
└───────────────────────────────────────────────┘
```

Only on Confirm does the frontend invoke the `assistant-execute` edge function, which performs the HubSpot write, logs the before/after to `assistant_actions`, and streams the result back into the conversation. Bulk operations show row count + sample rows + total $ exposure before Confirm.

Every write row gets a one-click "Undo" button visible for 24h (uses stored before-state to issue the inverse PATCH).

## Tools the assistant has access to

Implemented as JSON-schema function definitions sent to Gemini 2.5 Pro on every turn:

**Read tools** (no confirm)
- `query_pipeline(stage?, owner?, min_amount?, stalled?)` → SQL against `mirror_deals`
- `query_contacts(filter, limit)` → SQL against `mirror_contacts`
- `query_companies(filter)` → `mirror_companies`
- `get_record_detail(type, hubspot_id)` → full record + related engagements
- `run_leak_detector(detector_name)` → calls existing `detect_*` SQL functions
- `summarize_audit(audit_id?)` → reads latest audit
- `list_hygiene_queue(status?)` → from `hygiene_actions`

**App-action tools** (single confirm)
- `trigger_sync(mode)` → invokes `hubspot-sync`
- `trigger_hygiene_scan()` → invokes `hygiene-scan`
- `approve_hygiene_actions(filter)` → bulk-update `hygiene_actions.status`
- `run_audit()` → invokes `run-audit`

**Write tools** (preview + confirm)
- `update_contact(hubspot_id, properties)`
- `update_deal(hubspot_id, properties)` (incl. stage moves)
- `update_company(hubspot_id, properties)`
- `merge_records(type, primary_id, secondary_id)`
- `reassign_deals(from_owner, to_owner, filter?)` (bulk)
- `bulk_update_deals(filter, properties)` (bulk, requires row preview)

All write tools check `accounts.hubspot_scopes` for `*.write` scopes before queueing — if missing, return a friendly "Reconnect HubSpot to grant write scopes" instead of failing at HubSpot.

## Technical implementation

**New database tables (1 migration):**
- `assistant_conversations` (id, account_id, user_id, title, created_at, updated_at)
- `assistant_messages` (id, conversation_id, role, content, tool_calls jsonb, created_at) — stores full message history including tool calls/results so context survives reloads
- `assistant_actions` (id, conversation_id, message_id, account_id, tool_name, args jsonb, before_state jsonb, after_state jsonb, status, error_message, executed_at, undone_at) — audit trail + rollback source
- RLS: account-scoped, owner-only

**New edge functions (3):**
1. `assistant-chat` — streaming SSE endpoint. Loads conversation history, injects system prompt + account context (portal id, scope flags, current counts), calls Gemini 2.5 Pro with tools, streams tokens. When model returns tool calls: executes read tools immediately, returns write tools as `proposed_action` deltas for the frontend to render.
2. `assistant-execute` — called when user clicks Confirm. Validates the action against the original proposal (signed nonce to prevent tampering), fetches before-state, calls HubSpot via existing patterns from `hygiene-execute`, writes `assistant_actions` row, returns result.
3. `assistant-undo` — reads `assistant_actions.before_state`, issues inverse PATCH, marks row `undone_at`.

**New frontend (5 files):**
- `src/app/lib/useAssistant.ts` — hook managing conversation state, SSE streaming, tool-call rendering
- `src/app/components/AssistantPanel.tsx` — floating panel + FAB, mounted in `AppLayout`
- `src/app/components/AssistantMessage.tsx` — markdown rendering, tool-call cards, confirm/cancel UI
- `src/app/components/AssistantProposalCard.tsx` — diff view for proposed writes with Confirm/Cancel buttons
- `src/app/pages/AppAssistant.tsx` — full page with conversation list sidebar; route added to `AppRouter.tsx`

**Sidebar nav:** add "Co-Pilot" item to `AppLayout` between Dashboard and Hygiene.

**Model:** `google/gemini-2.5-pro` via Lovable AI Gateway with tool-calling enabled, streaming on. System prompt encodes: forensic-operator tone, current account context, list of available tools, the rule "never write without returning a proposed_action".

**Security:**
- All edge functions verify the user's JWT and check they own `account_id`
- Tool calls run with service-role client but every query includes `WHERE account_id = ?` enforced server-side
- Write tools double-check `hubspot_scopes` and bail with a UX-friendly error if scopes missing
- Bulk operations capped at 500 rows per execution; over that, the model is instructed to break it into batches with separate Confirms

## What this does NOT do (out of scope for v1)
- Voice input (can add later via `voice-chat` pattern)
- Scheduling actions for later ("do this Friday at 9am") — needs a scheduler
- Cross-account access (strictly account-scoped)
- Rollback beyond 24h (before-state retention window)

## Files to be created
- `supabase/migrations/<timestamp>_assistant_tables.sql`
- `supabase/functions/assistant-chat/index.ts`
- `supabase/functions/assistant-execute/index.ts`
- `supabase/functions/assistant-undo/index.ts`
- `src/app/lib/useAssistant.ts`
- `src/app/components/AssistantPanel.tsx`
- `src/app/components/AssistantMessage.tsx`
- `src/app/components/AssistantProposalCard.tsx`
- `src/app/pages/AppAssistant.tsx`

## Files to be modified
- `src/app/AppLayout.tsx` — mount `<AssistantPanel />`, add Co-Pilot sidebar link
- `src/app/AppRouter.tsx` — add `/app/assistant` route

After approval I'll build it in this order: migration → `assistant-chat` (with read tools first, end-to-end working) → confirmation flow + `assistant-execute` → bulk + undo → polish (full-page, history sidebar). About 9 files created, 2 modified.
