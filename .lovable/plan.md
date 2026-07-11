## Nexus Smart-Site Assistant

Replace the admin-only Operator Assistant with a single Nexus widget that behaves differently for public visitors vs signed-in operators, greets every visitor aggressively, and can either book a meeting or hand back a Stripe checkout link mid-conversation.

## What the visitor sees

- Floating amber "Nexus" button in the bottom-right on every public page (hidden on `/admin/*` and `/portal/*` — those still get the operator variant).
- 10 seconds after landing, the widget auto-opens with a **page-specific opener**. Examples:
  - `/services` → "Saw you on Services. Want me to price the piece you're actually stuck on?"
  - `/tools-shop` → "Looking at the toolkit? I can send you a checkout link for any of them in one click."
  - `/leak-audit` → "Want me to run the audit on your URL right now?"
- If dismissed, it collapses to a pulsing dot and won't auto-open again that session.
- Streaming markdown replies, "Nexus is thinking…" shimmer, transcript persisted to `localStorage` per browser (no thread history — one running conversation per visitor).
- Two inline action cards the AI can drop into the chat:
  1. **Book a call** — opens the existing HubSpot meeting embed in a modal, prefilled with name/email if collected.
  2. **Buy this** — a compact product card with title, price, and a "Checkout →" button that opens a Stripe Checkout session in a new tab.

## What Nexus can do (tools)

The edge function exposes exactly two tools to the model:

- `book_meeting({ name, email, topic })` → returns the HubSpot embed URL + a display label; UI renders the Book-a-call card.
- `create_checkout({ price_id, quantity })` → calls the existing payments flow with a `price_id` from `src/lib/tool-shop-catalog.ts`; UI renders the Buy card with the returned Stripe URL.

No other tools — no lead capture forms, no scan triggers (per your answers).

## Page context handoff

- New tiny hook `useNexusContext()` broadcasts `{ pathname, pageTitle, productSlug? }` into a React context.
- The widget sends that context on every turn as a `system` message segment ("Visitor is currently on: /services — Services page") so replies stay grounded in what they're looking at.
- No behavior scoring, no scroll/dwell tracking in v1 — path + title is enough to feel "smart" without building an analytics pipeline.

## Operator mode (unified)

Same component, but when `hasValidAdminToken()` or a portal session is present:
- Widget label switches to "Operator Assistant", no auto-open, no sales tools exposed.
- Existing `AdminAssistant` logic (admin data queries via `admin-data`) is folded in as the operator system prompt + admin tools.
- Public visitors never see admin tools; operators never see the sales tools.

## Backend

New edge function `nexus-chat`:
- Uses AI SDK + Lovable AI Gateway helper (`google/gemini-3.5-flash` for speed).
- `streamText` with `tools: { book_meeting, create_checkout }`, `stopWhen: stepCountIs(50)`.
- System prompt locked to brand voice (Operator, forensic, no earnings claims, USD only, honors pricing ladder from memory).
- Rate limit: soft cap 30 messages / visitor / hour (in-memory per IP) to protect credits.
- CORS + `verify_jwt = false`.

`create_checkout` calls Stripe via the existing `STRIPE_LIVE_API_KEY` path already used elsewhere.
`book_meeting` returns the HubSpot meeting URL from the memory (`admin-analytics-hub`) — no HubSpot API call needed for v1.

## Files

Create:
- `supabase/functions/nexus-chat/index.ts`
- `src/components/nexus/NexusWidget.tsx` (floating button + panel + auto-open logic)
- `src/components/nexus/NexusMessage.tsx` (markdown + tool-result cards)
- `src/components/nexus/BookCallCard.tsx`
- `src/components/nexus/BuyProductCard.tsx`
- `src/lib/nexusContext.ts` (context + `useNexusContext`)
- `src/lib/nexusOpeners.ts` (path → opener line map)

Edit:
- `src/App.tsx` — mount `<NexusWidget />` at the layout root, hide on `/admin` and `/portal`.
- `src/pages/AdminDashboard.tsx` — remove the standalone `<AdminAssistant />` mount (Nexus in operator mode replaces it).

## Out of scope (v1)

- No dwell-time / scroll / exit-intent triggers — only 10-second auto-open per session.
- No HubSpot API writes, no live CRM push from chat.
- No product recommendation engine — the AI picks a `price_id` from the catalog list in its system prompt.
- No voice, no video, no file uploads.

## Verification before I call it done

1. Load `/` in Playwright — Nexus button appears, opens after 10s with a homepage opener.
2. Ask "how much is the leak audit?" — reply cites $2,500 flat.
3. Ask "I want the LinkedIn ghostwriter tool" — Nexus calls `create_checkout` and a Buy card renders with a working Stripe URL.
4. Ask "can I talk to Joseph?" — Nexus calls `book_meeting` and a Book-a-call card renders opening the HubSpot embed.
5. Load `/admin` after PIN login — no public Nexus, operator variant appears instead.
