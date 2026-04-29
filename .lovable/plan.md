## Goal
Speed up the SalesChat conversation by giving visitors clickable "what's broken" chips instead of forcing them to type the first message — and have the AI suggest 3 follow-up quick-replies after each response so the conversation keeps moving with one tap.

## Changes

### 1. `src/components/SalesChat.tsx` — add quick-pick chips
- Define a `STARTER_PROBLEMS` array of 6 high-intent, blunt one-liners that match the forensic/Leak Audit voice. Suggested set:
  - "My website isn't generating leads"
  - "I'm losing bids and don't know why"
  - "My CRM is a graveyard"
  - "I'm spending on marketing with no ROI"
  - "My follow-up is broken"
  - "I don't know what's actually broken"
- Render the chips as a horizontal-wrap row directly under the initial assistant message, only while `messages.length === 1` (i.e., before the user has said anything). After the first user message they disappear.
- Clicking a chip calls a new `sendPresetMessage(text)` helper that mirrors `sendMessage` but takes the text directly (bypasses the input box) so we don't have to round-trip through state.
- Style: `bg-muted hover:bg-primary/20 border border-border text-xs px-3 py-1.5 rounded-full` to match the existing contact-link chip language. Amber outline on hover for the forensic feel.

### 2. Dynamic follow-up quick-replies after every assistant turn
Goal: after the AI finishes streaming, show 2–3 contextual one-tap follow-up buttons (e.g., "Tell me what that costs me", "Show me what to fix first", "I want the $500 audit").

Two viable approaches — recommend **(a)**:

**(a) Backend-generated suggestions (chosen):**
- Update `supabase/functions/sales-chat/index.ts` system prompt to instruct the model to end every response with a hidden machine-readable block:
  ```
  <suggestions>
  ["Short reply 1","Short reply 2","Short reply 3"]
  </suggestions>
  ```
  with a hard rule: 3 suggestions, max 6 words each, each one a plausible next thing the buyer would say.
- In `SalesChat.tsx`, after streaming completes, parse the trailing `<suggestions>...</suggestions>` block out of the assistant message, strip it from the displayed content, and store the parsed array on that message (`Msg` type gains optional `suggestions?: string[]`).
- Render those suggestions as chips under the latest assistant bubble. Clicking one calls `sendPresetMessage(text)`. Chips clear once the user sends anything else.
- Hide the block during streaming by applying the strip both incrementally (regex on each upsert) and once more on completion.

**(b) Hardcoded suggestions:** simpler but static and won't adapt to context. Skip unless (a) feels risky.

### 3. Tracking
- Fire `trackEvent('chat_quickpick', { label: text, position: 'starter' | 'followup' })` whenever a chip is clicked, so we can see which prompts convert.

## Technical Notes
- `Msg` type becomes `{ role; content; suggestions?: string[] }`.
- `sendPresetMessage` takes `(text: string)`, builds `userMsg`, appends to `messages`, and runs the same fetch/stream loop currently inside `sendMessage`. Refactor `sendMessage` to call `sendPresetMessage(input.trim())` to avoid duplication.
- Suggestion-block parsing regex: `/<suggestions>\s*(\[[\s\S]*?\])\s*<\/suggestions>\s*$/`. Wrap `JSON.parse` in try/catch — if parsing fails, just don't render chips (graceful degrade).
- During streaming, run a lightweight strip on each render so the user never sees the raw `<suggestions>` tag flash on screen.
- No DB or RLS changes. No new edge function — just edit the existing `sales-chat` function's system prompt.

## Out of Scope
- Persisting chat history across sessions
- Changing the launcher button, header, or checkout flow
- Adding new packages to the catalog

