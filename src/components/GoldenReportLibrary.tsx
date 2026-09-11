// Golden Report Library — admin-first, company-centered archive of every
// Golden Report, plus the System Blueprint generator.
//
// Reads only the materialized archive layer; the canonical report always stays
// in forensic_scans and is opened through the existing Golden Report page/PDF.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, Search, RefreshCw, Building2, ExternalLink, FileText, Copy, Download,
  ChevronLeft, AlertTriangle, CheckCircle2, Cpu, Database, Link2, ShieldCheck, Network,
} from 'lucide-react';
import { GoldenSourceBadge } from '@/components/GoldenSourceBadge';
import {
  listCompanies, getCompany, getReport, getLibraryStats, runBackfillBatch,
  generateBlueprint, setBlueprintApproval, formatExposure, downloadTextFile,
  type LibraryCard, type ArchiveRow, type FindingRow, type BlueprintRow, type LibraryCompany,
} from '@/lib/goldenLibrary';
import { composeSystem, composeBatch, type CompanySystemRow } from '@/lib/companySystem';

const SOURCES = [
  { v: '', l: 'All sources' },
  { v: 'public_website', l: 'Website lead' },
  { v: 'rep_portal', l: 'Rep' },
  { v: 'partner_portal', l: 'Partner' },
  { v: 'admin_internal', l: 'Admin / internal' },
];
const STATES = [
  { v: '', l: 'All states' },
  { v: 'compiled', l: 'Compiled' },
  { v: 'regeneration_required', l: 'Regeneration required' },
];
const SORTS = [
  { v: 'newest', l: 'Newest' },
  { v: 'oldest', l: 'Oldest' },
  { v: 'name', l: 'Business name' },
  { v: 'exposure_high', l: 'Highest exposure' },
  { v: 'exposure_low', l: 'Lowest exposure' },
  { v: 'findings', l: 'Most findings' },
];

const selectCls =
  'h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber';

function ValidityBadge({ valid, state }: { valid: boolean; state: string | null }) {
  return valid ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
      <CheckCircle2 className="h-3 w-3" /> Compiled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-red-300">
      <AlertTriangle className="h-3 w-3" /> {state === 'regeneration_required' ? 'Repair required' : 'Unverified'}
    </span>
  );
}

/* ───────────────────────── blueprint panel ───────────────────────── */

// Portal (rep / partner) sessions pass their portal token to every library
// call; admin surfaces leave this null and the shared client falls back to the
// admin PIN token. Backend scoping stays the source of truth.
const LibraryTokenCtx = React.createContext<string | null>(null);
const useLibraryToken = () => React.useContext(LibraryTokenCtx);

const BlueprintPanel: React.FC<{ archive: ArchiveRow; blueprints: BlueprintRow[]; onRefresh: () => void }> = ({
  archive, blueprints, onRefresh,
}) => {
  const [busy, setBusy] = useState(false);
  const portalToken = useLibraryToken();
  const latest = blueprints[0] || null;

  const run = async (force: boolean) => {
    setBusy(true);
    try {
      const res = await generateBlueprint(archive.scan_id, force, portalToken);
      toast({
        title: res.reused ? 'Existing blueprint reused' : 'Blueprint generated',
        description: res.blueprint?.validation_passed ? 'Validation passed.' : 'Saved with validation notes — review before build.',
      });
      onRefresh();
    } catch (e) {
      toast({ title: 'Blueprint failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const approve = async (state: 'approved' | 'rejected' | 'draft') => {
    if (!latest) return;
    try {
      await setBlueprintApproval(latest.id, state);
      toast({ title: `Blueprint ${state}` });
      onRefresh();
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const slug = (archive.raw_company_name || archive.target_url || 'blueprint').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 60);

  if (!archive.is_valid) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-300">
          <AlertTriangle className="h-4 w-4" /> Report must be repaired first.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          A System Blueprint is only generated from a compiled Golden Report. Re-run the forensic scan for this company.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <Cpu className="h-4 w-4 text-amber" /> System Blueprint
        </h4>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => run(false)} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Cpu className="mr-1 h-3.5 w-3.5" />}
            {latest ? 'Regenerate if changed' : 'Generate System Blueprint'}
          </Button>
          {latest && (
            <Button size="sm" variant="outline" onClick={() => run(true)} disabled={busy}>Force rebuild</Button>
          )}
        </div>
      </div>

      {!latest && <p className="mt-3 text-xs text-muted-foreground">No blueprint yet for this report version.</p>}

      {latest && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded border border-border px-1.5 py-0.5 font-mono uppercase">{latest.status}</span>
            <span className={`rounded border px-1.5 py-0.5 font-mono uppercase ${latest.approval_state === 'approved' ? 'border-emerald-500/40 text-emerald-300' : 'border-border'}`}>
              {latest.approval_state}
            </span>
            {latest.validation_passed
              ? <span className="text-emerald-300">Validation passed</span>
              : <span className="text-red-300">Validation issues</span>}
            {latest.validation?.coverage && (
              <span>Root causes {latest.validation.coverage.covered}/{latest.validation.coverage.expected}</span>
            )}
            {latest.ai_model && <span>· {latest.ai_provider}/{latest.ai_model}</span>}
            <span>· template {latest.template_version}</span>
          </div>

          {!!latest.validation?.errors?.length && (
            <ul className="list-disc space-y-0.5 rounded border border-red-500/30 bg-red-500/5 p-2 pl-6 text-[11px] text-red-300">
              {latest.validation.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {!!latest.validation?.warnings?.length && (
            <ul className="list-disc space-y-0.5 rounded border border-amber/30 bg-amber/5 p-2 pl-6 text-[11px] text-amber">
              {latest.validation.warnings.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {latest.error_message && !latest.validation?.errors?.length && (
            <p className="text-[11px] text-red-300">{latest.error_message}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!latest.master_prompt}
              onClick={() => { navigator.clipboard.writeText(latest.master_prompt || ''); toast({ title: 'Vibe build prompt copied' }); }}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy Vibe Build Prompt
            </Button>
            <Button size="sm" variant="outline" disabled={!latest.output_markdown}
              onClick={() => downloadTextFile(`${slug}-blueprint.md`, latest.output_markdown || '', 'text/markdown')}>
              <Download className="mr-1 h-3.5 w-3.5" /> Markdown
            </Button>
            <Button size="sm" variant="outline" disabled={!latest.output_json}
              onClick={() => downloadTextFile(`${slug}-blueprint.json`, JSON.stringify(latest.output_json, null, 2), 'application/json')}>
              <Download className="mr-1 h-3.5 w-3.5" /> JSON
            </Button>
            <Button size="sm" variant="outline" disabled={!latest.master_prompt}
              onClick={() => downloadTextFile(`${slug}-vibe-prompt.txt`, latest.master_prompt || '')}>
              <Download className="mr-1 h-3.5 w-3.5" /> Prompt .txt
            </Button>
            {!portalToken && (latest.approval_state !== 'approved' ? (
              <Button size="sm" variant="ghost" className="text-emerald-300" disabled={!latest.validation_passed}
                onClick={() => approve('approved')}>
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Approve for build
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => approve('draft')}>Revoke approval</Button>
            ))}
          </div>

          {latest.output_markdown && (
            <details className="rounded border border-border bg-background/60 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-amber">Preview blueprint</summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                {latest.output_markdown}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────── composed Aetheris Company System ─────────────────── */

const CompanySystemPanel: React.FC<{ scanId: string; eligible: boolean }> = ({ scanId, eligible }) => {
  const [busy, setBusy] = useState(false);
  const [system, setSystem] = useState<CompanySystemRow | null>(null);

  const compose = async (force: boolean) => {
    setBusy(true);
    try {
      const res = await composeSystem(scanId, 'diagnostic', force);
      setSystem(res.system);
      toast({ title: res.reused ? 'Existing company system reused' : 'Company system composed' });
    } catch (e) {
      toast({ title: 'Composition failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <h4 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-foreground">
        <Network className="h-4 w-4 text-amber" /> Aetheris Company System
      </h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Composes this report into a live workspace built from existing Aetheris Universe instruments. Draft only — nothing runs until approved.
      </p>
      {!eligible ? (
        <p className="text-xs text-destructive">Report must be repaired first.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => compose(false)} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Network className="mr-1 h-3.5 w-3.5" />}
            {system ? 'Recompose if changed' : 'Compose company system'}
          </Button>
          {system && (
            <a href={`/company-system/${system.id}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Open workspace</Button>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── report detail ───────────────────────── */



const ReportDetail: React.FC<{ scanId: string; onBack: () => void }> = ({ scanId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const portalToken = useLibraryToken();
  const [data, setData] = useState<{ archive: ArchiveRow; company: LibraryCompany; findings: FindingRow[]; blueprints: BlueprintRow[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getReport(scanId, portalToken)); }
    catch (e) { toast({ title: 'Failed to load report', description: (e as Error).message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [scanId, portalToken]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber" /></div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Report not found.</div>;

  const { archive, company, findings, blueprints } = data;
  const shareUrl = `${window.location.origin}/golden-report?scan=${archive.scan_id}`;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>

      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-bold text-foreground">{company?.display_name}</h3>
          <span className="font-mono text-[11px] text-muted-foreground">v{archive.report_version}</span>
          <GoldenSourceBadge source={archive.report_source} />
          <ValidityBadge valid={archive.is_valid} state={archive.report_state} />
        </div>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {archive.target_url}
          {archive.rep_code ? ` · Code ${archive.rep_code}` : ''}
          {archive.creator_name ? ` · ${archive.creator_name}` : ''}
          {archive.creator_email ? ` · ${archive.creator_email}` : ''}
          {archive.completed_at ? ` · ${new Date(archive.completed_at).toLocaleString()}` : ''}
        </p>
        <p className="mt-3 text-sm text-amber">{formatExposure(archive.annual_low, archive.annual_high)}</p>
        {archive.executive_summary && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{archive.executive_summary}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={shareUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Open report</Button>
          </a>
          <Button size="sm" variant="outline"
            onClick={() => { navigator.clipboard.writeText(shareUrl); toast({ title: 'Share link copied' }); }}>
            <Link2 className="mr-1 h-3.5 w-3.5" /> Copy share link
          </Button>
        </div>
      </div>

      <BlueprintPanel archive={archive} blueprints={blueprints} onRefresh={load} />

      <CompanySystemPanel scanId={archive.scan_id} eligible={archive.is_valid} />

      <div className="rounded-xl border border-border bg-card/40 p-4">
        <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-amber" /> Findings &amp; root causes ({findings.length})
        </h4>
        {findings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No indexed findings for this report.</p>
        ) : (
          <div className="space-y-2">
            {findings.map(f => (
              <div key={f.id} className="rounded-md border border-border/60 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{f.title}</span>
                  {f.evidence_grade && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">{f.evidence_grade}</span>}
                  {f.category && <span className="rounded bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber">{f.category}</span>}
                  {typeof f.annual_low === 'number' && (
                    <span className="font-mono text-[10px] text-red-300">{formatExposure(f.annual_low, f.annual_high)}</span>
                  )}
                </div>
                {f.root_cause_title && <p className="mt-1 text-[11px] text-muted-foreground">Root cause: {f.root_cause_title}</p>}
                {f.recommended_action && <p className="mt-1 text-[11px] text-muted-foreground">Action: {f.recommended_action}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────── company detail ───────────────────────── */

const CompanyDetail: React.FC<{ companyId: string; onBack: () => void; onOpenReport: (scanId: string) => void }> = ({
  companyId, onBack, onOpenReport,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ company: LibraryCompany; reports: ArchiveRow[]; blueprints: BlueprintRow[] } | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    getCompany(companyId)
      .then(d => { if (live) setData(d); })
      .catch(e => toast({ title: 'Failed to load company', description: (e as Error).message, variant: 'destructive' }))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [companyId]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber" /></div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Company not found.</div>;

  const { company, reports, blueprints } = data;
  const bpByScan = new Map(blueprints.map(b => [b.scan_id, b]));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> All companies</Button>
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <h3 className="font-display text-xl font-bold text-foreground">{company.display_name}</h3>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {company.primary_domain || company.website_url || 'No domain on file'}
          {company.industry ? ` · ${company.industry}` : ''}
          {company.location ? ` · ${company.location}` : ''}
        </p>
        {company.business_summary && (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{company.business_summary}</p>
        )}
        {!!company.contact_names?.length && (
          <p className="mt-2 text-[11px] text-muted-foreground">Contacts on file: {company.contact_names.join(', ')}</p>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-display text-sm font-bold text-foreground">Report history ({reports.length})</h4>
        {reports.map(r => {
          const bp = bpByScan.get(r.scan_id);
          return (
            <button key={r.id} onClick={() => onOpenReport(r.scan_id)}
              className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-left transition-colors hover:border-amber/50">
              <span className="font-mono text-[11px] text-muted-foreground">v{r.report_version}</span>
              <span className="text-xs text-foreground">{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}</span>
              <GoldenSourceBadge source={r.report_source} />
              <ValidityBadge valid={r.is_valid} state={r.report_state} />
              <span className="text-xs text-amber">{formatExposure(r.annual_low, r.annual_high)}</span>
              <span className="text-[11px] text-muted-foreground">{r.finding_count} findings · {r.root_cause_count} root causes</span>
              {bp && <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">BP {bp.approval_state}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ───────────────────────── main library ───────────────────────── */

export const GoldenReportLibrary: React.FC = () => {
  const [items, setItems] = useState<LibraryCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [source, setSource] = useState('');
  const [state, setState] = useState('');
  const [blueprint, setBlueprint] = useState<'' | 'has' | 'none'>('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total_scans: number; total_archived: number; total_companies: number } | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState('');
  const [sysBatching, setSysBatching] = useState(false);
  const [sysMsg, setSysMsg] = useState('');
  const LIMIT = 24;

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(0); }, 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await listCompanies({ search: debounced, source, state, blueprint, sort, limit: LIMIT, offset: page * LIMIT });
      setItems(res.items); setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [debounced, source, state, blueprint, sort, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getLibraryStats().then(setStats).catch(() => {}); }, []);

  const runBackfill = async () => {
    setBackfilling(true);
    let cursor: string | null = null;
    let archived = 0;
    try {
      for (let i = 0; i < 200; i++) {
        const res = await runBackfillBatch(cursor, 40);
        archived += res.archived;
        cursor = res.cursor;
        setBackfillMsg(`Archived ${res.total_archived} of ${res.total_scans} reports…`);
        setStats(s => s ? { ...s, total_archived: res.total_archived, total_scans: res.total_scans } : s);
        if (res.done || !cursor) break;
      }
      setBackfillMsg(`Backfill complete. ${archived} reports processed this run.`);
      toast({ title: 'Backfill finished' });
      load();
    } catch (e) {
      setBackfillMsg(`Backfill stopped: ${(e as Error).message}`);
      toast({ title: 'Backfill stopped', description: (e as Error).message, variant: 'destructive' });
    } finally { setBackfilling(false); }
  };

  // Historical company systems are built one small batch at a time on purpose:
  // no fan-out over the whole archive, and every run is resumable.
  const runSystemBatch = async () => {
    setSysBatching(true);
    try {
      const res = await composeBatch(5);
      setSysMsg(
        `${res.created} created, ${res.reused} already current, ${res.failed.length} failed · ${res.systems_total} of ${res.eligible_total} valid reports have a draft system.`,
      );
      if (res.failed.length) {
        toast({ title: `${res.failed.length} failed`, description: res.failed[0]?.error ?? '', variant: 'destructive' });
      } else {
        toast({ title: 'Batch complete' });
      }
    } catch (e) {
      setSysMsg(`Batch stopped: ${(e as Error).message}`);
      toast({ title: 'Batch stopped', description: (e as Error).message, variant: 'destructive' });
    } finally { setSysBatching(false); }
  };


  const pages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  if (scanId) return <ReportDetail scanId={scanId} onBack={() => setScanId(null)} />;
  if (companyId) return <CompanyDetail companyId={companyId} onBack={() => setCompanyId(null)} onOpenReport={setScanId} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Database className="h-5 w-5 text-amber" /> Golden Report Library
          </h2>
          <p className="text-xs text-muted-foreground">
            {stats ? `${stats.total_companies} businesses · ${stats.total_archived} of ${stats.total_scans} reports archived` : 'Loading index…'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={runBackfill} disabled={backfilling}>
            {backfilling ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Database className="mr-1 h-4 w-4" />}
            Archive historical reports
          </Button>
          <Button size="sm" variant="outline" onClick={runSystemBatch} disabled={sysBatching}>
            {sysBatching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Network className="mr-1 h-4 w-4" />}
            Draft 5 company systems
          </Button>
        </div>
      </div>
      {backfillMsg && <p className="font-mono text-[11px] text-amber">{backfillMsg}</p>}
      {sysMsg && <p className="font-mono text-[11px] text-muted-foreground">{sysMsg}</p>}


      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search the Golden Report library"
            placeholder="Search business, domain, URL, summary, finding…" className="h-8 pl-9 text-sm" />
        </div>
        <select aria-label="Filter by source" className={selectCls} value={source} onChange={e => { setSource(e.target.value); setPage(0); }}>
          {SOURCES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <select aria-label="Filter by report state" className={selectCls} value={state} onChange={e => { setState(e.target.value); setPage(0); }}>
          {STATES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <select aria-label="Filter by blueprint status" className={selectCls} value={blueprint} onChange={e => { setBlueprint(e.target.value as '' | 'has' | 'none'); setPage(0); }}>
          <option value="">Any blueprint</option>
          <option value="has">Has blueprint</option>
          <option value="none">No blueprint</option>
        </select>
        <select aria-label="Sort" className={selectCls} value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}>
          {SORTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-6 text-center text-sm text-red-300">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          {stats && stats.total_archived === 0
            ? 'Nothing archived yet. Run "Archive historical reports" to import every completed Golden Report.'
            : 'No businesses match these filters.'}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map(card => (
              <button key={card.company.id} onClick={() => setCompanyId(card.company.id)}
                className="group flex flex-col rounded-xl border border-border bg-card/40 p-4 text-left transition-colors hover:border-amber/50">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold text-foreground group-hover:text-amber">{card.company.display_name}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{card.company.primary_domain || card.company.website_url || '—'}</p>
                  </div>
                </div>
                {card.company.business_summary && (
                  <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{card.company.business_summary}</p>
                )}
                <p className="mt-3 text-sm font-semibold text-amber">{formatExposure(card.annual_low, card.annual_high)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <GoldenSourceBadge source={card.report_source} />
                  <ValidityBadge valid={card.is_valid} state={card.report_state} />
                  {card.grade && <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">Grade {card.grade}</span>}
                  {card.blueprint && <span className="rounded border border-sky-500/40 px-1.5 py-0.5 font-mono text-[9px] uppercase text-sky-300">Blueprint {card.blueprint.approval_state}</span>}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {card.report_count} report{card.report_count === 1 ? '' : 's'} · {card.finding_count} findings · {card.root_cause_count} root causes
                  {card.newest_completed_at ? ` · ${new Date(card.newest_completed_at).toLocaleDateString()}` : ''}
                </p>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">{total} businesses · page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GoldenReportLibrary;
