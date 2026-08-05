// ═══════════════════════════════════════════════════════════════════════════
// GOLDEN REPORT — MONEY TAXONOMY (presentation safeguard)
//
// The ledger already guarantees the arithmetic. This layer guarantees the
// READING: every dollar value a client can see carries — or inherits — one of
// four semantic categories, so a legitimate company price, an implementation
// budget or a recovery projection can never be mistaken for a second annual
// leak total.
//
//   ANNUAL REVENUE LOSS        canonical ledger value, inside the overall total
//   SOURCE EVIDENCE            observed company amount, not added to the total
//   IMPLEMENTATION INVESTMENT  proposed spend, not added to the total
//   RECOVERY SCENARIO          modeled recoverable subset, not a second total
//
// An amount that cannot be reliably placed in one of those four categories is
// OMITTED rather than rendered as ambiguous money.
//
// This file performs NO arithmetic. It never changes a ledger figure.
// Both runtimes import it: Deno edge functions directly, the Vite app through
// src/lib/goldenMoneyTaxonomy.ts, so web and PDF cannot drift.
// ═══════════════════════════════════════════════════════════════════════════

export type MoneyCategory =
  | "annual_revenue_loss"
  | "source_evidence"
  | "implementation_investment"
  | "recovery_scenario";

export const MONEY_CATEGORY_LABEL: Record<MoneyCategory, string> = {
  annual_revenue_loss: "ANNUAL REVENUE LOSS",
  source_evidence: "SOURCE EVIDENCE",
  implementation_investment: "IMPLEMENTATION INVESTMENT",
  recovery_scenario: "RECOVERY SCENARIO",
};

export const MONEY_CATEGORY_NOTE: Record<MoneyCategory, string> = {
  annual_revenue_loss: "Included in total annual revenue loss.",
  source_evidence: "Source evidence. Not a separate leak total.",
  implementation_investment:
    "Implementation investment. Not included in the annual revenue loss total.",
  recovery_scenario: "Recovery scenario. Not a second annual revenue loss total.",
};

/** Sentence appended wherever roadmap spend or recovery projections appear. */
export const PLANNING_FIGURES_NOTE =
  "These planning figures are not added to the annual revenue loss total.";

/** Label under every chapter financial allocation. */
export const CHAPTER_ALLOCATION_NOTE = MONEY_CATEGORY_NOTE.annual_revenue_loss;

/** Label for a leak whose money is carried by another chapter's total. */
export function crossReferenceNote(chapter: string | number): string {
  const ref =
    typeof chapter === "number" || /^\d+$/.test(String(chapter).trim())
      ? `Chapter ${chapter}`
      : String(chapter).trim();
  return `Already included in ${ref}. Not counted again.`;
}

/** Explicit sum relationship printed under the Top 10. */
export function topTenSumNote(
  subtotal: string,
  remainderCount: number,
  remainder: string,
  total: string,
): string {
  return remainderCount > 0
    ? `Top 10 subtotal ${subtotal} plus the remaining ${remainderCount} priced leaks ${remainder} equals the total annual revenue loss ${total}. All three figures are ANNUAL REVENUE LOSS values from the same ledger.`
    : `The Top 10 subtotal ${subtotal} is the total annual revenue loss ${total}; there are no further priced leaks. Both figures are ANNUAL REVENUE LOSS values from the same ledger.`;
}

/** `$1,000 – $2,000 (RECOVERY SCENARIO)` — idempotent. */
export function tagMoney(value: string, category: MoneyCategory): string {
  const label = MONEY_CATEGORY_LABEL[category];
  const v = String(value ?? "").trim();
  if (!v || v.includes(`(${label})`)) return v;
  return `${v} (${label})`;
}

// ───────────────────────── classification ─────────────────────────

const CATEGORY_PATTERNS: Array<{ category: MoneyCategory; re: RegExp }> = [
  {
    category: "source_evidence",
    re: new RegExp(
      [
        "average|avg\\.?|median|typical|observed|stated|listed|advertised|quoted",
        "(?:job|order|deal|contract|project|invoice|transaction|basket|cart|ticket)\\s+(?:value|size|price|amount)",
        "\\bAOV\\b|\\bACV\\b|\\bARPU\\b|\\bMSRP\\b|\\bARR\\b|\\bMRR\\b",
        "salary|salaries|payroll|compensation|hourly rate|day rate|wage",
        "list(?:ed)? price|price point|priced at|pricing page|starting at|per (?:unit|seat|licen[cs]e|user|hour|month)",
        "revenue of|turnover of|published price",
      ].join("|"),
      "gi",
    ),
  },
  {
    category: "implementation_investment",
    re: new RegExp(
      [
        "invest(?:ment|ing)?|spend(?:ing)?|budget|retainer|fee|subscription cost",
        "cost to (?:fix|implement|build|deploy)|implementation cost|setup cost|build cost",
        "to implement|one-?time cost|project cost|engagement cost",
      ].join("|"),
      "gi",
    ),
  },
  {
    category: "recovery_scenario",
    re: new RegExp(
      [
        "recover(?:y|ed|ing|able|s)?|recaptur\\w*|reclaim\\w*|recoup\\w*|win back|earn back",
        "upside|payback|return on invest\\w*|\\bROI\\b|projected (?:gain|return|lift|revenue)",
        "scenario|if (?:you|they) fix",
      ].join("|"),
      "gi",
    ),
  },
  {
    category: "annual_revenue_loss",
    re: new RegExp(
      [
        "annual(?:ly|ised|ized)?\\s+(?:revenue\\s+)?(?:loss|losses|leak|leakage|exposure|cost|impact|bleed)",
        "(?:loss|leak|leakage|exposure|cost|impact)\\s+(?:per|a|each)\\s+year",
        "revenue (?:loss|leak|leakage)|lost revenue|leak (?:estimate|total|range|value)",
        "per year|/\\s?year|a year|annually|exposure|leaking|bleeding|is costing|costing",
      ].join("|"),
      "gi",
    ),
  },
];

/** Tie-break order when two keywords sit at the same distance. */
const PRIORITY: MoneyCategory[] = [
  "source_evidence",
  "implementation_investment",
  "recovery_scenario",
  "annual_revenue_loss",
];

const WINDOW = 80;
/** Nothing further away than this can classify an amount. */
const MAX_DISTANCE = 60;

export const MONEY_TOKEN_RE =
  /\$\s?\d[\d,]*(?:\.\d+)?\s*(?:k|m|million|thousand|bn|billion)?/gi;

/**
 * Classifies ONE amount by the nearest category keyword around it.
 * Returns null when nothing credible is within range — the caller must then
 * inherit a field-level category or omit the amount entirely.
 */
export function classifyMoneyAt(text: string, index: number, length: number): MoneyCategory | null {
  const start = Math.max(0, index - WINDOW);
  const before = text.slice(start, index);
  const after = text.slice(index + length, index + length + WINDOW);

  let best: { category: MoneyCategory; distance: number } | null = null;
  for (const { category, re } of CATEGORY_PATTERNS) {
    let distance = Infinity;
    re.lastIndex = 0;
    for (const m of before.matchAll(re)) {
      const d = before.length - ((m.index ?? 0) + m[0].length);
      if (d < distance) distance = d;
    }
    re.lastIndex = 0;
    for (const m of after.matchAll(re)) {
      const d = m.index ?? 0;
      if (d < distance) distance = d;
    }
    if (distance > MAX_DISTANCE) continue;
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && PRIORITY.indexOf(category) < PRIORITY.indexOf(best.category))
    ) {
      best = { category, distance };
    }
  }
  return best?.category ?? null;
}

export type ClassifiedAmount = {
  token: string;
  index: number;
  category: MoneyCategory | null;
};

/** Every dollar token in a text with its resolved category. */
export function classifyMoneyAmounts(text: string): ClassifiedAmount[] {
  const out: ClassifiedAmount[] = [];
  for (const m of String(text ?? "").matchAll(MONEY_TOKEN_RE)) {
    const index = m.index ?? 0;
    out.push({ token: m[0], index, category: classifyMoneyAt(text, index, m[0].length) });
  }
  return out;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])(\s+)/).reduce<string[]>((acc, part, i) => {
    if (i % 2 === 0) acc.push(part);
    else acc[acc.length - 1] += part;
    return acc;
  }, []);
}

export type AnnotateOptions = {
  /** Category every unclassified amount in this field inherits. */
  defaultCategory?: MoneyCategory | null;
  /** Human location used in omission logs. */
  where?: string;
};

export type AnnotateResult = { text: string; omitted: string[] };

/**
 * Renders a prose field so no dollar value is category-less.
 *
 *  • Planning money (investment / recovery) is labelled inline and the sentence
 *    gains the explicit "not added to the annual revenue loss total" note.
 *  • Source evidence is labelled and marked as not a separate leak total.
 *  • Annual revenue loss keeps the ledger wording it already carries.
 *  • A sentence holding an amount that cannot be classified and has no field
 *    default is OMITTED rather than shown as ambiguous money.
 */
export function annotateMoneyProse(text: string, opts: AnnotateOptions = {}): AnnotateResult {
  const input = String(text ?? "");
  if (!input.trim() || !/\$\s?\d/.test(input)) return { text: input, omitted: [] };

  const where = opts.where || "text";
  const omitted: string[] = [];

  const kept = splitSentences(input).map((sentence) => {
    const trailing = sentence.match(/\s*$/)?.[0] ?? "";
    const core = sentence.slice(0, sentence.length - trailing.length);
    if (!/\$\s?\d/.test(core)) return sentence;

    const amounts = classifyMoneyAmounts(core).map((a) => ({
      ...a,
      category: a.category ?? opts.defaultCategory ?? null,
    }));

    if (amounts.some((a) => a.category == null)) {
      omitted.push(
        `${where}: omitted unclassifiable amount(s) ${amounts
          .filter((a) => a.category == null)
          .map((a) => a.token.trim())
          .join(", ")}`,
      );
      return "";
    }

    // Label planning + evidence money inline, right to left so indices hold.
    let out = core;
    for (const a of [...amounts].reverse()) {
      if (a.category === "annual_revenue_loss") continue;
      const label = MONEY_CATEGORY_LABEL[a.category as MoneyCategory];
      const after = out.slice(a.index + a.token.length);
      // Skip the second half of a range and anything already labelled.
      if (/^\s*(?:-|–|—|to|and)\s*\$/i.test(after)) continue;
      if (after.trimStart().startsWith(`(${label})`)) continue;
      out = `${out.slice(0, a.index + a.token.length)} (${label})${after}`;
    }

    const cats = new Set(amounts.map((a) => a.category as MoneyCategory));
    const notes: string[] = [];
    if (cats.has("implementation_investment") || cats.has("recovery_scenario")) {
      // Check the whole text: the note becomes its own sentence, so a
      // sentence-local check would re-append it on every pass.
      if (!input.includes(PLANNING_FIGURES_NOTE)) notes.push(PLANNING_FIGURES_NOTE);
    }
    if (cats.has("source_evidence") && !cats.has("annual_revenue_loss")) {
      const n = MONEY_CATEGORY_NOTE.source_evidence;
      if (!input.includes(n)) notes.push(n);
    }
    // Leak money stays unlabelled inline (the amounts read as prose), but the
    // sentence still states the category so nothing is left ambiguous.
    if (cats.has("annual_revenue_loss")) {
      const n = `${MONEY_CATEGORY_LABEL.annual_revenue_loss}. ${MONEY_CATEGORY_NOTE.annual_revenue_loss}`;
      if (!input.includes(MONEY_CATEGORY_NOTE.annual_revenue_loss)) notes.push(n);
    }

    if (!notes.length) return out + trailing;
    const punctuated = /[.!?]$/.test(out.trim()) ? out : `${out}.`;
    return `${punctuated} ${notes.join(" ")}${trailing || " "}`;
  });

  const text2 = kept.join("").replace(/[ \t]{2,}/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  return { text: text2, omitted };
}

/** Reader-facing key to the four categories, printed once per report. */
export const MONEY_TAXONOMY_LEGEND = [
  "How to read the money in this report.",
  `${MONEY_CATEGORY_LABEL.annual_revenue_loss}: ${MONEY_CATEGORY_NOTE.annual_revenue_loss}`,
  `${MONEY_CATEGORY_LABEL.source_evidence}: ${MONEY_CATEGORY_NOTE.source_evidence}`,
  `${MONEY_CATEGORY_LABEL.implementation_investment}: ${MONEY_CATEGORY_NOTE.implementation_investment}`,
  `${MONEY_CATEGORY_LABEL.recovery_scenario}: ${MONEY_CATEGORY_NOTE.recovery_scenario}`,
].join(" ");
