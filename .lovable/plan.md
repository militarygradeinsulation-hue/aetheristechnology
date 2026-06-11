# Aetheris Operator Extension v0.3 — Forensic Cockpit

Turn the existing v0.2 side-panel extension into a true forensic operator: it diagnoses leaks visually on the page, talks about what it sees, runs your existing tools as the "fix" layer, and builds a permanent case file per domain.

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  chrome.sidePanel  (cockpit UI — persistent agent)      │
│  Tabs: Scan · Operator · Fix · Growth · Case File       │
└──────────────▲──────────────────────────▲───────────────┘
               │ msgs                     │ msgs
┌──────────────┴──────────────┐  ┌────────┴────────────────┐
│ Content script (eyes/hands) │  │ Background SW (router)  │
│ • DOM walk + rules engine   │  │ • tabs.captureVisibleTab│
│ • Overlay renderer (X-ray)  │  │ • Routes to Supabase    │
│ • Flow recorder (Autopsy)   │  │ • Auth + case-file sync │
│ • CDP/debugger when allowed │  │ • Rate limit / quotas   │
└─────────────────────────────┘  └──────────┬──────────────┘
                                            │
                  ┌─────────────────────────┴──────────────────────────┐
                  │ Supabase Edge Functions (already partially built)  │
                  │ extension-leak-scan · extension-operator-chat ·    │
                  │ extension-case-file · extension-fix-bridge         │
                  └────────────────────────────────────────────────────┘
```

## Module 1 — Forensic Scanner (the X-ray)

Two-pass scan, run from the Scan tab or auto-run in Observe mode.

**Pass A — Deterministic (instant, free):** runs entirely in the content script.
- Lead capture: forms present? fields >5? required email/phone? submit visible above fold?
- Tracking: GA4, Meta, LinkedIn, RB2B, GTM, HubSpot, Stripe — sniff `<script src>` + `window.*`.
- CTAs: count of `a/button` whose text matches CTA lexicon, ATF (above-the-fold) coverage via `getBoundingClientRect`.
- Schema: `application/ld+json` count + types.
- Follow-up hooks: calendar embeds (Calendly/HubSpot/Cal.com), chat widgets, exit-intent.
- Dead links: sample first N internal `<a>` via background `fetch` HEAD.
- Mobile breakage: `matchMedia` simulate + check for overflow / tiny tap targets.
- Performance: `PerformanceNavigationTiming` + LCP element if available.
- Speed signals: page weight (sum of `PerformanceResourceTiming`).

**Pass B — AI judgment (only what rules can't see):** sends DOM text + ATF screenshot + Pass A findings to `extension-leak-scan-ai` (new) for messaging clarity, trust signals, funnel logic, and "where would a buyer bail." Uses `google/gemini-3-flash-preview` via the existing Lovable gateway helper. Strictly scoped prompt = bounded cost.

**On-page overlay (the magic):** content script injects an SVG layer that draws labeled boxes around each leak element using its bounding rect. Severity = color (crimson/amber/charcoal). Click a leak in the panel → page scrolls to it, box pulses. Toggle X-ray on/off from the panel header. Screenshareable for sales calls.

## Module 2 — AI Operator (3 modes)

A mode selector pill at the top of the Operator tab.

- **Observe** — every page load, content script auto-runs Pass A and quietly streams findings into the panel. No AI cost unless user opens a finding.
- **Suggest** — current `extension-operator-chat` flow, kept and improved: page URL + DOM text + auto viewport screenshot + chat history.
- **Execute** — guarded action mode. Only enabled on domains the user has added to an allow-list (stored in `chrome.storage.local`). Uses `chrome.scripting.executeScript` for safe DOM mutations (fill form, click button). `chrome.debugger` is gated behind a separate "Enable deep automation" toggle with a Chrome-native consent banner each session; off by default.

Confirm-before-act: every Execute step renders a "Do this?" card with the exact action (selector + value) before running.

## Module 3 — Fix (your 54 tools as actions)

Add a Fix tab. After a scan completes, leaks are mapped to existing tools via a static registry (`extension/fixRegistry.ts`):

| Leak signal | Tool |
| --- | --- |
| Weak overall site | Full Website Report (`/tools/website-report`) |
| Thin/missing social | Social Content Generator |
| No follow-up hook | Follow-Up Plan Generator |
| Messy CRM signals | Contact Validator |
| No proof / case study | Playbook Creator |
| Weak headline / messaging | Brand Contradiction Finder |
| Funnel friction | Friction Vocabulary Audit |

Clicking a leak's "Fix this" button opens the matching tool **inside the side panel as an iframe** with query params pre-filled from the scan (URL, company name, gap summary). One click = deliverable generated. Result is saved to the Case File for that domain.

## Module 4 — Growth (LinkedIn engine, kept)

Existing LinkedIn tab stays, restyled to match the new cockpit. Same comment / reply / venue-selection / post generation. Architecture (`fetch` to existing `linkedin-*` functions) is unchanged.

## Power features

**1. Funnel Autopsy (flow recorder)** — Record button in panel. Content script attaches global listeners (click, input, navigation, error, slow load) and timestamps each step with screenshot via `chrome.tabs.captureVisibleTab`. Stop → background uploads the JSON+frames to a new `funnel_autopsies` table + `autopsy-frames` storage bucket → `extension-autopsy-analyze` edge function returns a friction report (drop-off step, slow loads, dead ends). Replay viewer in panel scrubs through frames.

**2. Case File** — Every scan is upserted into a new `extension_case_files` table keyed by `(account_id, host)`. Side panel "Case File" tab lists every domain the user has scanned with score trend, last leaks, generated fixes, autopsy count. Searchable. "Browsing turns into pipeline."

**3. Competitor Diff** — Two-tab picker in the Case File tab. Pulls two stored case files, renders a side-by-side leak table (matched, unique-A, unique-B) with score delta.

## What stays unique

Everything flows through the Aetheris leak rubric, scored, dollarized, and routed to your tools. Sider/Monica/Bardeen are generic copilots. This is a forensic operator that turns any page into a quantified leak report and sells the fix.

---

## Technical detail

**New / changed files**

Extension (`extension/`):
- `manifest.json` → v0.3.0; add `sidePanel`, `debugger` (optional, requested at runtime), `webNavigation`. Keep `<all_urls>` and existing permissions.
- `background.js` → handle `sidePanel.setPanelBehavior`, route messages, capture viewport, manage autopsy upload, allow-list storage.
- `content.js` → split into modules: `dom-scan.js` (Pass A rules), `overlay.js` (SVG X-ray), `recorder.js` (autopsy), `executor.js` (Execute-mode actions). Keep current panel-toggle entrypoint.
- `sidepanel.html` + `sidepanel.js` → new cockpit UI with 5 tabs (Scan, Operator, Fix, Growth, Case File). Side panel is the primary surface; the current in-page panel becomes a fallback for `chrome://` edge cases.
- `fixRegistry.js` → leak → tool URL + param mapping.
- `panel.css` → restyle to match the new tabbed cockpit; keep existing tokens.

Edge functions (`supabase/functions/`):
- `extension-leak-scan/` → add `mode: "deterministic"` short-circuit; keep current behavior as `mode: "ai"` for Pass B.
- `extension-leak-scan-ai/` (new) → Pass B prompt; multimodal (DOM text + ATF screenshot).
- `extension-case-file/` (new) → upsert + list + diff endpoints; respects `account_id` from `chrome.storage` user token (anonymous device id for public users).
- `extension-autopsy-analyze/` (new) → consumes uploaded recording, returns friction report.
- `extension-operator-chat/` → unchanged contract; add `mode` to messages so Observe/Suggest/Execute share the same endpoint.

Database (`supabase/migrations/`):
- `extension_case_files` (id, account_id nullable, device_id, host, last_score, last_grade, leaks jsonb, fixes jsonb, autopsy_ids uuid[], created_at, updated_at).
- `funnel_autopsies` (id, device_id, host, steps jsonb, friction jsonb, created_at).
- Storage bucket `autopsy-frames` (private, signed-URL reads).
- Full GRANTs + RLS: public insert via device_id only; authenticated read of own; service_role full.

Frontend (`src/pages/ExtensionPage.tsx`):
- Update download copy + screenshots to reflect v0.3 (5 tabs, overlay X-ray, autopsy, case file).
- Bump zip; re-pack from `extension/` with `nix run nixpkgs#zip` into `public/aetheris-extension.zip`.

**Cost / privacy guardrails**
- Pass A is local, always free. AI calls are explicit (user opens a finding or clicks "Deepen scan").
- Per-IP rate limits on every public edge function (already in place; tune to 25 scans / 60 chats / 5 autopsies per hour).
- DOM truncated to 8k chars, screenshots ≤1024px JPEG q70 (already done).
- `chrome.debugger` off by default, separate toggle, Chrome shows the native "started debugging this tab" banner.
- Allow-list for Execute mode; never auto-act on arbitrary sites.

**Out of scope for v0.3**
- Cross-tab autonomous browsing.
- Rep login inside the extension (still public; case files keyed by device id, upgradable later).
- X / IG / Reddit Growth (architecture-ready but not built this pass).

**Verification**
- Load unpacked in Chrome → side panel opens on toolbar click.
- Run Pass A on `aetheris.technology` and a random prospect site; overlay boxes draw correctly, panel lists leaks.
- Open one leak → AI Pass B returns judgment block.
- Click "Fix this" on a "weak messaging" leak → embedded Brand Contradiction Finder loads pre-filled.
- Record an autopsy on the local app's leak-audit flow; replay scrubs through frames.
- Scan two sites, open Case File → both listed; Competitor Diff renders side-by-side.
- Re-zip and confirm `/extension` serves the v0.3 bundle.