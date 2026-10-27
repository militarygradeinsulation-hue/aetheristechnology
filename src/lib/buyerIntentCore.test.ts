import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTENT_SETTINGS, intentDedupeKey, qualifyBuyerOpportunity,
  safeEvidenceUrl, sanitizeIntentSettings,
} from '../../supabase/functions/_shared/buyer-intent-core';

const now = new Date('2026-10-27T16:00:00Z');
const url = 'https://example.org/marketing-rfp';
const quote = 'Acme Company is seeking a marketing agency to handle digital advertising.';
const sources = new Map([[url, {
  url,
  title: 'Acme Company vendor notice',
  text: 'Acme Company 2026-10-20. ' + quote + ' Proposals are now invited.',
}]]);
const candidate = {
  company: 'Acme Company', contactName: 'Made Up', contactTitle: 'CEO',
  location: 'United States', service: 'marketing', signalType: 'rfp',
  quote, summary: 'A marketing supplier is requested', sourceUrl: url,
  publishedAt: '2026-10-20',
};

describe('Buyer Intent Radar evidence boundary', () => {
  it('retains a verbatim, fresh, external-vendor buying signal and source', () => {
    const result = qualifyBuyerOpportunity(candidate, sources, DEFAULT_INTENT_SETTINGS, now);
    expect(result?.company).toBe('Acme Company');
    expect(result?.score).toBeGreaterThanOrEqual(80);
    expect(result?.tier).toBe('high');
    expect(result?.sourceUrl).toBe(url);
    expect(result?.contactName).toBe('');
    expect(result?.publishedAt).toBe('2026-10-20');
  });

  it('rejects non-cited and hallucinated quotes', () => {
    expect(qualifyBuyerOpportunity({ ...candidate, quote: 'Acme Company seeks a new AI agency.' }, sources, DEFAULT_INTENT_SETTINGS, now)).toBeNull();
    expect(qualifyBuyerOpportunity({ ...candidate, sourceUrl: 'https://unverified.example/rfp' }, sources, DEFAULT_INTENT_SETTINGS, now)).toBeNull();
  });

  it('rejects ordinary full-time job advertisements', () => {
    const jobQuote = 'Acme Company is seeking a full-time marketing manager with salary and benefits package.';
    const jobSources = new Map([[url, { url, title: 'Acme Company jobs', text: jobQuote }]]);
    expect(qualifyBuyerOpportunity({ ...candidate, quote: jobQuote, publishedAt: '' }, jobSources, DEFAULT_INTENT_SETTINGS, now)).toBeNull();
  });

  it('rejects old vendor requests instead of presenting them as hot', () => {
    const old = new Map([[url, { url, title: 'Acme Company', text: '2025-01-01. ' + quote }]]);
    expect(qualifyBuyerOpportunity({ ...candidate, publishedAt: '2025-01-01' }, old, DEFAULT_INTENT_SETTINGS, now)).toBeNull();
  });

  it('honors selected services and minimum signal strength', () => {
    const targeted = { ...DEFAULT_INTENT_SETTINGS, services: ['consulting' as const] };
    expect(qualifyBuyerOpportunity(candidate, sources, targeted, now)).toBeNull();
    const strict = { ...DEFAULT_INTENT_SETTINGS, minScore: 95 };
    expect(qualifyBuyerOpportunity(candidate, sources, strict, now)).toBeNull();
  });

  it('never accepts private or social-network evidence URLs', () => {
    expect(safeEvidenceUrl('http://localhost:8080/secrets')).toBe('');
    expect(safeEvidenceUrl('https://linkedin.com/in/contact')).toBe('');
    expect(safeEvidenceUrl('https://private.local/buying')).toBe('');
    expect(safeEvidenceUrl('https://example.org/rfp?utm_source=spam')).toBe('https://example.org/rfp');
  });

  it('sanitizes settings without elevating unknown services', () => {
    expect(sanitizeIntentSettings({ services: ['ai', 'bogus', 'ai'], minScore: 200 })).toMatchObject({
      services: ['ai'], minScore: 95, scheduleEnabled: false,
    });
  });

  it('deduplicates normalized opportunity identity and URL tracking parameters', () => {
    const key = intentDedupeKey({ company: 'Acme Company', service: 'marketing', sourceUrl: url });
    expect(intentDedupeKey({
      company: 'ACME COMPANY', service: 'marketing', sourceUrl: url + '?utm_source=google',
    })).toBe(key);
  });
});
