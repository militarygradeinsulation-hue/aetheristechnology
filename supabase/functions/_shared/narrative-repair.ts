// ============================================================================
// DETERMINISTIC NARRATIVE REPAIR
// ----------------------------------------------------------------------------
// Removes duplicated prose from Golden Report narrative fields WITHOUT touching
// any protected value. Only these fields are ever written:
//   executive_summary, chapters[].verdict / what_we_found / why_its_leaking /
//   what_its_costing / recommendation(s)
// Evidence, citations, confidence, finding ids, annual_low/high, cost_basis,
// financial_ledger, evidence_ledger and overall_leakage are never read for
// mutation and never written.
// ============================================================================

import {
  collectNarrativeSections,
  validateNarrative,
  validateReportNarrative,
  normalizeText,
  sentences,
  bannedHits,
  THRESHOLDS,
  UNIQUENESS_VERSION,
  type QualityManifest,
} from "./content-uniqueness.ts";

export type NarrativeRepair = {
  path: string;
  before_hash: string;
  after_hash: string;
  reason: string;
};

export type NarrativeRepairResult = {
  report: Record<string, unknown>;
  repairs: NarrativeRepair[];
  manifest: QualityManifest;
  ok: boolean;
};

/** Small stable hash so repairs are auditable without storing prose twice. */
export function textHash(s: unknown): string {
  const t = String(s ?? "");
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < t.length; i++) {
    h1 = (h1 ^ t.charCodeAt(i)) >>> 0;
    h1 = (h1 * 16777619) >>> 0;
    h2 = (h2 + t.charCodeAt(i) * (i + 7)) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`.padStart(16, "0");
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/** Read / write a collected section path such as `chapters[2].verdict`. */
function pathParts(path: string): { chapter: number | null; field: string; index: number | null } {
  const m = path.match(/^chapters\[(\d+)\]\.([a-z_]+)(?:\[(\d+)\])?$/);
  if (!m) return { chapter: null, field: path, index: null };
  return { chapter: Number(m[1]), field: m[2], index: m[3] !== undefined ? Number(m[3]) : null };
}

function readPath(report: Record<string, unknown>, path: string): string {
  const { chapter, field, index } = pathParts(path);
  if (chapter === null) return String(report[field] ?? "");
  const ch = (report.chapters as Record<string, unknown>[])?.[chapter];
  const v = ch?.[field];
  if (index !== null && Array.isArray(v)) return String(v[index] ?? "");
  return String(v ?? "");
}

function writePath(report: Record<string, unknown>, path: string, value: string): void {
  const { chapter, field, index } = pathParts(path);
  if (chapter === null) {
    report[field] = value;
    return;
  }
  const ch = (report.chapters as Record<string, unknown>[])?.[chapter];
  if (!ch) return;
  if (index !== null && Array.isArray(ch[field])) (ch[field] as unknown[])[index] = value;
  else ch[field] = value;
}

/** A distinct, evidence-grounded replacement built from the chapter's own record. */
function distinctLine(report: Record<string, unknown>, path: string): string {
  const { chapter, field } = pathParts(path);
  const ch = chapter === null ? null : (report.chapters as Record<string, unknown>[])?.[chapter];
  const title = String(ch?.title || ch?.slug || "this finding").trim();
  const no = ch?.no ?? (chapter === null ? "" : chapter + 1);
  const actions = ch?.what_to_do;
  const action = Array.isArray(actions)
    ? String((actions[0] as Record<string, unknown>)?.action ?? actions[0] ?? "").trim()
    : String(actions ?? "").trim();
  const label = field.replace(/_/g, " ");
  const base = action
    ? `Tracked separately under finding ${no} ${title}. The action of record for this ${label} is: ${action}.`
    : `Tracked separately under finding ${no} ${title}. This ${label} is carried by that finding alone and is not restated from any earlier section.`;
  return base.replace(/\s+/g, " ").trim();
}

/**
 * Strip sentences already used by an earlier section, then fall back to a
 * distinct evidence-grounded line if nothing original survives.
 */
export function repairReportNarrative(input: Record<string, unknown>): NarrativeRepairResult {
  const report = input;
  const sections = collectNarrativeSections(report);
  const repairs: NarrativeRepair[] = [];

  const seenSentences = new Set<string>();
  const seenSections: string[] = [];

  for (const s of sections) {
    const original = readPath(report, s.path);
    const norm = normalizeText(original);
    let reason = "";

    // 1. Drop long sentences that an earlier section already owns.
    const kept: string[] = [];
    for (const sent of sentences(original)) {
      const n = normalizeText(sent);
      const long = wordCount(sent) >= THRESHOLDS.longSentenceWords;
      if (long && seenSentences.has(n)) {
        reason = reason || "repeated_sentence";
        continue;
      }
      kept.push(sent.trim());
    }
    let next = kept.join(" ").replace(/\s+/g, " ").trim();

    // 2. Whole-section duplication or banned filler.
    const dupSection = seenSections.some((p) => p && p === normalizeText(next || original));
    if (dupSection) reason = reason || "exact_duplicate";
    if (bannedHits(next).length) reason = reason || "banned_phrase";

    if (dupSection || bannedHits(next).length || wordCount(next) < 12) {
      if (reason || wordCount(next) < 12) {
        if (wordCount(original) >= 12 || reason) {
          next = distinctLine(report, s.path);
          reason = reason || "insufficient_original_content";
        }
      }
    }

    if (next && normalizeText(next) !== norm) {
      writePath(report, s.path, next);
      repairs.push({
        path: s.path,
        before_hash: textHash(original),
        after_hash: textHash(next),
        reason: reason || "deduplicated",
      });
    }

    const finalText = readPath(report, s.path);
    for (const sent of sentences(finalText)) {
      if (wordCount(sent) >= THRESHOLDS.longSentenceWords) seenSentences.add(normalizeText(sent));
    }
    seenSections.push(normalizeText(finalText));
  }

  const gate = validateReportNarrative(report);
  return { report, repairs, manifest: gate.manifest, ok: gate.ok };
}

/** Gate + manifest without mutation, for audits. */
export function narrativeQuality(report: Record<string, unknown> | null | undefined) {
  const gate = validateNarrative(collectNarrativeSections(report));
  return { ok: gate.ok, manifest: gate.manifest, offendingPaths: gate.offendingPaths, version: UNIQUENESS_VERSION };
}
