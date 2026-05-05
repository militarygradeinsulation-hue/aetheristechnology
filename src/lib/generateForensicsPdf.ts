import jsPDF from 'jspdf';

/**
 * Aetheris Forensic Playbook PDF — dark case-file theme.
 * Black bg, off-white text, amber accents, JetBrains/Courier mono micro-labels,
 * Times serif for autopsy headlines. Matches the Leak Audit / Diagnostic PDFs.
 */

const INK: [number, number, number] = [18, 18, 22];           // page bg
const PANEL: [number, number, number] = [28, 28, 34];         // card bg
const PAPER: [number, number, number] = [245, 240, 230];      // primary text
const MUTED: [number, number, number] = [165, 160, 150];
const AMBER: [number, number, number] = [232, 165, 38];
const CRIMSON: [number, number, number] = [180, 60, 60];
const RULE: [number, number, number] = [60, 58, 64];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

class W {
  doc: jsPDF;
  y: number;
  pageNum = 1;
  toolLabel: string;

  constructor(toolLabel: string) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.y = MARGIN + 14;
    this.toolLabel = toolLabel;
  }

  paintBackground() {
    this.doc.setFillColor(...INK);
    this.doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  }

  drawHeader() {
    this.doc.setFillColor(...AMBER);
    this.doc.rect(0, 0, PAGE_W, 3, 'F');
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...AMBER);
    this.doc.text('AETHERIS · BUSINESS FORENSICS', MARGIN, 11);
    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...MUTED);
    this.doc.text(this.toolLabel.toUpperCase(), PAGE_W - MARGIN, 11, { align: 'right' });
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, 14, PAGE_W - MARGIN, 14);
  }

  drawFooter() {
    const fy = PAGE_H - 12;
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, fy - 4, PAGE_W - MARGIN, fy - 4);
    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...MUTED);
    this.doc.text('aetheris.technology  ·  FORENSIC PLAYBOOK', MARGIN, fy);
    this.doc.text(`PG ${String(this.pageNum).padStart(2, '0')}`, PAGE_W - MARGIN, fy, { align: 'right' });
  }

  newPage() {
    this.doc.addPage();
    this.pageNum++;
    this.paintBackground();
    this.drawHeader();
    this.drawFooter();
    this.y = MARGIN + 14;
  }

  ensure(needed: number) {
    if (this.y + needed > PAGE_H - 22) this.newPage();
  }

  cover(title: string) {
    this.paintBackground();

    // Top amber bar
    this.doc.setFillColor(...AMBER);
    this.doc.rect(0, 0, PAGE_W, 4, 'F');

    // Case-file labels
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...AMBER);
    this.doc.text('AETHERIS · BUSINESS FORENSICS', MARGIN, 16);
    this.doc.text(`CASE FILE · ${new Date().toISOString().slice(0, 10)}`, PAGE_W - MARGIN, 16, { align: 'right' });

    // Tool chip
    this.doc.setFillColor(...AMBER);
    this.doc.rect(MARGIN, 40, 2, 14, 'F');
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...AMBER);
    this.doc.text(this.toolLabel.toUpperCase(), MARGIN + 6, 49);

    // Headline (serif, off-white)
    this.doc.setTextColor(...PAPER);
    this.doc.setFont('times', 'bolditalic');
    this.doc.setFontSize(30);
    const lines = this.doc.splitTextToSize(title, CONTENT_W - 6);
    let ty = 78;
    for (const line of lines) {
      this.doc.text(line, MARGIN, ty);
      ty += 12;
    }

    // Sub
    this.doc.setFont('times', 'italic');
    this.doc.setFontSize(13);
    this.doc.setTextColor(...MUTED);
    this.doc.text('A forensic field report. Built for execution, not for filing.', MARGIN, ty + 4);

    // Mid amber rule
    this.doc.setDrawColor(...AMBER);
    this.doc.setLineWidth(0.4);
    this.doc.line(MARGIN, ty + 14, MARGIN + 32, ty + 14);

    // Bottom block — confidential stamp
    this.doc.setFillColor(...CRIMSON);
    this.doc.rect(MARGIN, PAGE_H - 40, 38, 9, 'F');
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...PAPER);
    this.doc.text('CONFIDENTIAL', MARGIN + 3, PAGE_H - 34);

    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...MUTED);
    this.doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      MARGIN,
      PAGE_H - 24,
    );
    this.doc.text('Aetheris AI Studio · aetheris.technology', MARGIN, PAGE_H - 18);

    this.newPage();
  }

  h1(text: string) {
    this.ensure(22);
    this.y += 4;
    this.doc.setFont('times', 'bolditalic');
    this.doc.setFontSize(22);
    this.doc.setTextColor(...PAPER);
    const lines = this.doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      this.ensure(11);
      this.y += 10;
      this.doc.text(line, MARGIN, this.y);
    }
    this.doc.setDrawColor(...AMBER);
    this.doc.setLineWidth(0.8);
    this.doc.line(MARGIN, this.y + 2.5, MARGIN + 30, this.y + 2.5);
    this.y += 8;
  }

  h2(text: string) {
    this.ensure(16);
    this.y += 6;
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...AMBER);
    this.doc.text('§ SECTION', MARGIN, this.y);
    this.y += 5;
    this.doc.setFont('times', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(...PAPER);
    const lines = this.doc.splitTextToSize(text, CONTENT_W - 4);
    for (const line of lines) {
      this.ensure(8);
      this.y += 6;
      this.doc.text(line, MARGIN, this.y);
    }
    this.doc.setFillColor(...AMBER);
    this.doc.rect(MARGIN, this.y + 1.5, 14, 0.6, 'F');
    this.y += 4;
  }

  h3(text: string) {
    this.ensure(10);
    this.y += 4;
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...AMBER);
    this.y += 5;
    this.doc.text(`› ${text.toUpperCase()}`, MARGIN, this.y);
    this.y += 1;
  }

  // mixed weight + bold/italic in one paragraph
  private renderRich(text: string, leftX: number, color: [number, number, number], size = 10) {
    const lh = size * 0.45;
    this.doc.setFontSize(size);
    this.doc.setTextColor(color[0], color[1], color[2]);

    // Tokenize: **bold**, *italic*, plain
    type Part = { text: string; bold: boolean; italic: boolean };
    const parts: Part[] = [];
    const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false, italic: false });
      if (m[1] != null) parts.push({ text: m[1], bold: true, italic: false });
      else parts.push({ text: m[2], bold: false, italic: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last), bold: false, italic: false });
    if (!parts.length) parts.push({ text, bold: false, italic: false });

    const styleOf = (p: Part) => (p.bold && p.italic ? 'bolditalic' : p.bold ? 'bold' : p.italic ? 'italic' : 'normal');
    const space = (p: Part) => {
      this.doc.setFont('helvetica', styleOf(p));
      return this.doc.getTextWidth(' ');
    };

    const maxW = PAGE_W - MARGIN - leftX;
    let lineParts: Part[] = [];
    let lineWidth = 0;

    const flush = () => {
      this.ensure(lh + 1);
      this.y += lh;
      let x = leftX;
      for (let i = 0; i < lineParts.length; i++) {
        const p = lineParts[i];
        this.doc.setFont('helvetica', styleOf(p));
        this.doc.text(p.text, x, this.y);
        x += this.doc.getTextWidth(p.text);
        if (i < lineParts.length - 1) x += space(p);
      }
      lineParts = [];
      lineWidth = 0;
    };
    for (const part of parts) {
      const words = part.text.split(/\s+/).filter(Boolean);
      this.doc.setFont('helvetica', styleOf(part));
      for (const word of words) {
        const wW = this.doc.getTextWidth(word);
        const sp = lineParts.length ? space(part) : 0;
        if (lineWidth + sp + wW > maxW && lineParts.length) flush();
        lineParts.push({ text: word, bold: part.bold, italic: part.italic });
        lineWidth += (lineParts.length > 1 ? sp : 0) + wW;
      }
    }
    if (lineParts.length) flush();
    this.y += 1.5;
  }

  paragraph(text: string) {
    if (!text.trim()) { this.y += 2; return; }
    this.renderRich(text, MARGIN, PAPER, 10);
  }

  bullet(text: string) {
    this.ensure(6);
    this.doc.setFontSize(10);
    this.doc.setTextColor(...AMBER);
    this.doc.setFont('courier', 'bold');
    const dotY = this.y + 4.5;
    this.doc.text('▸', MARGIN + 3, dotY);
    const before = this.y;
    this.renderRich(text, MARGIN + 8, PAPER, 10);
    if (this.y < before + 4) this.y = before + 4;
  }

  numbered(num: number, text: string) {
    this.ensure(6);
    this.doc.setFontSize(10);
    this.doc.setTextColor(...AMBER);
    this.doc.setFont('courier', 'bold');
    this.doc.text(`${String(num).padStart(2, '0')}.`, MARGIN + 1, this.y + 4.5);
    const before = this.y;
    this.renderRich(text, MARGIN + 11, PAPER, 10);
    if (this.y < before + 4) this.y = before + 4;
  }

  quote(text: string) {
    this.ensure(10);
    const startY = this.y + 1;
    // panel bg
    this.doc.setFillColor(...PANEL);
    const before = this.y;
    // measure by rendering off-screen? Simpler: render then draw rect behind via overlay trick.
    // We render text first to get height, but we need bg behind. So pre-measure with split:
    const size = 10;
    const lh = size * 0.45;
    this.doc.setFont('times', 'italic');
    this.doc.setFontSize(size);
    const wrapped = this.doc.splitTextToSize(text, CONTENT_W - 14);
    const h = wrapped.length * lh + 6;
    this.ensure(h + 3);
    const yTop = this.y + 1;
    this.doc.setFillColor(...PANEL);
    this.doc.rect(MARGIN, yTop, CONTENT_W, h, 'F');
    this.doc.setFillColor(...AMBER);
    this.doc.rect(MARGIN, yTop, 1.6, h, 'F');
    this.doc.setTextColor(...PAPER);
    this.doc.setFont('times', 'italic');
    this.doc.setFontSize(size);
    let ty = yTop + 4;
    for (const line of wrapped) {
      this.doc.text(line, MARGIN + 6, ty);
      ty += lh;
    }
    this.y = yTop + h + 2;
  }

  divider() {
    this.ensure(4);
    this.y += 2;
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 3;
  }

  table(rows: string[][]) {
    if (!rows.length) return;
    const cols = rows[0].length;
    const colW = CONTENT_W / cols;
    const cellPad = 2;
    this.doc.setFontSize(9);
    rows.forEach((row, ri) => {
      const lineCounts = row.map(cell => {
        this.doc.setFont('helvetica', ri === 0 ? 'bold' : 'normal');
        return this.doc.splitTextToSize(cell, colW - cellPad * 2).length;
      });
      const maxLines = Math.max(...lineCounts);
      const rowH = maxLines * 4 + cellPad * 2;
      this.ensure(rowH + 2);
      const y0 = this.y;
      // background
      this.doc.setFillColor(...(ri === 0 ? AMBER : PANEL));
      this.doc.rect(MARGIN, y0, CONTENT_W, rowH, 'F');
      // border
      this.doc.setDrawColor(...RULE);
      this.doc.setLineWidth(0.15);
      this.doc.rect(MARGIN, y0, CONTENT_W, rowH, 'S');
      row.forEach((cell, ci) => {
        const x = MARGIN + ci * colW;
        if (ci > 0) this.doc.line(x, y0, x, y0 + rowH);
        this.doc.setFont('helvetica', ri === 0 ? 'bold' : 'normal');
        this.doc.setTextColor(...(ri === 0 ? INK : PAPER));
        const wrapped = this.doc.splitTextToSize(cell, colW - cellPad * 2);
        wrapped.forEach((line: string, li: number) => {
          this.doc.text(line, x + cellPad, y0 + cellPad + 3 + li * 4);
        });
      });
      this.y = y0 + rowH;
    });
    this.y += 3;
  }

  finish(filename: string) {
    this.doc.save(filename);
  }
}

function renderMarkdown(w: W, md: string) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let orderedCounter = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // table block
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s\-:|]+\|/.test(lines[i + 1])) {
      const tableRows: string[][] = [];
      const parseRow = (l: string) =>
        l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      tableRows.push(parseRow(line));
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        tableRows.push(parseRow(lines[i]));
        i++;
      }
      w.table(tableRows);
      orderedCounter = 0;
      continue;
    }

    if (/^---+$/.test(line)) { w.divider(); i++; orderedCounter = 0; continue; }
    if (/^###\s+/.test(line)) { w.h3(line.replace(/^###\s+/, '')); i++; orderedCounter = 0; continue; }
    if (/^##\s+/.test(line)) { w.h2(line.replace(/^##\s+/, '')); i++; orderedCounter = 0; continue; }
    if (/^#\s+/.test(line)) { w.h1(line.replace(/^#\s+/, '')); i++; orderedCounter = 0; continue; }
    if (/^>\s?/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        parts.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      w.quote(parts.join(' '));
      orderedCounter = 0;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      w.bullet(line.replace(/^\s*[-*]\s+/, ''));
      i++;
      orderedCounter = 0;
      continue;
    }
    const olm = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olm) {
      orderedCounter++;
      w.numbered(orderedCounter, olm[1]);
      i++;
      continue;
    }
    if (line.trim() === '') {
      w.y += 2;
      i++;
      orderedCounter = 0;
      continue;
    }
    w.paragraph(line);
    orderedCounter = 0;
    i++;
  }
}

export function downloadForensicsPlaybookPdf(opts: {
  title: string;
  toolLabel: string;
  markdown: string;
  filename?: string;
}) {
  const w = new W(opts.toolLabel);
  w.cover(opts.title);
  renderMarkdown(w, opts.markdown);
  const filename =
    opts.filename ||
    `aetheris-${opts.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  w.finish(filename);
}
