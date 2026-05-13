import jsPDF from 'jspdf';

interface ReportGap {
  category: string;
  severity: string;
  title: string;
  description: string;
  annualCost?: string;
  recommendedFix?: string;
  projectedROI?: string;
}

interface RoadmapItem {
  month: string;
  action: string;
  estimatedCost: string;
  projectedRecovery: string;
}

interface ROIItem {
  category: string;
  currentWaste: string;
  projectedRecovery: string;
}

export interface FullReport {
  score: number;
  grade: string;
  companyName: string;
  executiveSummary: string;
  gaps: ReportGap[];
  roadmap: RoadmapItem[];
  roiTable: ROIItem[];
  nextSteps: string[];
  competitiveBrief: string;
}

const COLORS = {
  bg: [15, 15, 20] as [number, number, number],
  cardBg: [22, 22, 30] as [number, number, number],
  gold: [217, 158, 46] as [number, number, number],
  goldDim: [180, 130, 40] as [number, number, number],
  white: [235, 230, 220] as [number, number, number],
  gray: [160, 155, 145] as [number, number, number],
  darkGray: [100, 95, 90] as [number, number, number],
  red: [220, 80, 60] as [number, number, number],
  amber: [230, 160, 50] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const BOTTOM = PAGE_H - 20;

function paintBg(doc: jsPDF) {
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F');
}

function newPage(doc: jsPDF): number {
  doc.addPage();
  paintBg(doc);
  return 26;
}

function ensure(doc: jsPDF, y: number, needed: number): number {
  return y + needed > BOTTOM ? newPage(doc) : y;
}

function wrap(doc: jsPDF, text: string, w: number, size: number): string[] {
  doc.setFontSize(size);
  return doc.splitTextToSize(text || '', w);
}

function drawLines(doc: jsPDF, lines: string[], x: number, y: number, lh: number): number {
  for (const line of lines) {
    y = ensure(doc, y, lh);
    doc.text(line, x, y);
    y += lh;
  }
  return y;
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  y = ensure(doc, y, 16);
  doc.setFillColor(...COLORS.gold);
  doc.rect(MARGIN, y, CONTENT_W, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.gold);
  doc.text(title.toUpperCase(), MARGIN, y + 8);
  return y + 14;
}

export function generatePreviewPdf(report: FullReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  paintBg(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gold);
  doc.text('AETHERIS TECHNOLOGY', MARGIN, 30);

  doc.setFontSize(28);
  doc.setTextColor(...COLORS.white);
  doc.text('WEBSITE SCAN', MARGIN, 55);
  doc.text('PREVIEW', MARGIN, 70);

  doc.setFontSize(14);
  doc.setTextColor(...COLORS.gold);
  doc.text(`Score: ${report.score}/100  |  Grade: ${report.grade}`, MARGIN, 90);

  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text(report.companyName || 'Website Analysis', MARGIN, 110);

  let y = 130;
  for (const gap of report.gaps.slice(0, 2)) {
    doc.setFillColor(...COLORS.gold);
    doc.rect(MARGIN, y, 60, 0.6, 'F');
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gold);
    doc.text(`${gap.category}  •  ${gap.severity?.toUpperCase()}`, MARGIN, y);
    y += 6;
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.white);
    const titleLines = wrap(doc, gap.title, CONTENT_W, 11);
    y = drawLines(doc, titleLines, MARGIN, y, 5);
    y += 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    const descLines = wrap(doc, gap.description, CONTENT_W, 9);
    y = drawLines(doc, descLines, MARGIN, y, 4.5);
    y += 6;
  }

  y += 4;
  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(MARGIN, y, CONTENT_W, 40, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.gold);
  doc.text('FULL REPORT LOCKED', PAGE_W / 2, y + 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  doc.text('Contact Aetheris Technology to unlock your complete', PAGE_W / 2, y + 24, { align: 'center' });
  doc.text('Executive Diagnostic Report with strategic roadmap.', PAGE_W / 2, y + 30, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkGray);
  doc.text('PREVIEW ONLY  |  aetheris.technology', PAGE_W / 2, PAGE_H - 10, { align: 'center' });

  doc.save(`${(report.companyName || 'scan').replace(/\s+/g, '_')}_Preview.pdf`);
}

export function generateFullReport(report: FullReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // === COVER ===
  paintBg(doc);
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 60, 5, 120, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gold);
  doc.text('AETHERIS TECHNOLOGY', MARGIN + 10, 80);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkGray);
  doc.text('STRATEGIC BUSINESS ARCHITECTURE DIVISION', MARGIN + 10, 87);

  doc.setFontSize(32);
  doc.setTextColor(...COLORS.white);
  doc.text('EXECUTIVE', MARGIN + 10, 115);
  doc.text('DIAGNOSTIC', MARGIN + 10, 130);
  doc.text('REPORT', MARGIN + 10, 145);

  doc.setFillColor(...COLORS.gold);
  doc.rect(MARGIN + 10, 152, 80, 0.8, 'F');

  doc.setFontSize(16);
  doc.setTextColor(...COLORS.gold);
  doc.text(report.companyName || 'Website Analysis', MARGIN + 10, 168);

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  doc.text(`Prepared: ${date}`, MARGIN + 10, 184);
  doc.text(`Digital Health Score: ${report.score}/100  |  Grade: ${report.grade}`, MARGIN + 10, 191);

  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(MARGIN + 10, 220, 60, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gold);
  doc.text('CONFIDENTIAL', MARGIN + 30, 228);

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkGray);
  doc.text('aetheris.technology  |  Indianapolis, IN', PAGE_W / 2, PAGE_H - 10, { align: 'center' });

  // === EXECUTIVE SUMMARY ===
  let y = newPage(doc);
  y = sectionHeader(doc, 'Executive Summary', y);

  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 3, 3, 'F');
  doc.setFillColor(...COLORS.gold);
  doc.rect(MARGIN, y, 4, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.gold);
  doc.text(`Grade: ${report.grade}`, MARGIN + 12, y + 13);
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.text(`Score: ${report.score}/100`, MARGIN + 80, y + 13);
  y += 28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  const sumLines = wrap(doc, report.executiveSummary, CONTENT_W, 10);
  y = drawLines(doc, sumLines, MARGIN, y, 5);
  y += 8;

  if (report.competitiveBrief) {
    y = sectionHeader(doc, 'Competitive Intelligence Brief', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    const cbLines = wrap(doc, report.competitiveBrief, CONTENT_W, 10);
    y = drawLines(doc, cbLines, MARGIN, y, 5);
    y += 8;
  }

  // === GAPS — full text, every gap ===
  y = newPage(doc);
  y = sectionHeader(doc, 'Revenue Leaks & Gaps', y);

  for (const gap of report.gaps) {
    // Compute card height from real wrapped text
    const titleLines = wrap(doc, gap.title || '', CONTENT_W - 16, 11);
    const descLines = wrap(doc, gap.description || '', CONTENT_W - 16, 9);
    const fixLines = gap.recommendedFix ? wrap(doc, gap.recommendedFix, CONTENT_W - 16, 9) : [];
    const hasMetrics = !!(gap.annualCost || gap.projectedROI);

    const cardH =
      8 + // category line
      titleLines.length * 5 + 2 +
      descLines.length * 4.5 + 4 +
      (hasMetrics ? 8 : 0) +
      (fixLines.length ? fixLines.length * 4.5 + 6 : 0) +
      6;

    y = ensure(doc, y, cardH + 4);

    doc.setFillColor(...COLORS.cardBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 2, 2, 'F');

    const accent =
      gap.severity === 'critical' ? COLORS.red :
      gap.severity === 'warning' ? COLORS.amber : COLORS.darkGray;
    doc.setFillColor(...accent);
    doc.rect(MARGIN, y, 3, cardH, 'F');

    let cy = y + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gold);
    doc.text(`${gap.category || ''}  •  ${(gap.severity || '').toUpperCase()}`, MARGIN + 8, cy);
    cy += 5;

    doc.setFontSize(11);
    doc.setTextColor(...COLORS.white);
    cy = drawLines(doc, titleLines, MARGIN + 8, cy, 5) + 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    cy = drawLines(doc, descLines, MARGIN + 8, cy, 4.5) + 2;

    if (hasMetrics) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      if (gap.annualCost) {
        doc.setTextColor(...COLORS.red);
        doc.text(`Annual Cost: ${gap.annualCost}`, MARGIN + 8, cy);
      }
      if (gap.projectedROI) {
        doc.setTextColor(...COLORS.gold);
        doc.text(`Projected ROI: ${gap.projectedROI}`, MARGIN + 95, cy);
      }
      cy += 6;
    }

    if (fixLines.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gold);
      doc.text('RECOMMENDED FIX', MARGIN + 8, cy);
      cy += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.gray);
      cy = drawLines(doc, fixLines, MARGIN + 8, cy, 4.5);
    }

    y += cardH + 4;
  }

  // === ROADMAP ===
  if (report.roadmap?.length) {
    y = newPage(doc);
    y = sectionHeader(doc, '6-Month Strategic Roadmap', y);

    for (const item of report.roadmap) {
      const actionLines = wrap(doc, item.action || '', CONTENT_W - 50, 9);
      const cardH = Math.max(22, actionLines.length * 4.5 + 14);
      y = ensure(doc, y, cardH + 4);

      doc.setFillColor(...COLORS.cardBg);
      doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 2, 2, 'F');
      doc.setFillColor(...COLORS.gold);
      doc.rect(MARGIN, y, 3, cardH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.gold);
      doc.text(item.month || '', MARGIN + 8, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.white);
      drawLines(doc, actionLines, MARGIN + 40, y + 8, 4.5);

      doc.setFontSize(7);
      doc.setTextColor(...COLORS.gray);
      doc.text(`Cost: ${item.estimatedCost || '—'}  |  Recovery: ${item.projectedRecovery || '—'}`, MARGIN + 8, y + cardH - 4);

      y += cardH + 4;
    }
  }

  // === ROI ===
  if (report.roiTable?.length) {
    y = ensure(doc, y, 30);
    y = sectionHeader(doc, 'ROI Projections', y);

    doc.setFillColor(...COLORS.gold);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.bg);
    doc.text('Category', MARGIN + 4, y + 6);
    doc.text('Current Annual Waste', MARGIN + 70, y + 6);
    doc.text('Projected Recovery', MARGIN + 130, y + 6);
    y += 10;

    report.roiTable.forEach((row, i) => {
      const catLines = wrap(doc, row.category || '', 60, 8);
      const rowH = Math.max(8, catLines.length * 4 + 2);
      y = ensure(doc, y, rowH + 2);
      if (i % 2 === 0) {
        doc.setFillColor(...COLORS.cardBg);
        doc.rect(MARGIN, y - 2, CONTENT_W, rowH, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.white);
      drawLines(doc, catLines, MARGIN + 4, y + 4, 4);
      doc.setTextColor(...COLORS.red);
      doc.text(row.currentWaste || '', MARGIN + 70, y + 4);
      doc.setTextColor(...COLORS.gold);
      doc.text(row.projectedRecovery || '', MARGIN + 130, y + 4);
      y += rowH + 1;
    });
  }

  // === NEXT STEPS ===
  if (report.nextSteps?.length) {
    y = newPage(doc);
    y = sectionHeader(doc, 'Recommended Next Steps', y);

    report.nextSteps.forEach((step, i) => {
      const stepLines = wrap(doc, step, CONTENT_W - 25, 10);
      const cardH = Math.max(16, stepLines.length * 5 + 8);
      y = ensure(doc, y, cardH + 4);

      doc.setFillColor(...COLORS.cardBg);
      doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.gold);
      doc.text(`${i + 1}`, MARGIN + 8, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.white);
      drawLines(doc, stepLines, MARGIN + 20, y + 8, 5);

      y += cardH + 4;
    });
  }

  // === BACK PAGE ===
  newPage(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gold);
  doc.text('AETHERIS TECHNOLOGY', PAGE_W / 2, 40, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.text('Ready to Fix the Leaks?', PAGE_W / 2, 70, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.text('This report identified real revenue leaks in your digital infrastructure.', PAGE_W / 2, 85, { align: 'center' });
  doc.text('Every day without action is money left on the table.', PAGE_W / 2, 92, { align: 'center' });

  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(55, 110, 100, 14, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.bg);
  doc.text('BOOK A STRATEGY SESSION', PAGE_W / 2, 119, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  doc.text('aetheris.technology  |  Indianapolis, IN', PAGE_W / 2, 140, { align: 'center' });
  doc.text('joseph@aetheris.technology', PAGE_W / 2, 147, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.goldDim);
  const closing = '"Notice I did not ask for your business. This is free. What I do is educational. I find problems. I show the math. If you want them fixed \u2014 that is when I go to work."';
  const closingLines = wrap(doc, closing, 140, 8.5);
  let cy = 180;
  for (const line of closingLines) {
    doc.text(line, PAGE_W / 2, cy, { align: 'center' });
    cy += 5;
  }

  doc.save(`${(report.companyName || 'Diagnostic').replace(/\s+/g, '_')}_Executive_Report.pdf`);
}
