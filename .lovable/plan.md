# Golden Report: Executive Render Profile Cleanup

Goal: every future company report defaults to a concise executive PDF of roughly 16 to 24 pages with a hard ceiling of 28, while the full archival export and a machine-readable appendix remain available. The saved report stays the source of truth; what changes is how it is rendered.

## What is causing the 61-page output today

Confirmed by reading the current code:

- `golden-report-model.ts` has a future-proof catch-all (`extrasSection` plus `emitUnknown` at the top level, per chapter, and inside deliverables). Every unclaimed saved key is serialized verbatim, which is the 17 pages of internal structured data.
- Growth assets are built into the same section list (`brandSection`, `imagerySection`, `postsSection`, `scheduleSection`, `growth-assets-extra`), each with `newPage: true`. That is the 10 growth pages.
- `topLeaksSection` renders Top 10 plus remainder plus absorbed entries, and chapter 12 (`top-10-leaks`) renders the same canonical view again. That is the duplicate Top 10.
- Every chapter and every growth section sets `newPage: true`, so short chapters each burn a page.
- `chapterSection` emits `what_to_do` per chapter (this_week / this_month / this_quarter) and a full `evidence` mono block with no dedupe and no empty-value filter, producing the repeated CSS snippets, hyphen-only lines and repeated action horizons.
- `buildEvidenceConfidence` prints "Financially Modeled Leaks" from `report_consistency.uniquely_priced_leaks` while the ledger's own `reconciliation.priced_count` can disagree. Nothing blocks export on that mismatch, which is the "0 modeled leaks vs 11 priced leaks vs $1.26M-$2.10M" contradiction.

## Design

Introduce a **render profile** parameter threaded through the model builder and the PDF writer. The model builder keeps producing one canonical interpretation; the profile decides which sections are emitted and how densely.

```text
saved report -> sanitizer -> ledger -> buildGoldenReportModel({ profile })
                                          |-- executive     (default, <= 28 pages)
                                          |-- complete      (today's behavior, unchanged)
                                          `-- data_appendix (structured dump only)
```

## 1. `supabase/functions/_shared/golden-report-model.ts`

New exports and types:

- `export type RenderProfile = "executive" | "complete" | "data_appendix";`
- `buildGoldenReportModel(opts)` gains `profile?: RenderProfile` defaulting to `"complete"` so existing callers and the parity audit are unaffected.
- Section gains `density?: "compact" | "full"` and `profiles?: RenderProfile[]` so the writer knows how to lay it out.

Executive profile rules implemented here:

- Skip `extrasSection`, `growth-assets-extra`, and all per-chapter and per-deliverable `emitUnknown` output.
- Skip `brandSection`, `imagerySection`, `postsSection`, `scheduleSection`.
- Skip chapter 12 (`top-10-leaks`) since `topLeaksSection` already carries it; keep only one Top 10.
- `topLeaksSection` in executive mode renders a single compact table (rank, leak, annual range, chapter) plus one line for the remainder subtotal, instead of three kv blocks per entry.
- Conditional chapter inclusion: a chapter is included when it has a verdict or `what_we_found` prose, or a ledger allocation, or at least one unique evidence item. Excluded chapters roll into a new `coverage-gaps` section listing category names with a one-line reason, no dollar values.
- Root-cause grouping: chapters and leaks that share a `root_cause` id from the compiler are merged into one finding card; secondary members become a "also observed in" line.
- Evidence dedupe: new helper `dedupeEvidence(items)` drops entries whose value is empty, is only punctuation or hyphens, is a duplicate label+value seen earlier in the report, or is a CSS/asset fragment matching a suppression pattern. Cap at the top N unique items per chapter in executive mode, with the full list retained in the complete profile and appendix.
- Roadmap centralization: new `roadmapSection` collects every chapter `what_to_do` into one 30/60/90 section, deduplicated by normalized action text, each action tagged with its source chapter. Per-chapter `what_to_do` blocks are omitted in executive mode.
- Chart data: the model emits chart-ready blocks (new `Block` kind `chart` with `variant: "exposure_range" | "confidence_distribution" | "impact_effort" | "remediation_timeline"` and plain numeric series). Renderers that do not support charts fall back to the existing table representation, so the web view keeps working.
- `data_appendix` profile emits exactly the machine-readable content: ledger reconciliation, evidence ledger, root causes, consistency counts, and the catch-all extras that executive drops.

Financial classification:

- New `export type FinancialBasis = "measured" | "evidence_based_model" | "illustrative_scenario" | "not_evaluated";`
- Derived from existing ledger signals (`pricing_basis`, confidence heuristics in `golden-ledger.ts` line 306, and `excluded_from_total` on fallback leaks) so no report data has to change.
- Only `measured` and `evidence_based_model` contribute to the headline total. `illustrative_scenario` renders in a clearly labeled sidebar and is excluded from every sum.

## 2. `src/lib/goldenReportModel.ts` (browser re-export)

No logic added, consistent with the existing one-implementation rule. It re-exports the new `RenderProfile`, `FinancialBasis`, and helpers automatically through `export *`. No file change expected beyond confirming the new types surface.

## 3. `src/lib/generateForensicGoldenPdf.ts`

- `generateForensicGoldenPdf(opts)` gains `profile?: RenderProfile` defaulting to `"executive"`.
- `downloadForensicGoldenPdf` gains the same option; `ForensicScanAllPanel.tsx` gets a primary "Download report" (executive) plus a secondary menu with "Complete archival export" and "Data appendix".
- Layout changes: `drawSection` stops forcing a page break for compact sections; a section starts a new page only if fewer than roughly 60 mm remain. Finding cards are drawn as compact boxed units so several fit per page.
- New lightweight chart renderers drawn with jsPDF primitives: horizontal exposure-range bars, a confidence distribution bar row, an impact/effort 2x2 scatter, and a timeline strip for 30/60/90.
- New page-budget guard: after generation, count pages and measure ink coverage per page. If pages exceed 28, or more than a set fraction of pages fall below a low-density threshold, throw in dev/test and log a warning in production, so a regression is caught by the QA test rather than by a client.
- Export gates extended: refuse the executive export when the report carries contradictory counts or totals (see item 5).

## 4. `supabase/functions/forensic-scan-all/index.ts` and compiler/ledger/evidence modules

- `forensic-scan-all`: chapter prompt asks for at most 3 evidence items and drops the per-chapter three-horizon `what_to_do` in favor of 2 to 3 prioritized actions with an explicit `horizon` field, which the central roadmap groups. Prompt also asks for a `root_cause` slug per chapter so grouping is deterministic. Fallback chapters (the "re-run the scan" placeholders) are marked `no_signal: true` so the model routes them to coverage gaps instead of rendering an empty chapter.
- `golden-compiler.ts`: writes `financial_basis` per leak, writes a `root_cause_id` per finding, and adds a new contradiction check that compares `report_consistency.uniquely_priced_leaks` against `ledger.reconciliation.priced_count` and the presence of a headline total. A mismatch becomes a violation with code `COUNT_TOTAL_CONTRADICTION`.
- `golden-ledger.ts`: excludes `illustrative_scenario` entries from `overall`, `top10.subtotal`, and chapter allocations, while still listing them. Bump `FINANCIAL_MODEL_VERSION` to 6 so stored ledgers recompute.
- `golden-evidence-confidence.ts`: sources the priced count from the ledger reconciliation rather than only `report_consistency`, so the two can never disagree on screen.
- `golden-report-recompile/index.ts` is the existing backfill path; running it after deploy regenerates v6 ledgers for stored reports.

## 5. Blocking rules

Executive export is refused when:

- The compiler state is not `compiled` (already enforced).
- The generic detector requires regeneration (already enforced).
- New: priced-leak count and ledger reconciliation disagree, or a headline total exists with zero qualifying priced leaks, or reconciliation invariants fail.

Complete and data_appendix profiles remain exportable in those cases so an operator can still inspect a broken report.

## 6. Tests and fixtures

- New `src/lib/__tests__/goldenRenderProfiles.test.ts`: executive omits extras, growth assets, and duplicate Top 10; complete keeps them; data_appendix contains only structured content.
- New fixtures `goldenReport.sparse.fixture.ts`, `goldenReport.normal.fixture.ts`, `goldenReport.complex.fixture.ts` covering a near-empty scan, a typical scan, and a maximal 14-chapter scan with full growth assets.
- Page-budget tests: complex fixture executive PDF is between 16 and 28 pages; sparse fixture still produces a valid report with a coverage-gaps section; low-density page count stays under the threshold.
- Evidence dedupe tests: repeated CSS snippets and hyphen-only values are suppressed; unique evidence appears exactly once.
- Roadmap test: an action repeated in three chapters appears once in the central roadmap.
- Financial tests: an `illustrative_scenario` leak never enters the headline total; a count/total contradiction throws on executive export and does not throw on complete.
- `goldenReportParity.test.ts` is updated so the strict no-loss parity audit runs against the `complete` profile only; a second assertion states which fields executive intentionally drops.
- `_qa_pdf.ts` is extended into a profile QA harness that writes executive, complete, and appendix PDFs and prints page counts and per-page density, used with `pdftoppm` for visual QA.

## Migration and compatibility

- Existing saved reports render unchanged in the `complete` profile; no data migration is required for the report JSON.
- The ledger version bump means stored ledgers recompute on read, and the existing recompile function can persist them.
- Public and portal web views keep reading the same model, defaulting to `complete` unless a surface opts into `executive`.
- No change to `forensic_scans` schema.
