// Aetheris Company System workspace — the composed operating system for one
// Golden Report. Houses the connected Universe modules, the operator, memory,
// brand approval, forecasts, audit history and the composition export.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  getWorkspace, setModuleEnabled, approveSystem, setBrandStatus, operatorChat,
  previewAction, executeAction, setMemoryStatus, forgetMemory,
  buildCompositionMarkdown, buildCompositionPrompt, downloadText,
  type WorkspacePayload, type SystemModuleRow,
} from '@/lib/companySystem';
import { findModule } from '@/lib/universeSystem';
import {
  Loader2, Network, Brain, Palette, ListChecks, History, Download, Copy,
  ShieldCheck, Lock, ExternalLink, Play,
} from 'lucide-react';

const TABS = ['overview', 'teams', 'crm', 'map', 'operator', 'brand', 'memory', 'audit', 'export'] as const;
type Tab = typeof TABS[number];


const money = (v: number | null | undefined) =>
  v == null ? 'n/a' : `$${Math.round(v).toLocaleString('en-US')}`;

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-border bg-card/40 p-4 ${className}`}>{children}</div>
);

const CompanySystemWorkspacePage: React.FC = () => {
  const { systemId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getWorkspace(systemId)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [systemId]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber" /></div>;
  if (error) return <div className="p-10 text-center text-sm text-destructive">{error}</div>;
  if (!data) return <div className="p-10 text-center text-sm text-muted-foreground">System not found.</div>;

  const { system, company, archive, modules, connections, goals, checks, forecasts, events, memory, brand } = data;
  const enabled = modules.filter(m => m.enabled);
  const locked = modules.filter(m => m.locked);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Aetheris Company System</p>
        <h1 className="font-display text-2xl font-bold text-foreground">{company?.display_name || 'Company system'}</h1>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {company?.primary_domain || company?.website_url} · tier {system.tier} · {system.status} · {system.approval_state}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to={`/golden-report?scan=${system.scan_id}`} target="_blank">
            <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Golden Report</Button>
          </Link>
          {system.approval_state !== 'approved' ? (
            <Button size="sm" onClick={async () => { await approveSystem(system.id, 'approved'); toast({ title: 'System approved' }); load(); }}>
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Approve system
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={async () => { await approveSystem(system.id, 'draft'); load(); }}>Revoke approval</Button>
          )}
        </div>
      </header>

      <nav className="mb-5 flex flex-wrap gap-1 border-b border-border pb-2" aria-label="Workspace sections">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            aria-current={tab === t}
            className={`rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide ${tab === t ? 'bg-amber/15 text-amber' : 'text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="font-display text-sm font-bold text-foreground">Canonical exposure</h2>
            <p className="mt-1 text-lg text-amber">{money(archive?.annual_low)} – {money(archive?.annual_high)} / yr</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Read from the Golden Report ledger. Never recomputed here.</p>
            <p className="mt-3 text-sm text-muted-foreground">{company?.business_summary || archive?.executive_summary}</p>
          </Card>
          <Card>
            <h2 className="font-display text-sm font-bold text-foreground">Coverage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {system.coverage?.covered ?? 0} of {system.coverage?.total ?? 0} root causes mapped to instruments ·
              {' '}{enabled.length} enabled · {locked.length} locked
            </p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {goals.slice(0, 6).map(g => <li key={g.id}>[{g.classification}] {g.title}</li>)}
            </ul>
          </Card>
          <Card>
            <h2 className="font-display text-sm font-bold text-foreground">Recovery forecast</h2>
            {forecasts[0] ? (
              <>
                <p className="mt-1 text-[11px] text-muted-foreground">{forecasts[0].basis}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {(forecasts[0].scenarios || []).map(s => (
                    <li key={s.name} className="text-muted-foreground">
                      <span className="font-mono uppercase text-amber">{s.name}</span> · {s.recovery_percent}% — {s.rationale}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">Planning assumptions. No recovery is guaranteed.</p>
              </>
            ) : <p className="text-xs text-muted-foreground">No forecast yet.</p>}
          </Card>
          <Card>
            <h2 className="font-display text-sm font-bold text-foreground">Checks &amp; alerts</h2>
            {checks.length === 0 ? <p className="text-xs text-muted-foreground">No checks configured.</p> : (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {checks.map(c => <li key={c.id}>{c.name} — {c.threshold} <span className="font-mono">[{c.last_status || 'not_run'}]</span></li>)}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'map' && (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-foreground">
              <Network className="h-4 w-4 text-amber" /> System map
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {modules.map(m => <ModuleCard key={m.id} m={m} systemId={system.id} onChange={load} />)}
            </div>
          </Card>
          <Card>
            <h3 className="font-display text-sm font-bold text-foreground">Connections</h3>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
              {connections.map(c => <li key={c.id}>{c.from_module} --[{c.payload}]--&gt; {c.to_module}</li>)}
              {connections.length === 0 && <li>No connections.</li>}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'operator' && <OperatorPanel data={data} onChange={load} />}

      {tab === 'teams' && <TeamsPanel data={data} onChange={load} />}

      {tab === 'crm' && <CrmPanel data={data} />}


      {tab === 'brand' && (
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-foreground">
            <Palette className="h-4 w-4 text-amber" /> Brand center (v{brand?.version ?? 1} · {brand?.status ?? 'draft'})
          </h2>
          {!brand ? <p className="text-xs text-muted-foreground">No brand context captured.</p> : (
            <>
              <dl className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                <div><dt className="font-mono uppercase">Colors</dt><dd>{brand.colors?.join(', ') || '—'}</dd></div>
                <div><dt className="font-mono uppercase">Typography</dt><dd>{brand.typography?.join(', ') || '—'}</dd></div>
                <div><dt className="font-mono uppercase">Tone</dt><dd>{brand.tone || '—'}</dd></div>
                <div><dt className="font-mono uppercase">Audience</dt><dd>{brand.audience || '—'}</dd></div>
                <div><dt className="font-mono uppercase">CTA style</dt><dd>{brand.cta_style || '—'}</dd></div>
                <div><dt className="font-mono uppercase">Imagery</dt><dd>{brand.imagery_direction || '—'}</dd></div>
              </dl>
              {brand.inferred_fields?.length > 0 && (
                <p className="mt-3 rounded border border-destructive/40 p-2 text-[11px] text-destructive">
                  Inferred (not yet fact): {brand.inferred_fields.join(', ')}. Approval makes this version active for outputs.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={brand.status === 'approved'}
                  onClick={async () => { await setBrandStatus(brand.id, 'approved'); toast({ title: 'Brand version approved' }); load(); }}>
                  Approve brand version
                </Button>
                <Button size="sm" variant="ghost" disabled={brand.status !== 'approved'}
                  onClick={async () => { await setBrandStatus(brand.id, 'draft'); load(); }}>Send back to draft</Button>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === 'memory' && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-foreground">
            <Brain className="h-4 w-4 text-amber" /> Memory center ({memory.length})
          </h2>
          {memory.length === 0 ? <p className="text-xs text-muted-foreground">No memory recorded yet.</p> : (
            <div className="space-y-2">
              {memory.map(m => (
                <div key={m.id} className="rounded border border-border/60 p-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase text-amber">{m.scope}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">{m.status} · {Math.round(m.confidence * 100)}%</span>
                    <span className="font-semibold text-foreground">{m.memory_key}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{m.value}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">source: {m.provenance}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => { await setMemoryStatus(m.id, 'approved'); load(); }}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={async () => { await setMemoryStatus(m.id, 'rejected'); load(); }}>Reject</Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await forgetMemory(m.id); load(); }}>Forget</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-foreground">
            <History className="h-4 w-4 text-amber" /> Action history
          </h2>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {events.map(e => (
              <li key={e.id} className="rounded border border-border/60 p-2">
                <span className="font-mono text-[10px] uppercase text-amber">{e.kind}</span>{' '}
                {e.module_id ? `${e.module_id}/${e.action_id}` : ''} · {e.status} · {new Date(e.created_at).toLocaleString()}
                {e.error_message && <div className="text-destructive">{e.error_message}</div>}
                {e.rollback_note && <div>Rollback: {e.rollback_note}</div>}
              </li>
            ))}
            {events.length === 0 && <li>No actions yet.</li>}
          </ul>
        </Card>
      )}

      {tab === 'export' && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-foreground">
            <Download className="h-4 w-4 text-amber" /> Composition export
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Describes the composed Aetheris modules and their integration contracts. No private source code, no secrets.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(buildCompositionPrompt(data)); toast({ title: 'Vibe build prompt copied' }); }}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy Vibe Build Prompt
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadText(`company-system-${system.id}.md`, buildCompositionMarkdown(data), 'text/markdown')}>
              Download Markdown
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadText(`company-system-${system.id}.json`, JSON.stringify({ system, modules, connections, goals, checks, forecasts }, null, 2), 'application/json')}>
              Download JSON
            </Button>
          </div>
          <pre className="mt-4 max-h-96 overflow-auto rounded bg-background/60 p-3 text-[11px] text-muted-foreground">{buildCompositionMarkdown(data)}</pre>
        </Card>
      )}
    </main>
  );
};

/* ── team workspaces ─────────────────────────────────────────────────────── */

const TASK_STATUSES: Array<SystemTaskRow['status']> = ['open', 'in_progress', 'blocked', 'done'];

const TeamsPanel: React.FC<{ data: WorkspacePayload; onChange: () => void }> = ({ data, onChange }) => {
  const teams = data.teams.filter(t => t.enabled);
  const [active, setActive] = useState(teams[0]?.team_key ?? '');
  const team = teams.find(t => t.team_key === active) || teams[0];

  if (!teams.length) {
    return <Card><p className="text-xs text-muted-foreground">No team workspaces provisioned yet. Recompose this system from its Golden Report.</p></Card>;
  }

  const goals = data.goals.filter(g => (g.team_key || 'executive') === team.team_key);
  const tasks = data.tasks.filter(t => t.team_key === team.team_key);
  const plays = data.playbooks.filter(p => p.team_key === team.team_key);
  const tools = data.modules.filter(m => (team.module_ids || []).includes(m.module_id));

  return (
    <div className="grid gap-4 md:grid-cols-[200px_1fr]">
      <nav className="flex flex-row flex-wrap gap-1 md:flex-col" aria-label="Team workspaces">
        {teams.map(t => (
          <button key={t.team_key} onClick={() => setActive(t.team_key)} aria-current={t.team_key === team.team_key}
            className={`rounded px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wide ${t.team_key === team.team_key ? 'bg-amber/15 text-amber' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.name}
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        <Card>
          <h2 className="font-display text-sm font-bold text-foreground">{team.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{team.summary}</p>
          <p className="mt-2 font-mono text-[10px] uppercase text-muted-foreground">
            Root causes: {(team.root_cause_ids || []).join(', ') || 'none linked'}
          </p>
        </Card>

        <Card>
          <h3 className="font-display text-sm font-bold text-foreground">Goals</h3>
          {goals.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No goals for this team.</p> : (
            <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
              {goals.map(g => (
                <li key={g.id} className="rounded border border-border/60 p-2">
                  <span className="font-mono text-[10px] uppercase text-amber">{g.classification}</span> {g.title}
                  <div className="mt-1">KPI: {g.kpi} · baseline {g.baseline || 'not measured'} · target {g.target} · owner {g.owner_role}</div>
                  {g.requires_company_data && (
                    <div className="mt-1 font-mono text-[10px] uppercase text-destructive">Requires company data</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-display text-sm font-bold text-foreground">Tasks</h3>
          {tasks.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No tasks for this team.</p> : (
            <ul className="mt-2 space-y-2 text-xs">
              {tasks.map(t => (
                <li key={t.id} className="rounded border border-border/60 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase text-amber">P{t.priority}</span>
                    <span className="font-semibold text-foreground">{t.title}</span>
                    {t.requires_company_data && (
                      <span className="font-mono text-[10px] uppercase text-destructive">requires company data</span>
                    )}
                  </div>
                  {t.detail && <p className="mt-1 text-muted-foreground">{t.detail}</p>}
                  <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">
                    {t.kind} · owner {t.owner_role || 'unassigned'} · source {t.source}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {TASK_STATUSES.map(s => (
                      <Button key={s} size="sm" variant={t.status === s ? 'default' : 'ghost'}
                        onClick={async () => {
                          try { await setTaskStatus(data.system.id, t.id, s as 'open'); onChange(); }
                          catch (e) { toast({ title: 'Task error', description: (e as Error).message, variant: 'destructive' }); }
                        }}>
                        {s.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-display text-sm font-bold text-foreground">Playbooks &amp; tips</h3>
          {plays.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No playbook for this team.</p> : (
            <div className="mt-2 space-y-3 text-xs text-muted-foreground">
              {plays.map(p => (
                <div key={p.id} className="rounded border border-border/60 p-2">
                  <p className="font-semibold text-foreground">{p.title}</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4">{(p.steps || []).map((s, i) => <li key={i}>{s}</li>)}</ol>
                  {(p.tips || []).length > 0 && (
                    <p className="mt-2 font-mono text-[10px] uppercase text-amber">Tips</p>
                  )}
                  <ul className="space-y-0.5">{(p.tips || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-display text-sm font-bold text-foreground">Connected instruments</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {tools.length === 0
              ? <p className="text-xs text-muted-foreground">No instruments connected to this team.</p>
              : tools.map(m => <ModuleCard key={m.id} m={m} systemId={data.system.id} onChange={onChange} />)}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ── smart CRM ───────────────────────────────────────────────────────────── */

const CrmPanel: React.FC<{ data: WorkspacePayload }> = ({ data }) => {
  const crm = data.crm;
  if (!crm?.linked) {
    return (
      <Card>
        <h2 className="font-display text-sm font-bold text-foreground">Smart CRM</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          No CRM company linked yet. Recompose this system to link or create the company record. Contacts, deals and revenue are never invented.
        </p>
      </Card>
    );
  }
  const stages = (crm.config?.stages as string[] | undefined) || [];
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <Users className="h-4 w-4 text-amber" /> {crm.company?.name}
        </h2>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{crm.company?.website || '—'}</p>
        {stages.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Suggested pipeline: {stages.join(' → ')}. Operator approval is required before live CRM behaviour changes.
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-display text-sm font-bold text-foreground">Contacts ({crm.contacts.length})</h3>
          {crm.contacts.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">No contacts imported. Import real contacts to activate follow up automation.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {crm.contacts.slice(0, 25).map(c => (
                <li key={c.id}>{c.full_name} · {c.title || '—'} · {c.email || c.phone || 'no channel'}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-display text-sm font-bold text-foreground">Pipeline ({crm.deals.length})</h3>
          {crm.deals.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">No opportunities recorded.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {crm.deals.slice(0, 25).map(d => (
                <li key={d.id}>
                  <span className="font-mono text-[10px] uppercase text-amber">{d.stage}</span> {d.title} · {money(d.value_cents / 100)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="font-display text-sm font-bold text-foreground">Recent interactions</h3>
        {crm.interactions.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No interaction history.</p> : (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {crm.interactions.slice(0, 25).map(i => (
              <li key={i.id}>
                <span className="font-mono text-[10px] uppercase text-amber">{i.type}</span> {i.subject || '—'} · {new Date(i.occurred_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

/* ── module card with action bus ─────────────────────────────────────────── */


const ModuleCard: React.FC<{ m: SystemModuleRow; systemId: string; onChange: () => void }> = ({ m, systemId, onChange }) => {
  const reg = findModule(m.module_id);
  // The ticket is issued by the server and echoed back verbatim. The client
  // never fabricates one, so a plan is always required before a write.
  const [pending, setPending] = useState<
    { actionId: string; preview: Record<string, unknown>; token: string | null; expiresAt: string | null } | null
  >(null);

  const inputFor = (actionId: string) => {
    const action = reg?.actions.find(a => a.id === actionId);
    const input: Record<string, unknown> = {};
    for (const k of action?.input || []) input[k] = 'system';
    return input;
  };

  const run = async (actionId: string) => {
    const input = inputFor(actionId);
    try {
      const res = await previewAction(systemId, m.module_id, actionId, input);
      if (!res.ok) { toast({ title: 'Blocked', description: res.error, variant: 'destructive' }); return; }
      if (res.requires_confirmation) {
        if (!res.confirmation?.token) {
          toast({ title: 'No confirmation token issued', description: 'The server did not authorize this action.', variant: 'destructive' });
          return;
        }
        setPending({
          actionId,
          preview: res.preview || {},
          token: res.confirmation.token,
          expiresAt: res.confirmation.expires_at ?? null,
        });
        return;
      }
      const out = await executeAction(systemId, m.module_id, actionId, input, res.confirmation?.token ?? null);
      toast({ title: out.ok ? 'Action executed' : 'Action failed', description: out.error || out.rollback });
      onChange();
    } catch (e) { toast({ title: 'Action error', description: (e as Error).message, variant: 'destructive' }); }
  };

  const toggleModule = async () => {
    try {
      const plan = await setModuleEnabled(systemId, m.module_id, !m.enabled);
      if (plan.requires_confirmation) {
        if (!plan.confirmation?.token) {
          toast({ title: 'Blocked', description: plan.error || 'No confirmation token issued.', variant: 'destructive' });
          return;
        }
        const done = await setModuleEnabled(systemId, m.module_id, !m.enabled, plan.confirmation.token);
        if (done.ok === false) { toast({ title: 'Blocked', description: done.error, variant: 'destructive' }); return; }
      } else if (plan.ok === false) {
        toast({ title: 'Blocked', description: plan.error, variant: 'destructive' }); return;
      }
      onChange();
    } catch (e) { toast({ title: 'Module error', description: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <div className={`rounded-lg border p-3 ${m.locked ? 'border-destructive/40' : 'border-border'}`}>
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-bold text-foreground">{m.module_name}</span>
        {m.locked && <Lock className="h-3.5 w-3.5 text-destructive" />}
        <span className="ml-auto font-mono text-[10px] uppercase text-muted-foreground">{m.required_tier}</span>
      </div>
      {m.route && <p className="font-mono text-[10px] text-muted-foreground">{m.route}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">Addresses: {(m.root_cause_ids || []).join(', ') || '—'}</p>
      {m.lock_reason && <p className="mt-1 text-[11px] text-destructive">{m.lock_reason}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {!m.locked && (
          <Button size="sm" variant="outline" onClick={toggleModule}>
            {m.enabled ? 'Disable' : 'Enable'}
          </Button>
        )}
        {m.enabled && (reg?.actions || []).map(a => (
          <Button key={a.id} size="sm" variant="ghost" onClick={() => run(a.id)}>
            <Play className="mr-1 h-3 w-3" /> {a.label}
          </Button>
        ))}
      </div>
      {pending && (
        <div className="mt-2 rounded border border-amber/40 p-2 text-[11px]">
          <p className="font-mono uppercase text-amber">Confirmation required</p>
          {pending.expiresAt && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Ticket expires {new Date(pending.expiresAt).toLocaleTimeString()} · single use
            </p>
          )}
          <pre className="mt-1 overflow-auto text-muted-foreground">{JSON.stringify(pending.preview, null, 2)}</pre>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={async () => {
              const out = await executeAction(
                systemId, m.module_id, pending.actionId, inputFor(pending.actionId), pending.token,
              );
              toast({ title: out.ok ? 'Action executed' : 'Action failed', description: out.error || out.rollback });
              setPending(null); onChange();
            }}>Confirm &amp; execute</Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};


/* ── operator ────────────────────────────────────────────────────────────── */

const OperatorPanel: React.FC<{ data: WorkspacePayload; onChange: () => void }> = ({ data }) => {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Array<{ role: string; content: string }>>([]);
  const enabled = useMemo(() => data.modules.filter(m => m.enabled).map(m => m.module_name), [data.modules]);

  const ask = async () => {
    const question = q.trim();
    if (!question) return;
    setBusy(true); setQ('');
    setLog(l => [...l, { role: 'user', content: question }]);
    try {
      const res = await operatorChat(data.system.id, question, log.slice(-6));
      setLog(l => [...l, { role: 'assistant', content: res.answer }]);
    } catch (e) {
      toast({ title: 'Operator error', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-foreground">
        <ListChecks className="h-4 w-4 text-amber" /> Report AI / Operator
      </h2>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Grounded in this Golden Report and this system. Writes use Plan → Confirm → Execute. Enabled: {enabled.join(', ') || 'none'}.
      </p>
      <div className="mb-3 max-h-96 space-y-3 overflow-auto">
        {log.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-sm text-foreground' : 'whitespace-pre-wrap text-sm text-muted-foreground'}>
            <span className="font-mono text-[10px] uppercase text-amber">{m.role}</span>
            <p>{m.content}</p>
          </div>
        ))}
      </div>
      <Textarea aria-label="Ask the operator" value={q} onChange={e => setQ(e.target.value)} rows={3}
        placeholder="Ask what this system can do, or ask it to plan an action." />
      <Button className="mt-2" size="sm" onClick={ask} disabled={busy}>
        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} Ask operator
      </Button>
    </Card>
  );
};

export default CompanySystemWorkspacePage;
