import jsPDF from 'jspdf';

const INK: [number, number, number] = [18, 18, 22];
const AMBER: [number, number, number] = [232, 165, 38];
const MUTED: [number, number, number] = [120, 120, 130];

export function generateCredentialsPdf() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;

  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(...AMBER);
  doc.rect(0, 0, pageW, 4, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  doc.text('AETHERIS · CREDENTIALS', margin, 18);
  doc.text(new Date().toISOString().slice(0, 10), pageW - margin, 18, { align: 'right' });

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(245, 240, 230);
  doc.text('Joseph Toney', margin, 50);
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(190, 185, 170);
  doc.text('Operator · Aetheris', margin, 60);

  let y = 80;
  const block = (label: string, body: string) => {
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...AMBER);
    doc.text(label, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(230, 225, 215);
    const lines = doc.splitTextToSize(body, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 7;
  };

  block(
    'BACKGROUND',
    '20 years building revenue systems for manufacturers. Marine Corps veteran. Former Director of Strategy at a $25M aerospace firm with SpaceX accounts.',
  );
  block(
    'PRIOR OPERATOR ROLES',
    'Director of Strategy, $25M aerospace contract manufacturer. Revenue operations, CRM implementation, and sales-process rebuild for specialty manufacturing across construction, aerospace, and equipment categories.',
  );
  block(
    'EDUCATION',
    'B.A. in Psychology and Communication. M.S. in Business Marketing. Foundation in human behavior, persuasion, and the marketing systems that move B2B revenue.',
  );
  block(
    'CERTIFICATIONS',
    'Vibe Coding, Semrush (L5: Diamond, sourced from Lovable). Gemini 3 (AI Synthesis), Google. AI for Business, Harvard edX AI for Business Systems. AI Engineer, IBM AI Engineering. HubSpot Certification, HubSpot. Biomedical & Health Science Researchers, CITI Program (Credential ID 76234047). Google Analytics Individual Qualification, Google Operations Center. Marketing & Analytics, Google Digital Academy (Skillshop).',
  );
  block(
    'COMPANY',
    'Aetheris. Headquartered in Indianapolis, Indiana. US-wide engagements remote and on-site. Intellectual property held by CTOguy.ai.',
  );
  block(
    'BUSINESS CONTINUITY',
    'Sales calls run by Joseph Toney. Active engagements delivered jointly with operating partner. Client files, contracts, and credentials live in a documented, partner-accessible system. Continuity contact and escalation path provided to every retained client.',
  );

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Aetheris · Indianapolis, IN · (317) 376-2110 · aetheris.technology', margin, pageH - 10);

  doc.save('Aetheris-Credentials.pdf');
}
