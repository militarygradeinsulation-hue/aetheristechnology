import jsPDF from 'jspdf';

const INK: [number, number, number] = [12, 12, 16];
const AMBER: [number, number, number] = [232, 165, 38];
const MUTED: [number, number, number] = [150, 150, 160];
const PAPER: [number, number, number] = [235, 230, 218];

interface Section {
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    title: 'Definition',
    body: 'A revenue leak is a measurable gap between revenue captured and revenue that should have been captured, attributable to a specific operational, sales, or system failure. Not a forecast. A delta between two observable numbers, leads not contacted in SLA, deals stalled past Day 3, contracts never billed, duplicate CRM records, marketing pipeline that never matched closed-won.',
  },
  {
    title: 'Baseline',
    body: '12-month snapshot from your system of record (HubSpot, Salesforce, or CSV export). Three layers: lead-to-contact time, deal-stage progression and stalled-deal aging, outbound touch frequency vs. benchmark for deal size. Missing data is named explicitly. We do not estimate around gaps.',
  },
  {
    title: 'Attribution',
    body: 'Each leak is tagged with: baseline metric, proposed fix, conservative + aggressive ROI projection, and the metric we re-measure post-implementation. Recovered revenue is only claimed against pre/post measurement on the same population. No counterfactuals.',
  },
  {
    title: 'Scope',
    body: 'In: CRM data, sales activity, lead-source attribution, sales-stage definitions, follow-up cadences, quote-to-close, marketing/sales/delivery handoffs. Out: pricing strategy, brand, hiring, capital structure, legal, manufacturing shop floor.',
  },
  {
    title: 'Audit trail',
    body: 'Every claim traces to a record export. Deliverables include source CSVs/API pulls, the SQL or pandas queries behind each metric, this methodology doc, and a re-runnable post-implementation script. A controller or external auditor with read-only CRM access can re-derive every number.',
  },
  {
    title: '21-Day Diagnostic, deliverables',
    body: 'Written report (15–30 pp): leak map, prioritized fixes, ROI, roadmap. Source-data appendix. 60-min readout with you and up to two team members. Fixed implementation quote. Fee: $18,500. Timeline: 21 calendar days. CRM-agnostic, runs on a CSV export.',
  },
];

export function generateMethodologyPdf() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;

  const paintBg = () => {
    doc.setFillColor(...INK);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setFillColor(...AMBER);
    doc.rect(0, 0, pageW, 3, 'F');
  };

  // Page 1, Title + first half
  paintBg();

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text('AETHERIS · MEASUREMENT METHODOLOGY · v1.0', margin, 14);

  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...PAPER);
  doc.text('Revenue Diagnostic Methodology', margin, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(190, 185, 170);
  const intro = doc.splitTextToSize(
    'How we define, measure, and attribute revenue leaks for specialty manufacturers ($5M–$25M). Sent to every prospect before pricing.',
    contentW,
  );
  doc.text(intro, margin, 40);

  let y = 56;
  const drawSection = (sec: Section) => {
    // estimate height
    const bodyLines = doc.splitTextToSize(sec.body, contentW);
    const blockH = 8 + bodyLines.length * 4.5 + 4;
    if (y + blockH > pageH - 14) {
      doc.addPage();
      paintBg();
      y = 20;
    }
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...AMBER);
    doc.text(sec.title.toUpperCase(), margin, y);
    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, margin + 14, y + 1.5);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(220, 215, 200);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 4.5 + 5;
  };

  SECTIONS.forEach(drawSection);

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Aetheris · Indianapolis, IN · (317) 376-2110 · aetheris.technology', margin, pageH - 7);
    doc.text(`${i}/${pageCount}`, pageW - margin, pageH - 7, { align: 'right' });
  }

  doc.save('Aetheris-Revenue-Diagnostic-Methodology.pdf');
}
