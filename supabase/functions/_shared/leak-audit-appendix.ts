// Read-only customer projection. No pricing, compiler, or narrative synthesis.
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];

export function buildLeakAuditAppendix(reportInput: unknown, domain: string) {
  const report = obj(reportInput);
  const compiler = obj(report.compiler);
  if (report.report_state === 'regeneration_required' || compiler.state !== 'compiled' ||
      list(compiler.violations).length || list(obj(report.compiler_audit).violations).length ||
      obj(report.financial_reconciliation).invariant_status === 'failed') return null;
  const overall = obj(report.overall_leakage);
  const ledgerOverall = obj(obj(report.financial_ledger).overall);
  const range = typeof overall.annual_low === 'number' ? overall : ledgerOverall;
  const low = range.annual_low;
  const high = range.annual_high;
  const annual = typeof low === 'number' && typeof high === 'number' &&
    Number.isFinite(low) && Number.isFinite(high) && low >= 0 && high >= low ? { low, high } : null;
  const claims = list(report.evidence_ledger).map(obj);
  const chapters = list(report.chapters).map(obj);
  const findings = list(report.compiled_findings).map(obj).filter(f => text(f.statement)).map(f => {
    const chapter = chapters.find(c => c.slug === f.chapter_slug);
    const correction = obj(chapter?.what_to_do);
    return {
      finding: text(f.statement),
      status: text(f.status) || 'unverified',
      evidence: claims.filter(c => list(f.claim_ids).includes(c.claim_id)).map(c => ({
        observation: text(c.statement), status: text(c.status),
        source: text(c.source_kind), url: text(c.source_url), limitations: text(c.limitations),
      })),
      solutions: [...list(correction.day_30), ...list(correction.day_60), ...list(correction.day_90)]
        .filter((s): s is string => typeof s === 'string' && !!s.trim()),
    };
  });
  if (!findings.length) return null;
  return { domain, annual, source: text(overall.source) || 'financial_ledger', findings };
}

export function shouldStartCompanyReport(status: string, scanId: string | null): boolean {
  return status === 'pending' && !scanId;
}