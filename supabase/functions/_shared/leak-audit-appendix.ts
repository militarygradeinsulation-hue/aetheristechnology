// Read-only customer projection. No pricing, compiler, or narrative synthesis.
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const savedActions = (input: unknown): string[] => {
  const actions = obj(input);
  return [...list(actions.this_week), ...list(actions.this_month), ...list(actions.this_quarter),
    ...list(actions.day_30), ...list(actions.day_60), ...list(actions.day_90)]
    .filter((s): s is string => typeof s === 'string' && !!s.trim());
};

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
        observation: text(c.statement) || text(c.normalized_fact), status: text(c.status),
        source: text(c.source_kind), url: text(c.source_url), limitations: text(c.limitations),
      })),
      solutions: savedActions(correction),
    };
  });
  if (!findings.length) return null;
  // Detector category slugs are not necessarily chapter slugs. Preserve the
  // saved chapter attribution instead of guessing which fix belongs to a leak.
  const corrections = chapters.map(c => ({
    chapter: text(c.title) || text(c.slug),
    solutions: savedActions(c.what_to_do),
  })).filter(c => c.solutions.length > 0);
  return { domain, annual, source: text(overall.source) || 'financial_ledger', findings, corrections };
}

export function shouldStartCompanyReport(status: string, scanId: string | null): boolean {
  return status === 'pending' && !scanId;
}