// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL Financial Leak Ledger — the ONLY place Golden Report money is
// counted. Every surface (website, portal, main PDF, portal PDF, report
// history, reopened reports, email previews, Top 10 chapter) derives its
// numbers from the ledger built here.
//
// Consumed by BOTH runtimes:
//   • Deno edge functions → import "../_shared/golden-ledger.ts"
//   • Browser / Vite app  → src/lib/goldenLedger.ts re-exports this file
//
// Deterministic model, no LLM arithmetic:
//   1. Collect candidate priced entries from chapters and from top_leaks.
//   2. Roll-up / narrative chapters (Top 10, remediation plan, appendix…) are
//      NEVER priced — they summarise other chapters and pricing them double
//      counts the whole report.
//   3. Every entry is allocated to exactly ONE primary chapter. A chapter that
//      carries its own annual figure is the allocation of record for that
//      chapter; individual leaks inside it become cross-referenced entries
//      ("Included in Chapter X total") and are not summed again.
//   4. Remaining entries are deduplicated by normalized root-cause fingerprint.
//   5. overall = sum(active entries) = sum(chapter allocations), by construction.
//   6. Top 10 = the ten highest active entries under a documented sort rule.
//
// There is no company, url, account, rep or scan-id branch anywhere in here.
// ═══════════════════════════════════════════════════════════════════════════

/** Bump when the financial model changes. Persisted with every report. */
export const FINANCIAL_MODEL_VERSION = 6;

/**
 * How defensible a dollar figure is. Only "measured" and "evidence_based_model"
 * may enter the headline total; "illustrative_scenario" is shown but never
 * summed, and "not_evaluated" carries no figure at all.
 */
export type FinancialBasis =
  | "measured"
  | "evidence_based_model"
  | "illustrative_scenario"
  | "not_evaluated";

export const FINANCIAL_BASIS_LABEL: Record<FinancialBasis, string> = {
  measured: "Measured",
  evidence_based_model: "Evidence-based model",
  illustrative_scenario: "Illustrative scenario",
  not_evaluated: "Not evaluated",
};

const ILLUSTRATIVE_RE =
  /\b(illustrative|category benchmark|industry (?:average|benchmark|standard)|not measured|placeholder|hypothetical|for illustration|typical smb|standard smb)\b/i;
const MEASURED_RE =
  /\b(observed|measured|logged|recorded|crawled|returned|http\s?\d{3}|detected on|counted)\b/i;

/** Deterministic classification of a priced entry from its pricing basis. */
export function classifyFinancialBasis(
  basis: string,
  hasRange: boolean,
  excludedFromTotal = false,
): FinancialBasis {
  if (!hasRange) return "not_evaluated";
  const b = String(basis || "");
  if (excludedFromTotal || ILLUSTRATIVE_RE.test(b)) return "illustrative_scenario";
  if (MEASURED_RE.test(b) && /\d/.test(b)) return "measured";
  return "evidence_based_model";
}

/** Bases that are allowed to contribute to the headline annual total. */
export const COUNTABLE_BASES: ReadonlySet<FinancialBasis> = new Set<FinancialBasis>([
  "measured",
  "evidence_based_model",
]);


/** A single leak above this is a placeholder/data artifact, not evidence. */
export const MAX_SANE_LEAK = 50_000_000;
/** Chapter prose mixes annual, quarterly and speculative TAM figures. */
export const MAX_SANE_CHAPTER_LEAK = 10_000_000;
/** Report totals above this get a prominent scale warning, never silence. */
export const MAX_PLAUSIBLE_REPORT_TOTAL = 25_000_000;

/** Chapters that summarise or narrate — never a source of new money. */
export const NON_PRICEABLE_CHAPTER_SLUGS = new Set([
  "top-10-leaks",
  "top-10",
  "top10",
  "top-leaks",
  "executive-summary",
  "remediation-plan",
  "30-60-90",
  "next-steps",
  "appendix",
  "methodology",
  "conclusion",
  "glossary",
]);

const ANNUAL_WORDS = /\b(annual|annually|per year|a year|\/\s?yr|yearly)\b/i;
const RANGE_RE =
  /\$\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)\s*(?:-|–|—|to)\s*\$?\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)/;
const SINGLE_RE = /\$\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)/;

export const LEAK_LOW_FIELDS = ["dollars_low", "annual_low", "low", "cost_low"] as const;
export const LEAK_HIGH_FIELDS = ["dollars_high", "annual_high", "high", "cost_high"] as const;
export const LEAK_SINGLE_FIELDS = ["dollars", "annual_cost", "estimated_annual_loss"] as const;

/**
 * Accepts a real number, or a money string the model sometimes emits:
 * "25,000", "$25,000", " $-500,000 ", "USD 12k", "1.2M", "$4,500/yr".
 * Rejects zero, NaN, Infinity, negatives-as-zero, junk and absurd magnitudes.
 */
export function parseMoney(v: unknown): number | null {
  let n: number | null = null;
  if (typeof v === "number") {
    n = Number.isFinite(v) && v !== 0 ? Math.abs(v) : null;
  } else if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const m = s.match(/-?\d[\d,\s]*(?:\.\d+)?\s*(k|m)?/i);
    if (!m) return null;
    const raw = Number(m[0].replace(/[,\s]/g, "").replace(/[km]$/i, ""));
    if (!Number.isFinite(raw) || raw === 0) return null;
    const unit = (m[1] || "").toLowerCase();
    n = Math.abs(raw) * (unit === "k" ? 1_000 : unit === "m" ? 1_000_000 : 1);
  }
  if (n == null || !Number.isFinite(n) || n <= 0 || n > MAX_SANE_LEAK) return null;
  return n;
}

/** The one money formatter every surface uses. Integer USD. */
export const formatUsd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const formatUsdRange = (low: number, high: number) => `${formatUsd(low)} – ${formatUsd(high)}`;
export const formatUsdRangeAscii = (low: number, high: number) => `${formatUsd(low)} - ${formatUsd(high)}`;

export type LedgerEntryStatus =
  | "active"
  | "included_in_chapter"
  | "duplicate"
  | "rejected"
  /** Priced, shown, deliberately never summed into the headline total. */
  | "illustrative";


export type LedgerEntry = {
  leak_id: string;
  root_cause_id: string;
  fingerprint: string;
  title: string;
  annual_low: number;
  annual_high: number;
  currency: "USD";
  pricing_basis: string;
  evidence_refs: string[];
  confidence: "high" | "medium" | "low";
  primary_chapter: string;
  cross_referenced_chapters: string[];
  status: LedgerEntryStatus;
  origin: "top_leak" | "chapter";
  /** How defensible this figure is. Illustrative entries are never summed. */
  financial_basis?: FinancialBasis;
  calculation_version: number;

  /** Set when status is not "active": which entry absorbed this one. */
  absorbed_by?: string;
};

export type ChapterAllocation = {
  chapter: string;
  title: string;
  annual_low: number;
  annual_high: number;
  entry_ids: string[];
};

export type TopLeakView = {
  rank: number;
  leak_id: string;
  title: string;
  annual_low: number;
  annual_high: number;
  primary_chapter: string;
  pricing_basis: string;
  range_label: string;
};

export type FinancialReconciliation = {
  model_version: number;
  priced_count: number;
  unpriced_count: number;
  ledger_total_low: number;
  ledger_total_high: number;
  chapter_total_low: number;
  chapter_total_high: number;
  top10_subtotal_low: number;
  top10_subtotal_high: number;
  remainder_low: number;
  remainder_high: number;
  remaining_count: number;
  duplicate_count: number;
  invariant_status: "ok" | "warning" | "failed";
  violations: Array<{ code: string; detail: string }>;
  checked_at: string;
};

export type FinancialLedger = {
  model_version: number;
  currency: "USD";
  entries: LedgerEntry[];
  /** Only status === "active" entries — these and only these are summed. */
  active: LedgerEntry[];
  overall: { annual_low: number; annual_high: number } | null;
  chapters: ChapterAllocation[];
  top10: {
    entries: TopLeakView[];
    subtotal_low: number;
    subtotal_high: number;
    remaining_count: number;
    /** Rank 11+ entries, itemised so no priced leak is ever hidden. */
    remainder: TopLeakView[];
    remainder_low: number;
    remainder_high: number;
    priced_count: number;
    label: string;
  };
  reconciliation: FinancialReconciliation;
};

type ChapterLike = {
  no?: number;
  slug?: string;
  title?: string;
  what_its_costing?: string | null;
  annual_low?: number | string | null;
  annual_high?: number | string | null;
  cost_basis?: string | null;
  excluded_from_total?: boolean | null;
  [k: string]: unknown;
};

type LeakLike = {
  name?: string | null;
  rank?: number | null;
  chapter_slug?: string | null;
  basis?: string | null;
  summary?: string | null;
  [k: string]: unknown;
};

export type LedgerReportLike = {
  top_leaks?: LeakLike[] | null;
  chapters?: ChapterLike[] | null;
  financial_ledger?: FinancialLedger | null;
  [k: string]: unknown;
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "with", "no",
  "not", "is", "are", "leak", "leaks", "issue", "issues", "gap", "gaps",
  "problem", "problems", "audit", "chapter",
]);

/** Normalized root-cause fingerprint. Same economic leak => same string. */
export function fingerprintOf(...parts: Array<string | null | undefined>): string {
  const tokens = parts
    .map((p) => String(p || "").toLowerCase())
    .join(" ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
  const uniq = Array.from(new Set(tokens)).sort();
  return uniq.join("-") || "unclassified";
}

const slugTokens = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t));

/**
 * Maps a loose `chapter_slug` emitted by the synthesizer ("seo", "cta",
 * "lead_capture") onto the report's real chapter slug ("seo-discoverability",
 * "friction-vocabulary", "lead-intelligence"). Token-overlap based, so it is
 * universal rather than a hand-maintained alias list.
 */
export function resolveChapterSlug(raw: string, chapters: ChapterLike[]): string | null {
  const want = slugTokens(raw);
  if (!want.length) return null;
  let best: { slug: string; score: number } | null = null;
  for (const ch of chapters) {
    const slug = String(ch?.slug || "").toLowerCase();
    if (!slug) continue;
    const have = new Set([...slugTokens(slug), ...slugTokens(String(ch?.title || ""))]);
    let score = 0;
    for (const t of want) {
      if (have.has(t)) score += 2;
      else if ([...have].some((h) => h.startsWith(t) || t.startsWith(h))) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { slug, score };
  }
  return best?.slug ?? null;
}

function normalizeRange(a: number | null, b: number | null, cap: number) {
  if (a == null && b == null) return null;
  const x = a ?? (b as number);
  const y = b ?? (a as number);
  const low = Math.round(Math.min(x, y));
  const high = Math.round(Math.max(x, y));
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= 0 || high > cap) return null;
  return { low: low > 0 ? low : high, high };
}

function pickRange(obj: Record<string, unknown>, cap: number) {
  const pick = (fields: readonly string[]) => {
    for (const f of fields) {
      const v = parseMoney(obj[f]);
      if (v != null) return v;
    }
    return null;
  };
  const single = pick(LEAK_SINGLE_FIELDS);
  return normalizeRange(pick(LEAK_LOW_FIELDS) ?? single, pick(LEAK_HIGH_FIELDS) ?? single, cap);
}

/** Parses an annual dollar range out of chapter costing prose. */
export function rangeFromProse(text: string, cap: number) {
  const t = String(text || "");
  if (!t || !ANNUAL_WORDS.test(t)) return null;
  const okay = (v: unknown) => {
    const n = parseMoney(v);
    return n != null && n <= cap ? n : null;
  };
  const range = t.match(RANGE_RE);
  if (range) {
    const lo = okay(range[1]);
    const hi = okay(range[2]);
    if (lo != null && hi != null) return normalizeRange(lo, hi, cap);
  }
  const single = t.match(SINGLE_RE);
  if (single) {
    const v = okay(single[1]);
    if (v != null) return normalizeRange(v, v, cap);
  }
  return null;
}

export function isPriceableChapter(ch: ChapterLike): boolean {
  const slug = String(ch?.slug || "").toLowerCase();
  if (!slug) return false;
  if (NON_PRICEABLE_CHAPTER_SLUGS.has(slug)) return false;
  if (ch?.excluded_from_total) return false;
  return true;
}

function confidenceOf(basis: string, origin: "top_leak" | "chapter"): "high" | "medium" | "low" {
  const b = basis.toLowerCase();
  if (/\bassum|illustrative|unknown|estimate[ds]?\b|proxy/.test(b)) return "low";
  if (/\d/.test(b) && origin === "top_leak") return "high";
  return /\d/.test(b) ? "medium" : "low";
}

/**
 * THE canonical model. Deterministic: same report in => same ledger out.
 */
export function buildFinancialLedger(report: LedgerReportLike | null | undefined): FinancialLedger {
  const chapters: ChapterLike[] = Array.isArray(report?.chapters) ? (report!.chapters as ChapterLike[]) : [];
  const leaks: LeakLike[] = Array.isArray(report?.top_leaks) ? (report!.top_leaks as LeakLike[]) : [];
  const entries: LedgerEntry[] = [];
  let unpricedCount = 0;

  // ── 1. Chapter allocations of record ───────────────────────────────────────
  // Precedence, documented and deterministic:
  //   a) a chapter's STRUCTURED annual figure is the allocation of record —
  //      the synthesizer derived it from that chapter's own evidence;
  //   b) otherwise the priced top_leaks allocated to the chapter are;
  //   c) otherwise a dollar range parsed out of the chapter's costing prose.
  // Prose is last because narrative sentences often restate a report-wide
  // total, and counting those would double count the whole report.
  const chapterEntryBySlug = new Map<string, LedgerEntry>();
  const proseCandidates: Array<{ slug: string; entry: LedgerEntry }> = [];
  for (const ch of chapters) {
    const slug = String(ch?.slug || "").toLowerCase();
    if (!isPriceableChapter(ch)) continue;
    const structured = pickRange(ch as Record<string, unknown>, MAX_SANE_CHAPTER_LEAK);
    const range = structured || rangeFromProse(String(ch?.what_its_costing || ""), MAX_SANE_CHAPTER_LEAK);
    if (!range) {
      unpricedCount += 1;
      continue;
    }
    const title = String(ch?.title || slug);
    const basis = String(ch?.cost_basis || ch?.what_its_costing || "").trim();
    const entry: LedgerEntry = {
      leak_id: `ch:${slug}`,
      root_cause_id: fingerprintOf(slug, title),
      fingerprint: fingerprintOf(slug, title),
      title,
      annual_low: range.low,
      annual_high: range.high,
      currency: "USD",
      pricing_basis: basis || "Derived from this scan's collected signals for this chapter.",
      evidence_refs: [`chapter:${slug}`],
      confidence: confidenceOf(basis, "chapter"),
      primary_chapter: slug,
      cross_referenced_chapters: [],
      status: classifyFinancialBasis(basis, true, Boolean(ch?.excluded_from_total)) === "illustrative_scenario"
        ? "illustrative"
        : "active",
      origin: "chapter",
      financial_basis: classifyFinancialBasis(basis, true, Boolean(ch?.excluded_from_total)),

      calculation_version: FINANCIAL_MODEL_VERSION,
    };
    if (structured) {
      entries.push(entry);
      chapterEntryBySlug.set(slug, entry);
    } else {
      proseCandidates.push({ slug, entry });
    }
  }


  // ── 2. Top-leak entries, allocated to exactly one chapter ──────────────────
  leaks.forEach((leak, i) => {
    if (!leak || typeof leak !== "object") return;
    const range = pickRange(leak as Record<string, unknown>, MAX_SANE_LEAK);
    const name = String(leak?.name || "").trim();
    if (!range) {
      if (name) unpricedCount += 1;
      return;
    }
    const rawSlug = String(leak?.chapter_slug || "").toLowerCase();
    const resolved = resolveChapterSlug(rawSlug || name, chapters) || rawSlug || "unallocated";
    const owner = chapterEntryBySlug.get(resolved);
    const basis = String(leak?.basis || leak?.summary || "").trim();
    const entry: LedgerEntry = {
      leak_id: `leak:${i + 1}:${fingerprintOf(name || rawSlug)}`,
      root_cause_id: fingerprintOf(name || rawSlug),
      fingerprint: fingerprintOf(name || rawSlug, resolved),
      title: name || resolved,
      annual_low: range.low,
      annual_high: range.high,
      currency: "USD",
      pricing_basis: basis || "Derived from this scan's collected signals.",
      evidence_refs: [rawSlug ? `top_leak:${rawSlug}` : `top_leak:${i + 1}`],
      confidence: confidenceOf(basis, "top_leak"),
      primary_chapter: resolved,
      cross_referenced_chapters: rawSlug && rawSlug !== resolved ? [rawSlug] : [],
      // A chapter that prices itself is the allocation of record; the leak is
      // explained there but must not be added to the total a second time.
      status: owner ? "included_in_chapter" : "active",
      origin: "top_leak",
      calculation_version: FINANCIAL_MODEL_VERSION,
      ...(owner ? { absorbed_by: owner.leak_id } : {}),
    };
    if (owner) owner.cross_referenced_chapters.push(entry.leak_id);
    entries.push(entry);
  });

  // ── 2b. Prose-only chapters, used only when no leak was allocated there ────
  const leakOwnedChapters = new Set(
    entries.filter((e) => e.origin === "top_leak" && e.status === "active").map((e) => e.primary_chapter),
  );
  for (const { slug, entry } of proseCandidates) {
    if (leakOwnedChapters.has(slug)) {
      unpricedCount += 1;
      continue;
    }
    entries.push(entry);
    chapterEntryBySlug.set(slug, entry);
  }



  // ── 3. Deduplicate remaining active entries by root cause ──────────────────
  let duplicateCount = 0;
  const byRoot = new Map<string, LedgerEntry>();
  for (const e of entries) {
    if (e.status !== "active") continue;
    const keep = byRoot.get(e.root_cause_id);
    if (!keep) {
      byRoot.set(e.root_cause_id, e);
      continue;
    }
    // Documented rule: keep the higher annual_high; ties break on leak_id asc.
    const loser =
      keep.annual_high > e.annual_high ||
      (keep.annual_high === e.annual_high && keep.leak_id <= e.leak_id)
        ? e
        : keep;
    const winner = loser === e ? keep : e;
    loser.status = "duplicate";
    loser.absorbed_by = winner.leak_id;
    duplicateCount += 1;
    byRoot.set(e.root_cause_id, winner);
  }

  const active = entries
    .filter((e) => e.status === "active")
    .sort(
      (a, b) =>
        b.annual_high - a.annual_high ||
        b.annual_low - a.annual_low ||
        a.title.localeCompare(b.title) ||
        a.leak_id.localeCompare(b.leak_id),
    );

  // ── 4. Totals ──────────────────────────────────────────────────────────────
  const sum = (list: LedgerEntry[]) =>
    list.reduce((acc, e) => ({ low: acc.low + e.annual_low, high: acc.high + e.annual_high }), {
      low: 0,
      high: 0,
    });
  const total = sum(active);
  const overall = active.length ? { annual_low: total.low, annual_high: total.high } : null;

  const allocMap = new Map<string, ChapterAllocation>();
  for (const e of active) {
    const title =
      chapters.find((c) => String(c?.slug || "").toLowerCase() === e.primary_chapter)?.title ||
      e.primary_chapter;
    const cur =
      allocMap.get(e.primary_chapter) ||
      { chapter: e.primary_chapter, title: String(title), annual_low: 0, annual_high: 0, entry_ids: [] };
    cur.annual_low += e.annual_low;
    cur.annual_high += e.annual_high;
    cur.entry_ids.push(e.leak_id);
    allocMap.set(e.primary_chapter, cur);
  }
  const chapterAllocations = [...allocMap.values()].sort((a, b) => b.annual_high - a.annual_high);
  const chapterTotal = chapterAllocations.reduce(
    (acc, c) => ({ low: acc.low + c.annual_low, high: acc.high + c.annual_high }),
    { low: 0, high: 0 },
  );

  // ── 5. Canonical global Top 10 ─────────────────────────────────────────────
  const top = active.slice(0, 10);
  const rest = active.slice(10);
  const topSum = sum(top);
  const restSum = sum(rest);
  const top10 = {
    entries: top.map((e, i) => ({
      rank: i + 1,
      leak_id: e.leak_id,
      title: e.title,
      annual_low: e.annual_low,
      annual_high: e.annual_high,
      primary_chapter: e.primary_chapter,
      pricing_basis: e.pricing_basis,
      range_label: formatUsdRange(e.annual_low, e.annual_high),
    })),
    subtotal_low: topSum.low,
    subtotal_high: topSum.high,
    remaining_count: rest.length,
    remainder: rest.map((e, i) => ({
      rank: 11 + i,
      leak_id: e.leak_id,
      title: e.title,
      annual_low: e.annual_low,
      annual_high: e.annual_high,
      primary_chapter: e.primary_chapter,
      pricing_basis: e.pricing_basis,
      range_label: formatUsdRange(e.annual_low, e.annual_high),
    })),
    remainder_low: restSum.low,
    remainder_high: restSum.high,
    priced_count: active.length,
    label: `Top ${Math.min(10, active.length)} of ${active.length} priced leak${active.length === 1 ? "" : "s"}`,
  };

  // ── 6. Invariants ──────────────────────────────────────────────────────────
  const violations: Array<{ code: string; detail: string }> = [];
  if (overall) {
    if (chapterTotal.low !== overall.annual_low || chapterTotal.high !== overall.annual_high) {
      violations.push({
        code: "chapter_allocation_mismatch",
        detail: `chapter allocations ${chapterTotal.low}/${chapterTotal.high} != overall ${overall.annual_low}/${overall.annual_high}`,
      });
    }
    if (topSum.high > overall.annual_high) {
      violations.push({ code: "top10_exceeds_overall", detail: `${topSum.high} > ${overall.annual_high}` });
    }
    if (active.length <= 10 && (topSum.low !== overall.annual_low || topSum.high !== overall.annual_high)) {
      violations.push({
        code: "top10_must_equal_overall",
        detail: `priced_count=${active.length} but top10 subtotal ${topSum.low}/${topSum.high} != overall`,
      });
    }
    if (topSum.low + restSum.low !== overall.annual_low || topSum.high + restSum.high !== overall.annual_high) {
      violations.push({ code: "remainder_mismatch", detail: "top10 + remainder != overall" });
    }
    if (overall.annual_high > MAX_PLAUSIBLE_REPORT_TOTAL) {
      violations.push({
        code: "scale_warning",
        detail: `report total ${overall.annual_high} exceeds the plausibility ceiling ${MAX_PLAUSIBLE_REPORT_TOTAL} — verify against known company revenue`,
      });
    }
  }
  const seenFingerprints = new Set<string>();
  for (const e of active) {
    if (seenFingerprints.has(e.root_cause_id)) {
      violations.push({ code: "duplicate_counted", detail: `root cause ${e.root_cause_id} counted twice` });
    }
    seenFingerprints.add(e.root_cause_id);
  }

  const hardFailure = violations.some((v) => v.code !== "scale_warning");
  const reconciliation: FinancialReconciliation = {
    model_version: FINANCIAL_MODEL_VERSION,
    priced_count: active.length,
    unpriced_count: unpricedCount,
    ledger_total_low: overall?.annual_low ?? 0,
    ledger_total_high: overall?.annual_high ?? 0,
    chapter_total_low: chapterTotal.low,
    chapter_total_high: chapterTotal.high,
    top10_subtotal_low: topSum.low,
    top10_subtotal_high: topSum.high,
    remainder_low: restSum.low,
    remainder_high: restSum.high,
    remaining_count: rest.length,
    duplicate_count: duplicateCount,
    invariant_status: hardFailure ? "failed" : violations.length ? "warning" : "ok",
    violations,
    checked_at: new Date().toISOString(),
  };

  return {
    model_version: FINANCIAL_MODEL_VERSION,
    currency: "USD",
    entries,
    active,
    overall,
    chapters: chapterAllocations,
    top10,
    reconciliation,
  };
}

/**
 * Ledger for a report, preferring a persisted ledger written by the CURRENT
 * model version so every reopen/PDF/email renders byte-identical numbers.
 * Older or missing ledgers are recomputed from the stored evidence.
 */
export function resolveFinancialLedger(report: LedgerReportLike | null | undefined): FinancialLedger {
  const saved = report?.financial_ledger;
  if (
    saved &&
    typeof saved === "object" &&
    Number(saved.model_version) === FINANCIAL_MODEL_VERSION &&
    Array.isArray(saved.entries)
  ) {
    return saved;
  }
  return buildFinancialLedger(report);
}

/** Chapter allocation lookup used by chapter headers and prose. */
export function chapterAllocation(
  ledger: FinancialLedger,
  slug: string | null | undefined,
): ChapterAllocation | null {
  const s = String(slug || "").toLowerCase();
  return ledger.chapters.find((c) => c.chapter === s) || null;
}

/** Entries explained in a chapter but financially allocated elsewhere. */
export function crossReferencedIn(ledger: FinancialLedger, slug: string | null | undefined): LedgerEntry[] {
  const s = String(slug || "").toLowerCase();
  return ledger.entries.filter((e) => e.status === "included_in_chapter" && e.primary_chapter === s);
}

/** Shown when a stored report carries money-shaped prose the ledger cannot verify. */
export const REGENERATION_LABEL = "Financial model requires report regeneration.";

/**
 * Legacy safety: a report that displays dollar prose but produces no ledger
 * entries cannot be reconciled from stored evidence. We never manufacture the
 * missing data — the reader is told the report must be regenerated.
 */
export function needsFinancialRegeneration(report: LedgerReportLike | null | undefined): boolean {
  const ledger = resolveFinancialLedger(report);
  if (ledger.overall) return false;
  const chapters = Array.isArray(report?.chapters) ? (report!.chapters as ChapterLike[]) : [];
  const prose = chapters.map((c) => String(c?.what_its_costing || "")).join(" ");
  return /\$\s?\d/.test(prose);
}

/** Honest note for older reports whose narrative text predates the ledger. */
export const LEGACY_PROSE_NOTE =
  "Narrative figures in the summary and chapters below were written before the current financial model. The totals and per-chapter allocations shown are the canonical numbers.";

/** True when the stored report was priced by an older financial model. */
export function hasLegacyFinancialProse(report: LedgerReportLike | null | undefined): boolean {
  const saved = report?.financial_ledger as { model_version?: number } | undefined;
  if (saved && Number(saved.model_version) === FINANCIAL_MODEL_VERSION) return false;
  const overall = (report as { overall_leakage?: { calculation_version?: number } } | null | undefined)?.overall_leakage;
  if (!overall) return false;
  return Number(overall.calculation_version) !== FINANCIAL_MODEL_VERSION;
}
