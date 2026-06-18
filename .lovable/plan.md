# Aetheris Operator — Native Mobile App

Wrap a new mobile-friendly "Operator Cockpit" page in Capacitor so it ships as a real iOS/Android app you sideload or submit to the stores. The cockpit uses the same Supabase edge functions the Chrome extension already calls, just driven by URLs you paste in instead of the active browser tab.

## Honest constraint (read first)

A Chrome extension can inject scripts into any third-party site you're viewing. A mobile app cannot. So in the mobile app:

- **Scan / Operator / Growth / CRM-Autopsy / Auto-Fix** all work — they only need a URL + backend, which we already have.
- **X-Ray overlay on someone else's live site** does not work the same way; we render the findings in our own UI instead.
- **HubSpot "scan visible tab"** is replaced by the existing session-cookie pull (`crm-pull-deals` / `crm-pull-contacts`) entered via a HubSpot login screen inside the app.
- **Hourly LinkedIn auto-reply** stays in the Chrome extension. Mobile background execution can't reliably scrape LinkedIn notifications — we'll surface this clearly in the app.

## What gets built

### 1. New cockpit route `/operator-app`
A mobile-first page with the same tab structure as the extension:
- **Scan** — URL input → calls existing `forensic-scan` edge function → renders findings, dossier (`deepen-scan`), contradictions, friction, contacts.
- **Operator** — chat composer with quick-prompt chips → calls `operator-chat` edge function with the scanned URL + scraped text as context (no screenshot on mobile; URL + scrape only).
- **Growth** — 4 sub-tabs:
  - LinkedIn Reply (paste post or screenshot via phone camera/upload) → `linkedin-post-respond`
  - Post From Page → `post-from-page`
  - Cold Opener → `cold-opener`
  - Hooks → `hooks-from-page`
- **CRM** — HubSpot session pulls via `crm-pull-deals` / `crm-pull-contacts`; renders leak detectors.
- **Auto-Fix Site** — WP URL + Application Password form → `wp-autofix-preview` and `wp-autofix-apply`.

Reuses existing components where possible (`PlainEnglishReport`, `CaseFileCard`, etc.). All styling matches forensic identity (charcoal + amber, Fraunces/JetBrains Mono, crimson reserved for leak signals).

### 2. Capacitor wrapper
- Install `@capacitor/core`, `@capacitor/cli` (dev), `@capacitor/ios`, `@capacitor/android`.
- Create `capacitor.config.ts` with `appId: app.lovable.1b783889c4604e52a4bd950110dc395b`, `appName: aetheristechnology`, and the sandbox preview URL in `server.url` for hot-reload during development.
- App icon + splash use the existing Aetheris mark.
- Default landing inside the app = `/operator-app`.

### 3. Download/Install page on the website
New `/mobile-app` page with:
- Honest "what works / what doesn't vs the Chrome extension" table.
- Step-by-step instructions to:
  1. Export the project to GitHub
  2. `npm install`
  3. `npx cap add ios` / `npx cap add android`
  4. `npm run build && npx cap sync`
  5. `npx cap run ios` / `npx cap run android`
- Link to the existing Chrome extension `.zip` for the desktop superpowers.

### 4. Navigation + SEO
- Add "Mobile App" link in the footer/resources.
- `SEOHead` on `/mobile-app` and `/operator-app`.

## Technical details

- No new edge functions; reuses what the extension already calls.
- New files: `src/pages/OperatorAppPage.tsx` (cockpit), `src/pages/MobileAppPage.tsx` (download/install), `capacitor.config.ts`.
- Edits: `src/App.tsx` (routes), `src/components/Footer.tsx` (link), `package.json` (Capacitor deps).
- Auth: cockpit is gated behind the existing staff/admin unlock so random store visitors can't hit your edge functions.
- iOS native build requires a Mac + Xcode; Android requires Android Studio. The web build runs fine in the Lovable preview without either.

## What I will NOT do

- Won't replicate the Chrome extension's cross-site script injection (impossible on iOS/Android).
- Won't port the hourly LinkedIn auto-reply scanner (mobile background limits).
- Won't change the existing Chrome extension code.
- Won't add Play Store / App Store submission scaffolding — that's a manual step you take after `npx cap run` looks good on device.
