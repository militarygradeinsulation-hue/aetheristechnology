// Professional PDF for /try/* sandbox tool outputs.
// Styled to match the Golden Report: dark case-file cover, amber accents,
// crimson verdicts, clickable index, footer with page number + watermark.
//
// Takes the raw markdown-ish output the tool produced (split by `## Heading`)
// and re-flows it into an operator-grade forensic case file.

import jsPDF from "jspdf";

const BG: [number, number, number] = [15, 15, 20];
const PAPER: [number, number, number] = [236, 232, 222];
const BODY: [number, number, number] = [205, 200, 188];
const MUTED: [number, number, number] = [150, 145, 135];
const AMBER: [number, number, number] = [217, 158, 46];
const CRIMSON: [number, number, number] = [220, 70, 70];
const CARD: [number, number, number] = [24, 24, 32];

const PAGE_W = 210;
const PAGE_H = 297;
const M = 20;
const CW = PAGE_W - M * 2;

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
    "\u00D7": "x", "\u00F7": "/", "\u2043": "-",
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

function footer(doc: jsPDF, page: number, brand: string) {
  doc.setDrawColor(40, 40, 50);
  doc.setLineWidth(0.3);
  doc.line(M, PAGE_H - 14, PAGE_W - M, PAGE_H - 14);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(brand.toUpperCase(), M, PAGE_H - 9);
  doc.text(`Page ${page}`, PAGE_W / 2, PAGE_H - 9, { align: "center" });
  doc.setTextColor(...AMBER);
  doc.text("AETHERIS · BUSINESS FORENSICS", PAGE_W - M, PAGE_H - 9, { align: "right" });
  doc.setTextColor(70, 60, 40);
  doc.setFontSize(6);
  doc.text("Aetheris AI Studio", PAGE_W - M, PAGE_H - 4, { align: "right" });
}

function ensureSpace(doc: jsPDF, y: number, need: number, page: { n: number }, brand: string): number {
  if (y + need > PAGE_H - 20) {
    doc.addPage();
    page.n++;
    bg(doc);
    footer(doc, page.n, brand);
    return M + 6;
  }
  return y;
}

function wrap(doc: jsPDF, text: string, w: number): string[] {
  return doc.splitTextToSize(sanitize(text), w) as string[];
}

/** Detect a markdown table block: at least 2 lines of `| ... |`. */
function tryRenderTable(doc: jsPDF, block: string[], y: number, page: { n: number }, brand: string): number | null {
  const rows = block
    .filter(l => /^\s*\|/.test(l))
    .map(l => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim()));
  if (rows.length < 2) return null;
  // drop separator row (---)
  const clean = rows.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c)));
  if (clean.length < 2) return null;

  const header = clean[0];
  const body = clean.slice(1);
  const cols = header.length;
  if (cols < 2) return null;
  const colW = CW / cols;

  // Header
  y = ensureSpace(doc, y, 12, page, brand);
  doc.setFillColor(...AMBER);
  doc.rect(M, y - 4, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BG);
  header.forEach((h, i) => {
    doc.text(sanitize(h).slice(0, 40), M + i * colW + 2, y);
  });
  y += 5;

  // Body rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (let r = 0; r < body.length; r++) {
    const row = body[r];
    // measure row height
    const cellLines = row.map(c => wrap(doc, c, colW - 4));
    const rowH = Math.max(...cellLines.map(cl => cl.length)) * 4.4 + 3;
    y = ensureSpace(doc, y, rowH + 2, page, brand);
    // alternate zebra
    if (r % 2 === 0) {
      doc.setFillColor(...CARD);
      doc.rect(M, y - 3, CW, rowH, "F");
    }
    doc.setDrawColor(60, 55, 40);
    doc.setLineWidth(0.15);
    doc.line(M, y - 3 + rowH, PAGE_W - M, y - 3 + rowH);
    doc.setTextColor(...BODY);
    cellLines.forEach((cl, i) => {
      let yy = y;
      for (const line of cl) {
        doc.text(line, M + i * colW + 2, yy);
        yy += 4.4;
      }
    });
    y += rowH;
  }
  return y + 4;
}

/** Render a paragraph/list block. */
function renderBlock(doc: jsPDF, block: string[], y: number, page: { n: number }, brand: string): number {
  // Table?
  if (block.some(l => /^\s*\|.+\|\s*$/.test(l))) {
    const ty = tryRenderTable(doc, block, y, page, brand);
    if (ty != null) return ty;
  }

  for (const raw of block) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { y += 2; continue; }

    // H3
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      y = ensureSpace(doc, y, 9, page, brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...AMBER);
      doc.text(sanitize(h3[1]).toUpperCase(), M, y);
      y += 6;
      continue;
    }

    // Bold-heading style: "**Label:** value"
    const kv = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    if (kv) {
      y = ensureSpace(doc, y, 7, page, brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...PAPER);
      doc.text(sanitize(kv[1]) + ":", M, y);
      const labelW = doc.getTextWidth(sanitize(kv[1]) + ":  ");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BODY);
      const wrapped = wrap(doc, kv[2] || "", CW - labelW);
      wrapped.forEach((w, idx) => {
        if (idx === 0) doc.text(w, M + labelW, y);
        else { y = ensureSpace(doc, y + 5, 5, page, brand); doc.text(w, M + labelW, y); }
      });
      y += 6;
      continue;
    }

    // Bullet
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      const txt = bullet[1].replace(/\*\*(.+?)\*\*/g, "$1");
      const wrapped = wrap(doc, txt, CW - 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      wrapped.forEach((w, idx) => {
        y = ensureSpace(doc, y, 5, page, brand);
        if (idx === 0) {
          doc.setTextColor(...AMBER);
          doc.text("•", M, y);
        }
        doc.setTextColor(...BODY);
        doc.text(w, M + 5, y);
        y += 5;
      });
      y += 1;
      continue;
    }

    // Numbered
    const num = line.match(/^(\d+)\.\s+(.+)$/);
    if (num) {
      const txt = num[2].replace(/\*\*(.+?)\*\*/g, "$1");
      const wrapped = wrap(doc, txt, CW - 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      wrapped.forEach((w, idx) => {
        y = ensureSpace(doc, y, 5, page, brand);
        if (idx === 0) {
          doc.setTextColor(...AMBER);
          doc.setFont("helvetica", "bold");
          doc.text(num[1] + ".", M, y);
          doc.setFont("helvetica", "normal");
        }
        doc.setTextColor(...BODY);
        doc.text(w, M + 7, y);
        y += 5;
      });
      y += 1;
      continue;
    }

    // Blockquote / callout
    const bq = line.match(/^>\s*(.+)$/);
    if (bq) {
      const wrapped = wrap(doc, bq[1], CW - 6);
      const h = wrapped.length * 5 + 3;
      y = ensureSpace(doc, y, h + 2, page, brand);
      doc.setFillColor(...CARD);
      doc.rect(M, y - 4, CW, h, "F");
      doc.setFillColor(...CRIMSON);
      doc.rect(M, y - 4, 1.5, h, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...PAPER);
      let yy = y;
      for (const w of wrapped) { doc.text(w, M + 5, yy); yy += 5; }
      y += h + 1;
      continue;
    }

    // Plain paragraph
    const txt = line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/, "");
    const wrapped = wrap(doc, txt, CW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BODY);
    for (const w of wrapped) {
      y = ensureSpace(doc, y, 5, page, brand);
      doc.text(w, M, y);
      y += 5;
    }
    y += 2;
  }
  return y;
}

export interface TryToolPdfOptions {
  toolTitle: string;
  subject: string;
  caseId: string;
  runAt: Date;
  /** Full markdown output from the sandbox tool. */
  output: string;
  brand?: string;
}

export function generateTryToolPdf(opts: TryToolPdfOptions): jsPDF {
  const brand = opts.brand || "Aetheris";
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const page = { n: 1 };

  // WinAnsi guard
  const _text = doc.text.bind(doc);
  (doc as unknown as { text: typeof doc.text }).text = ((t: unknown, ...rest: unknown[]) => {
    const clean = Array.isArray(t) ? t.map(sanitize) : sanitize(t);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_text as any)(clean, ...rest);
  }) as typeof doc.text;

  // Split into sections by `## Heading`
  const lines = opts.output.split("\n");
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } = { title: "Executive Summary", lines: [] };
  for (const l of lines) {
    const m = l.match(/^##\s+(.+)$/);
    if (m) {
      if (current.lines.some(x => x.trim())) sections.push(current);
      current = { title: m[1].trim(), lines: [] };
    } else current.lines.push(l);
  }
  if (current.lines.some(x => x.trim())) sections.push(current);

  // ────── COVER ──────
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
  doc.setFontSize(30);
  const titleLines = wrap(doc, opts.toolTitle, CW);
  let cy = 78;
  for (const l of titleLines) { doc.text(l, M, cy); cy += 12; }

  // "Forensic Report" tag
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(...AMBER);
  doc.text("Forensic Report", M, cy + 4);

  // Subject / case block
  doc.setFillColor(...CARD);
  doc.rect(M, cy + 14, CW, 34, "F");
  doc.setFillColor(...AMBER);
  doc.rect(M, cy + 14, 1.5, 34, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("SUBJECT", M + 5, cy + 20);
  doc.setFontSize(11);
  doc.setTextColor(...PAPER);
  const subj = wrap(doc, opts.subject, CW - 10);
  doc.text(subj.slice(0, 2), M + 5, cy + 26);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`CASE ID   ${opts.caseId}`, M + 5, cy + 40);
  doc.text(`FILED     ${opts.runAt.toISOString().slice(0, 19).replace("T", " ")}Z`, M + 5, cy + 45);

  // Crimson ACTIVE stamp
  doc.setDrawColor(...CRIMSON);
  doc.setLineWidth(0.6);
  doc.rect(PAGE_W - M - 34, 60, 30, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...CRIMSON);
  doc.text("ACTIVE", PAGE_W - M - 19, 68, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text("Searchable Smart PDF. Every finding is evidence-backed.", M, PAGE_H - 44);
  footer(doc, page.n, brand);

  // ────── INDEX ──────
  if (sections.length > 1) {
    doc.addPage(); page.n++; bg(doc); footer(doc, page.n, brand);
    doc.setFont("times", "bold"); doc.setFontSize(24); doc.setTextColor(...PAPER);
    doc.text("Index", M, 32);
    doc.setDrawColor(...AMBER); doc.line(M, 36, M + 18, 36);
    let y = 52;
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    sections.forEach((s, i) => {
      y = ensureSpace(doc, y, 8, page, brand);
      doc.setTextColor(...AMBER);
      doc.text(String(i + 1).padStart(2, "0"), M, y);
      doc.setTextColor(...BODY);
      doc.text(sanitize(s.title), M + 12, y);
      y += 8;
    });
  }

  // ────── SECTIONS ──────
  sections.forEach((s, i) => {
    doc.addPage(); page.n++; bg(doc); footer(doc, page.n, brand);
    // Section header
    doc.setFont("times", "italic"); doc.setFontSize(10); doc.setTextColor(...AMBER);
    doc.text(`§ ${String(i + 1).padStart(2, "0")} · SECTION`, M, 30);
    doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(...PAPER);
    let yy = 40;
    for (const l of wrap(doc, s.title, CW)) { doc.text(l, M, yy); yy += 9; }
    doc.setDrawColor(...AMBER); doc.line(M, yy, M + 20, yy);
    yy += 8;
    yy = renderBlock(doc, s.lines, yy, page, brand);
  });

  return doc;
}

export function downloadTryToolPdf(opts: TryToolPdfOptions) {
  const doc = generateTryToolPdf(opts);
  const safe = opts.toolTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
  doc.save(`aetheris-${safe}-${opts.caseId.toLowerCase()}.pdf`);
}
