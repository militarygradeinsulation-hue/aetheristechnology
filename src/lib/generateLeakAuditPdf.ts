import jsPDF from 'jspdf';

export interface LeakAuditCategoryResult {
  key: string;
  label: string;
  score: number;
  max: number;
  pct: number;
  diagnosis: string;
  topLeaks: string[];
}

export interface LeakAuditPdfData {
  name?: string;
  company?: string;
  email: string;
  revenueBand: string;
  estimatedAnnualLeak: number;
  severity: 'CRITICAL' | 'ACTIVE' | 'MINOR';
  totalScore: number;
  maxScore: number;
  categories: LeakAuditCategoryResult[];
}

const CRIMSON: [number, number, number] = [161, 33, 33];
const AMBER: [number, number, number] = [232, 165, 38];
const INK: [number, number, number] = [18, 18, 22];
const PAPER: [number, number, number] = [240, 235, 224];
const MUTED: [number, number, number] = [120, 120, 130];

function severityColor(s: LeakAuditPdfData['severity']) {
  if (s === 'CRITICAL') return CRIMSON;
  if (s === 'ACTIVE') return AMBER;
  return [80, 140, 80] as [number, number, number];
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export function generateLeakAuditPdf(data: LeakAuditPdfData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 18;
  const contentW = pageW - margin * 2;

  // ============== COVER, CASE FILE ==============
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Top bar
  doc.setFillColor(...AMBER);
  doc.rect(0, 0, pageW, 4, 'F');

  // Header
  doc.setTextColor(...AMBER);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('AETHERIS · BUSINESS FORENSICS', margin, 16);
  doc.text(`CASE FILE · ${new Date().toISOString().slice(0, 10)}`, pageW - margin, 16, { align: 'right' });

  // Title
  doc.setTextColor(245, 240, 230);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.text('The Leak Audit', margin, 48);
  doc.setFont('times', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(180, 170, 150);
  doc.text('A forensic field report on your revenue leaks.', margin, 58);

  // Subject block
  let y = 78;
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentW, y);
  y += 8;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('SUBJECT', margin, y);
  doc.text('REVENUE BAND', margin + 80, y);
  doc.text('REPORT FOR', pageW - margin, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(245, 240, 230);
  doc.text(data.company || data.name || 'Operator', margin, y);
  doc.text(data.revenueBand, margin + 80, y);
  doc.text(data.email, pageW - margin, y, { align: 'right' });

  // Severity stamp
  y += 28;
  const sevColor = severityColor(data.severity);
  doc.setFillColor(...sevColor);
  doc.roundedRect(margin, y, contentW, 60, 2, 2, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('SEVERITY', margin + 6, y + 10);
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.text(data.severity, margin + 6, y + 26);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('ESTIMATED ANNUAL LEAK', margin + 6, y + 40);
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.text(fmtUsd(data.estimatedAnnualLeak) + ' / yr', margin + 6, y + 55);

  // Score
  y += 75;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`AUDIT SCORE  ${data.totalScore}/${data.maxScore}`, margin, y);

  // Footer disclaimer
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    'This is a self-reported forensic estimate. The Forensic Diagnostic ($2,500) confirms it with operator-led investigation.',
    margin, pageH - 12
  );
  doc.text('aetheris.technology · (317) 376-2110', margin, pageH - 7);

  // ============== CATEGORY PAGES ==============
  data.categories.forEach((cat, idx) => {
    doc.addPage();
    doc.setFillColor(...PAPER);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Top bar
    doc.setFillColor(...INK);
    doc.rect(0, 0, pageW, 4, 'F');

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`SECTION ${String(idx + 1).padStart(2, '0')} / ${String(data.categories.length).padStart(2, '0')}`, margin, 16);
    doc.text(`SCORE  ${cat.score}/${cat.max}  (${cat.pct}%)`, pageW - margin, 16, { align: 'right' });

    let cy = 32;
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...INK);
    doc.text(cat.label, margin, cy);

    cy += 4;
    doc.setDrawColor(...CRIMSON);
    doc.setLineWidth(0.5);
    doc.line(margin, cy, margin + 30, cy);

    cy += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 50);
    const diagLines = doc.splitTextToSize(cat.diagnosis, contentW);
    doc.text(diagLines, margin, cy);
    cy += diagLines.length * 6 + 6;

    // Leaks list
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...CRIMSON);
    doc.text('LEAKS IDENTIFIED', margin, cy);
    cy += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    cat.topLeaks.forEach((leak, i) => {
      const lines = doc.splitTextToSize(`${i + 1}.  ${leak}`, contentW - 4);
      doc.text(lines, margin, cy);
      cy += lines.length * 6 + 3;
    });

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`AETHERIS · LEAK AUDIT · ${cat.label.toUpperCase()}`, margin, pageH - 7);
  });

  // ============== CTA PAGE ==============
  doc.addPage();
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(...CRIMSON);
  doc.rect(0, 0, pageW, 4, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  doc.text('NEXT STEP · FORENSIC DIAGNOSTIC', margin, 16);

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(26);
  doc.setTextColor(245, 240, 230);
  doc.text('You\'ve seen the symptoms.', margin, 60);
  doc.text('Now confirm the wound.', margin, 72);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(200, 195, 180);
  const ctaCopy = doc.splitTextToSize(
    'The Leak Audit is a self-reported scan. The Forensic Diagnostic is the operator-led investigation, 14 days inside your operation, mapping every system, channel, and handoff. We name every leak, quantify the exact dollar bleed, and hand you a sealed remediation plan.',
    contentW
  );
  doc.text(ctaCopy, margin, 92);

  // Price block
  let py = 130;
  doc.setFillColor(...AMBER);
  doc.roundedRect(margin, py, contentW, 50, 2, 2, 'F');
  doc.setTextColor(...INK);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('THE FORENSIC DIAGNOSTIC', margin + 6, py + 10);
  doc.setFont('times', 'bold');
  doc.setFontSize(36);
  doc.text('$2,500', margin + 6, py + 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Flat. 14 days. Applied toward engagement if you proceed.', margin + 6, py + 42);

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...AMBER);
  doc.text('Book at: aetheris.technology/services', margin, 200);
  doc.setTextColor(245, 240, 230);
  doc.text('Or call (317) 376-2110', margin, 210);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Aetheris · Business Forensics · Indianapolis, IN', margin, pageH - 7);

  const fileName = `Leak-Audit-${(data.company || data.name || 'Report').replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
}
