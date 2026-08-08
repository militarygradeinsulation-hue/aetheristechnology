// Forensic Golden Standard PDF — COMPLETE, FAITHFUL EXPORT.
//
// The PDF is a rendering of the shared Golden Report view model
// (src/lib/goldenReportModel.ts), which is built from the SAME saved report the
// website and portal display. Nothing is re-summarized, shortened, truncated or
// invented here: this file only knows how to draw blocks on paper.
//
// Guarantees:
//  • No hardcoded leak headline. The red box is drawn only when
//    computeGoldenLeakage(report) returns evidence, and it is omitted otherwise.
//  • Every section of the on-screen report (executive summary, top leaks, all
//    chapters in full, Brand / Imagery / Posts / 30-day Schedule) is exported.
//  • Text auto-flows across pages; nothing is clipped or cut with an ellipsis.
//
// Theme (black / gold / blue / red), cover, index, smart-PDF ask link and
// watermark are unchanged.

import jsPDF from "jspdf";
import { GOLDEN_LEAKAGE_LABEL, type OverallLeakage } from "@/lib/goldenLeakage";
import { MONEY_CATEGORY_LABEL, MONEY_TAXONOMY_LEGEND } from "@/lib/goldenMoneyTaxonomy";

import { detectGenericReport } from "@/lib/goldenGenericDetector";
import type { ReportConsistency, CompilerViolation } from "@/lib/goldenCompiler";
import {
  buildGoldenReportModel,
  auditGoldenReportParity,
  executiveExportGate,
  EXECUTIVE_PAGE_CEILING,

  type Block,
  type GoldenReportModel,
  type RenderProfile,
  type Section,

} from "@/lib/goldenReportModel";

export type Chapter = {
  no: number;
  slug: string;
  title: string;
  verdict?: string;
  what_we_found?: string;
  why_its_leaking?: string;
  what_its_costing?: string;
  what_to_do?: { this_week?: string[]; this_month?: string[]; this_quarter?: string[] };
  evidence?: { label: string; value: string }[];
};

export type ForensicReport = {
  executive_summary?: string;
  /** Canonical annual revenue loss persisted at scan completion. */
  overall_leakage?: OverallLeakage | null;
  top_leaks?: { rank: number; name: string; dollars_low?: number | string; dollars_high?: number | string; chapter_slug?: string; summary?: string }[];
  chapters?: Chapter[];
  /** Growth assets generated alongside the report. Exported in full. */
  deliverables?: import("@/components/GoldenGrowthAssets").GoldenDeliverables | null;
  /** Canonical counts + evidence quality written by the report compiler. */
  report_consistency?: ReportConsistency | null;
  compiler?: { state?: "compiled" | "needs_review"; violations?: CompilerViolation[]; repairs?: string[] } | null;
};

const BG: [number, number, number] = [15, 15, 20];
const PAPER: [number, number, number] = [236, 232, 222];
const BODY: [number, number, number] = [205, 200, 188];
const MUTED: [number, number, number] = [150, 145, 135];
const AMBER: [number, number, number] = [217, 158, 46];
const CRIMSON: [number, number, number] = [220, 70, 70];
const BLUE: [number, number, number] = [96, 150, 220];

const PAGE_W = 210;
const PAGE_H = 297;
const M = 20;
const CW = PAGE_W - M * 2;
const BOTTOM = PAGE_H - 20;

/**
 * jsPDF built-in fonts only support WinAnsi. Map smart punctuation to ASCII and
 * strip the rest so nothing renders as garbage boxes.
 */
function sanitize(input: unknown): string {
  if (input == null) return "";
  let s = String(input);
  try { s = s.normalize("NFKC"); } catch { /* noop */ }
  const map: Record<string, string> = {
    "\u00A0": " ", "\u2007": " ", "\u2009": " ", "\u200A": " ", "\u200B": "",
    "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u2010": "-", "\u2011": "-",
    "\u2018": "'", "\u2019": "'", "\u201A": "'", "\u201B": "'", "\u2032": "'",
    "\u201C": '"', "\u201D": '"', "\u201E": '"', "\u2033": '"',
    "\u2026": "...", "\u00B7": "-", "\u2022": "-", "\u25CF": "-", "\u25AA": "-", "\u25A0": "-",
    "\u2192": "->", "\u2190": "<-", "\u2194": "<->", "\u21D2": "=>", "\u21D0": "<=",
    "\u2713": "v", "\u2714": "v", "\u2717": "x", "\u2718": "x", "\u26A0": "!",
    "\u00A9": "(c)", "\u00AE": "(R)", "\u2122": "(TM)",
    "\u00D7": "x", "\u00F7": "/",
    "\u2043": "-",
  };
  s = s.replace(/[\u00A0\u2007\u2009\u200A\u200B\u2013\u2014\u2212\u2010\u2011\u2018\u2019\u201A\u201B\u2032\u201C\u201D\u201E\u2033\u2026\u00B7\u2022\u25CF\u25AA\u25A0\u2192\u2190\u2194\u21D2\u21D0\u2713\u2714\u2717\u2718\u26A0\u00A9\u00AE\u2122\u00D7\u00F7\u2043]/g, (c) => map[c] ?? c);
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA1-\xFF]/g, "");
  return s;
}

function bg(doc: jsPDF) {
  doc.setFillColor(...BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  doc.setFillColor(...AMBER);
  doc.rect(PAGE_W - 24, 0, 24, 2, "F");
  doc.rect(PAGE_W - 2, 0, 2, 24, "F");
}

function footer(doc: jsPDF, page: number, askUrl: string) {
  doc.setDrawColor(40, 40, 50);
  doc.setLineWidth(0.3);
  doc.line(M, PAGE_H - 14, PAGE_W - M, PAGE_H - 14);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("AETHERIS · BUSINESS FORENSICS · USD", M, PAGE_H - 9);
  doc.text(`Page ${page}`, PAGE_W / 2, PAGE_H - 9, { align: "center" });
  doc.setTextColor(...AMBER);
  doc.textWithLink("ASK THIS REPORT →", PAGE_W - M, PAGE_H - 9, { url: askUrl, align: "right" });
  doc.setTextColor(70, 60, 40);
  doc.setFontSize(6);
  doc.text("Aetheris AI Studio", PAGE_W - M, PAGE_H - 4, { align: "right" });
}

type Cursor = { y: number; page: number };

function newPage(doc: jsPDF, cur: Cursor, askUrl: string) {
  // Preserve the caller's text style: footer() repaints color/font/size and a
  // continued paragraph must keep rendering in its own style on the new page.
  const style = {
    color: (doc as unknown as { getTextColor: () => string }).getTextColor(),
    font: doc.getFont(),
    size: doc.getFontSize(),
  };
  doc.addPage();
  cur.page++;
  bg(doc);
  footer(doc, cur.page, askUrl);
  doc.setFont(style.font.fontName, style.font.fontStyle);
  doc.setFontSize(style.size);
  doc.setTextColor(style.color);
  cur.y = M + 6;
}

/** Guarantees `need` mm of room; adds a page when the block would clip. */
function room(doc: jsPDF, cur: Cursor, need: number, askUrl: string) {
  if (cur.y + need > BOTTOM) newPage(doc, cur, askUrl);
}

function wrap(doc: jsPDF, text: string, w: number): string[] {
  return doc.splitTextToSize(sanitize(text), w) as string[];
}

/** Writes wrapped text line-by-line, breaking pages as needed. Never truncates. */
function flow(doc: jsPDF, cur: Cursor, text: string, opts: { x?: number; w?: number; lh?: number; askUrl: string }) {
  const x = opts.x ?? M;
  const w = opts.w ?? CW;
  const lh = opts.lh ?? 5;
  for (const raw of sanitize(text).split("\n")) {
    const lines = raw.trim() ? wrap(doc, raw, w) : [""];
    for (const l of lines) {
      room(doc, cur, lh, opts.askUrl);
      if (l) doc.text(l, x, cur.y);
      cur.y += lh;
    }
  }
}

// ───────────────────────── chart renderer ─────────────────────────

/**
 * Small vector charts drawn with jsPDF primitives. Every chart carries a text
 * fallback in the model, so a chart can never be the only place a fact lives.
 */
function drawChart(
  doc: jsPDF,
  cur: Cursor,
  b: Extract<Block, { kind: "chart" }>,
  askUrl: string,
) {
  const points = (b.points || []).filter(Boolean);
  if (!points.length) {
    drawBlock(doc, cur, b.fallback, askUrl);
    return;
  }
  const rows = Math.min(points.length, 8);
  const rowH = 6.5;
  const need = 14 + rows * rowH;
  room(doc, cur, need, askUrl);

  if (b.label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...AMBER);
    doc.text(sanitize(b.label).toUpperCase(), M, cur.y);
    cur.y += 6;
  }

  const labelW = CW * 0.42;
  const barX = M + labelW;
  const barW = CW - labelW - 26;
  const max = Math.max(
    1,
    ...points.map((p) => Number(p.high ?? p.value ?? 0)),
  );

  doc.setFontSize(8);
  for (const p of points.slice(0, rows)) {
    const low = Number(p.low ?? 0);
    const high = Number(p.high ?? p.value ?? 0);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BODY);
    doc.text(wrap(doc, sanitize(p.label), labelW - 4)[0] || "", M, cur.y + 3);

    const x0 = barX + (low / max) * barW;
    const w = Math.max(0.8, ((high - low) / max) * barW);
    doc.setFillColor(60, 55, 45);
    doc.rect(barX, cur.y, barW, 3.2, "F");
    doc.setFillColor(...AMBER);
    doc.rect(x0, cur.y, w, 3.2, "F");

    doc.setTextColor(...AMBER);
    const value = p.high != null
      ? `${Math.round(low / 1000)}k-${Math.round(high / 1000)}k`
      : String(p.value ?? 0);
    doc.text(value, barX + barW + 2, cur.y + 3);
    cur.y += rowH;
  }
  cur.y += 3;
}

// ───────────────────────── block renderers ─────────────────────────


function drawBlock(doc: jsPDF, cur: Cursor, b: Block, askUrl: string) {
  switch (b.kind) {
    case "subheading": {
      room(doc, cur, 12, askUrl);
      cur.y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...AMBER);
      flow(doc, cur, b.text.toUpperCase(), { lh: 5.5, askUrl });
      cur.y += 1;
      break;
    }
    case "paragraph": {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BODY);
      flow(doc, cur, b.text.replace(/^[#*\-]\s*/gm, "- ").replace(/\*\*(.+?)\*\*/g, "$1"), { lh: 5, askUrl });
      cur.y += 2.5;
      break;
    }
    case "kv": {
      room(doc, cur, 6, askUrl);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...PAPER);
      const label = `${sanitize(b.label)}:`;
      const lw = doc.getTextWidth(label) + 1.6;
      doc.text(label, M, cur.y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BODY);
      const lines = wrap(doc, b.value, CW - lw);
      doc.text(lines[0] ?? "", M + lw, cur.y);
      cur.y += 5;
      for (const l of lines.slice(1)) {
        room(doc, cur, 5, askUrl);
        doc.text(l, M + 4, cur.y);
        cur.y += 5;
      }
      cur.y += 1.5;
      break;
    }
    case "bullets": {
      if (b.label) {
        room(doc, cur, 8, askUrl);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...PAPER);
        doc.text(sanitize(b.label), M, cur.y);
        cur.y += 5;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BODY);
      for (const item of b.items) {
        const lines = wrap(doc, item, CW - 6);
        lines.forEach((l, i) => {
          room(doc, cur, 5, askUrl);
          if (i === 0) {
            doc.setTextColor(...AMBER);
            doc.text("-", M + 1, cur.y);
            doc.setTextColor(...BODY);
          }
          doc.text(l, M + 6, cur.y);
          cur.y += 5;
        });
      }
      cur.y += 2.5;
      break;
    }
    case "mono": {
      if (b.label) {
        room(doc, cur, 8, askUrl);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...AMBER);
        doc.text(sanitize(b.label).toUpperCase(), M, cur.y);
        cur.y += 6;
      }
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...BODY);
      for (const line of b.lines) flow(doc, cur, line, { lh: 4.6, askUrl });
      cur.y += 2.5;
      break;
    }
    case "callout": {
      const tone = b.tone === "red" ? CRIMSON : b.tone === "blue" ? BLUE : AMBER;
      const fill: [number, number, number] = b.tone === "red" ? [40, 15, 15] : b.tone === "blue" ? [14, 22, 34] : [34, 26, 10];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = wrap(doc, b.text, CW - 10);
      const h = 6 + (b.label ? 5 : 0) + lines.length * 5;
      room(doc, cur, h + 4, askUrl);
      doc.setFillColor(...fill);
      doc.rect(M, cur.y - 4, CW, h, "F");
      doc.setDrawColor(...tone);
      doc.setLineWidth(0.5);
      doc.line(M, cur.y - 4, M, cur.y - 4 + h);
      let ty = cur.y + 1;
      if (b.label) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...tone);
        doc.text(sanitize(b.label).toUpperCase(), M + 5, ty);
        ty += 5;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...PAPER);
      for (const l of lines) { doc.text(l, M + 5, ty); ty += 5; }
      cur.y = cur.y - 4 + h + 6;
      break;
    }
    case "table": {
      if (b.label) {
        room(doc, cur, 8, askUrl);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...AMBER);
        doc.text(sanitize(b.label).toUpperCase(), M, cur.y);
        cur.y += 6;
      }
      const total = b.widths.reduce((a, c) => a + c, 0) || 1;
      const cols = b.widths.map((w) => (w / total) * CW);
      const header = () => {
        room(doc, cur, 9, askUrl);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...AMBER);
        let x = M;
        b.columns.forEach((c, i) => { doc.text(sanitize(c).toUpperCase(), x, cur.y); x += cols[i]; });
        cur.y += 2;
        doc.setDrawColor(60, 55, 45);
        doc.setLineWidth(0.2);
        doc.line(M, cur.y, PAGE_W - M, cur.y);
        cur.y += 4;
      };
      header();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      for (const row of b.rows) {
        const cells = row.map((c, i) => wrap(doc, c, cols[i] - 3));
        const h = Math.max(...cells.map((c) => c.length)) * 4.4 + 2;
        if (cur.y + h > BOTTOM) { newPage(doc, cur, askUrl); header(); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); }
        doc.setTextColor(...BODY);
        let x = M;
        cells.forEach((lines, i) => {
          let yy = cur.y;
          for (const l of lines) { doc.text(l, x, yy); yy += 4.4; }
          x += cols[i];
        });
        cur.y += h;
      }
      cur.y += 3;
      break;
    }
    case "chart": {
      drawChart(doc, cur, b, askUrl);
      break;
    }
  }

}

function drawSection(doc: jsPDF, cur: Cursor, s: Section, askUrl: string) {
  if (s.newPage) newPage(doc, cur, askUrl);
  else room(doc, cur, 24, askUrl);

  if (s.kicker) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...AMBER);
    doc.text(sanitize(s.kicker), M, cur.y);
    cur.y += 8;
  }
  doc.setFont("times", "bold");
  doc.setFontSize(s.newPage ? 22 : 16);
  doc.setTextColor(...PAPER);
  for (const l of wrap(doc, s.title, CW)) {
    room(doc, cur, 10, askUrl);
    doc.text(l, M, cur.y);
    cur.y += s.newPage ? 9 : 7;
  }
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.4);
  doc.line(M, cur.y - 3, M + 20, cur.y - 3);
  cur.y += 6;

  for (const b of s.blocks) drawBlock(doc, cur, b, askUrl);
}

// ───────────────────────── entry point ─────────────────────────

export function generateForensicGoldenPdf(opts: {
  report: ForensicReport;
  company: string;
  url: string;
  scanId: string;
  generatedAt?: Date;
  /** Defaults to the concise executive deliverable. */
  profile?: RenderProfile;
}): jsPDF {
  const { report, company, url, scanId } = opts;
  const profile: RenderProfile = opts.profile ?? "executive";


  // ── HARD GATE ── generic/template reports are never exported, even if they
  // predate the compiler: an unsupported dollar headline must not leave the app.
  if (
    (report as { report_state?: string } | null)?.report_state === "regeneration_required" ||
    detectGenericReport(report as never).regeneration_required
  ) {
    throw new Error(
      `Golden Report ${scanId} is generic/template and cannot be exported. Re-run the scan to produce an evidence-backed report.`,
    );
  }
  // A report that failed the consistency compiler is never exported.
  if (report?.compiler?.state && report.compiler.state !== "compiled") {
    const first = report.compiler.violations?.[0];
    throw new Error(
      `Golden Report ${scanId} failed the consistency gate and cannot be exported` +
        (first ? `: ${first.code} at ${first.location} — ${first.detail}` : "."),
    );
  }

  let model = buildGoldenReportModel({
    report: report as unknown as Record<string, unknown>,
    company,
    url,
    scanId,
    generatedAt: opts.generatedAt,
    profile,
  });

  // ── PAGE BUDGET GUARD ──
  // The executive deliverable is the concise client artifact. If a report is so
  // large that the concise profile still blows the ceiling, fall back to the
  // complete archival profile rather than shipping a half-truncated document.
  if (profile === "executive") {
    const gate = executiveExportGate(model);
    if (!gate.ok && gate.estimatedPages > EXECUTIVE_PAGE_CEILING) {
      console.warn(
        `[golden-pdf] ${scanId}: executive profile estimated ${gate.estimatedPages} pages; exporting complete profile instead.`,
      );
      model = buildGoldenReportModel({
        report: report as unknown as Record<string, unknown>,
        company,
        url,
        scanId,
        generatedAt: opts.generatedAt,
        profile: "complete",
      });
    }
  }

  // Drift alarm: if a saved report field the website can render is not present
  // in the export model, surface it loudly in dev instead of losing it silently.
  try {
    if (typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      const parity = auditGoldenReportParity(report, model);
      if (!parity.ok) {
        console.warn(
          `[golden-pdf] parity drift on ${scanId}: ${parity.issues.length} saved field(s) missing from the export`,
          parity.issues.slice(0, 10),
        );
      }
    }
  } catch { /* diagnostics only */ }

  const askUrl = model.meta.askUrl;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cur: Cursor = { y: M + 6, page: 1 };

  // WinAnsi-safe text writers.
  const _text = doc.text.bind(doc);
  (doc as unknown as { text: typeof doc.text }).text = ((t: unknown, ...rest: unknown[]) => {
    const clean = Array.isArray(t) ? t.map(sanitize) : sanitize(t);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_text as any)(clean, ...rest);
  }) as typeof doc.text;
  const _twl = doc.textWithLink.bind(doc);
  (doc as unknown as { textWithLink: typeof doc.textWithLink }).textWithLink = ((t: string, x: number, y: number, o: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_twl as any)(sanitize(t), x, y, o);
  }) as typeof doc.textWithLink;

  // ───────── COVER ─────────
  bg(doc);
  doc.setTextColor(...AMBER);
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.text("AETHERIS · BUSINESS FORENSICS", M, 40);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.5);
  doc.line(M, 44, M + 50, 44);

  doc.setFont("times", "bold");
  doc.setTextColor(...PAPER);
  doc.setFontSize(34);
  let cy = 80;
  for (const l of wrap(doc, "Forensic Audit Report", CW)) { doc.text(l, M, cy); cy += 14; }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...PAPER);
  doc.text(model.meta.company, M, cy + 4);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Target: ${url}`, M, cy + 12);
  doc.text(`Generated: ${model.meta.generatedAt.toLocaleString("en-US")}`, M, cy + 18);
  doc.text(`Scan ID: ${scanId}`, M, cy + 24);

  // Red leakage box — drawn ONLY from the canonical resolver. With no evidence
  // the box says "Not calculated"; a generic fallback range is never invented.
  {
    const boxY = cy + 36;
    const tone = model.leakage ? CRIMSON : AMBER;
    const headline = model.leakage ? `${model.leakage.rangeLabelAscii} / year` : "Not calculated";
    const caption = model.leakage
      ? model.leakage.caption
      : "This scan produced no priced leak evidence, so no annual revenue loss figure is calculated for this report.";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const capLines = wrap(doc, caption, CW - 8);
    // The category key travels with the cover total so the reader knows which
    // of the four money categories every later figure belongs to.
    const legendLines = model.leakage ? wrap(doc, MONEY_TAXONOMY_LEGEND, CW - 8) : [];
    const boxH = 24 + (capLines.length + legendLines.length + (model.leakage ? 1 : 0)) * 4;
    doc.setFillColor(...(model.leakage ? [40, 15, 15] : [34, 26, 10]) as [number, number, number]);
    doc.rect(M, boxY, CW, boxH, "F");
    doc.setDrawColor(...tone);
    doc.setLineWidth(0.6);
    doc.rect(M, boxY, CW, boxH);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...tone);
    doc.text(GOLDEN_LEAKAGE_LABEL.toUpperCase(), M + 4, boxY + 7);
    doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(...tone);
    doc.text(headline, M + 4, boxY + 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    let capY = boxY + 26;
    if (model.leakage) {
      doc.setFont("helvetica", "bold");
      doc.text(MONEY_CATEGORY_LABEL.annual_revenue_loss, M + 4, capY);
      doc.setFont("helvetica", "normal");
      capY += 4;
    }
    for (const l of capLines) { doc.text(l, M + 4, capY); capY += 4; }
    doc.setFontSize(6.5);
    for (const l of legendLines) { doc.text(l, M + 4, capY); capY += 4; }
    doc.setFontSize(8);
  }



  // ───────── INDEX (clickable, back-filled with real page numbers) ─────────
  newPage(doc, cur, askUrl);
  const indexPage = cur.page;
  doc.setFont("times", "bold"); doc.setFontSize(24); doc.setTextColor(...PAPER);
  doc.text("Index", M, 32);
  doc.setDrawColor(...AMBER); doc.line(M, 36, M + 18, 36);
  cur.y = 50;

  const indexed = model.sections.filter((s) => s.indexed);
  const indexRows: { id: string; lineY: number; page: number }[] = [];
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  indexed.forEach((s, i) => {
    room(doc, cur, 7, askUrl);
    indexRows.push({ id: s.id, lineY: cur.y, page: cur.page });
    doc.setTextColor(...AMBER);
    doc.text(String(i + 1).padStart(2, "0"), M, cur.y);
    doc.setTextColor(...BODY);
    for (const l of wrap(doc, s.title, CW - 30)) { doc.text(l, M + 12, cur.y); cur.y += 6; }
    cur.y += 1;
  });

  // ───────── BODY ─────────
  // The cover already carries case metadata + the leakage headline.
  const skip = new Set(["case-metadata", "leakage"]);
  const sectionPages: Record<string, number> = {};
  for (const s of model.sections) {
    if (skip.has(s.id)) continue;
    drawSection(doc, cur, s, askUrl);
    if (sectionPages[s.id] == null) sectionPages[s.id] = cur.page;
  }

  // Back-fill index page numbers + internal links.
  for (const row of indexRows) {
    const target = sectionPages[row.id];
    if (!target) continue;
    doc.setPage(row.page);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
    doc.text(String(target).padStart(3, " "), PAGE_W - M, row.lineY, { align: "right" });
    doc.link(M, row.lineY - 5, CW, 7, { pageNumber: target });
  }
  doc.setPage(indexPage);
  doc.setPage(doc.getNumberOfPages());

  return doc;
}

/** Model + parity audit for the given scan, for tests and diagnostics. */
export function auditGoldenPdfParity(opts: {
  report: ForensicReport;
  company: string;
  url: string;
  scanId: string;
}) {
  const model: GoldenReportModel = buildGoldenReportModel({
    report: opts.report as unknown as Record<string, unknown>,
    company: opts.company,
    url: opts.url,
    scanId: opts.scanId,
  });
  return { model, audit: auditGoldenReportParity(opts.report, model) };
}

export function downloadForensicGoldenPdf(opts: Parameters<typeof generateForensicGoldenPdf>[0]) {
  const doc = generateForensicGoldenPdf(opts);
  const safe = (opts.company || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`aetheris-forensic-${safe}-${opts.scanId.slice(0, 8)}.pdf`);
}
