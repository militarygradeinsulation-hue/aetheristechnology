# Co-Pilot Screen Scan

Add a one-click visual capture flow to the Co-Pilot. You hit a button, drag a box around any part of the screen, type a question (or use a default like "what am I looking at?"), and the assistant answers based on the actual pixels — pipeline cards, charts, queue rows, error toasts, anything visible.

Gemini 2.5 Pro is multimodal, so the existing assistant model already supports image input. We just need to capture the region, ship it to the chat function, and add it to the user message.

---

## What you'll see in the UI

1. New camera-style button in the Co-Pilot panel header (and in the input bar of `/app/assistant`), next to Send.
2. Click it → the panel collapses to the FAB temporarily, the cursor changes to crosshair, and a dim blue overlay covers the page.
3. Drag a rectangle around the area you want analyzed. ESC to cancel.
4. On release: the region is captured, the panel re-opens with a thumbnail attached above the input box, and a default prompt ("Explain what's in this screenshot.") is pre-filled — you can edit it or just hit send.
5. The assistant reply appears inline like any other message. The thumbnail stays in the message history so you can refer back to it.

A tiny `Image attached` chip with an X lets you remove the capture before sending.

---

## How the capture works

Two-tier approach for reliability:

- **Primary: `html2canvas-pro`** (drop-in, supports modern CSS like oklch/lab — important because the app uses HSL+oklch tokens). Renders the visible DOM into a canvas, then we crop to the selected rect. Fast, no permission prompt, works on the actual app DOM.
- **Fallback for cross-origin iframes / canvas-tainting:** if html2canvas throws (e.g., HubSpot embed iframe), call `navigator.mediaDevices.getDisplayMedia()` once, grab a single frame from the video track, crop, and stop the stream. Browser shows the standard "share screen" prompt — only triggered if DOM capture fails.

Output: PNG data URL, downscaled so the longest edge ≤ 1280px (keeps payload under ~400KB and well within Gemini's image limits).

---

## Backend changes

`assistant-chat` currently accepts `{ conversation_id, message }`. We extend it to accept an optional `image` (base64 data URL).

When present:
- The user message sent to Gemini becomes a multimodal `content` array:
  ```
  [{ type: "text", text: "..." }, { type: "image_url", image_url: { url: "data:image/png;base64,..." }}]
  ```
- We persist a marker in `assistant_messages.content` (e.g. prefix `[screenshot attached] ` + the user text) so the conversation transcript stays readable. The raw image is **not** stored in the DB (privacy + size); it only lives in the single Gemini call.
- An additional system note is injected for that turn: "The user attached a screenshot of their current view in the Aetheris operator app. Describe what you see in the context of HubSpot CRM data, the Hygiene Queue, or whatever is visible. If you see specific record IDs, deal names, or numbers, you may reference the existing read tools to look them up."

All existing tool-calling behavior (read tools auto-run, writes return `proposed_action`) stays unchanged — the model can still chain a screenshot question into a tool call (e.g., "this deal looks stalled, let me check it").

---

## Files

**New**
- `src/app/lib/useScreenCapture.ts` — hook exposing `startCapture(): Promise<string | null>`. Manages the overlay lifecycle, drag math, html2canvas call, fallback, and downscaling.
- `src/app/components/ScreenCaptureOverlay.tsx` — the dim overlay + crosshair + drag rectangle UI. Portaled to `document.body`, z-index above everything including the panel.

**Edited**
- `src/app/components/AssistantPanel.tsx` — add capture button in header, attached-image preview chip above input, hide panel during drag.
- `src/app/pages/AppAssistant.tsx` — same capture button + preview chip in the full-page chat composer.
- `src/app/lib/useAssistant.ts` — `send()` accepts an optional `imageDataUrl`, passes it through to the function invoke.
- `supabase/functions/assistant-chat/index.ts` — accept `image` in body, build multimodal content for that turn, inject the screenshot system note, leave history/tools untouched.

**Dependency**
- `bun add html2canvas-pro` (~120KB gz, only loaded when capture is invoked via dynamic `import()` so it doesn't bloat the initial bundle).

---

## Edge cases handled

- ESC during drag → cancel cleanly, no state stuck.
- Drag rectangle smaller than 20×20px → ignored (treated as accidental click).
- html2canvas failure → automatic fallback to `getDisplayMedia` with a one-line toast: "Using screen-share fallback for this capture."
- User on Safari with no `getDisplayMedia` support → fallback to whole-viewport html2canvas (no crop) and a toast explaining region capture isn't available.
- Image too large (rare) → rejected client-side with a toast before sending.
- Assistant-chat token cost: only the current turn carries the image — prior screenshots in history are sent as text markers only, so context stays bounded.

---

## Out of scope (future ideas, not building now)

- Drawing arrows/highlights on the captured image before sending.
- Multi-region capture in one turn.
- OCR pre-pass to extract text before calling the model (Gemini Pro handles this natively, no need).
- Persisting screenshots to storage for later review — keeping them ephemeral by default.
