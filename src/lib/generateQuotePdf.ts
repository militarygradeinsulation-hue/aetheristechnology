// Aetheris-branded Quote + Statement of Work PDF. Multi-page with a repeated
// header/footer on every page. Light paper body for legible printing, black
// header band with gold wordmark. Signature dates are left blank on purpose.
import jsPDF from 'jspdf';
import { sanitize } from '@/lib/briefPdfStyle';
import { computeQuote, CADENCES, CADENCE_LABEL, CADENCE_SUFFIX } from '@/lib/quoteMath';
import { PROVIDER, fmtDate, usd, type QuoteDraft } from '@/lib/quoteDocument';

const INK: [number, number, number] = [17, 19, 23];
const GOLD: [number, number, number] = [196, 140, 42];
const MUTED: [number, number, number] = [95, 95, 100];
const RULE: [number, number, number] = [210, 205, 195];
const W = 210, H = 297, M = 16, CW = W - 2 * M;
const TOP = 34, BOTTOM = H - 20;

export function buildQuotePdf(q: QuoteDraft): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const totals = computeQuote(q.lines, q.quoteDiscount, q.quoteDiscountCadence);
  let y = TOP;

  const header = () => {
    doc.setFillColor(...INK);
    doc.rect(0, 0, W, 24, 'F');
    doc.setTextColor(...GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('AETHERIS TECHNOLOGY', M, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(230, 225, 210);
    doc.text('QUOTE & STATEMENT OF WORK', M, 17);
    doc.text(sanitize(`Quote ${q.quoteNumber || '(unsaved)'}`), W - M, 11, { align: 'right' });
    doc.text(sanitize(`Issued ${fmtDate(q.quoteDate)}`), W - M, 17, { align: 'right' });
    doc.setFillColor(...GOLD);
    doc.rect(0, 24, W, 0.8, 'F');
  };
  const newPage = () => { doc.addPage(); header(); y = TOP; };
  const ensure = (h: number) => { if (y + h > BOTTOM) newPage(); };

  const sectionTitle = (t: string) => {
    ensure(14);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GOLD);
    doc.text(sanitize(t.toUpperCase()), M, y);
    y += 1.5;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 5;
  };
  const para = (text: string, opts: { size?: number; color?: [number, number, number]; x?: number; width?: number; bold?: boolean } = {}) => {
    const size = opts.size ?? 9.5;
    const x = opts.x ?? M;
    const width = opts.width ?? CW;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? INK));
    const lh = size * 0.42;
    for (const raw of sanitize(text).split('\n')) {
      const lines = doc.splitTextToSize(raw || ' ', width) as string[];
      for (const ln of lines) { ensure(lh + 1); doc.text(ln, x, y); y += lh; }
    }
  };

  header();

  // Parties
  const colW = (CW - 8) / 2;
  const startY = y;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text('PREPARED FOR', M, y); doc.text('PREPARED BY', M + colW + 8, y);
  y += 5;
  const clientLines = [q.client.company, q.client.contact, q.client.email, q.client.phone, q.client.address].filter(Boolean);
  const provLines = [PROVIDER.name, PROVIDER.web];
  const yL = y;
  para(clientLines.join('\n') || 'Client details not provided', { width: colW });
  const yAfterL = y; y = yL;
  para(provLines.join('\n'), { x: M + colW + 8, width: colW });
  y = Math.max(y, yAfterL) + 3;
  const meta = [
    ['Quote date', fmtDate(q.quoteDate)],
    ['Valid until', fmtDate(q.validUntil) || 'Not specified'],
    ['Project dates', q.projectStart || q.projectEnd ? `${fmtDate(q.projectStart) || 'TBD'} - ${fmtDate(q.projectEnd) || 'TBD'}` : 'Not specified'],
  ];
  doc.setFontSize(8.5);
  meta.forEach(([k, v], i) => {
    const x = M + i * (CW / 3);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...MUTED); doc.text(k.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK); doc.text(sanitize(v), x, y + 4.5);
  });
  y += 10;
  void startY;

  if (q.sow.title) { ensure(10); para(q.sow.title, { size: 15, bold: true }); y += 2; }

  // Pricing table
  sectionTitle('Itemized pricing');
  const cols = { name: M, cad: M + 78, qty: M + 100, unit: M + 128, disc: M + 153, net: W - M };
  const th = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text('SERVICE', cols.name, y); doc.text('CADENCE', cols.cad, y); doc.text('QTY', cols.qty, y);
    doc.text('UNIT', cols.unit + 20, y, { align: 'right' }); doc.text('DISCOUNT', cols.disc + 20, y, { align: 'right' });
    doc.text('LINE TOTAL', cols.net, y, { align: 'right' });
    y += 2; doc.setDrawColor(...RULE); doc.line(M, y, W - M, y); y += 4;
  };
  th();
  q.lines.forEach((l, i) => {
    const r = totals.lines[i];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const nameLines = doc.splitTextToSize(sanitize(l.name), 74) as string[];
    const rowH = nameLines.length * 3.8 + (r.listGrossCents !== null && r.overrideDeltaCents !== 0 ? 4 : 0) + 2;
    if (y + rowH > BOTTOM) { newPage(); th(); }
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    nameLines.forEach((ln, k) => doc.text(ln, cols.name, y + k * 3.8));
    doc.setFont('helvetica', 'normal');
    doc.text(CADENCE_LABEL[l.cadence], cols.cad, y);
    doc.text(String(l.quantity), cols.qty, y);
    doc.text(l.unitPriceCents === null ? 'Price required' : usd(l.unitPriceCents), cols.unit + 20, y, { align: 'right' });
    doc.text(r.discountCents ? `-${usd(r.discountCents)}` : '-', cols.disc + 20, y, { align: 'right' });
    doc.text(`${usd(r.netCents)}${CADENCE_SUFFIX[l.cadence] ? (l.cadence === 'monthly' ? '/mo' : '/yr') : ''}`, cols.net, y, { align: 'right' });
    let yy = y + nameLines.length * 3.8;
    if (r.listGrossCents !== null && r.overrideDeltaCents !== 0 && l.listPriceCents !== null) {
      doc.setFontSize(7.5); doc.setTextColor(...MUTED);
      doc.text(sanitize(`List ${usd(l.listPriceCents)} each; quoted ${usd(l.unitPriceCents ?? 0)} each`), cols.name, yy);
      yy += 4;
    }
    y = yy + 1;
    doc.setDrawColor(235, 232, 225); doc.line(M, y - 2, W - M, y - 2);
    y += 1.5;
  });

  // Totals per cadence
  sectionTitle('Totals by billing cadence');
  for (const c of CADENCES) {
    const g = totals.groups[c];
    if (!g.lineCount) continue;
    ensure(32);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK);
    doc.text(`${CADENCE_LABEL[c]} charges`, M, y); y += 5;
    const rows: [string, string][] = [
      ['List price', usd(g.listCents)],
      ['Subtotal after line pricing and line discounts', usd(g.subtotalCents)],
    ];
    if (g.lineDiscountCents) rows.splice(1, 0, ['Line discounts', `-${usd(g.lineDiscountCents)}`]);
    if (g.quoteDiscountCents) rows.push(['Quote discount', `-${usd(g.quoteDiscountCents)}`]);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    for (const [k, v] of rows) { doc.setTextColor(...MUTED); doc.text(k, M + 4, y); doc.setTextColor(...INK); doc.text(v, W - M, y, { align: 'right' }); y += 4.3; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
    doc.text(`Total ${CADENCE_LABEL[c].toLowerCase()}`, M + 4, y + 1);
    doc.setTextColor(...GOLD);
    doc.text(`${usd(g.totalCents)}${CADENCE_SUFFIX[c]}`, W - M, y + 1, { align: 'right' });
    y += 8;
  }
  ensure(8);
  para('One-time, monthly and yearly amounts are billed separately and are not added together.', { size: 7.5, color: MUTED });

  // Scope
  sectionTitle('Included scope and deliverables');
  q.lines.forEach((l) => {
    ensure(10);
    para(l.name, { bold: true, size: 9.5 });
    para(l.scope?.trim() || 'Scope to be confirmed in writing.', { size: 9 });
    y += 2;
  });

  const blocks: [string, string][] = [
    ['Objectives', q.sow.objectives], ['Exclusions', q.sow.exclusions], ['Timeline', q.sow.timeline],
    ['Responsibilities', q.sow.responsibilities], ['Payment terms', q.sow.paymentTerms],
    ['Assumptions', q.sow.assumptions], ['Notes', q.sow.notes],
  ];
  for (const [t, v] of blocks) { if (v && v.trim()) { sectionTitle(t); para(v); } }

  // Signatures
  ensure(70);
  sectionTitle('Acceptance');
  para('By signing below, both parties agree to the scope, pricing and terms in this quote and statement of work.', { size: 8.5, color: MUTED });
  y += 8;
  const sig = (x: number, party: string) => {
    let yy = y;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(sanitize(party.toUpperCase()), x, yy); yy += 12;
    for (const label of ['Signature', 'Printed name', 'Title', 'Date signed']) {
      doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(x, yy, x + colW, yy);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
      doc.text(label, x, yy + 3.5);
      yy += 12;
    }
    return yy;
  };
  const a = sig(M, `Client: ${q.client.company || 'Client'}`);
  const b = sig(M + colW + 8, PROVIDER.name);
  y = Math.max(a, b);

  // Footers
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE); doc.line(M, H - 13, W - M, H - 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text('AETHERIS TECHNOLOGY  |  AETHERIS.TECHNOLOGY', M, H - 8);
    doc.text(`Page ${i} of ${n}`, W - M, H - 8, { align: 'right' });
  }
  return doc;
}

export function quotePdfFilename(q: QuoteDraft) {
  const who = (q.client.company || 'client').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `aetheris-quote-${q.quoteNumber || 'draft'}-${who}.pdf`;
}
