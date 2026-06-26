import jsPDF from 'jspdf';
import {
  BRIEF, CONTENT_W, paintBg, sanitize,
  briefCoverHeader, briefInnerHeader,
  briefDisplayTitle, briefSectionLabel, briefBody, briefCallout,
  briefArrowList, briefCtaBanner, briefNewPage, briefEnsure,
  stampFooters,
} from './briefPdfStyle';

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

const M = BRIEF.margin;

function gapCard(doc: jsPDF, gap: ReportGap, y: number, subtitle: string): number {
  // measure
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  const titleLines = doc.splitTextToSize(sanitize(gap.title || ''), CONTENT_W - 16) as string[];
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const descLines = doc.splitTextToSize(sanitize(gap.description || ''), CONTENT_W - 16) as string[];
  const fixLines = gap.recommendedFix
    ? doc.splitTextToSize(sanitize(gap.recommendedFix), CONTENT_W - 16) as string[]
    : [];
  const hasMetrics = !!(gap.annualCost || gap.projectedROI);
  const h = 10
    + titleLines.length * 5 + 2
    + descLines.length * 4.5 + 3
    + (hasMetrics ? 7 : 0)
    + (fixLines.length ? 6 + fixLines.length * 4.5 : 0)
    + 6;

  y = briefEnsure(doc, y, h + 4, subtitle);

  doc.setFillColor(...BRIEF.panel);
  doc.rect(M, y, CONTENT_W, h, 'F');

  const accent =
    gap.severity === 'critical' ? BRIEF.red :
    gap.severity === 'warning' ? BRIEF.amber : BRIEF.dim;
  doc.setFillColor(...accent);
  doc.rect(M, y, 2, h, 'F');

  let cy = y + 6;
  doc.setFont('courier', 'bold'); doc.setFontSize(7.5);
  doc.setTextColor(...BRIEF.amber);
  doc.text(`${sanitize(gap.category).toUpperCase()}  ·  ${sanitize(gap.severity).toUpperCase()}`, M + 8, cy);
  cy += 5;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.setTextColor(...BRIEF.paper);
  titleLines.forEach((ln) => { doc.text(ln, M + 8, cy); cy += 5; });
  cy += 1;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.setTextColor(...BRIEF.muted);
  descLines.forEach((ln) => { doc.text(ln, M + 8, cy); cy += 4.5; });
  cy += 2;

  if (hasMetrics) {
    doc.setFont('courier', 'bold'); doc.setFontSize(8);
    if (gap.annualCost) {
      doc.setTextColor(...BRIEF.red);
      doc.text(`ANNUAL COST  ${sanitize(gap.annualCost)}`, M + 8, cy);
    }
    if (gap.projectedROI) {
      doc.setTextColor(...BRIEF.amber);
      doc.text(`PROJECTED ROI  ${sanitize(gap.projectedROI)}`, M + 95, cy);
    }
    cy += 6;
  }

  if (fixLines.length) {
    doc.setFont('courier', 'bold'); doc.setFontSize(7.5);
    doc.setTextColor(...BRIEF.amber);
    doc.text('RECOMMENDED FIX', M + 8, cy);
    cy += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(...BRIEF.text);
    fixLines.forEach((ln) => { doc.text(ln, M + 8, cy); cy += 4.5; });
  }

  return y + h + 4;
}

// ============ PREVIEW (1 page teaser) ============
export function generatePreviewPdf(report: FullReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const subject = report.companyName || 'Website Analysis';
  paintBg(doc);
  briefCoverHeader(doc, `Scan Preview  ·  Confidential  ·  Prepared for ${subject}`);

  let y = 78;
  y = briefDisplayTitle(doc, ['Your Website', 'Has a Revenue', 'Leak Problem.'], y);

  y = briefSectionLabel(doc, 'Preview Findings', y);
  y = briefBody(
    doc,
    `Score ${report.score}/100  ·  Grade ${report.grade}. The full Executive Diagnostic names every leak, quantifies the dollar bleed, and hands you a sealed remediation plan.`,
    y,
    { color: BRIEF.text },
  );

  for (const gap of report.gaps.slice(0, 2)) {
    y = gapCard(doc, gap, y, 'Scan Preview');
  }

  y = Math.max(y, 200);
  y = briefCtaBanner(doc, 'Unlock the Full Diagnostic', 'Operator-led. 21 days. Every leak named and priced.', y);
  briefBody(doc, 'Contact: businessforensics.tech  ·  (317) 495-4601', y, { color: BRIEF.muted, size: 9 });

  stampFooters(doc, subject);
  doc.save(`${subject.replace(/\s+/g, '_')}_Scan_Preview.pdf`);
}

// ============ FULL REPORT ============
export function generateFullReport(report: FullReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const subject = report.companyName || 'Website Analysis';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ===== COVER =====
  paintBg(doc);
  briefCoverHeader(doc, `Executive Diagnostic  ·  Confidential  ·  Prepared for ${subject}`);

  let y = 78;
  y = briefDisplayTitle(doc, ['You Are Leaking', 'Revenue. We Found', 'Where.'], y);

  y = briefBody(
    doc,
    `Most operators do not know where they are losing money. Aetheris finds it, then we put the right systems in place to plug them.`,
    y,
  );

  y = briefSectionLabel(doc, 'Case Summary', y);
  doc.setFillColor(...BRIEF.panel);
  doc.rect(M, y, CONTENT_W, 26, 'F');
  doc.setFillColor(...BRIEF.amber);
  doc.rect(M, y, 2.5, 26, 'F');
  doc.setFont('courier', 'bold'); doc.setFontSize(9);
  doc.setTextColor(...BRIEF.amber);
  doc.text('SUBJECT', M + 8, y + 8);
  doc.text('GRADE', M + 80, y + 8);
  doc.text('SCORE', M + 120, y + 8);
  doc.text('FILED', M + 155, y + 8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.setTextColor(...BRIEF.paper);
  doc.text(sanitize(subject), M + 8, y + 16);
  doc.setFont('courier', 'bold'); doc.setFontSize(16);
  doc.setTextColor(...BRIEF.amberHi);
  doc.text(sanitize(report.grade), M + 80, y + 18);
  doc.setTextColor(...BRIEF.paper);
  doc.text(`${report.score}/100`, M + 120, y + 18);
  doc.setFont('courier', 'normal'); doc.setFontSize(9);
  doc.setTextColor(...BRIEF.text);
  doc.text(date, M + 155, y + 18);
  y += 32;

  y = briefCallout(
    doc,
    '78% of the leaks we find, the owner already felt. They just could not name them.',
    y,
    'Aetheris Technology, Forensic Case Files',
  );

  // ===== EXECUTIVE SUMMARY =====
  y = briefNewPage(doc, 'Executive Diagnostic');
  y = briefSectionLabel(doc, 'Executive Summary', y);
  y = briefBody(doc, report.executiveSummary || 'No summary provided.', y);

  if (report.competitiveBrief) {
    y = briefSectionLabel(doc, 'Competitive Intelligence Brief', y);
    y = briefBody(doc, report.competitiveBrief, y);
  }

  // ===== LEAKS =====
  y = briefNewPage(doc, 'Revenue Leaks');
  y = briefSectionLabel(doc, `Revenue Leaks Identified  ·  ${report.gaps.length}`, y);
  for (const gap of report.gaps) {
    y = gapCard(doc, gap, y, 'Revenue Leaks');
  }

  // ===== ROADMAP =====
  if (report.roadmap?.length) {
    y = briefNewPage(doc, 'Remediation Roadmap');
    y = briefSectionLabel(doc, '6-Month Strategic Roadmap', y);
    for (const item of report.roadmap) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const actionLines = doc.splitTextToSize(sanitize(item.action || ''), CONTENT_W - 36) as string[];
      const h = Math.max(20, 10 + actionLines.length * 4.5 + 6);
      y = briefEnsure(doc, y, h + 4, 'Remediation Roadmap');

      doc.setFillColor(...BRIEF.panel);
      doc.rect(M, y, CONTENT_W, h, 'F');
      doc.setFillColor(...BRIEF.amber);
      doc.rect(M, y, 26, h, 'F');
      doc.setFont('courier', 'bold'); doc.setFontSize(10);
      doc.setTextColor(...BRIEF.bg);
      doc.text(sanitize(item.month || ''), M + 13, y + h / 2 + 1, { align: 'center' });

      let cy = y + 8;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.setTextColor(...BRIEF.paper);
      actionLines.forEach((ln) => { doc.text(ln, M + 32, cy); cy += 4.5; });

      doc.setFont('courier', 'normal'); doc.setFontSize(7.5);
      doc.setTextColor(...BRIEF.muted);
      doc.text(
        `COST  ${sanitize(item.estimatedCost) || 'N/A'}    ·    RECOVERY  ${sanitize(item.projectedRecovery) || 'N/A'}`,
        M + 32, y + h - 4,
      );
      y += h + 4;
    }
  }

  // ===== ROI =====
  if (report.roiTable?.length) {
    y = briefNewPage(doc, 'ROI Projections');
    y = briefSectionLabel(doc, 'ROI Projections', y);
    doc.setFillColor(...BRIEF.amber);
    doc.rect(M, y, CONTENT_W, 8, 'F');
    doc.setFont('courier', 'bold'); doc.setFontSize(8);
    doc.setTextColor(...BRIEF.bg);
    doc.text('CATEGORY', M + 4, y + 5.5);
    doc.text('CURRENT ANNUAL WASTE', M + 80, y + 5.5);
    doc.text('PROJECTED RECOVERY', M + 140, y + 5.5);
    y += 10;
    report.roiTable.forEach((row, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const catLines = doc.splitTextToSize(sanitize(row.category || ''), 70) as string[];
      const rowH = Math.max(7, catLines.length * 4.5 + 2);
      y = briefEnsure(doc, y, rowH + 2, 'ROI Projections');
      if (i % 2 === 0) {
        doc.setFillColor(...BRIEF.panel);
        doc.rect(M, y - 2, CONTENT_W, rowH, 'F');
      }
      doc.setTextColor(...BRIEF.text);
      let ry = y + 3;
      catLines.forEach((ln) => { doc.text(ln, M + 4, ry); ry += 4.5; });
      doc.setTextColor(...BRIEF.red);
      doc.text(sanitize(row.currentWaste || ''), M + 80, y + 3);
      doc.setTextColor(...BRIEF.amber);
      doc.text(sanitize(row.projectedRecovery || ''), M + 140, y + 3);
      y += rowH + 1;
    });
  }

  // ===== NEXT STEPS =====
  if (report.nextSteps?.length) {
    y = briefNewPage(doc, 'Recommended Next Steps');
    y = briefSectionLabel(doc, 'Recommended Next Steps', y);
    y = briefArrowList(doc, report.nextSteps, y);
  }

  // ===== CTA =====
  briefNewPage(doc, 'Engagement');
  let cy = 50;
  cy = briefDisplayTitle(doc, ['Ready to Fix', 'the Leaks?'], cy);
  cy = briefBody(
    doc,
    'This report identified real revenue leaks in your operation. Every day without action is money left on the table.',
    cy,
  );
  cy = briefCtaBanner(doc, 'Book the Forensic Diagnostic', '21 days. Operator-led. Every leak named and priced.', cy);
  briefBody(
    doc,
    'businessforensics.tech  ·  aetheris.technology  ·  (317) 495-4601  ·  Braden Roberts, Managing Partner',
    cy,
    { color: BRIEF.muted, size: 9 },
  );

  stampFooters(doc, subject);
  doc.save(`${subject.replace(/\s+/g, '_')}_Executive_Diagnostic.pdf`);
}
