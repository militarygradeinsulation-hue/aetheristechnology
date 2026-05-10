import jsPDF from 'jspdf';

const INK: [number, number, number] = [18, 18, 22];
const AMBER: [number, number, number] = [232, 165, 38];
const MUTED: [number, number, number] = [120, 120, 130];
const PAPER: [number, number, number] = [240, 235, 224];

interface Section {
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    title: '1. How we define a revenue leak',
    body: [
      'A revenue leak is a measurable gap between revenue a business should have captured and revenue it actually captured, attributable to a specific operational, sales, or system failure. It is not a forecast, a projection, or a "potential opportunity." It is a delta between two observable numbers.',
      'Examples: leads received but never contacted within SLA; quoted deals not followed up after Day 3; signed contracts that never converted to billable activity; CRM records duplicated across tools causing rep double-work; marketing-attributed pipeline that never matched to closed-won.',
    ],
  },
  {
    title: '2. How we measure baseline',
    body: [
      'We pull a 12-month snapshot from your system of record (HubSpot, Salesforce, or a CSV export of contacts, deals, and activities). We then sample three measurement layers:',
      '- Lead-to-contact: time from inbound capture to first human response.',
      '- Deal-stage progression: time-in-stage by deal value, conversion rate per stage, and stalled-deal aging.',
      '- Touch frequency: number of outbound touches per opportunity vs. industry benchmark for the deal size.',
      'Where data is missing, we say so explicitly in the report. We do not estimate around missing data.',
    ],
  },
  {
    title: '3. How we attribute recovered revenue',
    body: [
      'Every leak in the report is tagged with: (a) the baseline metric we measured, (b) the proposed fix, (c) the conservative and aggressive ROI projection, and (d) the metric we will re-measure after implementation to confirm recovery.',
      'Recovered revenue is only claimed against pre/post measurement of the same metric on the same population, with the same definition. No counterfactuals. No "would have been."',
    ],
  },
  {
    title: '4. Scope — what is in, what is out',
    body: [
      'In scope: CRM data, sales activity logs, lead-source attribution, sales-stage definitions, follow-up cadences, quote-to-close timelines, and operational handoffs between marketing, sales, and delivery.',
      'Out of scope: product pricing strategy, brand strategy, hiring decisions, equity / capital structure, legal compliance, manufacturing operations on the shop floor.',
    ],
  },
  {
    title: '5. What an auditor would need to verify it',
    body: [
      'Every claim in the final report can be traced to a record export. We deliver: the source CSVs / API pulls used, the SQL or pandas queries that produced each metric, the methodology document (this one), and a re-runnable script for any post-implementation re-measurement.',
      'A CFO, controller, or external auditor with read-only access to your CRM can re-derive every number in the report.',
    ],
  },
  {
    title: '6. The 21-Day Diagnostic — deliverables',
    body: [
      '- Written report (15–30 pages): leak map, prioritized fixes, ROI projections, implementation roadmap.',
      '- Source-data appendix: every CSV / query used.',
      '- 60-minute readout call with you and up to two of your team.',
      '- A fixed-fee quote for implementation if you choose to proceed.',
      'Fixed fee: $18,500. Timeline: 21 calendar days from kickoff. CRM-agnostic — runs on a CSV export. HubSpot or Salesforce live integration is an upsell, not a prerequisite.',
    ],
  },
];

export function generateMethodologyPdf() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;

  // Cover
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(...AMBER);
  doc.rect(0, 0, pageW, 4, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  doc.text('AETHERIS · MEASUREMENT METHODOLOGY', margin, 18);
  doc.text('v1.0', pageW - margin, 18, { align: 'right' });

  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(245, 240, 230);
  doc.text('Revenue Diagnostic', margin, 70);
  doc.text('Methodology', margin, 84);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(190, 185, 170);
  const intro = doc.splitTextToSize(
    'How we define, measure, and attribute revenue leaks for specialty manufacturers ($5M–$25M). This document is sent to every prospect before pricing is discussed.',
    contentW,
  );
  doc.text(intro, margin, 100);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Aetheris · Indianapolis, IN · (317) 376-2110 · aetheris.technology', margin, pageH - 10);

  // Sections
  SECTIONS.forEach((sec) => {
    doc.addPage();
    doc.setFillColor(...PAPER);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setFillColor(...INK);
    doc.rect(0, 0, pageW, 4, 'F');

    let y = 28;
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...INK);
    const titleLines = doc.splitTextToSize(sec.title, contentW);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 8 + 6;

    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.6);
    doc.line(margin, y - 4, margin + 30, y - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 50);
    sec.body.forEach((para) => {
      const lines = doc.splitTextToSize(para, contentW);
      if (y + lines.length * 6 > pageH - 20) {
        doc.addPage();
        doc.setFillColor(...PAPER);
        doc.rect(0, 0, pageW, pageH, 'F');
        y = 28;
      }
      doc.text(lines, margin, y);
      y += lines.length * 6 + 5;
    });

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('AETHERIS · METHODOLOGY · ' + sec.title.split('.')[0], margin, pageH - 8);
  });

  doc.save('Aetheris-Revenue-Diagnostic-Methodology.pdf');
}
