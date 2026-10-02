import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeQuote, dollarsToCents, percentOf, type QuoteLineInput } from './quoteMath';
import { catalogFromRepProducts, emptyDraft } from './quoteDocument';
import { buildQuotePdf } from './generateQuotePdf';

const line = (p: Partial<QuoteLineInput>): QuoteLineInput => ({
  id: Math.random().toString(36), catalogName: null, name: 'Svc', cadence: 'one_time', quantity: 1,
  listPriceCents: null, unitPriceCents: 10000, discount: { type: 'none', value: 0 }, scope: '', ...p,
});

describe('quote math', () => {
  it('server copy is byte-identical', () => {
    expect(readFileSync('supabase/functions/_shared/quote-math.ts', 'utf8')).toBe(readFileSync('src/lib/quoteMath.ts', 'utf8'));
  });

  it('reads current catalog prices and cadences', () => {
    const cat = catalogFromRepProducts();
    const diag = cat.find((c) => c.name === '21-Day Diagnostic')!;
    const ac = cat.find((c) => c.name === 'Active Case')!;
    expect(diag).toMatchObject({ priceCents: 2_350_000, cadence: 'one_time' });
    expect(ac).toMatchObject({ priceCents: 2_000_000, cadence: 'monthly' });
    expect(cat.length).toBeGreaterThan(30);
  });

  it('parses dollars exactly', () => {
    expect(dollarsToCents('$1,234.5')).toBe(123450);
    expect(dollarsToCents('0.07')).toBe(7);
    expect(dollarsToCents('1.234')).toBeNull();
    expect(dollarsToCents('-5')).toBeNull();
  });

  it('rounds percent half-up to cents', () => {
    expect(percentOf(999, 12.5)).toBe(125); // 124.875
    expect(percentOf(333, 33.33)).toBe(111); // 110.9889
  });

  it('applies line percent then quote fixed amount in order', () => {
    const t = computeQuote([
      line({ unitPriceCents: 750_000, listPriceCents: 750_000, quantity: 2, discount: { type: 'percent', value: 10 } }),
    ], { type: 'amount', value: 50_000 }, 'one_time');
    expect(t.lines[0]).toMatchObject({ grossCents: 1_500_000, discountCents: 150_000, netCents: 1_350_000 });
    expect(t.groups.one_time).toMatchObject({ subtotalCents: 1_350_000, quoteDiscountCents: 50_000, totalCents: 1_300_000 });
    expect(t.valid).toBe(true);
  });

  it('keeps one-time and monthly totals separate', () => {
    const t = computeQuote([
      line({ unitPriceCents: 2_350_000 }),
      line({ cadence: 'monthly', unitPriceCents: 2_000_000 }),
    ], { type: 'percent', value: 5 }, 'monthly');
    expect(t.groups.one_time.totalCents).toBe(2_350_000);
    expect(t.groups.monthly.totalCents).toBe(1_900_000);
  });

  it('rejects invalid input instead of silently zeroing', () => {
    const t = computeQuote([
      line({ unitPriceCents: null }),
      line({ quantity: 0 }),
      line({ quantity: 1.5 }),
      line({ discount: { type: 'percent', value: 120 } }),
      line({ discount: { type: 'amount', value: 20_000 } }),
    ], { type: 'none', value: 0 }, 'one_time');
    expect(t.valid).toBe(false);
    expect(t.errors.join(' ')).toMatch(/enter a unit price/);
    expect(t.errors.join(' ')).toMatch(/quantity must be a whole number/);
    expect(t.errors.join(' ')).toMatch(/between 0 and 100/);
    expect(t.errors.join(' ')).toMatch(/cannot exceed/);
    for (const c of ['one_time', 'monthly', 'yearly'] as const) expect(t.groups[c].totalCents).toBeGreaterThanOrEqual(0);
  });

  it('flags a quote discount on an empty cadence and empty carts', () => {
    expect(computeQuote([line({})], { type: 'percent', value: 10 }, 'yearly').valid).toBe(false);
    expect(computeQuote([], { type: 'none', value: 0 }, 'one_time').valid).toBe(false);
  });

  it('builds a multi-page PDF with long scope and blank signature dates', () => {
    const d = emptyDraft();
    d.quoteNumber = 'AET-Q-TEST';
    d.client.company = 'Acme Co';
    d.lines = Array.from({ length: 6 }, (_, i) => line({ name: `Service ${i}`, scope: 'Long deliverable text. '.repeat(120) }));
    const pdf = buildQuotePdf(d);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(2);
  });
});
