import jsPDF from 'jspdf';

const AMBER: [number, number, number] = [232, 165, 38];
const INK: [number, number, number] = [18, 18, 22];
const PAPER: [number, number, number] = [240, 235, 224];
const MUTED: [number, number, number] = [90, 90, 95];
const CRIMSON: [number, number, number] = [161, 33, 33];

interface Section {
  title: string;
  intro: string;
  items: string[];
}

const SECTIONS: Section[] = [
  {
    title: '1 · Pre-Flight: Operational Readiness',
    intro: 'Before any AI tool touches your stack, confirm these five.',
    items: [
      'Documented map of every recurring operational workflow (sales, ops, finance, support).',
      'Single source of truth for customer data (CRM, billing, support all reconcile).',
      'Defined owner per workflow — name, not job title.',
      'Baseline KPIs captured for each process (time-to-close, response time, error rate).',
      'Written list of the top 5 "this is broken and we know it" leaks.',
    ],
  },
  {
    title: '2 · Use-Case Triage (Build vs Buy vs Skip)',
    intro: 'Not every problem deserves AI. Score each candidate.',
    items: [
      'Volume: does this happen >100×/month? If no → skip.',
      'Variance: is the work repetitive enough that a model can pattern-match? If no → skip.',
      'Cost of error: a wrong AI answer here is recoverable, not catastrophic.',
      'Vendor exists that solves 80% of it for <$500/mo → BUY before you build.',
      'Cannot be solved by a vendor + has proprietary data leverage → BUILD.',
    ],
  },
  {
    title: '3 · Data & Access Hygiene',
    intro: 'AI is only as good as the data it touches.',
    items: [
      'PII / PHI / financial data classified and access-controlled per record.',
      'API keys rotated in the last 90 days; no secrets in code.',
      'Audit log on every AI-driven action (who/what/when).',
      'Vendor DPA + data-residency review on file for every AI tool.',
      'Internal "do not feed to LLM" list for legal, HR, M&A docs.',
    ],
  },
  {
    title: '4 · Pilot Design (30-Day Rule)',
    intro: 'No AI rollout exceeds 30 days without a measurable verdict.',
    items: [
      'Pilot scoped to ONE workflow, ONE team, ONE success metric.',
      'Baseline metric captured for 30 days BEFORE the pilot starts.',
      'Pre-defined kill criteria — what number triggers shutdown.',
      'Human-in-loop checkpoint on every AI output during pilot.',
      'Weekly written debrief — what worked, what hallucinated, what was slower.',
    ],
  },
  {
    title: '5 · Rollout & Change Management',
    intro: 'The model is the easy part. The org is the hard part.',
    items: [
      'Operator/owner trained to override the model and document why.',
      'Customer-facing copy updated if AI now answers them.',
      'Internal Slack/Teams channel for "AI did something weird" reports.',
      'Quarterly recalibration: retrain prompts, swap models, kill what underperforms.',
      'Compensation/ops plan adjusted — capacity that AI freed up has a new mission.',
    ],
  },
  {
    title: '6 · Risk, Compliance & Brand',
    intro: 'Where most ops managers get blindsided.',
    items: [
      'Disclosure language reviewed by legal (FTC AI guidance, EU AI Act if EU customers).',
      'Bias test on any AI touching hiring, lending, pricing, or customer eligibility.',
      'Bot/AI clearly labeled to end-users where required by jurisdiction.',
      'Insurance carrier notified — many policies now require AI use disclosure.',
      'Vendor exit plan: if the AI vendor disappears tomorrow, what breaks?',
    ],
  },
  {
    title: '7 · Measure What Actually Moved',
    intro: 'If you cannot tie AI to dollars, you do not have AI — you have a toy.',
    items: [
      'Hours saved × loaded labor cost = hard-dollar savings, calculated monthly.',
      'Conversion lift / response-time lift attributed only after holdout test.',
      'Cost per outcome (per ticket resolved, per lead qualified) tracked vs baseline.',
      'Net Revenue Retention or churn delta measured 90 days post-rollout.',
      'Quarterly board-ready one-pager: spent, saved, earned, killed.',
    ],
  },
];

export interface ChecklistPdfData {
  name?: string;
  company?: string;
  email: string;
}

export function generateAIChecklistPdf(data: ChecklistPdfData): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 54;
  let y = M;

  const paint = () => {
    pdf.setFillColor(...PAPER);
    pdf.rect(0, 0, W, H, 'F');
  };

  paint();

  // Header
  pdf.setFillColor(...INK);
  pdf.rect(0, 0, W, 32, 'F');
  pdf.setTextColor(...AMBER);
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(9);
  pdf.text('AETHERIS · BUSINESS FORENSICS · INDIANAPOLIS', M, 20);
  pdf.setTextColor(...PAPER);
  pdf.text('CASE FILE · AI-IMPL-CHECKLIST', W - M, 20, { align: 'right' });

  y = 70;
  pdf.setTextColor(...INK);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(28);
  pdf.text('AI Implementation Checklist', M, y);
  y += 28;
  pdf.setFontSize(18);
  pdf.setTextColor(...CRIMSON);
  pdf.text('for Operations Managers', M, y);
  y += 26;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text(
    `Prepared for: ${data.name || 'Operator'}${data.company ? ` · ${data.company}` : ''}  ·  ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    M,
    y,
  );
  y += 24;

  pdf.setTextColor(...INK);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const intro = pdf.splitTextToSize(
    'Use this as a forensic pre-flight before any AI rollout. Every checkbox you cannot truthfully tick is a leak. Pilots launched on top of unchecked boxes do not fail loudly — they fail quietly while the invoice keeps clearing.',
    W - M * 2,
  );
  pdf.text(intro, M, y);
  y += intro.length * 14 + 12;

  for (const sec of SECTIONS) {
    if (y > H - 140) {
      pdf.addPage();
      paint();
      y = M;
    }
    pdf.setFont('times', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...AMBER);
    pdf.text(sec.title, M, y);
    y += 16;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(...MUTED);
    const introLines = pdf.splitTextToSize(sec.intro, W - M * 2);
    pdf.text(introLines, M, y);
    y += introLines.length * 12 + 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...INK);
    for (const it of sec.items) {
      if (y > H - 60) {
        pdf.addPage();
        paint();
        y = M;
      }
      // Checkbox
      pdf.setDrawColor(...INK);
      pdf.setLineWidth(0.8);
      pdf.rect(M, y - 9, 10, 10);
      const lines = pdf.splitTextToSize(it, W - M * 2 - 18);
      pdf.text(lines, M + 18, y);
      y += lines.length * 13 + 4;
    }
    y += 8;
  }

  // Footer / CTA on last page
  if (y > H - 120) {
    pdf.addPage();
    paint();
    y = M;
  }
  y = H - 120;
  pdf.setFillColor(...INK);
  pdf.rect(M, y, W - M * 2, 80, 'F');
  pdf.setTextColor(...AMBER);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(14);
  pdf.text('Want us to run this on your business?', M + 16, y + 26);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...PAPER);
  pdf.text('Forensic Diagnostic — $2,500 flat, applied 1:1 toward any engagement.', M + 16, y + 44);
  pdf.text('aetheris.technology  ·  hello@aetheris.technology  ·  (317) 376-2110', M + 16, y + 60);

  // Watermark
  pdf.setTextColor(...MUTED);
  pdf.setFontSize(7);
  pdf.text('Aetheris AI Studio', W - M, H - 12, { align: 'right' });

  return pdf;
}
