# Golden Report: company-specific leaks + live "Fix this for me" advisor

Two workstreams: make the Golden Report's dollar figures real and company-specific with a live consulting AI attached to it, and move the Industries content into the Careers Connector area.

## 1. Kill the repeated template dollar ranges

The repeated "$7,000 to $15,000"-style wording comes from two places:

- The scan's fallback path writes the same fixed category benchmark sentence into every chapter whenever AI synthesis fails or times out.
- The per-chapter AI prompt asks for "a USD range grounded in the leak type", which pushes the model toward round generic ranges instead of math tied to the scanned company.

Changes:
- Rewrite the chapter cost instruction so every dollar figure must be derived from a stated basis found in the scan (traffic, page count, missing conversion element, response lag, service mix, stated pricing, competitor gap) and must show its arithmetic in one line, e.g. "12 service pages with no CTA, ~X monthly sessions, 2% recovery at $Y average job".
- Require each chapter to return structured cost fields (`annual_low`, `annual_high`, `basis`) alongside the prose, so the total is summed from numbers instead of parsed out of sentences.
- Add a repetition guard after synthesis: if two or more chapters return the same low/high pair or a near-duplicate cost sentence, those chapters are re-asked once with the already-used figures listed as forbidden.
- Stop emitting the fixed benchmark sentence as a chapter cost. A chapter with no measurable basis says plainly that no dollar exposure could be measured for this company and contributes nothing to the total.

## 2. Total at the very top

The red total banner already exists, but it currently resolves from whatever it can find. It will now sum the structured per-chapter figures plus the priced top leaks with de-duplication, so the number at the top of the report equals everything below it added together. The banner moves to the first element of the report card on the website, the portal view, and the PDF cover, with a one-line "sum of N measured leaks across M chapters" caption.

## 3. "Fix this for me" advisor, docked beside the report

- Rename "Ask this report" to **Fix this for me** everywhere (report panel, standalone page, PDF link text stays as-is since the PDF stays contained).
- On the website report, the advisor opens as a docked side panel next to the report instead of a new tab. The full-page `/report/:scanId/ask` route stays for shared links and reuses the same component.
- Preset buttons above the composer, generated from what the report actually contains:
  - What are the top 5 leaks in this report
  - Write a plan to start fixing these
  - What do I fix first this week
  - What is this costing me per month
  - Plus dynamic buttons built from the report's own chapters and top leaks, e.g. "Fix the [chapter title] problem" for the highest-cost chapters and "Explain the $X [leak name] number".
- Each chapter row gets a **Fix this now** button. It opens the panel and sends that chapter's verdict, findings, cost basis, and actions as context with a fix request, so the user does not retype anything.

## 4. Stronger advisor

The chat function currently pins the model to report-only answers. It becomes a consultant that leads with the report but is allowed to go beyond it: concrete implementation steps, tooling and staffing suggestions, sequencing, rough effort and payback, scripts and templates, and follow-up questions about the business. It still refuses to invent facts about the company that the scan did not find and labels general advice as such. Upgraded to the stronger default chat model with streaming so long answers appear as they generate. PDF behaviour is unchanged.

## 5. Industries into Careers

- The industries list moves into the Careers page Connector section as a collapsed accordion titled around connector reach.
- Intro copy explains these are the industries our licensed Connectors have relationships in, and that Aetheris focuses on manufacturing and construction.
- The condensed entries show industry name, primary leak, and typical loss only. No hero, no physics bubbles, no per-industry cards.
- `/industries` is deleted and redirected to `/careers`; the nav link is removed. Existing per-industry landing routes stay live.

## Technical notes

- Edited: `supabase/functions/forensic-scan-all/index.ts` (chapter prompt, structured cost fields, repetition guard, fallback text), `supabase/functions/_shared/golden-leakage.ts` (prefer structured chapter figures, dedupe), `supabase/functions/forensic-report-chat/index.ts` (consultant prompt, model upgrade, streaming).
- Edited: `src/components/ForensicScanAllPanel.tsx` (docked panel, Fix this now per chapter, banner position), new `src/components/GoldenFixPanel.tsx`, `src/pages/ForensicReportAskPage.tsx` (reuse panel, rename).
- Edited: `src/pages/CareersPage.tsx` (connector industries accordion), new shared `src/lib/connectorIndustries.ts` extracted from the industries data, `src/App.tsx` (redirect), navbar link removal, `src/pages/IndustriesPage.tsx` deleted.
- Existing reports keep working: the leakage resolver falls back to today's parsing when structured chapter figures are absent.
