# Fix: Golden Report total does not match the leaks in the report

## What you are seeing

The red box at the top is not the combined total. It is currently built from a
small subset of the report, so it can read a few thousand dollars while the
chapters below show far larger numbers.

Answer to your question: the scan I ran went through the public website path
(the same endpoint the site uses), not the portal. So this is not a
website-vs-portal difference — both surfaces read the same stored total.

## Confirmed cause (verified against the live data)

For the scan I ran (Turner Construction, completed):

- Stored top total: `$2,500 – $5,700`, `source: priced_leaks`, `priced_leak_count: 3`
- Chapter figures in the same report: Ch2 `$38,200–$38,400`, Ch5 `$275,200–$605,440`,
  Ch10 `$630,528–$1,261,056`, Ch12 `$357,504–$715,008`, and Ch4 at
  `$19,152,000–$38,304,000`

Two separate defects:

1. The report compiler overwrites the total using only the executive
   `top_leaks` rows that survive its dedupe and benchmark filters. The
   per-chapter annual figures the reader actually sees are never added in, so the
   banner is far smaller than the report it is summarising.
2. Some chapter figures are not plausible for the company scanned (a $19M–$38M
   brand-voice leak). Anything above the $10M chapter sanity cap is silently
   dropped, which makes the mismatch worse and makes the report look unserious.

## What will be changed

1. **One total, summing everything the reader sees.** The compiler will build the
   total from the union of unique priced leaks *and* every chapter that carries
   its own annual figure, deduped by root cause / chapter so nothing is counted
   twice. Category benchmarks stay excluded, as today.
2. **Realistic chapter figures.** Chapter dollar ranges will be clamped to a
   defensible band scaled off the company's own signals, so no chapter can emit
   a multi-million-dollar figure that a small operator would laugh at, and no
   chapter figure gets dropped for breaching the sanity cap.
3. **A consistency guard.** Completion will compare the banner total against the
   sum of the chapter figures rendered in the report. If they disagree, the
   report is repaired to the combined total rather than shipped inconsistent.
4. **Backfill.** Existing completed scans are recomputed with the corrected math
   so old reports in the portal and in the CRM stop showing the small number.
5. **Verification.** A fresh scan run through the public website path, checking
   that banner total = sum of the chapter figures, and that the same numbers
   appear in the portal view and the PDF.

## Technical detail

- `supabase/functions/_shared/golden-compiler.ts`: replace the
  `canonicalLeaks`-only total (lines ~853-890) with `allPricedLeaks()` over the
  compiled report, mapping compiled priced leaks by `chapter_slug` and
  `dedupe_key` so chapter rows already represented by a priced top leak are
  skipped; keep the `benchmark_leaks` exclusion and the "delete the box when no
  evidence survives" behaviour.
- `supabase/functions/forensic-scan-all/index.ts`: bound
  `applyDerivedChapterCosts` and the AI costing rules to a plausible per-chapter
  ceiling; keep values company-derived, never a stock band.
- `supabase/functions/_shared/golden-leakage.ts`: add a
  `chapterSumMismatch(report)` helper used by the completion invariant; bump
  `LEAKAGE_CALCULATION_VERSION` to 4 so persisted v3 totals are recomputed
  instead of trusted.
- Run `golden-leakage-backfill` (and `golden-report-recompile` where a full
  recompile is needed) after deploy.
