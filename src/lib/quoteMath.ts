// Quote math — pure, cents-only. Mirrored byte-for-byte at
// supabase/functions/_shared/quote-math.ts (a test enforces identity) so the
// server recomputes the exact totals the admin saw before persisting.
//
// Calculation order (explicit, per cadence group):
//   1. line gross    = unit price (override or catalog list) x quantity
//   2. line discount = percent of line gross (rounded half-up) OR fixed amount, capped at gross
//   3. line net      = gross - line discount
//   4. group subtotal = sum of line nets with the same cadence
//   5. quote discount applies to exactly ONE cadence group (percent of that
//      group subtotal, or a fixed amount capped at it)
//   6. group total   = group subtotal - quote discount  (never negative)
// One-time, monthly and yearly totals are NEVER added together.

export type QuoteCadence = 'one_time' | 'monthly' | 'yearly';
export type DiscountType = 'none' | 'percent' | 'amount';

export interface QuoteDiscount {
  type: DiscountType;
  /** percent: 0-100 (up to 2 decimals). amount: cents. */
  value: number;
}

export interface QuoteLineInput {
  id: string;
  catalogName: string | null;
  name: string;
  cadence: QuoteCadence;
  quantity: number;
  listPriceCents: number | null;
  unitPriceCents: number | null;
  discount: QuoteDiscount;
  scope: string;
}

export interface QuoteLineResult {
  id: string;
  grossCents: number;
  discountCents: number;
  netCents: number;
  listGrossCents: number | null;
  overrideDeltaCents: number;
  errors: string[];
}

export interface CadenceTotals {
  listCents: number;
  subtotalCents: number;
  lineDiscountCents: number;
  quoteDiscountCents: number;
  totalCents: number;
  lineCount: number;
}

export interface QuoteTotals {
  lines: QuoteLineResult[];
  groups: Record<QuoteCadence, CadenceTotals>;
  errors: string[];
  valid: boolean;
}

export const CADENCES: QuoteCadence[] = ['one_time', 'monthly', 'yearly'];
export const CADENCE_LABEL: Record<QuoteCadence, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  yearly: 'Yearly',
};
export const CADENCE_SUFFIX: Record<QuoteCadence, string> = {
  one_time: '',
  monthly: ' / month',
  yearly: ' / year',
};

export const MAX_QTY = 1000;
export const MAX_UNIT_CENTS = 100_000_000; // $1,000,000 per unit

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

/** Parses a user-typed dollar string to integer cents. Returns null if invalid. */
export function dollarsToCents(input: string): number | null {
  const s = String(input ?? '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function centsToDollarString(cents: number | null): string {
  if (cents === null || cents === undefined) return '';
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return `${neg ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Percent of cents, rounded half-up to the nearest cent. Percent may have up to 2 decimals. */
export function percentOf(cents: number, percent: number): number {
  // Work in basis points x100 to avoid float drift: percent*100 is an integer for <=2 decimals.
  const bp = Math.round(percent * 100); // 12.5% -> 1250
  return Math.floor((cents * bp + 5000) / 10000);
}

export function validateDiscount(d: QuoteDiscount, baseCents: number, label: string): string[] {
  const errs: string[] = [];
  if (!d || d.type === 'none') return errs;
  if (d.type === 'percent') {
    if (typeof d.value !== 'number' || !Number.isFinite(d.value) || d.value < 0 || d.value > 100) {
      errs.push(`${label}: percent must be between 0 and 100.`);
    } else if (Math.round(d.value * 100) !== Math.round(d.value * 100 * 1e6) / 1e6) {
      errs.push(`${label}: percent allows at most 2 decimals.`);
    }
  } else if (d.type === 'amount') {
    if (!isInt(d.value) || d.value < 0) errs.push(`${label}: discount amount must be a positive dollar amount.`);
    else if (d.value > baseCents) errs.push(`${label}: discount amount cannot exceed ${centsToDollarString(baseCents)}.`);
  } else {
    errs.push(`${label}: unknown discount type.`);
  }
  return errs;
}

export function discountCents(d: QuoteDiscount, baseCents: number): number {
  if (!d || d.type === 'none') return 0;
  if (d.type === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(d.value) || 0));
    return Math.min(baseCents, percentOf(baseCents, pct));
  }
  if (d.type === 'amount') return Math.min(baseCents, Math.max(0, Math.round(Number(d.value) || 0)));
  return 0;
}

function emptyGroup(): CadenceTotals {
  return { listCents: 0, subtotalCents: 0, lineDiscountCents: 0, quoteDiscountCents: 0, totalCents: 0, lineCount: 0 };
}

export function computeQuote(
  lines: QuoteLineInput[],
  quoteDiscount: QuoteDiscount,
  quoteDiscountCadence: QuoteCadence,
): QuoteTotals {
  const errors: string[] = [];
  const groups: Record<QuoteCadence, CadenceTotals> = {
    one_time: emptyGroup(), monthly: emptyGroup(), yearly: emptyGroup(),
  };
  const results: QuoteLineResult[] = lines.map((l, i) => {
    const label = l.name?.trim() ? `"${l.name.trim()}"` : `Line ${i + 1}`;
    const errs: string[] = [];
    if (!l.name || !l.name.trim()) errs.push(`Line ${i + 1}: service name is required.`);
    if (!CADENCES.includes(l.cadence)) errs.push(`${label}: billing cadence is required.`);
    if (!isInt(l.quantity) || l.quantity < 1 || l.quantity > MAX_QTY) {
      errs.push(`${label}: quantity must be a whole number from 1 to ${MAX_QTY}.`);
    }
    if (l.unitPriceCents === null || l.unitPriceCents === undefined) {
      errs.push(`${label}: enter a unit price (no price on file).`);
    } else if (!isInt(l.unitPriceCents) || l.unitPriceCents < 0 || l.unitPriceCents > MAX_UNIT_CENTS) {
      errs.push(`${label}: unit price must be between $0 and $1,000,000.`);
    }
    const qty = isInt(l.quantity) && l.quantity > 0 ? Math.min(l.quantity, MAX_QTY) : 0;
    const unit = isInt(l.unitPriceCents) && l.unitPriceCents >= 0 ? l.unitPriceCents : 0;
    const gross = unit * qty;
    errs.push(...validateDiscount(l.discount, gross, `${label} discount`));
    const disc = discountCents(l.discount, gross);
    const net = gross - disc;
    const listGross = l.listPriceCents === null || l.listPriceCents === undefined ? null : l.listPriceCents * qty;
    const g = groups[CADENCES.includes(l.cadence) ? l.cadence : 'one_time'];
    g.listCents += listGross ?? gross;
    g.subtotalCents += net;
    g.lineDiscountCents += disc;
    g.lineCount += 1;
    errors.push(...errs);
    return {
      id: l.id,
      grossCents: gross,
      discountCents: disc,
      netCents: net,
      listGrossCents: listGross,
      overrideDeltaCents: listGross === null ? 0 : gross - listGross,
      errors: errs,
    };
  });

  const target = groups[quoteDiscountCadence] ?? groups.one_time;
  if (quoteDiscount && quoteDiscount.type !== 'none') {
    if (target.lineCount === 0) {
      errors.push(`Quote discount applies to ${CADENCE_LABEL[quoteDiscountCadence]} items, but there are none.`);
    }
    errors.push(...validateDiscount(quoteDiscount, target.subtotalCents, 'Quote discount'));
  }
  target.quoteDiscountCents = discountCents(quoteDiscount, target.subtotalCents);
  for (const c of CADENCES) {
    const g = groups[c];
    g.totalCents = Math.max(0, g.subtotalCents - g.quoteDiscountCents);
  }
  if (lines.length === 0) errors.push('Add at least one service to the quote.');
  return { lines: results, groups, errors, valid: errors.length === 0 };
}
