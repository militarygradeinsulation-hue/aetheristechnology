// Forensic Golden Standard PDF.
// Text-layer PDF (fully searchable / Ctrl+F friendly), clickable index,
// footer with "Ask this report" link, watermark "Aetheris AI Studio".
//
// Pages auto-flow; each chapter starts on a fresh page with anchored title
// so jsPDF outline + internal link annotations work for the TOC.

import jsPDF from "jspdf";
import { computeGoldenLeakage, GOLDEN_LEAKAGE_LABEL } from "@/lib/goldenLeakage";


export interface Chapter {
  no: number;
  slug: string;
  title: string;
  verdict?: string;
  what_we_found?: string;
  why_its_leaking?: string;
  what_its_costing?: string;
  what_to_do?: { this_week?: string[]; this_month?: string[]; this_quarter?: string[] };
  evidence?: { label: string; value: string }[];
}
export interface ForensicReport {
  executive_summary?: string;
  top_leaks?: { rank: number; name: string; dollars_low?: number; dollars_high?: number; chapter_slug?: string; summary?: string }[];
  chapters?: Chapter[];
  /** Growth assets generated alongside the report. Rendered on-screen only; PDF logic unchanged. */
  deliverables?: import("@/components/GoldenGrowthAssets").GoldenDeliverables | null;
}


const BG: [number, number, number] = [15, 15, 20];
const PAPER: [number, number, number] = [236, 232, 222];
const BODY: [number, number, number] = [205, 200, 188];
const MUTED: [number, number, number] = [150, 145, 135];
const AMBER: [number, number, number] = [217, 158, 46];
const CRIMSON: [number, number, number] = [220, 70, 70];

const PAGE_W = 210;
const PAGE_H = 297;
const M = 20;
const CW = PAGE_W - M * 2;

/**
 * jsPDF built-in fonts (helvetica/times/courier) only support WinAnsi encoding.
 * Any character outside that range renders as garbage boxes/symbols (e.g. ><#%^).
 * We aggressively map smart-punctuation, dashes, arrows, bullets, and other
 * common unicode into ASCII equivalents, then strip everything else.
 */
function sanitize(input: unknown): string {
  if (input == null) return "";
  let s = String(input);
  // Normalize compatibility forms (e.g., ligatures)
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
  // Strip anything outside printable WinAnsi (basic Latin + Latin-1 supplement + a few)
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
  // Smart-PDF "Ask this report" link
  doc.setTextColor(...AMBER);
  const askText = "ASK THIS REPORT →";
  doc.textWithLink(askText, PAGE_W - M, PAGE_H - 9, { url: askUrl, align: "right" });
  // Watermark
  doc.setTextColor(70, 60, 40);
  doc.setFontSize(6);
  doc.text("Aetheris AI Studio", PAGE_W - M, PAGE_H - 4, { align: "right" });
}

function ensureSpace(doc: jsPDF, y: number, need: number, page: { n: number }, askUrl: string): number {
  if (y + need > PAGE_H - 20) {
    doc.addPage();
    page.n++;
    bg(doc);
    footer(doc, page.n, askUrl);
    return M + 6;
  }
  return y;
}

function wrap(doc: jsPDF, text: string, w: number): string[] {
  return doc.splitTextToSize(sanitize(text), w) as string[];
}

function renderMarkdown(doc: jsPDF, md: string, x: number, y: number, page: { n: number }, askUrl: string): number {
  const lines = (md || "").split(/\n+/);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BODY);
  for (const line of lines) {
    if (!line.trim()) { y += 3; continue; }
    let txt = line.replace(/^[#*\-•]\s*/, "• ").replace(/\*\*(.+?)\*\*/g, "$1");
    txt = txt.replace(/[—–]/g, "-");
    const wrapped = wrap(doc, txt, CW);
    for (const w of wrapped) {
      y = ensureSpace(doc, y, 5, page, askUrl);
      doc.text(w, x, y);
      y += 5;
    }
    y += 1;
  }
  return y + 2;
}

export function generateForensicGoldenPdf(opts: {
  report: ForensicReport;
  company: string;
  url: string;
  scanId: string;
  generatedAt?: Date;
}): jsPDF {
  const { report, company, url, scanId } = opts;
  const askUrl = `https://aetheris.technology/report/${scanId}/ask`;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const page = { n: 1 };

  // Monkey-patch text writers so every string flowing to the PDF is WinAnsi-safe.
  // jsPDF's built-in fonts render non-WinAnsi glyphs as garbage (><#%^ etc.).
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
  const titleLines = wrap(doc, "Forensic Audit Report", CW);
  let cy = 80;
  for (const l of titleLines) { doc.text(l, M, cy); cy += 14; }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...PAPER);
  doc.text(company || url, M, cy + 4);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Target: ${url}`, M, cy + 12);
  doc.text(`Generated: ${(opts.generatedAt || new Date()).toLocaleString("en-US")}`, M, cy + 18);
  doc.text(`Scan ID: ${scanId}`, M, cy + 24);

  // ── Total leakage headline (same source of truth as the website/portal) ──
  const totalLeakage = computeGoldenLeakage(report.top_leaks);
  if (totalLeakage) {
    const boxY = cy + 36;
    doc.setFillColor(40, 15, 15);
    doc.rect(M, boxY, CW, 34, "F");
    doc.setDrawColor(...CRIMSON);
    doc.setLineWidth(0.6);
    doc.rect(M, boxY, CW, 34);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...CRIMSON);
    doc.text(GOLDEN_LEAKAGE_LABEL.toUpperCase(), M + 4, boxY + 7);
    doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(...CRIMSON);
    doc.text(`${totalLeakage.rangeLabelAscii} / year`, M + 4, boxY + 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    const capLines = wrap(doc, totalLeakage.caption, CW - 8).slice(0, 2);
    let capY = boxY + 26;
    for (const l of capLines) { doc.text(l, M + 4, capY); capY += 4; }
  }


  // ───────── EXECUTIVE SUMMARY ─────────
  doc.addPage(); page.n++; bg(doc); footer(doc, page.n, askUrl);
  doc.setFont("times", "bold"); doc.setFontSize(24); doc.setTextColor(...PAPER);
  doc.text("Executive Summary", M, 32);
  doc.setDrawColor(...AMBER); doc.setLineWidth(0.4); doc.line(M, 36, M + 40, 36);
  let y = 48;
  y = renderMarkdown(doc, report.executive_summary || "(No summary returned.)", M, y, page, askUrl);

  // ───────── INDEX (clickable) ─────────
  doc.addPage(); page.n++; bg(doc); footer(doc, page.n, askUrl);
  doc.setFont("times", "bold"); doc.setFontSize(24); doc.setTextColor(...PAPER);
  doc.text("Index", M, 32);
  doc.setDrawColor(...AMBER); doc.line(M, 36, M + 18, 36);
  y = 50;

  // Collect chapter page numbers as we render them; for now we render index AFTER
  // chapters and back-fill via a 2nd page. Simpler: render placeholder list now
  // with internal links to named destinations; jsPDF outline tree owns navigation.
  const chapters = report.chapters || [];
  const indexY: { ch: Chapter; lineY: number }[] = [];
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...BODY);
  for (const ch of chapters) {
    y = ensureSpace(doc, y, 7, page, askUrl);
    indexY.push({ ch, lineY: y });
    doc.setTextColor(...AMBER);
    doc.text(String(ch.no).padStart(2, "0"), M, y);
    doc.setTextColor(...BODY);
    doc.text(ch.title, M + 12, y);
    y += 7;
  }
  y = ensureSpace(doc, y, 14, page, askUrl);
  doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text("Tap a chapter name in this index after the PDF is downloaded to jump.", M, y + 6);

  // ───────── CHAPTERS ─────────
  const chapterPages: Record<number, number> = {};
  for (const ch of chapters) {
    doc.addPage(); page.n++; bg(doc); footer(doc, page.n, askUrl);
    chapterPages[ch.no] = page.n;

    // Chapter header
    doc.setFont("times", "italic"); doc.setFontSize(10); doc.setTextColor(...AMBER);
    doc.text(`CHAPTER ${String(ch.no).padStart(2, "0")}`, M, 30);
    doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(...PAPER);
    const tLines = wrap(doc, ch.title, CW);
    let yy = 40;
    for (const l of tLines) { doc.text(l, M, yy); yy += 9; }
    doc.setDrawColor(...AMBER); doc.line(M, yy, M + 20, yy);
    yy += 8;

    if (ch.verdict) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...CRIMSON);
      for (const l of wrap(doc, `Verdict: ${ch.verdict}`, CW)) {
        yy = ensureSpace(doc, yy, 6, page, askUrl); doc.text(l, M, yy); yy += 6;
      }
      yy += 2;
    }

    const section = (label: string, content: string | undefined) => {
      if (!content) return;
      yy = ensureSpace(doc, yy, 10, page, askUrl);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...AMBER);
      doc.text(label.toUpperCase(), M, yy); yy += 6;
      yy = renderMarkdown(doc, content, M, yy, page, askUrl);
    };

    section("What we found", ch.what_we_found);
    section("Why it's leaking", ch.why_its_leaking);
    section("What it's costing (USD)", ch.what_its_costing);

    if (ch.what_to_do) {
      yy = ensureSpace(doc, yy, 12, page, askUrl);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...AMBER);
      doc.text("WHAT TO DO", M, yy); yy += 6;
      const groups: [string, string[] | undefined][] = [
        ["This week", ch.what_to_do.this_week],
        ["This month", ch.what_to_do.this_month],
        ["This quarter", ch.what_to_do.this_quarter],
      ];
      for (const [g, items] of groups) {
        if (!items?.length) continue;
        yy = ensureSpace(doc, yy, 8, page, askUrl);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...PAPER);
        doc.text(g, M, yy); yy += 5;
        doc.setFont("helvetica", "normal"); doc.setTextColor(...BODY);
        for (const it of items) {
          for (const l of wrap(doc, `• ${it}`, CW - 4)) {
            yy = ensureSpace(doc, yy, 5, page, askUrl);
            doc.text(l, M + 4, yy); yy += 5;
          }
        }
        yy += 2;
      }
    }

    if (ch.evidence?.length) {
      yy = ensureSpace(doc, yy, 12, page, askUrl);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...AMBER);
      doc.text("EVIDENCE", M, yy); yy += 6;
      doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY);
      for (const e of ch.evidence) {
        const line = `${e.label}: ${e.value}`;
        for (const l of wrap(doc, line, CW)) {
          yy = ensureSpace(doc, yy, 5, page, askUrl);
          doc.text(l, M, yy); yy += 5;
        }
      }
    }
  }

  // ───────── back-fill index with page numbers + internal links ─────────
  // jsPDF doesn't easily let us redraw page 3, but we can add the destination
  // links onto the original Y positions using doc.link()
  // The index page is page 3.
  doc.setPage(3);
  for (const { ch, lineY } of indexY) {
    const targetPage = chapterPages[ch.no];
    if (!targetPage) continue;
    // page number tab
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
    doc.text(String(targetPage).padStart(3, " "), PAGE_W - M, lineY, { align: "right" });
    // clickable rect across the row
    doc.link(M, lineY - 5, CW, 7, { pageNumber: targetPage });
  }

  return doc;
}

export function downloadForensicGoldenPdf(opts: Parameters<typeof generateForensicGoldenPdf>[0]) {
  const doc = generateForensicGoldenPdf(opts);
  const safe = (opts.company || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`aetheris-forensic-${safe}-${opts.scanId.slice(0, 8)}.pdf`);
}
