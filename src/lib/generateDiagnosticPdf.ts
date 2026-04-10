import jsPDF from 'jspdf';

interface CategoryScore {
  score: number;
  max: number;
  pct: number;
}

interface DiagnosticPdfData {
  name?: string;
  company?: string;
  totalScore: number;
  maxScore: number;
  catScores: Record<string, CategoryScore>;
  weakestCategories: string[];
}

const categoryLabels: Record<string, string> = {
  marketing: 'Marketing & Visibility',
  conversion: 'Conversion & Sales',
  brand: 'Brand & Messaging',
  systems: 'Systems & Operations',
  growth: 'Growth & Strategy',
};

const categoryActions: Record<string, { title: string; actions: string[] }> = {
  marketing: {
    title: 'Fix Your Marketing & Visibility',
    actions: [
      'Audit your current lead sources — identify which ones bring revenue vs. just traffic.',
      'Build a simple content calendar: 3 posts/week minimum (2 educational, 1 promotional).',
      'Set up Google Analytics or a similar tool to track which channels drive actual inquiries.',
      'Create one lead magnet (checklist, guide, or calculator) relevant to your ideal customer.',
      'Implement UTM tracking on all outbound links so you know exactly what works.',
      'Dedicate 30 minutes weekly to engaging with your audience on your primary social platform.',
      'Start an email list — even 50 subscribers is a direct line to potential customers.',
      'Run a small paid ad test ($5-10/day) on your best-performing content to amplify reach.',
    ],
  },
  conversion: {
    title: 'Fix Your Conversion & Sales Process',
    actions: [
      'Add a clear, single call-to-action above the fold on your homepage (e.g., "Get a Free Quote").',
      'Set up an auto-responder for all inquiries — respond within 5 minutes, not 5 hours.',
      'Create a 3-touch follow-up sequence: Day 1 (thank you + next steps), Day 3 (value-add), Day 7 (check-in).',
      'Add social proof near your CTAs — testimonials, case studies, or client logos.',
      'Simplify your contact/quote form to 3-5 fields maximum.',
      'Install a live chat or chatbot to capture visitors who won\'t fill out a form.',
      'Review your last 10 lost deals — identify the common objection and address it on your site.',
      'Create a "What to Expect" page or section that walks prospects through your process.',
    ],
  },
  brand: {
    title: 'Fix Your Brand & Messaging',
    actions: [
      'Write a one-sentence value proposition: "We help [audience] achieve [result] without [pain point]."',
      'Replace all stock photos with real photos of your team, work, or office within 30 days.',
      'Create a competitor comparison page that clearly shows your differentiation.',
      'Develop 3 core brand messages and use them consistently across all channels.',
      'Ask 5 existing customers why they chose you — use their exact words in your marketing.',
      'Audit your website for jargon — replace industry terms with plain language.',
      'Create a brand voice guide: are you professional, friendly, bold, or technical? Be consistent.',
      'Record a 60-second video explaining what you do — put it on your homepage.',
    ],
  },
  systems: {
    title: 'Fix Your Systems & Operations',
    actions: [
      'Choose and implement a CRM within 7 days (HubSpot Free, Pipedrive, or similar).',
      'Create a lead status pipeline: New → Contacted → Qualified → Proposal → Won/Lost.',
      'Set up automated reminders for follow-ups so no lead goes more than 48 hours without contact.',
      'Build a simple dashboard showing: leads this week, response time, conversion rate.',
      'Document your sales process step-by-step so anyone on your team can follow it.',
      'Automate repetitive tasks: email templates, proposal generation, appointment scheduling.',
      'Schedule a weekly 15-minute pipeline review to catch stalled deals early.',
      'Integrate your website forms directly into your CRM for zero-delay lead capture.',
    ],
  },
  growth: {
    title: 'Fix Your Growth Strategy',
    actions: [
      'Define your #1 growth bottleneck: Is it traffic, leads, conversion, or retention?',
      'Set a 90-day revenue target and work backward to determine how many leads you need.',
      'Identify your top 3 most profitable services/products and double down on marketing them.',
      'Calculate your customer acquisition cost (CAC) and customer lifetime value (LTV).',
      'Create a referral program — your happiest customers are your best salespeople.',
      'Block 2 hours weekly for strategic work (not operational tasks).',
      'Find one strategic partnership that gives you access to your ideal customer base.',
      'Track your key metrics weekly: revenue, leads, conversion rate, average deal size.',
    ],
  },
};

function getTierInfo(pct: number) {
  if (pct >= 80) return { label: 'Strong but Leaking', color: [34, 197, 94] as const };
  if (pct >= 50) return { label: 'Unstable Growth', color: [234, 179, 8] as const };
  return { label: 'Revenue Leakage Mode', color: [239, 68, 68] as const };
}

export function generateDiagnosticPdf(data: DiagnosticPdfData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  const scorePct = Math.round((data.totalScore / data.maxScore) * 100);
  const tier = getTierInfo(scorePct);

  // --- COVER PAGE ---
  doc.setFillColor(15, 15, 25);
  doc.rect(0, 0, pageW, 297, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('AETHERIS TECHNOLOGY', pageW / 2, 30, { align: 'center' });

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Business Diagnostic', pageW / 2, 55, { align: 'center' });
  doc.text('Action Plan', pageW / 2, 67, { align: 'center' });

  if (data.name || data.company) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const label = [data.name, data.company].filter(Boolean).join(' — ');
    doc.text(`Prepared for: ${label}`, pageW / 2, 85, { align: 'center' });
  }

  // Score circle area
  doc.setFillColor(tier.color[0], tier.color[1], tier.color[2]);
  doc.roundedRect(pageW / 2 - 40, 100, 80, 50, 5, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.totalScore}/${data.maxScore}`, pageW / 2, 125, { align: 'center' });
  doc.setFontSize(14);
  doc.text(tier.label, pageW / 2, 140, { align: 'center' });

  // Category breakdown
  let y = 175;
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Category Breakdown', margin, y);
  y += 12;

  for (const [key, label] of Object.entries(categoryLabels)) {
    const cs = data.catScores[key];
    if (!cs) continue;
    const barColor = cs.pct >= 80 ? [34, 197, 94] : cs.pct >= 50 ? [234, 179, 8] : [239, 68, 68];

    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.text(label, margin, y);
    doc.text(`${cs.score}/${cs.max}`, pageW - margin, y, { align: 'right' });
    y += 5;

    // Bar background
    doc.setFillColor(40, 40, 60);
    doc.roundedRect(margin, y, contentW, 6, 3, 3, 'F');
    // Bar fill
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    const fillW = Math.max((cs.pct / 100) * contentW, 6);
    doc.roundedRect(margin, y, fillW, 6, 3, 3, 'F');
    y += 14;
  }

  // --- ACTION PAGES ---
  for (const catKey of data.weakestCategories) {
    const catData = categoryActions[catKey];
    if (!catData) continue;

    doc.addPage();
    doc.setFillColor(15, 15, 25);
    doc.rect(0, 0, pageW, 297, 'F');

    let ay = 30;
    const cs = data.catScores[catKey];
    const barColor = cs && cs.pct >= 80 ? [34, 197, 94] : cs && cs.pct >= 50 ? [234, 179, 8] : [239, 68, 68];

    // Section header
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.roundedRect(margin, ay - 8, contentW, 14, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(catData.title, pageW / 2, ay, { align: 'center' });
    ay += 18;

    if (cs) {
      doc.setFontSize(11);
      doc.setTextColor(180, 180, 180);
      doc.text(`Your score: ${cs.score}/${cs.max} (${cs.pct}%)`, margin, ay);
      ay += 12;
    }

    // Action items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    for (let i = 0; i < catData.actions.length; i++) {
      const action = catData.actions[i];
      const lines = doc.splitTextToSize(`${i + 1}. ${action}`, contentW - 5);

      if (ay + lines.length * 6 > 270) {
        doc.addPage();
        doc.setFillColor(15, 15, 25);
        doc.rect(0, 0, pageW, 297, 'F');
        ay = 30;
      }

      doc.setTextColor(230, 230, 230);
      doc.text(lines, margin, ay);
      ay += lines.length * 6 + 4;
    }
  }

  // --- CTA PAGE ---
  doc.addPage();
  doc.setFillColor(15, 15, 25);
  doc.rect(0, 0, pageW, 297, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Ready to Fix These Gaps?', pageW / 2, 60, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  const ctaLines = doc.splitTextToSize(
    'Our 14-Day Operational Systems Diagnostic pinpoints exactly where revenue is leaking and builds a custom roadmap to fix it. No guesswork — just data-driven action steps tailored to your business.',
    contentW
  );
  doc.text(ctaLines, pageW / 2, 80, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(139, 92, 246);
  doc.text('Visit: aetheristechnology.com/diagnostic', pageW / 2, 120, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by Aetheris Technology', pageW / 2, 280, { align: 'center' });

  // Download
  const fileName = data.company
    ? `Aetheris-Action-Plan-${data.company.replace(/\s+/g, '-')}.pdf`
    : 'Aetheris-Business-Action-Plan.pdf';
  doc.save(fileName);
}
