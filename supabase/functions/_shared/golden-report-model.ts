// ─────────────────────────────────────────────────────────────────────────────
// Golden Report — SHARED NORMALIZED VIEW MODEL
//
// This is the single interpretation of a saved Golden Report. The website /
// portal report view and every PDF export read the SAME saved report through
// this normalizer, so a section can never be rendered on screen and quietly
// summarized, shortened or replaced in the export.
//
// Rules enforced here:
//  • No AI, no network, no re-synthesis. Pure function of the saved report.
//  • No truncation, no ellipsis, no character limits. Full saved strings only.
//  • No fabricated numbers. The leakage headline comes exclusively from
//    computeGoldenLeakage(report) (canonical `overall_leakage` first).
// ─────────────────────────────────────────────────────────────────────────────

import { computeGoldenLeakage, GOLDEN_LEAKAGE_LABEL, type GoldenLeakage } from "./golden-leakage.ts";
import {
  resolveFinancialLedger,
  needsFinancialRegeneration,
  REGENERATION_LABEL,
  chapterAllocation,
  crossReferencedIn,
  formatUsdRangeAscii,
  NON_PRICEABLE_CHAPTER_SLUGS,
  FINANCIAL_BASIS_LABEL,
  type FinancialBasis,
  type FinancialLedger,
  type LedgerEntry,
} from "./golden-ledger.ts";

import { sanitizeGoldenReportFinancials, FINANCIAL_METHODOLOGY_NOTE } from "./golden-money-sanitizer.ts";
import {
  MONEY_CATEGORY_LABEL,
  MONEY_CATEGORY_NOTE,
  MONEY_TAXONOMY_LEGEND,
  CHAPTER_ALLOCATION_NOTE,
  crossReferenceNote,
  topTenSumNote,
  tagMoney,
} from "./golden-money-taxonomy.ts";

import { buildEvidenceConfidence, EVIDENCE_CONFIDENCE_TITLE } from "./golden-evidence-confidence.ts";



export type GoldenDeliverables = {
  brand?: {
    positioning?: string;
    target_audience?: string;
    voice?: { summary?: string; do?: string[]; dont?: string[] };
    messaging_pillars?: { title?: string; detail?: string }[];
    value_proposition?: string;
    differentiators?: string[];
    color_guidance?: { summary?: string; palette?: { role?: string; hex?: string; use?: string }[] };
    typography_guidance?: { headline?: string; body?: string; notes?: string };
    corrections?: { issue?: string; fix?: string }[];
  } | null;
  imagery?: {
    visual_style?: string;
    subjects?: string[];
    composition?: string;
    lighting?: string;
    color_treatment?: string;
    show?: string[];
    avoid?: string[];
    prompts?: { title?: string; prompt?: string }[];
  } | null;
  posts?: { platform?: string; hook?: string; body?: string; cta?: string; visual?: string }[] | null;
  schedule?: {
    overview?: string;
    days?: { day?: number; platform?: string; time?: string; purpose?: string; topic?: string; visual?: string }[];
  } | null;
  generated_at?: string;
};

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "kv"; label: string; value: string }
  | { kind: "bullets"; label?: string; items: string[] }
  | { kind: "mono"; label?: string; lines: string[] }
  | { kind: "callout"; tone: "red" | "amber" | "blue"; label?: string; text: string }
  | { kind: "table"; label?: string; columns: string[]; widths: number[]; rows: string[][] };

export type Section = {
  /** Stable id, also used by the parity audit and the clickable PDF index. */
  id: string;
  title: string;
  kicker?: string;
  /** Chapters and major parts open a fresh PDF page. */
  newPage: boolean;
  /** Listed in the PDF index. */
  indexed: boolean;
  blocks: Block[];
};

export type GoldenReportModel = {
  meta: {
    company: string;
    url: string;
    scanId: string;
    generatedAt: Date;
    askUrl: string;
  };
  /** Canonical annual revenue loss, or null when the report has no evidence. */
  leakage: GoldenLeakage | null;
  sections: Section[];
};

/** Anything the report carries that is machinery rather than reader-facing prose. */
const NON_DISPLAY_KEYS = new Set([
  "compiler",
  "evidence_ledger",
  "compiled_findings",
  "root_causes",
  "priced_leaks",
  "report_consistency",
  "overall_leakage",
  "synth_fallback",
  "deliverables_status",
]);

const str = (v: unknown): string => (v == null ? "" : String(v)).trim();
const has = (v: unknown): boolean => str(v).length > 0;

function money(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) return `$${Math.round(v).toLocaleString("en-US")}`;
  const s = String(v).trim();
  return s.startsWith("$") ? s : `$${s}`;
}

function paragraphs(text: string): Block[] {
  // Saved prose uses blank lines between paragraphs. Every paragraph is kept.
  return str(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ kind: "paragraph", text: p }) as Block);
}

function pushIf(blocks: Block[], b: Block | null) {
  if (b) blocks.push(b);
}

function bullets(label: string, items?: unknown): Block | null {
  const list = Array.isArray(items) ? items.map(str).filter(Boolean) : [];
  return list.length ? { kind: "bullets", label, items: list } : null;
}

function block(label: string, body?: unknown): Block[] {
  if (!has(body)) return [];
  return [{ kind: "subheading", text: label }, ...paragraphs(str(body))];
}

// ───────────────────────── sections ─────────────────────────

function leakageSection(leakage: GoldenLeakage | null, needsRegen = false): Section {
  if (!leakage) {
    // Never fabricate a fallback range. The reader is told plainly that the
    // scan produced no priced evidence.
    return {
      id: "leakage",
      title: GOLDEN_LEAKAGE_LABEL,
      newPage: false,
      indexed: false,
      blocks: [
        {
          kind: "callout",
          tone: "amber",
          label: GOLDEN_LEAKAGE_LABEL,
          text: needsRegen ? REGENERATION_LABEL : "Not calculated",
        },
        {
          kind: "paragraph",
          text:
            "This scan produced no priced leak evidence, so no annual revenue loss figure is calculated for this report. Re-run the scan to price the findings.",
        },
      ],
    };
  }
  return {
    id: "leakage",
    title: GOLDEN_LEAKAGE_LABEL,
    newPage: false,
    indexed: false,
    blocks: [
      { kind: "callout", tone: "red", label: GOLDEN_LEAKAGE_LABEL, text: `${leakage.rangeLabelAscii} / year` },
      { kind: "kv", label: "Money category", value: MONEY_CATEGORY_LABEL.annual_revenue_loss },
      { kind: "paragraph", text: MONEY_TAXONOMY_LEGEND },
      { kind: "paragraph", text: leakage.caption },

      { kind: "kv", label: "Priced leaks counted", value: String(leakage.count) },
      { kind: "kv", label: "Source", value: leakage.source },
      { kind: "kv", label: "Currency", value: leakage.currency },
    ],
  };
}

/** Degradation warning the website shows above the report body. */
function degradedSection(report: Record<string, unknown>): Section | null {
  const sf = report.synth_fallback as
    | { degraded?: boolean; chapters_fallback?: unknown[]; chapters_total?: number }
    | undefined;
  if (!sf || typeof sf !== "object" || !sf.degraded) return null;
  const fell = Array.isArray(sf.chapters_fallback) ? sf.chapters_fallback.length : 0;
  const total = Number(sf.chapters_total) || 14;
  return {
    id: "degraded",
    title: "Degraded - AI synthesis unavailable",
    newPage: false,
    indexed: false,
    blocks: [
      {
        kind: "callout",
        tone: "amber",
        label: "Degraded - AI synthesis unavailable",
        text: `${fell} of ${total} chapters fell back to template benchmark text instead of scan evidence. Re-run this scan before sending it to a client.`,
      },
    ],
  };
}


type ConsistencyLike = {
  evidence_quality?: Record<string, number>;
  canonical_counts_sentence?: string;
  detected_findings?: number;
  uniquely_priced_leaks?: number;
  unique_root_causes?: number;
  site_type?: string;
};

function evidenceSection(report: Record<string, unknown>): Section | null {
  const c = report.report_consistency as ConsistencyLike | undefined;
  if (!c || typeof c !== "object") return null;
  const confidence = buildEvidenceConfidence(report);
  if (!confidence) return null;
  const compiler = report.compiler as { state?: string; violations?: { code?: string; location?: string; detail?: string }[] } | undefined;
  const blocks: Block[] = [];

  if (confidence.lead) blocks.push({ kind: "paragraph", text: confidence.lead });
  if (confidence.metrics.length) {
    blocks.push({
      kind: "table",
      columns: ["Measure", "Count"],
      widths: [120, 50],
      rows: confidence.metrics.map((m) => [m.label, String(m.value)]),
    });
  }
  blocks.push({ kind: "paragraph", text: confidence.explanation });

  // Methodology notes appendix: detailed grades kept for transparency.
  blocks.push({ kind: "paragraph", text: `Methodology notes. ${confidence.methodologyNote}` });
  if (confidence.methodologyRows.length) {
    blocks.push({
      kind: "table",
      columns: ["Evidence basis", "Claims"],
      widths: [120, 50],
      rows: confidence.methodologyRows.map((r) => [r.label, String(r.value)]),
    });
  }
  if (has(c.canonical_counts_sentence)) blocks.push({ kind: "paragraph", text: str(c.canonical_counts_sentence) });
  if (c.detected_findings != null) blocks.push({ kind: "kv", label: "Detected findings", value: String(c.detected_findings) });
  if (c.uniquely_priced_leaks != null) blocks.push({ kind: "kv", label: "Uniquely priced leaks", value: String(c.uniquely_priced_leaks) });
  if (c.unique_root_causes != null) blocks.push({ kind: "kv", label: "Unique root causes", value: String(c.unique_root_causes) });
  if (has(c.site_type)) blocks.push({ kind: "kv", label: "Site type", value: str(c.site_type) });
  // Any consistency field added later is exported instead of silently dropped.
  for (const [k, v] of Object.entries(c as Record<string, unknown>)) {
    if (["evidence_quality", "canonical_counts_sentence", "detected_findings", "uniquely_priced_leaks", "unique_root_causes", "site_type"].includes(k)) continue;
    if (Array.isArray(v)) pushIf(blocks, bullets(labelize(k), v.map(str)));
    else if (has(v) && typeof v !== "object") blocks.push({ kind: "kv", label: labelize(k), value: str(v) });
  }
  if (compiler?.violations?.length) {
    blocks.push({
      kind: "mono",
      label: "Open consistency violations",
      lines: compiler.violations.map((v) => `${str(v.code)} · ${str(v.location)}: ${str(v.detail)}`),
    });
  }
  return { id: "evidence-quality", title: EVIDENCE_CONFIDENCE_TITLE, newPage: true, indexed: true, blocks };
}


/**
 * The canonical global Top 10. Sorted by annual_high desc, then annual_low
 * desc, then title, then leak_id — a documented, deterministic rule. Every
 * number here is a ledger entry; nothing is recomputed.
 */
/** Auditable proof that every surface agrees, rendered on web and PDF alike. */
function reconciliationSection(ledger: FinancialLedger): Section | null {
  const r = ledger.reconciliation;
  if (!ledger.overall) return null;
  return {
    id: "financial-reconciliation",
    title: "Financial Reconciliation",
    newPage: false,
    indexed: false,
    blocks: [
      { kind: "paragraph", text: FINANCIAL_METHODOLOGY_NOTE },
      { kind: "kv", label: "Model version", value: String(r.model_version) },
      { kind: "kv", label: "Priced leaks", value: String(r.priced_count) },
      { kind: "kv", label: "Unpriced findings", value: String(r.unpriced_count) },
      { kind: "kv", label: "Ledger total", value: formatUsdRangeAscii(r.ledger_total_low, r.ledger_total_high) },
      { kind: "kv", label: "Chapter allocation total", value: formatUsdRangeAscii(r.chapter_total_low, r.chapter_total_high) },
      { kind: "kv", label: "Top 10 subtotal", value: formatUsdRangeAscii(r.top10_subtotal_low, r.top10_subtotal_high) },
      { kind: "kv", label: "Remainder subtotal", value: formatUsdRangeAscii(r.remainder_low, r.remainder_high) },
      { kind: "kv", label: "Duplicates removed", value: String(r.duplicate_count) },
      { kind: "kv", label: "Invariants", value: r.invariant_status },
      ...(r.violations.length ? [{ kind: "mono" as const, label: "Reconciliation issues", lines: r.violations.map((v) => `${v.code}: ${v.detail}`) }] : []),
    ],
  };
}

function topLeaksSection(ledger: FinancialLedger, chapterRef: (slug: string) => string | number): Section | null {
  if (!ledger.active.length || !ledger.overall) return null;
  const t = ledger.top10;
  const subtotal = formatUsdRangeAscii(t.subtotal_low, t.subtotal_high);
  const remainder = formatUsdRangeAscii(t.remainder_low, t.remainder_high);
  const total = formatUsdRangeAscii(ledger.overall.annual_low, ledger.overall.annual_high);
  const blocks: Block[] = [
    { kind: "kv", label: "Scope", value: t.label },
    { kind: "kv", label: "Money category", value: MONEY_CATEGORY_LABEL.annual_revenue_loss },
  ];
  for (const e of t.entries) {
    blocks.push({ kind: "subheading", text: `#${e.rank} · ${e.title}` });
    blocks.push({
      kind: "kv",
      label: "Annual cost",
      value: tagMoney(formatUsdRangeAscii(e.annual_low, e.annual_high), "annual_revenue_loss"),
    });
    blocks.push({ kind: "kv", label: "Allocated to chapter", value: e.primary_chapter });
    if (e.pricing_basis) blocks.push({ kind: "kv", label: "Pricing basis", value: e.pricing_basis });
  }
  blocks.push({
    kind: "kv",
    label: "Top 10 subtotal",
    value: tagMoney(subtotal, "annual_revenue_loss"),
  });
  if (t.remaining_count > 0) {
    blocks.push({ kind: "kv", label: "Remaining priced leaks", value: String(t.remaining_count) });
    blocks.push({
      kind: "kv",
      label: "Remainder subtotal",
      value: tagMoney(remainder, "annual_revenue_loss"),
    });
    // The remainder is itemised so no priced leak is ever hidden from the reader.
    blocks.push({ kind: "subheading", text: `Remaining ${t.remaining_count} priced leaks` });
    for (const e of t.remainder) {
      blocks.push({
        kind: "kv",
        label: e.title,
        value: tagMoney(formatUsdRangeAscii(e.annual_low, e.annual_high), "annual_revenue_loss"),
      });
      blocks.push({ kind: "kv", label: `${e.title} · chapter`, value: e.primary_chapter });
      if (e.pricing_basis) blocks.push({ kind: "kv", label: `${e.title} · basis`, value: e.pricing_basis });
    }
  }
  blocks.push({
    kind: "kv",
    label: "Report total",
    value: tagMoney(total, "annual_revenue_loss"),
  });
  // Exact sum relationship, spelled out so the three figures can never read as
  // three competing totals.
  blocks.push({ kind: "paragraph", text: topTenSumNote(subtotal, t.remaining_count, remainder, total) });
  // Leaks that are real findings but whose money is already carried by their
  // chapter. Shown for completeness, never added to a total a second time.
  const absorbed = ledger.entries.filter((e) => e.status === "included_in_chapter" || e.status === "duplicate");
  if (absorbed.length) {
    blocks.push({ kind: "subheading", text: "Also identified (already counted in a chapter total)" });
    for (const e of absorbed) {
      blocks.push({ kind: "kv", label: e.title, value: crossReferenceNote(chapterRef(e.primary_chapter)) });
      if (e.pricing_basis) blocks.push({ kind: "kv", label: `${e.title} · basis`, value: e.pricing_basis });
      for (const x of e.cross_referenced_chapters) {
        blocks.push({ kind: "kv", label: `${e.title} · also discussed in`, value: x });
      }
    }
  }
  return { id: "top-leaks", title: "Top 10 Active Leaks (Ranked by $ Exposure)", newPage: true, indexed: true, blocks };
}


function labelize(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function brandSection(d: GoldenDeliverables): Section | null {
  const b = d.brand;
  if (!b) return null;
  const blocks: Block[] = [];
  if (has(b.value_proposition)) blocks.push({ kind: "callout", tone: "amber", label: "Value Proposition", text: str(b.value_proposition) });
  blocks.push(...block("Positioning", b.positioning));
  blocks.push(...block("Target Audience", b.target_audience));
  if (b.voice) {
    blocks.push(...block("Voice", b.voice.summary));
    pushIf(blocks, bullets("Voice · Do", b.voice.do));
    pushIf(blocks, bullets("Voice · Don't", b.voice.dont));
  }
  if (b.messaging_pillars?.length) {
    blocks.push({ kind: "subheading", text: "Messaging Pillars" });
    for (const p of b.messaging_pillars) {
      if (has(p.title)) blocks.push({ kind: "kv", label: str(p.title), value: str(p.detail) });
      else if (has(p.detail)) blocks.push({ kind: "paragraph", text: str(p.detail) });
    }
  }
  pushIf(blocks, bullets("Differentiators", b.differentiators));
  if (b.color_guidance) {
    blocks.push({ kind: "subheading", text: "Color Guidance" });
    if (has(b.color_guidance.summary)) blocks.push({ kind: "paragraph", text: str(b.color_guidance.summary) });
    const palette = b.color_guidance.palette || [];
    if (palette.length) {
      blocks.push({
        kind: "table",
        columns: ["Hex", "Role", "Use"],
        widths: [28, 38, 104],
        rows: palette.map((c) => [str(c.hex), str(c.role), str(c.use)]),
      });
    }
  }
  if (b.typography_guidance) {
    blocks.push({ kind: "subheading", text: "Typography" });
    if (has(b.typography_guidance.headline)) blocks.push({ kind: "kv", label: "Headline", value: str(b.typography_guidance.headline) });
    if (has(b.typography_guidance.body)) blocks.push({ kind: "kv", label: "Body", value: str(b.typography_guidance.body) });
    if (has(b.typography_guidance.notes)) blocks.push({ kind: "paragraph", text: str(b.typography_guidance.notes) });
  }
  if (b.corrections?.length) {
    blocks.push({ kind: "subheading", text: "Corrections From The Scan" });
    for (const c of b.corrections) {
      if (has(c.issue)) blocks.push({ kind: "callout", tone: "red", label: "Issue", text: str(c.issue) });
      if (has(c.fix)) blocks.push({ kind: "paragraph", text: `Fix: ${str(c.fix)}` });
    }
  }
  emitUnknown(blocks, b, [
    "positioning", "target_audience", "voice", "messaging_pillars", "value_proposition",
    "differentiators", "color_guidance", "typography_guidance", "corrections",
  ]);
  return blocks.length ? { id: "brand", title: "Brand Blueprint", kicker: "GROWTH ASSETS", newPage: true, indexed: true, blocks } : null;
}

function imagerySection(d: GoldenDeliverables): Section | null {
  const im = d.imagery;
  if (!im) return null;
  const blocks: Block[] = [];
  blocks.push(...block("Visual Style", im.visual_style));
  pushIf(blocks, bullets("Subjects", im.subjects));
  blocks.push(...block("Composition", im.composition));
  blocks.push(...block("Lighting", im.lighting));
  blocks.push(...block("Color Treatment", im.color_treatment));
  pushIf(blocks, bullets("Show", im.show));
  pushIf(blocks, bullets("Avoid", im.avoid));
  if (im.prompts?.length) {
    blocks.push({ kind: "subheading", text: "Ready To Use Image Prompts" });
    im.prompts.forEach((p, i) => {
      blocks.push({ kind: "kv", label: `Prompt ${i + 1}`, value: str(p.title) || `Prompt ${i + 1}` });
      if (has(p.prompt)) blocks.push({ kind: "mono", lines: [str(p.prompt)] });
    });
  }
  emitUnknown(blocks, im, [
    "visual_style", "subjects", "composition", "lighting", "color_treatment", "show", "avoid", "prompts",
  ]);
  return blocks.length ? { id: "imagery", title: "Imagery Direction", kicker: "GROWTH ASSETS", newPage: true, indexed: true, blocks } : null;
}

function postsSection(d: GoldenDeliverables): Section | null {
  const posts = d.posts || [];
  if (!posts.length) return null;
  const blocks: Block[] = [];
  posts.forEach((p, i) => {
    blocks.push({ kind: "subheading", text: `${str(p.platform) || "Post"} · ${String(i + 1).padStart(2, "0")}` });
    if (has(p.hook)) blocks.push({ kind: "callout", tone: "blue", label: "Hook", text: str(p.hook) });
    if (has(p.body)) blocks.push(...paragraphs(str(p.body)));
    if (has(p.cta)) blocks.push({ kind: "kv", label: "CTA", value: str(p.cta) });
    if (has(p.visual)) blocks.push({ kind: "kv", label: "Visual", value: str(p.visual) });
    emitUnknown(blocks, p, ["platform", "hook", "body", "cta", "visual"]);
  });
  return { id: "posts", title: `Ready To Publish Posts (${posts.length})`, kicker: "GROWTH ASSETS", newPage: true, indexed: true, blocks };
}

function scheduleSection(d: GoldenDeliverables): Section | null {
  const sched = d.schedule;
  const days = sched?.days || [];
  if (!sched) return null;
  const blocks: Block[] = [];
  if (has(sched.overview)) blocks.push(...paragraphs(str(sched.overview)));
  if (days.length) {
    blocks.push({
      kind: "table",
      columns: ["Day", "Platform", "Time", "Purpose", "Topic", "Visual"],
      widths: [10, 20, 20, 22, 50, 48],
      rows: days.map((r, i) => [
        str(r.day ?? i + 1),
        str(r.platform),
        str(r.time),
        str(r.purpose),
        str(r.topic),
        str(r.visual),
      ]),
    });
    // Any extra field saved on a day is exported below the table.
    days.forEach((r, i) => {
      const extra: Block[] = [];
      emitUnknown(extra, r, ["day", "platform", "time", "purpose", "topic", "visual"]);
      if (extra.length) {
        blocks.push({ kind: "subheading", text: `Day ${str(r.day ?? i + 1)} detail` });
        blocks.push(...extra);
      }
    });
  }
  emitUnknown(blocks, sched, ["overview", "days"]);
  if (!blocks.length) return null;
  return { id: "schedule", title: `Content Schedule (${days.length} days)`, kicker: "GROWTH ASSETS", newPage: true, indexed: true, blocks };
}

function chapterSection(ch: Record<string, unknown>, idx: number, ledger: FinancialLedger): Section {
  const no = Number(ch.no) || idx + 1;
  const slug = String(ch.slug || "").toLowerCase();
  const blocks: Block[] = [];
  const rollup = NON_PRICEABLE_CHAPTER_SLUGS.has(slug);
  const alloc = chapterAllocation(ledger, slug);
  if (rollup) {
    // Roll-up chapters never carry their own money: they render the canonical
    // global view so no second Top 10 total can exist.
    blocks.push({
      kind: "kv",
      label: "Financial allocation",
      value: "None — this chapter summarises leaks priced in other chapters.",
    });
    if (ledger.overall) {
      blocks.push({ kind: "kv", label: "Canonical view", value: ledger.top10.label });
      blocks.push({
        kind: "kv",
        label: "Top 10 subtotal",
        value: tagMoney(formatUsdRangeAscii(ledger.top10.subtotal_low, ledger.top10.subtotal_high), "annual_revenue_loss"),
      });
      blocks.push({
        kind: "kv",
        label: "Report total",
        value: tagMoney(formatUsdRangeAscii(ledger.overall.annual_low, ledger.overall.annual_high), "annual_revenue_loss"),
      });
    }
  } else {
    blocks.push({
      kind: "kv",
      label: "Chapter annual allocation",
      value: alloc
        ? tagMoney(formatUsdRangeAscii(alloc.annual_low, alloc.annual_high), "annual_revenue_loss")
        : "Not priced",
    });
    if (alloc) blocks.push({ kind: "kv", label: "Category", value: CHAPTER_ALLOCATION_NOTE });
    for (const x of crossReferencedIn(ledger, slug)) {
      blocks.push({
        kind: "kv",
        label: `Cross-referenced · ${x.title}`,
        value: crossReferenceNote(no),
      });
    }
  }

  if (has(ch.verdict)) blocks.push({ kind: "callout", tone: "red", label: "Verdict", text: str(ch.verdict) });
  blocks.push(...block("What we found", ch.what_we_found));
  blocks.push(...block("Why it's leaking", ch.why_its_leaking));
  if (!rollup) blocks.push(...block("What it's costing (USD)", ch.what_its_costing));
  const wtd = ch.what_to_do as Record<string, unknown> | undefined;
  if (wtd && typeof wtd === "object") {
    blocks.push({ kind: "subheading", text: "What to do" });
    for (const [k, v] of Object.entries(wtd)) pushIf(blocks, bullets(labelize(k), v));
  }
  const ev = Array.isArray(ch.evidence) ? (ch.evidence as Record<string, unknown>[]) : [];
  if (ev.length) {
    blocks.push({
      kind: "mono",
      label: "Evidence",
      lines: ev.map((e) => `${str(e.label)}: ${str(e.value)}`),
    });
  }
  // Any additional saved chapter field is exported rather than silently dropped.
  for (const [k, v] of Object.entries(ch)) {
    if (["no", "slug", "title", "verdict", "what_we_found", "why_its_leaking", "what_its_costing", "what_to_do", "evidence", "annual_low", "annual_high"].includes(k)) continue;
    if (Array.isArray(v)) pushIf(blocks, bullets(labelize(k), v.map(str)));
    else if (has(v) && typeof v !== "object") blocks.push({ kind: "kv", label: labelize(k), value: str(v) });
  }
  return {
    id: `chapter-${no}`,
    title: str(ch.title) || `Chapter ${no}`,
    kicker: `CHAPTER ${String(no).padStart(2, "0")}`,
    newPage: true,
    indexed: true,
    blocks,
  };
}
/** Top-level report keys already owned by a dedicated section above. */
const CLAIMED_KEYS = new Set([
  "executive_summary",
  "top_leaks",
  "chapters",
  "deliverables",
  
  "generated_at",
]);

/** Recursively renders any saved value into blocks, losing nothing. */
function emitValue(blocks: Block[], label: string, v: unknown) {
  if (v == null) return;
  if (Array.isArray(v)) {
    if (!v.length) return;
    if (v.every((x) => typeof x !== "object" || x === null)) {
      pushIf(blocks, bullets(label, v.map(str)));
    } else {
      blocks.push({ kind: "subheading", text: label });
      v.forEach((x, i) => emitValue(blocks, `${label} ${i + 1}`, x));
    }
    return;
  }
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x != null);
    if (!entries.length) return;
    blocks.push({ kind: "subheading", text: label });
    for (const [k, x] of entries) emitValue(blocks, labelize(k), x);
    return;
  }
  if (!has(v)) return;
  blocks.push({ kind: "kv", label, value: str(v) });
}

/**
 * Renders every key of `obj` that the caller did not already handle. This is
 * what makes new Golden Report fields flow into the export automatically.
 */
function emitUnknown(blocks: Block[], obj: unknown, known: string[]) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
  const skip = new Set(known);
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (skip.has(k) || NON_DISPLAY_KEYS.has(k) || k === "slug" || k === "generated_at") continue;
    emitValue(blocks, labelize(k), v);
  }
}

/**
 * Renders every saved top-level field that no dedicated section claims.
 * This is the safety net that makes future Golden Report schema additions flow
 * into the PDF automatically instead of disappearing.
 */
function extrasSection(report: Record<string, unknown>): Section | null {
  const blocks: Block[] = [];
  emitUnknown(blocks, report, [...CLAIMED_KEYS]);
  return blocks.length
    ? { id: "additional-report-data", title: "Additional Report Data", newPage: true, indexed: true, blocks }
    : null;
}


/**
 * Build the one view model both the on-screen report and the PDF read from.
 * Everything the website shows for a scan is represented here, in the same
 * logical order, with the saved text untouched.
 */
export function buildGoldenReportModel(opts: {
  report: Record<string, unknown> | null | undefined;
  company: string;
  url: string;
  scanId: string;
  generatedAt?: Date;
}): GoldenReportModel {
  // ONE financial source for every surface: the persisted ledger when present,
  // otherwise rebuilt deterministically from the same stored evidence. The
  // report is sanitized FIRST, so no structured field or prose sentence can
  // carry a leak amount the ledger does not back.
  const sanitized = sanitizeGoldenReportFinancials((opts.report || {}) as Record<string, unknown>);
  const report = sanitized.report as Record<string, unknown>;
  const ledger = sanitized.ledger;
  const leakage = computeGoldenLeakage(report as never);
  const sections: Section[] = [];

  sections.push({
    id: "case-metadata",
    title: "Case Metadata",
    newPage: false,
    indexed: false,
    blocks: [
      { kind: "kv", label: "Company", value: opts.company || opts.url },
      { kind: "kv", label: "Target", value: opts.url },
      { kind: "kv", label: "Scan ID", value: opts.scanId },
    ],
  });

  pushIf(sections as never, degradedSection(report) as never);
  sections.push(leakageSection(leakage, needsFinancialRegeneration(report as never)));
  pushIf(sections as never, reconciliationSection(ledger) as never);
  pushIf(sections as never, evidenceSection(report) as never);

  if (has(report.executive_summary)) {
    sections.push({
      id: "executive-summary",
      title: "Executive Summary",
      newPage: true,
      indexed: true,
      blocks: paragraphs(str(report.executive_summary)),
    });
  }

  // Chapter numbers let cross-reference labels name an exact chapter instead of
  // a slug, so "Already included in Chapter 4" is literally true in the export.
  const chapterList = Array.isArray(report.chapters) ? (report.chapters as Record<string, unknown>[]) : [];
  const chapterNoBySlug = new Map<string, number>();
  chapterList.forEach((ch, i) => {
    const s = String(ch?.slug || "").toLowerCase();
    if (s) chapterNoBySlug.set(s, Number(ch?.no) || i + 1);
  });
  const chapterRef = (slug: string) => chapterNoBySlug.get(String(slug).toLowerCase()) ?? slug;

  pushIf(sections as never, topLeaksSection(ledger, chapterRef as never) as never);


  const d = (report.deliverables || null) as GoldenDeliverables | null;
  if (d) {
    pushIf(sections as never, brandSection(d) as never);
    pushIf(sections as never, imagerySection(d) as never);
    pushIf(sections as never, postsSection(d) as never);
    pushIf(sections as never, scheduleSection(d) as never);
    const extra: Block[] = [];
    emitUnknown(extra, d, ["brand", "imagery", "posts", "schedule"]);
    if (extra.length) {
      sections.push({
        id: "growth-assets-extra",
        title: "Growth Assets - Additional Detail",
        kicker: "GROWTH ASSETS",
        newPage: true,
        indexed: true,
        blocks: extra,
      });
    }
  }

  const chapters = Array.isArray(report.chapters) ? (report.chapters as Record<string, unknown>[]) : [];
  chapters.forEach((ch, i) => sections.push(chapterSection(ch, i, ledger)));

  // ── FUTURE-PROOF CATCH-ALL ──
  // Any saved top-level field that no section above claims is rendered here, so
  // a new Golden Report field can never be silently dropped from the export.
  pushIf(sections as never, extrasSection(report) as never);


  return {
    meta: {
      company: opts.company || opts.url,
      url: opts.url,
      scanId: opts.scanId,
      generatedAt: opts.generatedAt || new Date(),
      askUrl: `https://aetheris.technology/report/${opts.scanId}/ask`,
    },
    leakage,
    sections,
  };
}

// ───────────────────────── parity audit ─────────────────────────

export type ParityIssue = { path: string; reason: "missing" | "changed"; excerpt: string };
export type ParityResult = {
  ok: boolean;
  checkedLeaves: number;
  issues: ParityIssue[];
  sectionCount: number;
  blockCount: number;
};

/** Every reader-facing string in the saved report, with its JSON path. */
export function collectDisplayedLeaves(report: unknown, base = ""): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (node: unknown, path: string) => {
    if (node == null) return;
    if (typeof node === "string") {
      const v = node.trim();
      if (v) out.push([path, v]);
      return;
    }
    if (typeof node === "number" || typeof node === "boolean") return; // numbers are rendered formatted
    if (Array.isArray(node)) {
      node.forEach((n, i) => walk(n, `${path}[${i}]`));
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (!path && NON_DISPLAY_KEYS.has(k)) continue;
        // `slug` is an internal identifier, never shown to the reader.
        if (k === "slug" || k === "generated_at") continue;
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(report, base);
  return out;
}

export function modelText(model: GoldenReportModel): string {
  const parts: string[] = [model.meta.company, model.meta.url, model.meta.scanId];
  for (const s of model.sections) {
    parts.push(s.title, s.kicker || "");
    for (const b of s.blocks) {
      switch (b.kind) {
        case "paragraph":
        case "subheading":
          parts.push(b.text);
          break;
        case "kv":
          parts.push(b.label, b.value);
          break;
        case "bullets":
          parts.push(b.label || "", ...b.items);
          break;
        case "mono":
          parts.push(b.label || "", ...b.lines);
          break;
        case "callout":
          parts.push(b.label || "", b.text);
          break;
        case "table":
          parts.push(b.label || "", ...b.columns, ...b.rows.flat());
          break;
      }
    }
  }
  return parts.join("\n");
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Deterministic fidelity gate: every substantive string the website renders
 * from the saved report must appear, unchanged and unsummarized, in the PDF
 * render model. Interactive controls (buttons, tabs, copy actions) have no
 * saved content and therefore never appear here.
 */
export function auditGoldenReportParity(
  report: unknown,
  model: GoldenReportModel,
): ParityResult {
  const haystack = norm(modelText(model));
  // Parity is measured against the SANITIZED report — that is what every
  // surface renders. A stale prose amount is removed by design, not "missing".
  const leaves = collectDisplayedLeaves(sanitizeGoldenReportFinancials(report as never).report);
  const issues: ParityIssue[] = [];
  for (const [path, value] of leaves) {
    const needle = norm(value);
    if (!needle) continue;
    if (!haystack.includes(needle)) {
      issues.push({ path, reason: "missing", excerpt: needle.slice(0, 160) });
    }
  }
  return {
    ok: issues.length === 0,
    checkedLeaves: leaves.length,
    issues,
    sectionCount: model.sections.length,
    blockCount: model.sections.reduce((n, s) => n + s.blocks.length, 0),
  };
}
