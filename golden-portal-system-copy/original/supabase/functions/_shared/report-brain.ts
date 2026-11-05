// ============================================================================
// GOLDEN REPORT BRAIN — the single evidence + prompt + money-guard core.
// ----------------------------------------------------------------------------
// Both report-facing AIs share this. There is no second report brain:
//   - forensic-report-chat  : public/shared reader, ADVICE ONLY.
//   - company-system        : authenticated workspace operator, advice + module
//                             control through the audited action bus.
// Financial discipline (ledger sanitisation + output guard) lives here so a
// change can never drift between the two surfaces.
// ============================================================================

import { sanitizedGoldenReport, guardChatMoney } from "./golden-money-sanitizer.ts";

export interface Chapter {
  no: number;
  slug: string;
  title: string;
  verdict?: string;
  what_we_found?: string;
  why_its_leaking?: string;
  what_its_costing?: string;
  what_to_do?: unknown;
  evidence?: unknown;
}

export interface SanitizedReport {
  executive_summary?: string;
  top_leaks?: unknown;
  overall_leakage?: unknown;
  deliverables?: unknown;
  chapters?: Chapter[];
}

export interface ScanLike {
  report: unknown;
  target_url?: string | null;
  company_name?: string | null;
  report_state?: string | null;
}

export function chapterToContext(c: Chapter): string {
  return `### CH ${c.no} — ${c.title} [slug:${c.slug}]
Verdict: ${c.verdict || ""}
${c.what_we_found || ""}

Why it's leaking: ${c.why_its_leaking || ""}
What it's costing: ${c.what_its_costing || ""}
Actions: ${JSON.stringify(c.what_to_do || {})}
Evidence: ${JSON.stringify(c.evidence || [])}`;
}

export interface ReportEvidence {
  company: string;
  report: SanitizedReport;
  /** True when the compiler rejected the financial model: no money may be stated. */
  unpublishable: boolean;
  /** Full chapter-level context block. */
  context: string;
  /** Compact block for surfaces that also carry system context. */
  briefContext: string;
}

/** One evidence builder. The ledger-sanitised report is the only source. */
export function buildReportEvidence(scan: ScanLike, maxChars = 160_000): ReportEvidence {
  const report = sanitizedGoldenReport(scan.report as never) as SanitizedReport;
  const company = scan.company_name || scan.target_url || "this company";
  const unpublishable = scan.report_state === "regeneration_required";
  const money = unpublishable
    ? "## Total annual leakage\nNOT AVAILABLE. This scan's financial model did not pass validation and is queued for regeneration. State no dollar figures for this report."
    : `## Total annual leakage\n${JSON.stringify(report.overall_leakage || {})}`;

  const context = [
    `# Forensic Report — ${company}`,
    `Website: ${scan.target_url || ""}`,
    money,
    `## Executive Summary\n${report.executive_summary || ""}`,
    `## Top Leaks\n${JSON.stringify(report.top_leaks || [])}`,
    ...((report.chapters || []).map(chapterToContext)),
  ].join("\n\n").slice(0, maxChars);

  const briefContext = [
    money,
    `## Executive Summary\n${String(report.executive_summary || "").slice(0, 6000)}`,
    `## Top Leaks\n${JSON.stringify(report.top_leaks || []).slice(0, 8000)}`,
  ].join("\n\n");

  return { company, report, unpublishable, context, briefContext };
}

/** Shared financial rule text. Identical wording on both surfaces. */
export function moneyRules(unpublishable: boolean): string {
  return unpublishable
    ? "FINANCIALS WITHHELD: this scan's pricing did not pass validation. Do not state, estimate or imply ANY dollar figure for this company. Say the financial model is being regenerated and give the non-financial operator advice instead."
    : "USD only, every amount as $X,XXX. Quote only figures present in the report context, in the same scope they appear in. Never add, sum, average, annualize or otherwise derive a new dollar amount.";
}

/** Shared voice rules. */
export const OPERATOR_VOICE = [
  "Lead with the answer. No preamble, no restating the question.",
  "Be concrete: exact steps, who does it, what tool, how long, rough effort, and how they will know it worked.",
  "When you use a report finding, cite it as [Ch <no> — <title>]. When you go beyond the report, say plainly that it is your recommendation rather than a scan finding.",
  "Never invent scan data, numbers, company facts, credentials, integrations or results.",
  "Blunt operator voice, short sentences, no em-dashes, no rhetorical questions, no corporate filler.",
].join("\n- ");

/** One output guard. An unpublishable report allows no figures at all. */
export function guardAnswer(raw: string, ev: ReportEvidence): string {
  return guardChatMoney(raw, ev.unpublishable ? null : (ev.report as never)).text;
}

/** Chapter citations for whatever the model referenced. */
export function citationsFor(answer: string, report: SanitizedReport) {
  const cites: { chapter_no: number; slug: string; title: string }[] = [];
  for (const c of report.chapters || []) {
    if (new RegExp(`Ch\\s*${c.no}\\b`, "i").test(answer)) {
      cites.push({ chapter_no: c.no, slug: c.slug, title: c.title });
    }
  }
  return cites;
}
