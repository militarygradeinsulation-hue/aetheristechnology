import jsPDF from 'jspdf';

/**
 * Aetheris Forensic Playbook PDF — matches the live "Aetheris Playbook" style
 * used by supabase/functions/generate-playbook (dark bg, gold pillar tag,
 * large helvetica title, gold accent bars, section numbering).
 */

const BG: [number, number, number] = [15, 15, 20];
const PANEL_DARK: [number, number, number] = [22, 22, 30];
const TABLE_HEADER_BG: [number, number, number] = [40, 35, 20];
const PAPER: [number, number, number] = [235, 230, 220];
const BODY: [number, number, number] = [200, 195, 185];
const MUTED: [number, number, number] = [160, 155, 145];
const FOOTER_MUTED: [number, number, number] = [100, 95, 90];
const GOLD: [number, number, number] = [217, 158, 46];
const GOLD_DEEP: [number, number, number] = [180, 130, 40];
const RULE: [number, number, number] = [60, 60, 70];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 22;
const CONTENT_W = PAGE_W - MARGIN * 2;

function paintBg(doc: jsPDF) {
  doc.setFillColor(...BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function decoCorner(doc: jsPDF) {
  doc.setFillColor(...GOLD);
  doc.rect(PAGE_W - 30, 0, 30, 3, 'F');
  doc.rect(PAGE_W - 3, 0, 3, 30, 'F');
}

function footer(doc: jsPDF, pageNum: number) {
  doc.setDrawColor(40, 40, 50);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
  doc.setFontSize(7);
  doc.setTextColor(...FOOTER_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text('AETHERIS', MARGIN, PAGE_H - 9);
  doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' });
}

function renderCover(doc: jsPDF, title: string, subtitle: string, pillar: string, tags: string[]) {
  paintBg(doc);

  // Border frame
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN - 5, MARGIN - 5, CONTENT_W + 10, PAGE_H - MARGIN * 2 + 10);

  // Pillar label + bar
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.text(pillar.toUpperCase(), MARGIN, 50);
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, 55, 50, 3, 'F');

  // Title
  doc.setTextColor(...PAPER);
  doc.setFontSize(34);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(title, CONTENT_W);
  doc.text(titleLines, MARGIN, 78);

  // Subtitle
  const subY = 78 + titleLines.length * 15 + 8;
  doc.setFontSize(16);
  doc.setTextColor(...BODY);
  doc.setFont('helvetica', 'normal');
  const subLines = doc.splitTextToSize(subtitle, CONTENT_W);
  doc.text(subLines, MARGIN, subY);

  // Tags
  if (tags.length) {
    const tagsY = subY + subLines.length * 8 + 15;
    doc.setFontSize(9);
    doc.setTextColor(...GOLD_DEEP);
    doc.text(tags.join('   •   '), MARGIN, tagsY);
  }

  // Bottom block — gold bar, AETHERIS, meta
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, PAGE_H - 60, 50, 2, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GOLD);
  doc.text('AETHERIS', MARGIN, PAGE_H - 45);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('aetheris.technology', MARGIN, PAGE_H - 38);
  doc.text(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    MARGIN,
    PAGE_H - 31,
  );

  doc.setFontSize(7);
  doc.setTextColor(80, 75, 70);
  doc.text('CONFIDENTIAL — FOR AUTHORIZED DISTRIBUTION ONLY', MARGIN, PAGE_H - 20);
}

function renderTOC(doc: jsPDF, sections: string[]) {
  paintBg(doc);
  decoCorner(doc);

  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, MARGIN, 35, 2, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PAPER);
  doc.text('Table of Contents', MARGIN, MARGIN + 16);

  let y = MARGIN + 35;
  sections.forEach((section, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...GOLD);
    doc.text(String(i + 1).padStart(2, '0'), MARGIN, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BODY);
    const truncated = section.length > 70 ? section.substring(0, 67) + '...' : section;
    doc.text(truncated, MARGIN + 14, y);

    doc.setDrawColor(...RULE);
    const tw = doc.getTextWidth(truncated);
    const lineStart = MARGIN + 14 + tw + 3;
    const lineEnd = PAGE_W - MARGIN;
    if (lineStart < lineEnd - 10) {
      for (let x = lineStart; x < lineEnd; x += 3) {
        doc.circle(x, y - 1, 0.3, 'F');
      }
    }
    y += 10;
  });

  footer(doc, 2);
}

function renderBackCover(doc: jsPDF) {
  paintBg(doc);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN - 5, MARGIN - 5, CONTENT_W + 10, PAGE_H - MARGIN * 2 + 10);

  doc.setFillColor(...GOLD);
  doc.rect(PAGE_W / 2 - 25, 65, 50, 3, 'F');

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PAPER);
  doc.text('Ready to Execute?', PAGE_W / 2, 88, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BODY);
  const ctaLines = doc.splitTextToSize(
    'This playbook gives you the framework. The Forensic Diagnostic gives you the execution plan — a 14-day deep-dive custom-built for your business, your leaks, and your revenue goals. $2,500, applied toward engagement.',
    CONTENT_W - 20,
  );
  doc.text(ctaLines, PAGE_W / 2, 108, { align: 'center' });

  const contactY = 108 + ctaLines.length * 7 + 20;
  doc.setFillColor(...GOLD);
  doc.rect(PAGE_W / 2 - 20, contactY - 5, 40, 2, 'F');

  doc.setFontSize(13);
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.text('(317) 376-2110', PAGE_W / 2, contactY + 12, { align: 'center' });
  doc.text('joseph@aetheris.technology', PAGE_W / 2, contactY + 26, { align: 'center' });
  doc.text('aetheris.technology', PAGE_W / 2, contactY + 40, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(120, 115, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `© ${new Date().getFullYear()} Aetheris. All rights reserved.`,
    PAGE_W / 2,
    PAGE_H - 25,
    { align: 'center' },
  );
}

function renderBody(doc: jsPDF, content: string, startPageNum: number) {
  let pageNum = startPageNum;
  doc.addPage();
  paintBg(doc);
  decoCorner(doc);
  let y = MARGIN;
  let sectionNum = 0;

  const ensure = (need: number) => {
    if (y + need > PAGE_H - 18) {
      footer(doc, pageNum);
      doc.addPage();
      pageNum++;
      paintBg(doc);
      decoCorner(doc);
      y = MARGIN;
    }
  };

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      y += 4;
      continue;
    }

    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      if (y > MARGIN + 5) {
        footer(doc, pageNum);
        doc.addPage();
        pageNum++;
      }
      paintBg(doc);
      decoCorner(doc);
      y = MARGIN;
      sectionNum++;

      doc.setFillColor(...GOLD);
      doc.rect(MARGIN, y, 35, 2, 'F');
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GOLD);
      doc.text(`SECTION ${String(sectionNum).padStart(2, '0')}`, MARGIN, y);
      y += 8;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PAPER);
      const headerText = trimmed.replace('## ', '').replace(/\*\*/g, '');
      const headerLines = doc.splitTextToSize(headerText, CONTENT_W);
      doc.text(headerLines, MARGIN, y);
      y += headerLines.length * 9 + 8;
    } else if (trimmed.startsWith('### ')) {
      ensure(16);
      y += 3;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GOLD);
      const subText = trimmed.replace('### ', '').replace(/\*\*/g, '');
      const subLines = doc.splitTextToSize(subText, CONTENT_W);
      doc.text(subLines, MARGIN, y);
      y += subLines.length * 6 + 5;
    } else if (trimmed.startsWith('# ')) {
      ensure(16);
      y += 2;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PAPER);
      const t = trimmed.replace('# ', '').replace(/\*\*/g, '');
      const lns = doc.splitTextToSize(t, CONTENT_W);
      doc.text(lns, MARGIN, y);
      y += lns.length * 8 + 4;
    } else if (trimmed.startsWith('> ')) {
      ensure(12);
      doc.setFillColor(...PANEL_DARK);
      doc.rect(MARGIN, y - 4, CONTENT_W, 10, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(MARGIN, y - 4, 1.5, 10, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...PAPER);
      const q = trimmed.replace(/^>\s?/, '').replace(/\*\*/g, '');
      const ql = doc.splitTextToSize(q, CONTENT_W - 8);
      doc.text(ql, MARGIN + 5, y + 1);
      y += ql.length * 5 + 6;
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      ensure(12);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);

      doc.setFillColor(...GOLD);
      const dx = MARGIN + 3;
      const dy = y - 1.5;
      doc.triangle(dx, dy - 1.5, dx + 1.5, dy, dx, dy + 1.5, 'F');
      doc.triangle(dx, dy - 1.5, dx - 1.5, dy, dx, dy + 1.5, 'F');

      const text = trimmed.replace(/^[-*]\s/, '').replace(/\*\*/g, '');
      const bl = doc.splitTextToSize(text, CONTENT_W - 12);
      doc.text(bl, MARGIN + 10, y);
      y += bl.length * 6 + 3;
    } else if (/^\d+\.\s/.test(trimmed)) {
      ensure(12);
      const m = trimmed.match(/^(\d+)\.\s+(.*)$/)!;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GOLD);
      doc.text(`${m[1]}.`, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const text = m[2].replace(/\*\*/g, '');
      const bl = doc.splitTextToSize(text, CONTENT_W - 12);
      doc.text(bl, MARGIN + 10, y);
      y += bl.length * 6 + 3;
    } else if (trimmed.startsWith('|')) {
      ensure(10);
      const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
      if (cells.some(c => /^[-:]+$/.test(c))) continue;
      const isHeader = cells.length > 0 && cells.every(c => c === c.toUpperCase() || (c.length > 0 && /[A-Z]/.test(c[0])));
      doc.setFontSize(9);
      if (isHeader) {
        doc.setFillColor(...TABLE_HEADER_BG);
        doc.rect(MARGIN, y - 4.5, CONTENT_W, 7.5, 'F');
        doc.setFillColor(...GOLD);
        doc.rect(MARGIN, y - 4.5, CONTENT_W, 0.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GOLD);
      } else {
        const rowIndex = Math.floor((y - MARGIN) / 6);
        if (rowIndex % 2 === 0) {
          doc.setFillColor(...PANEL_DARK);
          doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BODY);
      }
      const colW = CONTENT_W / cells.length;
      cells.forEach((cell, i) => {
        doc.text(cell.substring(0, 35), MARGIN + i * colW + 3, y);
      });
      y += 7;
    } else if (/^---+$/.test(trimmed)) {
      ensure(6);
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 5;
    } else {
      ensure(12);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      const paraLines = doc.splitTextToSize(trimmed.replace(/\*\*/g, ''), CONTENT_W);
      doc.text(paraLines, MARGIN, y);
      y += paraLines.length * 6 + 3;
    }

    if (y > PAGE_H - 18) {
      footer(doc, pageNum);
      doc.addPage();
      pageNum++;
      paintBg(doc);
      decoCorner(doc);
      y = MARGIN;
    }
  }

  footer(doc, pageNum);
  return pageNum;
}

export function downloadForensicsPlaybookPdf(opts: {
  title: string;
  toolLabel: string;
  markdown: string;
  filename?: string;
  subtitle?: string;
  tags?: string[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Collect ## headings for TOC
  const sections: string[] = [];
  for (const line of opts.markdown.split('\n')) {
    const t = line.trim();
    if (t.startsWith('## ') && !t.startsWith('### ')) {
      sections.push(t.replace('## ', '').replace(/\*\*/g, ''));
    }
  }

  renderCover(
    doc,
    opts.title,
    opts.subtitle || 'A forensic field report. Built for execution, not for filing.',
    opts.toolLabel,
    opts.tags || [],
  );

  if (sections.length) {
    doc.addPage();
    renderTOC(doc, sections);
  }

  renderBody(doc, opts.markdown, sections.length ? 3 : 2);

  doc.addPage();
  renderBackCover(doc);

  const filename =
    opts.filename ||
    `aetheris-${opts.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(filename);
}
