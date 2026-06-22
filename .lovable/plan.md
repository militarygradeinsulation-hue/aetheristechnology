# Forensic Scan All — Golden Standard Report

A single "Scan All" button on the admin + rep tools that runs every diagnostic we have against one target (URL + optional company name + optional CRM/HubSpot account), then assembles a **~70-page chaptered forensic report** with a clickable index, professional typography, and a downloadable **Smart PDF** (text-indexed for native search + QR/link to "Ask this report" AI chat). Same flow ships inside the Chrome extension side panel.

## What "Scan All" runs (end-to-end)

A new edge function `scan-all-forensic` orchestrates the full battery in parallel where safe, sequenced where it must be. It writes a single `forensic_scans` row tracking status per stage and persists every raw payload as JSON for the report builder.

Stages (every existing function reused — no logic re-invented):
1. **Site + SEO + tech** — Firecrawl scrape (markdown/html/links/branding/screenshot), Firecrawl map, `generate-scan-report`, SEMrush domain_analysis + top_pages + backlink_analysis + competitive_analysis, tech-stack sniff from headers/HTML.
2. **Copy forensics** — `generate-friction-audit`, BrandContradictionFinder logic, FrictionVocabularyAudit, repetition scan.
3. **CRM / Deal leaks** (when HubSpot connected) — `detect_stalled_deals`, `detect_closed_lost_reactivation`, `detect_dead_leads`, `detect_slow_followup`, `detect_stuck_proposal`, `detect_missing_contact_info`, `detect_owner_overload`, `detect_high_intent_no_workflow`, mirror_* summaries.
4. **Lead intelligence** — RocketReach enrichment on key contacts, competitor SERP scan, identified_visitors join, news cache lookup.
5. **Synthesis** — Lovable AI (`google/gemini-3-flash-preview`) summarises each stage into chapter-ready prose using the forensic operator voice (memory: linkedin-voice-playbook + forensic-blueprint).

## The Report (golden standard)

`generate-forensic-report` edge function takes a `scan_id` and outputs structured JSON:

```text
Cover  →  Executive Summary  →  Index  →
Ch 1  The Site Autopsy
Ch 2  SEO & Discoverability Leaks
Ch 3  Tech-Stack & Performance Friction
Ch 4  Brand Voice & Copy Contradictions
Ch 5  Vocabulary / Friction Vocabulary Audit
Ch 6  Competitive Position
Ch 7  Backlink & Authority Profile
Ch 8  Pipeline Forensics (deals, stalled, closed-lost)
Ch 9  Lead Hygiene & Workflow Gaps
Ch 10 Lead Intelligence & Visitor Identification
Ch 11 Owner / Capacity Diagnostics
Ch 12 Top 10 Active Leaks (ranked by $ exposure)
Ch 13 The 30/60/90 Remediation Plan
Ch 14 Appendix — raw findings, sample IDs, source data
```

Each chapter: title page, 1-sentence verdict, "What we found", "Why it's leaking", "What it's costing", "What to do — this week / this month / this quarter", evidence table. Forensic case-file aesthetic (Fraunces serif headings, JetBrains Mono labels, dark charcoal + amber, crimson reserved for active leaks). USD only.

Rendered via **React + react-pdf** in a new `src/lib/generateForensicGoldenPdf.ts`. Generates a real text-layer PDF (so Ctrl+F + screen readers + AI ingestion all work) at ~70 pages, with TOC bookmarks (`<Link>` anchors + react-pdf outline) so the index is clickable in viewers.

## Smart PDF (hybrid)

- The PDF itself is fully searchable text (no rasterised pages).
- Cover + footer of every page carries:
  - A QR code linking to `https://aetheris.technology/report/:scan_id/ask`
  - A "Ask this report" button (PDF link annotation) to the same URL.
- New route `/report/:scan_id/ask` opens a chat UI scoped to that scan. Edge function `forensic-report-chat` loads the scan's stored JSON + chapter markdown, embeds via Lovable AI embeddings into a transient in-memory RAG context per request (or pgvector if scan > 30 days old), and answers questions with citations like *"Ch 8 — Pipeline Forensics, finding #3"*.
- Watermark "Aetheris AI Studio" bottom-right per memory rule.

## Chrome extension parity

`extension/sidepanel.html` gets a new "Scan All" tab that:
1. Captures the active tab URL.
2. Calls `scan-all-forensic` with the admin/rep token.
3. Streams progress (stage list with check-marks).
4. Renders the full chaptered report inline (collapsible chapters, same typography) in the side panel.
5. "Download Smart PDF" + "Ask this report" buttons that open the hosted chat in a new tab.

## Data model

New tables (migration, with GRANTs + RLS):

- `forensic_scans` — id, account_id, requested_by, target_url, company_name, hubspot_account_id, status, stage_status jsonb, raw_payload jsonb, summary jsonb, created_at, completed_at
- `forensic_report_chunks` — scan_id, chapter_no, chapter_slug, title, markdown, embedding vector(1536), metadata jsonb — used by the Ask chat
- `forensic_report_qa_log` — scan_id, question, answer, citations jsonb, asked_at — for auditing

Index `forensic_report_chunks` with HNSW on `embedding`.

## New / edited files (high level)

- `supabase/functions/scan-all-forensic/index.ts` (new) — orchestrator
- `supabase/functions/generate-forensic-report/index.ts` (new) — chapter synthesis via Lovable AI
- `supabase/functions/forensic-report-chat/index.ts` (new) — RAG chat for Smart PDF
- `supabase/functions/_shared/forensicStages.ts` (new) — pure helpers calling each existing detector / scanner
- `src/lib/generateForensicGoldenPdf.ts` (new) — react-pdf renderer w/ TOC, bookmarks, QR
- `src/components/admin/ForensicScanAllPanel.tsx` (new) — admin UI: trigger, live progress, chapter viewer, download
- `src/components/portal/ForensicScanAllPanel.tsx` (new) — rep version (gated to their account)
- `src/components/workbench/toolRegistry.tsx` — register the new tool
- `src/pages/ForensicReportAskPage.tsx` (new) + route in `AppRouter.tsx`
- `extension/sidepanel.html` + `extension/sidepanel.css` + new `extension/scanAll.js` — extension panel
- `extension/manifest.json` — add permissions if needed (already has activeTab)

## Technical notes

- Long jobs: orchestrator returns immediately with `scan_id`, runs stages with `EdgeRuntime.waitUntil` and writes progress; client polls `forensic_scans` row.
- Concurrency-safe: each stage idempotent against `(scan_id, stage)`.
- Costs: AI synthesis chunked per chapter; embeddings only run when Smart-PDF chat is enabled (default on).
- Citations: each chunk stores `chapter_no`, `section_anchor` so the chat answers can deep-link back into the PDF.
- Reuses memory: voice from `linkedin-voice-playbook`, design tokens from `forensic-identity`, USD lock from `currency-lock`.

## Out of scope (call out)

- No new payment flow — Scan All is admin/rep-only.
- No email delivery of the PDF on first ship (download + extension only). Easy follow-up.
- No re-scan scheduling on first ship (manual trigger).

I'll build this in one pass. Approve and I'll start with the DB migration → orchestrator → report renderer → UI → extension.
