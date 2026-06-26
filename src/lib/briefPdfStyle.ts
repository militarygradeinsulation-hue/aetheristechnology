// Shared "Aetheris Executive Brief" PDF style helpers.
// Matches the Miami DDA Executive Brief template — dark charcoal page,
// amber accents, mono header type, big display headline with last-line
// highlight, numbered step cards, callout quotes, branded footer.
//
// Every scan / extension PDF generator should compose with these primitives
// so output stays visually consistent.

import type jsPDF from 'jspdf';

export const BRIEF = {
  // colors
  bg:        [12, 12, 14]   as [number, number, number],
  panel:     [22, 22, 26]   as [number, number, number],
  panelAlt:  [28, 28, 34]   as [number, number, number],
  amber:     [212, 154, 58] as [number, number, number],
  amberHi:   [240, 185, 74] as [number, number, number],
  amberDim:  [140, 102, 38] as [number, number, number],
  paper:     [235, 230, 220] as [number, number, number],
  text:      [225, 220, 208] as [number, number, number],
  muted:     [150, 145, 135] as [number, number, number],
  dim:       [95, 92, 86]   as [number, number, number],
  red:       [205, 70, 55]  as [number, number, number],

  // page (A4 mm)
  pageW: 210,
  pageH: 297,
  margin: 18,
};
BRIEF['contentW' as keyof typeof BRIEF] = (BRIEF.pageW - 2 * BRIEF.margin) as never;
export const CONTENT_W = BRIEF.pageW - 2 * BRIEF.margin;
export const BOTTOM = BRIEF.pageH - 26;

// jsPDF built-in fonts are WinAnsi only — strip exotic chars.
export function sanitize(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF\u25E6\u2043]/g, '-')
    .replace(/[\u2192\u27A1]/g, '->')
    .replace(/[\u2190]/g, '<-')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

export function paintBg(doc: jsPDF) {
  doc.setFillColor(...BRIEF.bg);
  doc.rect(0, 0, BRIEF.pageW, BRIEF.pageH, 'F');
}

function drawLogoMark(doc: jsPDF, cx: number, cy: number, r: number) {
  // simple amber circular crest with eye motif (stand-in for the brand mark)
  doc.setFillColor(...BRIEF.amber);
  doc.circle(cx, cy, r, 'F');
  doc.setFillColor(...BRIEF.bg);
  doc.circle(cx, cy, r - 1.4, 'F');
  doc.setFillColor(...BRIEF.amberHi);
  doc.circle(cx, cy, r * 0.45, 'F');
  doc.setFillColor(...BRIEF.bg);
  doc.circle(cx, cy, r * 0.18, 'F');
}

/**
 * Cover-page header strip:
 *   AETHERIS / TECHNOLOGY  ...  [logo]
 *   BUSINESS FORENSICS · REAL FINDINGS · NO SUGAR   [ACTIVE]
 *   <docTag>   (e.g. "EXECUTIVE BRIEF · CONFIDENTIAL · PREPARED FOR: X")
 */
export function briefCoverHeader(doc: jsPDF, docTag: string, opts?: { active?: boolean }) {
  const M = BRIEF.margin;

  doc.setFont('courier', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...BRIEF.paper);
  doc.text('AETHERIS', M, 22);
  doc.setFontSize(11);
  doc.text('TECHNOLOGY', M, 30);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRIEF.muted);
  doc.text('BUSINESS FORENSICS  ·  REAL FINDINGS  ·  NO SUGAR', M, 37);

  if (opts?.active !== false) {
    doc.setFillColor(...BRIEF.red);
    doc.rect(M, 40, 16, 5, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BRIEF.paper);
    doc.text('ACTIVE', M + 8, 43.7, { align: 'center' });
  }

  drawLogoMark(doc, BRIEF.pageW - M - 12, 26, 11);

  // doc tag line + thin amber rule
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRIEF.paper);
  doc.text(sanitize(docTag).toUpperCase(), M, 56);
  doc.setDrawColor(...BRIEF.amber);
  doc.setLineWidth(0.4);
  doc.line(M, 60, BRIEF.pageW - M, 60);
}

/** Inner-page header: AETHERIS TECHNOLOGY · <subtitle>  + small logo */
export function briefInnerHeader(doc: jsPDF, subtitle: string) {
  const M = BRIEF.margin;
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRIEF.paper);
  doc.text('AETHERIS TECHNOLOGY', M, 18);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRIEF.muted);
  doc.text(sanitize(subtitle).toUpperCase(), M, 25);
  drawLogoMark(doc, BRIEF.pageW - M - 8, 20, 7);

  doc.setDrawColor(...BRIEF.amber);
  doc.setLineWidth(0.4);
  doc.line(M, 31, BRIEF.pageW - M, 31);
}

/**
 * Display headline — up to 3 lines of big mono text with the final line
 * highlighted in amber (Miami DDA "Leak Problem." treatment).
 * Returns y after the headline block.
 */
export function briefDisplayTitle(
  doc: jsPDF,
  lines: string[],
  y: number,
  highlightLastLine = true,
): number {
  doc.setFont('courier', 'bold');
  doc.setFontSize(30);
  const lh = 13;
  lines.forEach((raw, i) => {
    const last = i === lines.length - 1;
    doc.setTextColor(...(last && highlightLastLine ? BRIEF.amber : BRIEF.paper));
    doc.text(sanitize(raw), BRIEF.margin, y);
    y += lh;
  });
  return y + 4;
}

/** Small uppercase amber label (e.g. "THE PROBLEM THE DDA FACES") */
export function briefSectionLabel(doc: jsPDF, label: string, y: number): number {
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRIEF.amber);
  doc.text(sanitize(label).toUpperCase(), BRIEF.margin, y);
  y += 3;
  doc.setDrawColor(...BRIEF.amberDim);
  doc.setLineWidth(0.3);
  doc.line(BRIEF.margin, y, BRIEF.pageW - BRIEF.margin, y);
  return y + 6;
}

/** Body paragraph(s). Returns updated y. */
export function briefBody(
  doc: jsPDF,
  text: string,
  y: number,
  opts?: { size?: number; color?: [number, number, number]; width?: number },
): number {
  const size = opts?.size ?? 10;
  const color = opts?.color ?? BRIEF.text;
  const width = opts?.width ?? CONTENT_W;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(sanitize(text), width) as string[];
  const lh = size * 0.5;
  lines.forEach((ln) => {
    doc.text(ln, BRIEF.margin, y);
    y += lh;
  });
  return y + 3;
}

/** Amber-bordered callout quote box. */
export function briefCallout(
  doc: jsPDF,
  body: string,
  y: number,
  attribution?: string,
): number {
  const M = BRIEF.margin;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  const bodyLines = doc.splitTextToSize(sanitize(body), CONTENT_W - 14) as string[];
  const attrLines = attribution
    ? (doc.setFontSize(8), doc.splitTextToSize(sanitize(attribution), CONTENT_W - 14) as string[])
    : [];
  const h = 10 + bodyLines.length * 5.5 + (attrLines.length ? 4 + attrLines.length * 4 : 0);

  doc.setFillColor(...BRIEF.panel);
  doc.rect(M, y, CONTENT_W, h, 'F');
  doc.setFillColor(...BRIEF.amber);
  doc.rect(M, y, 1.4, h, 'F');

  let cy = y + 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(...BRIEF.paper);
  bodyLines.forEach((ln) => {
    doc.text(ln, M + 8, cy);
    cy += 5.5;
  });
  if (attrLines.length) {
    cy += 2;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRIEF.amber);
    attrLines.forEach((ln) => {
      doc.text(`- ${ln}`, M + 8, cy);
      cy += 4;
    });
  }
  return y + h + 6;
}

/** Numbered step card (01 .. NN) with title + body. */
export function briefStepCard(
  doc: jsPDF,
  index: number,
  title: string,
  body: string,
  y: number,
): number {
  const M = BRIEF.margin;
  const titleLines = (doc.setFont('helvetica', 'bold'), doc.setFontSize(11),
    doc.splitTextToSize(sanitize(title), CONTENT_W - 28) as string[]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const bodyLines = doc.splitTextToSize(sanitize(body), CONTENT_W - 28) as string[];
  const h = Math.max(20, 8 + titleLines.length * 5 + bodyLines.length * 4.5 + 6);

  doc.setFillColor(...BRIEF.panel);
  doc.rect(M, y, CONTENT_W, h, 'F');

  // number badge
  doc.setFillColor(...BRIEF.amber);
  doc.rect(M, y, 18, h, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRIEF.bg);
  doc.text(String(index).padStart(2, '0'), M + 9, y + h / 2 + 2, { align: 'center' });

  let cy = y + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRIEF.paper);
  titleLines.forEach((ln) => { doc.text(ln, M + 24, cy); cy += 5; });
  cy += 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRIEF.muted);
  bodyLines.forEach((ln) => { doc.text(ln, M + 24, cy); cy += 4.5; });

  return y + h + 4;
}

/** Two-column "OPT A / OPT B" engagement cards. */
export function briefOptionCards(
  doc: jsPDF,
  options: Array<{ tag: string; title: string; body: string }>,
  y: number,
): number {
  const M = BRIEF.margin;
  const gap = 6;
  const colW = (CONTENT_W - gap * (options.length - 1)) / options.length;
  let maxH = 0;
  const layouts = options.map((opt) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(sanitize(opt.body), colW - 12) as string[];
    const h = 18 + lines.length * 4.5 + 8;
    if (h > maxH) maxH = h;
    return { ...opt, lines };
  });
  layouts.forEach((opt, i) => {
    const x = M + i * (colW + gap);
    doc.setFillColor(...BRIEF.panel);
    doc.rect(x, y, colW, maxH, 'F');

    // tag pill
    doc.setFillColor(...BRIEF.amber);
    doc.rect(x, y, 18, 6, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BRIEF.bg);
    doc.text(sanitize(opt.tag).toUpperCase(), x + 9, y + 4.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRIEF.paper);
    doc.text(sanitize(opt.title), x + 22, y + 5);

    let cy = y + 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRIEF.muted);
    opt.lines.forEach((ln) => { doc.text(ln, x + 6, cy); cy += 4.5; });
  });
  return y + maxH + 6;
}

/** Bullet list with amber arrows. */
export function briefArrowList(doc: jsPDF, items: string[], y: number): number {
  const M = BRIEF.margin;
  doc.setFillColor(...BRIEF.panel);
  const h = 6 + items.length * 6;
  doc.rect(M, y, CONTENT_W, h, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let cy = y + 9;
  items.forEach((it) => {
    doc.setTextColor(...BRIEF.amber);
    doc.text('->', M + 6, cy);
    doc.setTextColor(...BRIEF.text);
    doc.text(sanitize(it), M + 14, cy);
    cy += 6;
  });
  return y + h + 6;
}

/** Full-width amber "ready to act" banner. */
export function briefCtaBanner(doc: jsPDF, title: string, sub: string, y: number): number {
  const M = BRIEF.margin;
  const h = 22;
  doc.setFillColor(...BRIEF.amber);
  doc.rect(M, y, CONTENT_W, h, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRIEF.bg);
  doc.text(sanitize(title), BRIEF.pageW / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(sanitize(sub), BRIEF.pageW / 2, y + 17, { align: 'center' });
  return y + h + 6;
}

/** Footer drawn on every page. Call after content. */
export function briefFooter(
  doc: jsPDF,
  page: number,
  pageCount: number,
  preparedFor?: string,
) {
  const M = BRIEF.margin;
  const y = BRIEF.pageH - 22;
  doc.setDrawColor(...BRIEF.amberDim);
  doc.setLineWidth(0.3);
  doc.line(M, y, BRIEF.pageW - M, y);

  drawLogoMark(doc, M + 6, y + 8, 6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRIEF.paper);
  doc.text('AETHERIS TECHNOLOGY', M + 16, y + 6);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRIEF.muted);
  doc.text('businessforensics.tech  ·  aetheris.technology', M + 16, y + 10);
  doc.text('(317) 495-4601  ·  Braden Roberts, Managing Partner', M + 16, y + 14);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...BRIEF.paper);
  doc.text(`PAGE ${page} OF ${pageCount}`, BRIEF.pageW - M, y + 6, { align: 'right' });
  if (preparedFor) {
    doc.setFont('courier', 'normal');
    doc.setTextColor(...BRIEF.muted);
    doc.text('PREPARED EXCLUSIVELY FOR:', BRIEF.pageW - M, y + 10, { align: 'right' });
    doc.setTextColor(...BRIEF.amber);
    doc.text(sanitize(preparedFor).toUpperCase(), BRIEF.pageW - M, y + 14, { align: 'right' });
  }
}

/** Apply footers to every page after the doc is fully built. */
export function stampFooters(doc: jsPDF, preparedFor?: string) {
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    briefFooter(doc, i, count, preparedFor);
  }
}

/** Start a new page with bg + inner header. Returns starting y for content. */
export function briefNewPage(doc: jsPDF, subtitle: string): number {
  doc.addPage();
  paintBg(doc);
  briefInnerHeader(doc, subtitle);
  return 42;
}

/** Ensure room or page-break. */
export function briefEnsure(doc: jsPDF, y: number, needed: number, subtitle: string): number {
  if (y + needed > BOTTOM) return briefNewPage(doc, subtitle);
  return y;
}
