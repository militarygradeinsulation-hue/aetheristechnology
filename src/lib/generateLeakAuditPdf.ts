import jsPDF from 'jspdf';
import {
  BRIEF, CONTENT_W, paintBg, sanitize,
  briefCoverHeader, briefDisplayTitle, briefSectionLabel,
  briefBody, briefCallout, briefStepCard, briefCtaBanner,
  briefNewPage, briefEnsure, stampFooters,
} from './briefPdfStyle';

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

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

const M = BRIEF.margin;

export function generateLeakAuditPdf(data: LeakAuditPdfData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const subject = data.company || data.name || 'Operator';

  // ===== COVER =====
  paintBg(doc);
  briefCoverHeader(doc, `Leak Audit  ·  Confidential  ·  Prepared for ${subject}`, { active: data.severity !== 'MINOR' });

  let y = 78;
  y = briefDisplayTitle(doc, ['Your Operation', 'Is Bleeding', 'Revenue.'], y);
  y = briefBody(
    doc,
    'A forensic field report on the leaks already costing you customers, hours, and cash. Self-reported scan. The Forensic Diagnostic confirms it with operator-led investigation.',
    y,
  );

  // Severity / leak panel
  y = briefSectionLabel(doc, 'Case Summary', y);
  const sevColor =
    data.severity === 'CRITICAL' ? BRIEF.red :
    data.severity === 'ACTIVE'   ? BRIEF.amber : BRIEF.dim;

  const h = 38;
  doc.setFillColor(...BRIEF.panel);
  doc.rect(M, y, CONTENT_W, h, 'F');
  doc.setFillColor(...sevColor);
  doc.rect(M, y, 2.5, h, 'F');

  doc.setFont('courier', 'bold'); doc.setFontSize(9);
  doc.setTextColor(...BRIEF.amber);
  doc.text('SEVERITY', M + 8, y + 8);
  doc.text('ESTIMATED ANNUAL LEAK', M + 80, y + 8);
  doc.text('AUDIT SCORE', M + 155, y + 8);

  doc.setFont('courier', 'bold'); doc.setFontSize(22);
  doc.setTextColor(...sevColor);
  doc.text(data.severity, M + 8, y + 22);

  doc.setFont('courier', 'bold'); doc.setFontSize(22);
  doc.setTextColor(...BRIEF.amberHi);
  doc.text(`${fmtUsd(data.estimatedAnnualLeak)} / yr`, M + 80, y + 22);

  doc.setFont('courier', 'bold'); doc.setFontSize(16);
  doc.setTextColor(...BRIEF.paper);
  doc.text(`${data.totalScore}/${data.maxScore}`, M + 155, y + 22);

  doc.setFont('courier', 'normal'); doc.setFontSize(7.5);
  doc.setTextColor(...BRIEF.muted);
  doc.text(`SUBJECT  ${sanitize(subject).toUpperCase()}    ·    REVENUE BAND  ${sanitize(data.revenueBand)}    ·    CONTACT  ${sanitize(data.email)}`,
    M + 8, y + h - 4);
  y += h + 8;

  y = briefCallout(
    doc,
    '78% of the leaks we find, the owner already felt. They just could not name them.',
    y,
    'Aetheris Technology, Forensic Case Files',
  );

  // ===== CATEGORY PAGES =====
  data.categories.forEach((cat, idx) => {
    let cy = briefNewPage(doc, `Section ${String(idx + 1).padStart(2, '0')} of ${String(data.categories.length).padStart(2, '0')}`);
    cy = briefSectionLabel(doc, `${cat.label}  ·  Score ${cat.score}/${cat.max} (${cat.pct}%)`, cy);
    cy = briefBody(doc, cat.diagnosis, cy);

    cy = briefSectionLabel(doc, 'Leaks Identified', cy);
    cat.topLeaks.forEach((leak, i) => {
      cy = briefEnsure(doc, cy, 24, 'Leaks Identified');
      cy = briefStepCard(doc, i + 1, leak, '', cy);
    });
  });

  // ===== CTA =====
  let cy = briefNewPage(doc, 'Next Step  ·  Forensic Diagnostic');
  cy = briefDisplayTitle(doc, ["You've Seen the", 'Symptoms. Now', 'Confirm the Wound.'], cy);
  cy = briefBody(
    doc,
    'The Leak Audit is a self-reported scan. The Forensic Diagnostic is the operator-led investigation: 14 days inside your operation, mapping every system, channel, and handoff. We name every leak, quantify the exact dollar bleed, and hand you a sealed remediation plan.',
    cy,
  );

  // Price block (amber slab)
  const ph = 38;
  doc.setFillColor(...BRIEF.amber);
  doc.rect(M, cy, CONTENT_W, ph, 'F');
  doc.setFont('courier', 'bold'); doc.setFontSize(9);
  doc.setTextColor(...BRIEF.bg);
  doc.text('THE FORENSIC DIAGNOSTIC', M + 8, cy + 9);
  doc.setFont('courier', 'bold'); doc.setFontSize(28);
  doc.text('$2,500', M + 8, cy + 25);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Flat.  14 days.  Applied toward engagement if you proceed.', M + 8, cy + 33);
  cy += ph + 8;

  cy = briefCtaBanner(doc, 'Book the Diagnostic', 'aetheris.technology/services  ·  (317) 495-4601', cy);

  stampFooters(doc, subject);

  const fileName = `Leak-Audit-${sanitize(subject).replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
}
