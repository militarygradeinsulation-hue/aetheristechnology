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

function leakageSection(leakage: GoldenLeakage | null): Section {
  if (!leakage) {
    // Never fabricate a fallback range. The reader is told plainly that the
    // scan produced no priced evidence.
    return {
      id: "leakage",
      title: GOLDEN_LEAKAGE_LABEL,
      newPage: false,
      indexed: false,
      blocks: [
        { kind: "callout", tone: "amber", label: GOLDEN_LEAKAGE_LABEL, text: "Not calculated" },
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
  const q = c.evidence_quality || {};
  const compiler = report.compiler as { state?: string; violations?: { code?: string; location?: string; detail?: string }[] } | undefined;
  const blocks: Block[] = [];
  if (compiler?.state) {
    blocks.push({
      kind: "kv",
      label: "Compiler state",
      value: compiler.state === "compiled" ? "Compiled - consistency checks passed" : "Needs review - checks failed",
    });
  }
  const rows: string[][] = [
    ["Verified", String(q.verified ?? 0), `${q.verified_pct ?? 0}%`],
    ["Inferred", String(q.inferred ?? 0), `${q.inferred_pct ?? 0}%`],
    ["Unverified", String(q.unverified ?? 0), `${q.unverified_pct ?? 0}%`],
    ["Contradicted", String(q.contradicted ?? 0), `${q.contradicted_pct ?? 0}%`],
  ];
  blocks.push({ kind: "table", columns: ["Claim grade", "Count", "Share of claims"], widths: [70, 40, 60], rows });
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
  return { id: "evidence-quality", title: "Evidence Quality", newPage: true, indexed: true, blocks };
}

function topLeaksSection(report: Record<string, unknown>): Section | null {
  const leaks = Array.isArray(report.top_leaks) ? (report.top_leaks as Record<string, unknown>[]) : [];
  if (!leaks.length) return null;
  const blocks: Block[] = [];
  leaks.forEach((l, i) => {
    const rank = str(l.rank) || String(i + 1);
    blocks.push({ kind: "subheading", text: `#${rank} · ${str(l.name) || "Leak"}` });
    const lo = money(l.dollars_low);
    const hi = money(l.dollars_high);
    if (lo || hi) pushIf(blocks, { kind: "kv", label: "Annual cost", value: lo && hi ? `${lo} - ${hi}` : lo || hi });
    // Every remaining saved field on the leak is exported verbatim.
    for (const [k, v] of Object.entries(l)) {
      if (["rank", "name", "dollars_low", "dollars_high"].includes(k)) continue;
      if (Array.isArray(v)) pushIf(blocks, bullets(labelize(k), v));
      else if (has(v)) blocks.push({ kind: "kv", label: labelize(k), value: str(v) });
    }
  });
  return { id: "top-leaks", title: "Top Leaks", newPage: true, indexed: true, blocks };
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

function chapterSection(ch: Record<string, unknown>, idx: number): Section {
  const no = Number(ch.no) || idx + 1;
  const blocks: Block[] = [];
  if (has(ch.verdict)) blocks.push({ kind: "callout", tone: "red", label: "Verdict", text: str(ch.verdict) });
  blocks.push(...block("What we found", ch.what_we_found));
  blocks.push(...block("Why it's leaking", ch.why_its_leaking));
  blocks.push(...block("What it's costing (USD)", ch.what_its_costing));
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
    if (["no", "slug", "title", "verdict", "what_we_found", "why_its_leaking", "what_its_costing", "what_to_do", "evidence"].includes(k)) continue;
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
  "report_state",
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
  const report = (opts.report || {}) as Record<string, unknown>;
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
  sections.push(leakageSection(leakage));
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

  pushIf(sections as never, topLeaksSection(report) as never);

  const d = (report.deliverables || null) as GoldenDeliverables | null;
  if (d) {
    pushIf(sections as never, brandSection(d) as never);
    pushIf(sections as never, imagerySection(d) as never);
    pushIf(sections as never, postsSection(d) as never);
    pushIf(sections as never, scheduleSection(d) as never);
  }

  const chapters = Array.isArray(report.chapters) ? (report.chapters as Record<string, unknown>[]) : [];
  chapters.forEach((ch, i) => sections.push(chapterSection(ch, i)));

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
  const leaves = collectDisplayedLeaves(report);
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
