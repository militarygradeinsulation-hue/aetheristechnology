import { describe, expect, it } from 'vitest';
import { buildLeakAuditAppendix, shouldStartCompanyReport } from '../../supabase/functions/_shared/leak-audit-appendix';
const report = {
  compiler: { state: 'compiled', violations: [] },
  overall_leakage: { annual_low: 91000, annual_high: 243000, source: 'financial_ledger' },
  compiled_findings: [{ statement: 'The contact form failed.', status: 'verified', chapter_slug: 'capture', claim_ids: ['c1'] }],
  evidence_ledger: [{ claim_id: 'c1', statement: 'HTTP 500', status: 'verified', source_kind: 'browser_test', source_url: 'https://example.com/contact' }],
  chapters: [{ slug: 'capture', what_to_do: { day_30: ['Repair the contact form.'] } }],
};
describe('customer Golden Report appendix', () => {
  it('keeps the exact canonical annual amounts without summing other prose', () => {
    const input = { ...report, top_leaks: [{ annual_low: 9999999 }], company_name: 'Contact Person' };
    expect(buildLeakAuditAppendix(input, 'example.com')?.annual).toEqual({ low: 91000, high: 243000 });
    expect(buildLeakAuditAppendix(input, 'example.com')?.domain).toBe('example.com');
  });
  it('preserves evidence status, source and saved solution', () => {
    const appendix = buildLeakAuditAppendix(report, 'example.com');
    expect(appendix?.findings[0].evidence[0]).toMatchObject({ status: 'verified', source: 'browser_test', url: 'https://example.com/contact' });
    expect(appendix?.findings[0].solutions).toEqual(['Repair the contact form.']);
  });
  it('never fabricates a range or changes the report', () => {
    const input = { ...report, overall_leakage: null };
    const before = JSON.stringify(input);
    expect(buildLeakAuditAppendix(input, 'example.com')?.annual).toBeNull();
    expect(JSON.stringify(input)).toBe(before);
  });
  it('blocks regeneration-required and compiler failures', () => {
    expect(buildLeakAuditAppendix({ ...report, report_state: 'regeneration_required' }, 'example.com')).toBeNull();
    expect(buildLeakAuditAppendix({ ...report, compiler: { state: 'needs_review' } }, 'example.com')).toBeNull();
    expect(buildLeakAuditAppendix({ ...report, compiler_audit: { violations: ['MONEY_MISMATCH'] } }, 'example.com')).toBeNull();
  });
  it('permits only one initial report attempt per company', () => {
    expect(shouldStartCompanyReport('pending', null)).toBe(true);
    for (const status of ['dispatching', 'queued', 'reused', 'limited', 'failed']) expect(shouldStartCompanyReport(status, null)).toBe(false);
    expect(shouldStartCompanyReport('pending', 'existing-report')).toBe(false);
  });
});