// ═══════════════════════════════════════════════════════════════════════════
// GOLDEN REPORT MONEY SANITIZER
//
// Guarantees that NO surface (website, portal, both PDFs, report history /
// reopen, email previews, report chat) can ever display a leak, exposure or
// annual-loss dollar amount that is not the canonical Financial Leak Ledger
// value for that context.
//
// Two passes, both deterministic and company-agnostic:
//
//   1. STRUCTURED  — cost_usd / dollars_low / dollars_high / annual_low /
//      annual_high / estimated_annual_loss / overall_leakage are OVERWRITTEN
//      with ledger values (or removed when the ledger does not price them).
//
//   2. PROSE — sentences that make a modeled leak claim ("annual loss",
//      "annual leak", "exposure", "cost per year", "revenue loss", "chapter
//      leak"…) are checked amount by amount. An amount that is not a canonical
//      ledger number for that context — and is not anchored evidence (average
//      order value, salary, contract value, list price…) — causes the sentence
//      to be replaced with neutral text. Amounts are never left dangling in a
//      half-sentence, and legitimate non-leak dollar evidence is preserved.
//
// Consumed by BOTH runtimes: Deno edge functions import this file directly,
// the Vite app imports it through src/lib/goldenMoneySanitizer.ts.
// ═══════════════════════════════════════════════════════════════════════════

import {
  resolveFinancialLedger,
  formatUsdRange,
  parseMoney,
  FINANCIAL_MODEL_VERSION,
  NON_PRICEABLE_CHAPTER_SLUGS,
  type FinancialLedger,
  type LedgerReportLike,
} from "./golden-ledger.ts";
import {
  annotateMoneyProse,
  tagMoney,
  MONEY_CATEGORY_NOTE,
} from "./golden-money-taxonomy.ts";


/** Rendered in place of a leak sentence whose amount the ledger cannot back. */
export const NEUTRAL_LEAK_SENTENCE = "See the canonical financial allocation shown above.";

/** Methodology note. Explains the model — never excuses a competing number. */
export const FINANCIAL_METHODOLOGY_NOTE =
  `Every dollar figure in this report is rendered from the canonical Financial Leak Ledger (model version ${FINANCIAL_MODEL_VERSION}). Amounts written before this model are not displayed.`;

/** A sentence is in scope only when it makes a modeled leak / exposure claim. */
const LEAK_CLAIM_RE = new RegExp(
  [
    "annual(?:ly|ised|ized)?\\s+(?:revenue\\s+)?(?:loss|losses|leak|leakage|exposure|cost|impact|bleed)",
    "(?:loss|leak|leakage|exposure|cost|impact)\\s+(?:per|a|each)\\s+year",
    "(?:revenue|pipeline|margin)\\s+(?:loss|leak|leakage|at risk)",
    "lost\\s+(?:revenue|pipeline|sales|deals|income)",
    "leak(?:age)?\\s+(?:estimate|estimated|value|total|range|figure)",
    "(?:total|top-level|overall|combined|aggregate)\\s+(?:estimated\\s+)?(?:leak|leakage|loss|exposure)",
    "modell?ed\\s+exposure",
    "\\bexposure\\b",
    "\\bleaking\\b",
    "\\bbleeding\\b",
    "(?:is|are|it'?s)\\s+costing",
    "what\\s+it'?s\\s+costing",
    "at\\s+risk\\s+(?:annually|per year|a year)",
    // Money handed an annualised frame, or framed as recoverable leak value.
    "\\$\\s?[\\d,]+(?:\\.\\d+)?\\s*[km]?(?:\\s*(?:-|–|—|to|and)\\s*\\$?\\s?[\\d,]+(?:\\.\\d+)?\\s*[km]?)?\\s*(?:a|per|each|\\/)\\s*(?:year|yr|annum)",
    "(?:worth|totall?ing|recover(?:ing|s)?|recapture|reclaim|unlock|win\\s+back|leaving)\\s+(?:the\\s+|an?\\s+)?\\$",
  ].join("|"),
  "i",
);

/**
 * Dollar amounts that are company evidence rather than modeled leak output.
 * A value anchored ONCE anywhere in the field is trusted for the whole field,
 * so a pricing basis can restate its own inputs without being redacted.
 */
const EVIDENCE_ANCHOR_RE = new RegExp(
  [
    "(?:average|avg\\.?|median|typical|assumed|stated|listed|advertised)\\s+[a-z ]{0,24}?(?:value|price|size|cost|rate|ticket|sale|salary|revenue)",
    "(?:order|deal|job|contract|project|invoice|transaction|basket|cart)\\s+(?:value|size|price)",
    "\\bAOV\\b|\\bACV\\b|\\bARPU\\b|\\bMSRP\\b",
    "salary|salaries|compensation|payroll|hourly rate|day rate",
    "list(?:ed)? price|price point|priced at \\$?[\\d,]|pricing page|starting at|from only|per (?:unit|seat|licen[cs]e|user|hour|month) price",
    "budget|spend|investment|retainer|fee|subscription|plan costs?|ad spend",
    "revenue of|turnover of|ARR|MRR",
  ].join("|"),
  "i",
);

/** Half-written money slots left by earlier naive amount-stripping. */
const DANGLING_SLOTS: RegExp[] = [
  /\b(?:priced at|estimated at|valued at|costing|worth|totall?ing)\s*(?:in|to|per|a|and|,|\.|$)/i,
  /\b(?:a\s+)?(?:low|high|total|range)\s+of\s*(?:and|to|per|,|\.|$)/i,
  /\bbetween\s*(?:and|to|,|\.|$)/i,
  /\b(?:x|×)\s*(?:low|high)\b/i,
  /\bfrom\s+to\b/i,
];

const MONEY_TOKEN_RE = /\$\s?\d[\d,]*(?:\.\d+)?\s*(?:k|m|million|thousand|bn|billion)?/gi;

export type SanitizeContext = {
  /** Canonical ledger amounts allowed to appear in this text. */
  allowed: Set<number>;
  /** Human label used in removal logs. */
  where: string;
};

export type ProseSanitizeResult = { text: string; removed: string[] };

const roundKey = (n: number) => Math.round(n);

/** Splits into sentences while keeping their trailing punctuation/whitespace. */
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])(\s+)/).reduce<string[]>((acc, part, i) => {
    if (i % 2 === 0) acc.push(part);
    else acc[acc.length - 1] += part;
    return acc;
  }, []);
}

/**
 * Structured placeholders the synthesizer is instructed to emit instead of
 * freeform leak amounts. They are rendered server-side from the ledger, so a
 * new report's narrative can never contain a model-invented annual figure.
 */
export const LEAK_PLACEHOLDERS = {
  chapter: "{{CHAPTER_ANNUAL_RANGE}}",
  report: "{{REPORT_ANNUAL_TOTAL}}",
  leak: "{{LEAK_ANNUAL_RANGE}}",
} as const;

export function renderLeakPlaceholders(
  text: string,
  values: { chapter?: string | null; report?: string | null; leak?: string | null },
): string {
  return String(text ?? "")
    .split(LEAK_PLACEHOLDERS.chapter).join(values.chapter || "the chapter allocation shown above")
    .split(LEAK_PLACEHOLDERS.report).join(values.report || "the report total shown above")
    .split(LEAK_PLACEHOLDERS.leak).join(values.leak || "the allocation shown above");
}

/**
 * True when a money token is tied to evidence wording rather than to a modeled
 * leak. The anchor must either lead directly into the amount ("average job
 * value of $18,400") with no other amount in between, or follow it immediately
 * ("$18,400 average job value"). A distant anchor elsewhere in the sentence
 * does not launder a leak figure.
 */
function isAnchoredAt(text: string, idx: number, len: number): boolean {
  const after = text.slice(idx + len, idx + len + 48);
  const am = after.match(EVIDENCE_ANCHOR_RE);
  if (am && (am.index ?? 99) <= 3) return true;

  const before = text.slice(Math.max(0, idx - 60), idx);
  const bm = [...before.matchAll(new RegExp(EVIDENCE_ANCHOR_RE.source, "gi"))].pop();
  if (!bm) return false;
  const between = before.slice((bm.index ?? 0) + bm[0].length);
  if (between.length > 34) return false;
  MONEY_TOKEN_RE.lastIndex = 0;
  return !MONEY_TOKEN_RE.test(between);
}

/** Money values in a text that are anchored to legitimate evidence wording. */
function anchoredValues(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(MONEY_TOKEN_RE)) {
    if (!isAnchoredAt(text, m.index ?? 0, m[0].length)) continue;
    const v = parseMoney(m[0]);
    if (v != null) out.add(roundKey(v));
  }
  return out;
}

/**
 * Sanitizes one freeform field. Sentences that do not make a leak claim are
 * returned untouched, so prices, salaries, contract values and source evidence
 * survive regardless of the dollar signs they contain.
 */
export function sanitizeLeakProse(text: string, ctx: SanitizeContext): ProseSanitizeResult {
  const input = String(text ?? "");
  if (!input.trim()) return { text: input, removed: [] };

  const fieldAnchors = anchoredValues(input);
  const removed: string[] = [];

  const cleaned = splitSentences(input)
    .map((sentence) => {
      const trailingWs = sentence.match(/\s*$/)?.[0] ?? "";
      const core = sentence.slice(0, sentence.length - trailingWs.length);
      if (!core.trim()) return sentence;

      const dangling = DANGLING_SLOTS.some((re) => re.test(core));
      const hasMoney = MONEY_TOKEN_RE.test(core);
      MONEY_TOKEN_RE.lastIndex = 0;
      const isLeakClaim = LEAK_CLAIM_RE.test(core);

      if (dangling && (isLeakClaim || !hasMoney)) {
        removed.push(`${ctx.where}: removed half-written money claim "${core.trim().slice(0, 90)}"`);
        return NEUTRAL_LEAK_SENTENCE + (trailingWs || " ");
      }
      if (!hasMoney || !isLeakClaim) return sentence;

      const unsupported: string[] = [];
      for (const m of core.matchAll(MONEY_TOKEN_RE)) {
        const v = parseMoney(m[0]);
        if (v == null) continue;
        const key = roundKey(v);
        if (ctx.allowed.has(key) || fieldAnchors.has(key)) continue;
        if (isAnchoredAt(core, m.index ?? 0, m[0].length)) continue;
        unsupported.push(m[0].trim());
      }
      if (!unsupported.length) return sentence;

      removed.push(`${ctx.where}: removed unbacked leak amount(s) ${unsupported.join(", ")}`);
      return NEUTRAL_LEAK_SENTENCE + (trailingWs || " ");
    })
    .join("");

  // Collapse repeats produced by several redactions in a row.
  const deduped = cleaned
    .replace(new RegExp(`(?:${escapeRe(NEUTRAL_LEAK_SENTENCE)}\\s*){2,}`, "g"), `${NEUTRAL_LEAK_SENTENCE} `)
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd();

  return { text: deduped, removed };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Canonical amounts the ledger backs, globally. */
export function ledgerAllowedValues(ledger: FinancialLedger): Set<number> {
  const out = new Set<number>();
  const add = (n?: number | null) => {
    if (typeof n === "number" && Number.isFinite(n) && n > 0) out.add(roundKey(n));
  };
  add(ledger.overall?.annual_low);
  add(ledger.overall?.annual_high);
  add(ledger.top10.subtotal_low);
  add(ledger.top10.subtotal_high);
  add(ledger.top10.remainder_low);
  add(ledger.top10.remainder_high);
  for (const c of ledger.chapters) {
    add(c.annual_low);
    add(c.annual_high);
  }
  for (const e of ledger.entries) {
    add(e.annual_low);
    add(e.annual_high);
  }
  return out;
}

/**
 * Canonical amounts allowed inside ONE chapter's prose.
 *
 * SCOPED BY DESIGN: a priceable chapter may render only its own reconciled
 * allocation and the leaks assigned to it. The report-wide total is NOT
 * allowed there — a value that is canonical elsewhere in the ledger is still
 * wrong in the wrong chapter, and permitting the overall total is exactly how
 * chapters ended up claiming the whole report's number as their own.
 *
 * Only an explicit non-priceable roll-up chapter, whose job is to restate the
 * canonical headline, may cite the overall total and the Top 10 figures.
 */
export function chapterAllowedValues(ledger: FinancialLedger, slug: string): Set<number> {
  const s = String(slug || "").toLowerCase();
  const out = new Set<number>();
  const add = (n?: number | null) => {
    if (typeof n === "number" && Number.isFinite(n) && n > 0) out.add(roundKey(n));
  };
  const alloc = ledger.chapters.find((c) => c.chapter === s);
  add(alloc?.annual_low);
  add(alloc?.annual_high);
  for (const e of ledger.entries) {
    if (e.primary_chapter !== s) continue;
    add(e.annual_low);
    add(e.annual_high);
  }
  // Roll-up chapters render the canonical global view, so they may cite it.
  if (NON_PRICEABLE_CHAPTER_SLUGS.has(s)) {
    add(ledger.overall?.annual_low);
    add(ledger.overall?.annual_high);
    add(ledger.top10.subtotal_low);
    add(ledger.top10.subtotal_high);
    add(ledger.top10.remainder_low);
    add(ledger.top10.remainder_high);
    for (const e of ledger.top10.entries) {
      add(e.annual_low);
      add(e.annual_high);
    }
  }
  return out;
}

/** True when this chapter is allowed to restate the report-wide headline. */
export function isRollupChapter(slug: string): boolean {
  return NON_PRICEABLE_CHAPTER_SLUGS.has(String(slug || "").toLowerCase());
}

/** Structured money keys that must never survive un-reconciled on an object. */
const STRUCTURED_MONEY_KEYS = [
  "cost_usd",
  "cost_low",
  "cost_high",
  "dollars",
  "dollars_low",
  "dollars_high",
  "annual_cost",
  "annual_low",
  "annual_high",
  "estimated_annual_loss",
  "low",
  "high",
  "amount",
  "amount_low",
  "amount_high",
  "leak_total",
  "chapter_total",
  "subtotal",
];

const PROSE_KEYS_CHAPTER = ["verdict", "what_we_found", "why_its_leaking", "what_its_costing", "summary", "cost_basis"];

export type SanitizeReportResult<T> = {
  report: T;
  ledger: FinancialLedger;
  removals: string[];
  structuralRewrites: string[];
  /** Amounts dropped because no money category could be resolved for them. */
  omissions: string[];
};

function stripMoneyKeys(obj: Record<string, unknown>, keep: string[] = []) {
  for (const k of STRUCTURED_MONEY_KEYS) {
    if (keep.includes(k)) continue;
    if (k in obj) delete obj[k];
  }
}

/**
 * THE render-time gate. Returns a deep clone of the report in which every
 * structured financial field is ledger-derived, every leak claim in prose is
 * either a canonical ledger amount or neutral text, and every surviving dollar
 * value carries or inherits an explicit money category.
 */
export function sanitizeGoldenReportFinancials<T extends LedgerReportLike | null | undefined>(
  report: T,
): SanitizeReportResult<T> {
  const ledger = resolveFinancialLedger(report as never);
  if (!report || typeof report !== "object") {
    return { report, ledger, removals: [], structuralRewrites: [], omissions: [] };
  }

  const clone = JSON.parse(JSON.stringify(report)) as Record<string, unknown>;
  const removals: string[] = [];
  const structuralRewrites: string[] = [];
  const omissions: string[] = [];
  const globalAllowed = ledgerAllowedValues(ledger);

  const totalLabel = ledger.overall
    ? formatUsdRange(ledger.overall.annual_low, ledger.overall.annual_high)
    : null;

  // ── 1. canonical overall total ─────────────────────────────────────────────
  if (ledger.overall) {
    clone.overall_leakage = {
      annual_low: ledger.overall.annual_low,
      annual_high: ledger.overall.annual_high,
      currency: "USD",
      source: "financial_ledger",
      priced_leak_count: ledger.reconciliation.priced_count,
      calculation_version: FINANCIAL_MODEL_VERSION,
    };
  } else if (clone.overall_leakage) {
    clone.overall_leakage = null;
    structuralRewrites.push("overall_leakage: removed — the ledger prices nothing in this report");
  }

  // ── 2. top_leaks: ledger values only ───────────────────────────────────────
  const leaks = Array.isArray(clone.top_leaks) ? (clone.top_leaks as Record<string, unknown>[]) : [];
  leaks.forEach((leak, i) => {
    if (!leak || typeof leak !== "object") return;
    const entry = ledger.entries.find((e) => e.leak_id.startsWith(`leak:${i + 1}:`));
    const before = JSON.stringify({ lo: leak.dollars_low, hi: leak.dollars_high });
    stripMoneyKeys(leak);
    if (entry && entry.status === "active") {
      leak.dollars_low = entry.annual_low;
      leak.dollars_high = entry.annual_high;
    } else if (entry) {
      leak.included_in_chapter_total = entry.primary_chapter;
    }
    const after = JSON.stringify({ lo: leak.dollars_low, hi: leak.dollars_high });
    if (before !== after) structuralRewrites.push(`top_leaks[${i}]: ${before} -> ${after} (ledger)`);
    const leakLabel =
      entry && entry.status === "active" ? formatUsdRange(entry.annual_low, entry.annual_high) : null;
    for (const key of ["summary", "basis", "name"]) {
      if (typeof leak[key] !== "string") continue;
      const rendered = renderLeakPlaceholders(leak[key] as string, { report: totalLabel, leak: leakLabel });
      const r = sanitizeLeakProse(rendered, { allowed: globalAllowed, where: `top_leaks[${i}].${key}` });
      const t = annotateMoneyProse(r.text, {
        defaultCategory: "annual_revenue_loss",
        where: `top_leaks[${i}].${key}`,
      });
      leak[key] = t.text;
      removals.push(...r.removed);
      omissions.push(...t.omitted);
    }

  });

  // ── 3. chapters: allocation of record + sanitized prose ────────────────────
  const chapters = Array.isArray(clone.chapters) ? (clone.chapters as Record<string, unknown>[]) : [];
  for (const ch of chapters) {
    if (!ch || typeof ch !== "object") continue;
    const slug = String(ch.slug || "").toLowerCase();
    const alloc = ledger.chapters.find((c) => c.chapter === slug) || null;
    const before = JSON.stringify({ lo: ch.annual_low, hi: ch.annual_high });
    stripMoneyKeys(ch);
    if (alloc) {
      ch.annual_low = alloc.annual_low;
      ch.annual_high = alloc.annual_high;
    }
    const after = JSON.stringify({ lo: ch.annual_low, hi: ch.annual_high });
    if (before !== after) structuralRewrites.push(`chapter:${slug}: ${before} -> ${after} (ledger)`);

    const allowed = chapterAllowedValues(ledger, slug);
    const chapterLabel = alloc ? formatUsdRange(alloc.annual_low, alloc.annual_high) : null;
    const place = { chapter: chapterLabel, report: totalLabel, leak: chapterLabel };
    for (const key of PROSE_KEYS_CHAPTER) {
      if (typeof ch[key] !== "string") continue;
      const r = sanitizeLeakProse(renderLeakPlaceholders(ch[key] as string, place), { allowed, where: `chapter:${slug}.${key}` });
      // "What it's costing" is the chapter's leak paragraph, so an unlabelled
      // amount there inherits ANNUAL REVENUE LOSS. Narrative fields inherit
      // nothing: an amount they cannot justify is omitted.
      const t = annotateMoneyProse(r.text, {
        defaultCategory: key === "what_its_costing" || key === "cost_basis" ? "annual_revenue_loss" : null,
        where: `chapter:${slug}.${key}`,
      });
      ch[key] = t.text;
      removals.push(...r.removed);
      omissions.push(...t.omitted);
    }
    const wtd = ch.what_to_do as Record<string, unknown> | undefined;
    if (wtd && typeof wtd === "object") {
      for (const [horizon, list] of Object.entries(wtd)) {
        if (!Array.isArray(list)) continue;
        wtd[horizon] = list.map((item) => {
          if (typeof item !== "string") return item;
          const r = sanitizeLeakProse(renderLeakPlaceholders(item, place), { allowed, where: `chapter:${slug}.${horizon}` });
          // Action lines are proposed work: their money is spend, not loss.
          const t = annotateMoneyProse(r.text, {
            defaultCategory: "implementation_investment",
            where: `chapter:${slug}.${horizon}`,
          });
          removals.push(...r.removed);
          omissions.push(...t.omitted);
          return t.text;
        });
      }
    }
    const ev = Array.isArray(ch.evidence) ? (ch.evidence as Record<string, unknown>[]) : [];
    for (const e of ev) {
      // Evidence values are source observations, not modeled leaks: only a
      // sentence that explicitly states an annual leak is redacted.
      if (typeof e?.value !== "string") continue;
      const value = renderLeakPlaceholders(e.value as string, place);
      // The label carries the claim ("annual leak estimate"), so judge the pair
      // together: a bare "$17,200 - $36,500" value reads as neutral on its own.
      const label = typeof e.label === "string" ? (e.label as string) : "";
      const paired = label ? `${label}: ${value}` : value;
      const r = sanitizeLeakProse(paired, { allowed, where: `chapter:${slug}.evidence` });
      if (r.removed.length) {
        e.value = NEUTRAL_LEAK_SENTENCE;
        removals.push(...r.removed);
      } else if (/\$\s?\d/.test(value)) {
        // A surviving dollar amount in evidence is an observed company figure.
        e.value = tagMoney(value, "source_evidence");
        e.money_category = "source_evidence";
        e.money_category_note = MONEY_CATEGORY_NOTE.source_evidence;
      } else {
        e.value = value;
      }
    }
  }

  // ── 4. executive summary + any other top-level prose ───────────────────────
  for (const key of ["executive_summary", "summary", "verdict", "recommendations_summary", "conclusion"]) {
    if (typeof clone[key] !== "string") continue;
    const r = sanitizeLeakProse(renderLeakPlaceholders(clone[key] as string, { report: totalLabel }), { allowed: globalAllowed, where: key });
    const t = annotateMoneyProse(r.text, { defaultCategory: null, where: key });
    clone[key] = t.text;
    removals.push(...r.removed);
    omissions.push(...t.omitted);
  }

  const recs = clone.recommendations;
  if (Array.isArray(recs)) {
    clone.recommendations = recs.map((item, i) => {
      if (typeof item !== "string") return item;
      const r = sanitizeLeakProse(renderLeakPlaceholders(item, { report: totalLabel }), { allowed: globalAllowed, where: `recommendations[${i}]` });
      const t = annotateMoneyProse(r.text, {
        defaultCategory: "implementation_investment",
        where: `recommendations[${i}]`,
      });
      removals.push(...r.removed);
      omissions.push(...t.omitted);
      return t.text;
    });
  }

  return { report: clone as T, ledger, removals, structuralRewrites, omissions };
}


/** Convenience for render paths that only need the cleaned report. */
export function sanitizedGoldenReport<T extends LedgerReportLike | null | undefined>(report: T): T {
  return sanitizeGoldenReportFinancials(report).report;
}
