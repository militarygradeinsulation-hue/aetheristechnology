
# Aetheris Operator Extension v0.2 — Public Forensic Co-Pilot

Turn the LinkedIn-only side panel into a universal Chrome extension that works on **any website** the user is viewing. Three modes, all public, no login required.

## What gets built

### 1. Leak Scan (any site)
- New tab in the side panel: **"Scan this site"**.
- Pulls the current tab's URL + visible DOM text (title, meta, headings, copy, buttons, forms) and POSTs to a new edge function `extension-leak-scan` (public, no JWT).
- Server reuses the deterministic logic in `scan-website` + lead-scoring to return: leak score, top 3–5 forensic gaps, estimated $ exposure, a 3-step roadmap, and a "Get the full audit" CTA linking back to `aetheris.technology/leak-audit`.
- Result renders as a forensic case-file card (amber/charcoal/crimson) inside the panel with Copy + "Email me the full report" (writes to existing `leads` table via the same edge function, attributed `source = "chrome_extension"`).

### 2. AI Operator chat (sees the page)
- New **"Operator"** tab. Free-form chat box.
- Each user turn auto-captures (a) the current tab URL + scraped DOM text (≤8k chars) and (b) a **viewport screenshot** via `chrome.tabs.captureVisibleTab` from the extension's background service worker.
- Sends `{ messages, pageText, pageUrl, screenshotDataUrl }` to new edge function `extension-operator-chat`. That function calls Lovable AI Gateway (`google/gemini-3-flash-preview`, multimodal: text + `image_url` data-URL) with the Aetheris forensic-operator system prompt (reused from the LinkedIn voice playbook, retuned for "what's leaking on this page").
- Streams response back; panel renders markdown.
- Conversation kept in-memory per tab (no persistence, no login).

### 3. Snip-to-annotate
- "Snip" button overlays a crosshair selector (port of `src/components/ScreenSnip.tsx` logic into the content script, no html2canvas — uses `chrome.tabs.captureVisibleTab` + canvas crop on the chosen rect).
- Cropped PNG attaches to the next Operator chat turn with a default prompt: "What's leaking in this section?"

## Packaging & distribution
- Bump `manifest.json` to v0.2.0, add permissions: `activeTab`, `scripting`, `storage`, host permission `<all_urls>` (replacing LinkedIn-only) and the Supabase project URL.
- Rebuild `public/aetheris-extension.zip` via nix `zip`.
- Update `/extension` landing page copy: new screenshots/description, three feature blocks ("Scan any site • Ask the operator • Snip + analyze"), refreshed install steps.

## Technical sections

**Files to add**
- `supabase/functions/extension-leak-scan/index.ts` — public, CORS open, calls existing deterministic analyzer in `scan-website` (refactor shared parts into `supabase/functions/_shared/leak-scan.ts` so both functions reuse it).
- `supabase/functions/extension-operator-chat/index.ts` — public, CORS open, streams `streamText` from `@ai-sdk/openai-compatible` via the shared `_shared/ai-gateway.ts` helper, multimodal user message (text + `image_url`).
- `extension/sidepanel.html` + `extension/sidepanel.js` — replaces single-purpose panel with three tabs (Scan / Operator / Comment-on-LinkedIn kept as legacy tab).
- `extension/snip.js` — content script for crosshair region select, returns rect to background which calls `chrome.tabs.captureVisibleTab` and crops.
- `extension/background.js` — already exists; extend with `captureVisibleTab` handler and message router.

**Files to edit**
- `extension/manifest.json` — v0.2.0, `<all_urls>` host, add `action.default_panel` (or keep popup-toggle pattern), add `tabs` + `activeTab` perms.
- `extension/content.js` — split: keep LinkedIn helpers, add generic DOM-text scraper used on every site.
- `extension/panel.css` — add styling for Scan card, chat bubbles, snip thumbnail.
- `src/pages/ExtensionPage.tsx` — rewrite hero + feature blocks for the 3-mode pitch; keep download flow.

**Privacy / abuse**
- Public endpoints rate-limited by IP (simple in-memory token bucket in the edge function, 20 scans / 50 chats per IP per hour) and a max-payload cap (truncate DOM to 8k chars, screenshot resized to ≤1024px wide before send).
- Add a one-time consent screen on first open: "This tool reads the page you're viewing and sends it to Aetheris AI. Don't use on pages with confidential data." Stored in `chrome.storage.local`.

**Out of scope (call out, don't build)**
- Rep login / save-to-portal (you chose "fully public").
- Auto-post / DM automation.
- Cross-tab background scanning.

## Verification
After build: load unpacked in Chrome, hit a random marketing site, confirm Scan returns a forensic card, Operator chat streams with the screenshot included, and Snip crops + attaches correctly. Then re-zip and confirm `/extension` download serves the new bundle.
