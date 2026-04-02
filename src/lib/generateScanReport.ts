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

function addPage(doc: jsPDF) {
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function drawGoldBar(doc: jsPDF, y: number, width = CONTENT_W) {
  doc.setFillColor(...COLORS.gold);
  doc.rect(MARGIN, y, width, 1, 'F');
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  drawGoldBar(doc, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.gold);
  doc.text(title.toUpperCase(), MARGIN, y + 10);
  return y + 16;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxWidth);
}

function drawWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number, lineHeight: number): number {
  const lines = wrapText(doc, text, maxWidth, fontSize);
  for (const line of lines) {
    if (y > PAGE_H - 25) return y; // Don't overflow
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 25) {
    addPage(doc);
    return 30;
  }
  return y;
}

export function generatePreviewPdf(report: FullReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Background
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Gold accent bars
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F');

  // Title
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

  // Show first 2 gaps
  let y = 130;
  const visibleGaps = report.gaps.slice(0, 2);
  for (const gap of visibleGaps) {
    drawGoldBar(doc, y, 60);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gold);
    doc.text(`${gap.category}  •  ${gap.severity.toUpperCase()}`, MARGIN, y);
    y += 6;
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.white);
    doc.text(gap.title, MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    y = drawWrappedText(doc, gap.description, MARGIN, y, CONTENT_W, 9, 4.5);
    y += 8;
  }

  // Gated message
  y += 10;
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

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkGray);
  doc.text('PREVIEW ONLY  |  aetheristechnology.com', PAGE_W / 2, PAGE_H - 10, { align: 'center' });

  doc.save(`${(report.companyName || 'scan').replace(/\s+/g, '_')}_Preview.pdf`);
}

export function generateFullReport(report: FullReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // === COVER PAGE ===
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Top gold bar
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, PAGE_W, 5, 'F');

  // Left accent
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

  drawGoldBar(doc, 155, 80);

  doc.setFontSize(16);
  doc.setTextColor(...COLORS.gold);
  doc.text(report.companyName || 'Website Analysis', MARGIN + 10, 170);

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  doc.text(`Prepared: ${date}`, MARGIN + 10, 185);
  doc.text(`Digital Health Score: ${report.score}/100  |  Grade: ${report.grade}`, MARGIN + 10, 192);

  // Confidential
  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(MARGIN + 10, 220, 60, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gold);
  doc.text('CONFIDENTIAL', MARGIN + 30, 228);

  // Bottom bar
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, PAGE_H - 5, PAGE_W, 5, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkGray);
  doc.text('aetheristechnology.com  |  Indianapolis, IN', PAGE_W / 2, PAGE_H - 10, { align: 'center' });

  // === EXECUTIVE SUMMARY PAGE ===
  addPage(doc);
  let y = 30;
  y = drawSectionHeader(doc, 'Executive Summary', y);
  y += 4;

  // Grade callout box
  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 3, 3, 'F');
  doc.setFillColor(...COLORS.gold);
  doc.rect(MARGIN, y, 4, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.gold);
  doc.text(`Grade: ${report.grade}`, MARGIN + 12, y + 10);
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.text(`Score: ${report.score}/100`, MARGIN + 70, y + 10);
  y += 28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.gray);
  y = drawWrappedText(doc, report.executiveSummary, MARGIN, y, CONTENT_W, 9.5, 5);
  y += 10;

  // Competitive Brief
  if (report.competitiveBrief) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, 'Competitive Intelligence Brief', y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.gray);
    y = drawWrappedText(doc, report.competitiveBrief, MARGIN, y, CONTENT_W, 9.5, 5);
  }

  // === GAP ANALYSIS PAGES ===
  addPage(doc);
  y = 30;
  y = drawSectionHeader(doc, 'Gap Analysis & Revenue Recovery', y);
  y += 6;

  for (const gap of report.gaps) {
    y = checkPageBreak(doc, y, 55);

    // Gap card background
    doc.setFillColor(...COLORS.cardBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, 48, 2, 2, 'F');

    // Severity accent
    const accentColor = gap.severity === 'critical' ? COLORS.red : gap.severity === 'warning' ? COLORS.amber : COLORS.darkGray;
    doc.setFillColor(...accentColor);
    doc.rect(MARGIN, y, 3, 48, 'F');

    // Category + Severity
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gold);
    doc.text(`${gap.category}  •  ${gap.severity.toUpperCase()}`, MARGIN + 8, y + 7);

    // Title
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.text(gap.title, MARGIN + 8, y + 14);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    const descLines = wrapText(doc, gap.description, CONTENT_W - 16, 8);
    let dy = y + 20;
    for (let i = 0; i < Math.min(descLines.length, 3); i++) {
      doc.text(descLines[i], MARGIN + 8, dy);
      dy += 4;
    }

    // Cost / Fix / ROI row
    const rowY = y + 36;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.red);
    doc.text(`Est. Leak: ${gap.annualCost || 'N/A'}`, MARGIN + 8, rowY);
    doc.setTextColor(...COLORS.gold);
    doc.text(`ROI: ${gap.projectedROI || 'N/A'}`, MARGIN + 75, rowY);
    doc.setTextColor(...COLORS.gray);
    doc.setFont('helvetica', 'normal');
    const fixLines = wrapText(doc, `Fix: ${gap.recommendedFix || 'N/A'}`, CONTENT_W - 16, 7);
    doc.text(fixLines[0] || '', MARGIN + 8, rowY + 5);

    y += 54;
  }

  // === STRATEGIC ROADMAP ===
  addPage(doc);
  y = 30;
  y = drawSectionHeader(doc, '6-Month Strategic Roadmap', y);
  y += 6;

  for (const item of report.roadmap) {
    y = checkPageBreak(doc, y, 30);

    doc.setFillColor(...COLORS.cardBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, 'F');
    doc.setFillColor(...COLORS.gold);
    doc.rect(MARGIN, y, 3, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gold);
    doc.text(item.month, MARGIN + 8, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.white);
    const actionLines = wrapText(doc, item.action, CONTENT_W - 50, 8.5);
    doc.text(actionLines[0] || '', MARGIN + 40, y + 8);

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    doc.text(`Cost: ${item.estimatedCost}  |  Recovery: ${item.projectedRecovery}`, MARGIN + 8, y + 17);

    y += 28;
  }

  // === ROI PROJECTIONS ===
  y = checkPageBreak(doc, y, 60);
  if (y < 40) y = 30;
  y = drawSectionHeader(doc, 'ROI Projections', y);
  y += 6;

  // Table header
  doc.setFillColor(...COLORS.gold);
  doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.bg);
  doc.text('Category', MARGIN + 4, y + 6);
  doc.text('Current Annual Waste', MARGIN + 70, y + 6);
  doc.text('Projected Recovery', MARGIN + 130, y + 6);
  y += 10;

  for (let i = 0; i < report.roiTable.length; i++) {
    y = checkPageBreak(doc, y, 10);
    const row = report.roiTable[i];
    if (i % 2 === 0) {
      doc.setFillColor(...COLORS.cardBg);
      doc.rect(MARGIN, y - 2, CONTENT_W, 8, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.text(row.category, MARGIN + 4, y + 4);
    doc.setTextColor(...COLORS.red);
    doc.text(row.currentWaste, MARGIN + 70, y + 4);
    doc.setTextColor(...COLORS.gold);
    doc.text(row.projectedRecovery, MARGIN + 130, y + 4);
    y += 9;
  }

  // === NEXT STEPS ===
  addPage(doc);
  y = 30;
  y = drawSectionHeader(doc, 'Recommended Next Steps', y);
  y += 6;

  for (let i = 0; i < report.nextSteps.length; i++) {
    y = checkPageBreak(doc, y, 20);
    doc.setFillColor(...COLORS.cardBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, 16, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.gold);
    doc.text(`${i + 1}`, MARGIN + 8, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.white);
    const stepLines = wrapText(doc, report.nextSteps[i], CONTENT_W - 25, 9);
    doc.text(stepLines[0] || '', MARGIN + 20, y + 8);
    if (stepLines[1]) doc.text(stepLines[1], MARGIN + 20, y + 13);

    y += 22;
  }

  // === BACK PAGE ===
  addPage(doc);
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, PAGE_W, 5, 'F');

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

  // CTA box
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(55, 110, 100, 14, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.bg);
  doc.text('BOOK A STRATEGY SESSION', PAGE_W / 2, 119, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  doc.text('aetheristechnology.com  |  Indianapolis, IN', PAGE_W / 2, 140, { align: 'center' });
  doc.text('joseph@aetheristechnology.com', PAGE_W / 2, 147, { align: 'center' });

  // Closing line
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.goldDim);
  const closing = '"Notice I did not ask for your business. This is free. What I do is educational. I find problems. I show the math. If you want them fixed \u2014 that is when I go to work."';
  const closingLines = wrapText(doc, closing, 140, 8.5);
  let cy = 180;
  for (const line of closingLines) {
    doc.text(line, PAGE_W / 2, cy, { align: 'center' });
    cy += 5;
  }

  doc.setFillColor(...COLORS.gold);
  doc.rect(0, PAGE_H - 5, PAGE_W, 5, 'F');

  doc.save(`${(report.companyName || 'Diagnostic').replace(/\s+/g, '_')}_Executive_Report.pdf`);
}
