import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, CheckCircle2, Clock3, Copy, Download, Filter, Loader2,
  Radar, RefreshCw, Save, Search, ShieldCheck, Sparkles, Target, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ensureOwnerToken } from '@/lib/adminAuth';

type Service = 'marketing' | 'consulting' | 'ai';
type Stage = 'new' | 'researching' | 'approved' | 'contacted' | 'qualified' | 'won' | 'dismissed';
type IntentSettings = {
  geography: string; industries: string; services: Service[]; minScore: number; scheduleEnabled: boolean;
};
type Opportunity = {
  id: string; company: string; contactName: string; contactTitle: string; location: string;
  service: Service; signalType: string; summary: string; quote: string; sourceUrl: string;
  sourceTitle: string; publishedAt: string; observedAt: string; score: number;
  tier: 'high' | 'medium' | 'watch'; reasons: string[]; suggestedOffer: string;
  status: Stage; note: string; updatedAt: string;
};
type ScanReport = {
  at: string; sources: number; candidates: number; added: number; duplicates: number;
  rejected: number; queries: number; errors: string[];
};
type RadarResult = {
  settings: IntentSettings; opportunities: Opportunity[]; lastRunAt: string;
  lastReport: ScanReport | null; manualCount: number; manualDay: string;
  maxManualPerDay: number; searchReady: boolean; cronReady: boolean;
  sendingEnabled: false; error?: string; skipped?: string;
};
const serviceOptions: { value: Service; title: string; detail: string }[] = [
  { value: 'marketing', title: 'Marketing', detail: 'Agencies, SEO, advertising, lead generation' },
  { value: 'consulting', title: 'Consulting', detail: 'Strategy, operations, fractional leadership' },
  { value: 'ai', title: 'AI & automation', detail: 'AI implementation, integrations, workflow automation' },
];
const stageOptions: { value: Stage; label: string }[] = [
  { value: 'new', label: 'New' }, { value: 'researching', label: 'Researching' },
  { value: 'approved', label: 'Approved' }, { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' }, { value: 'won', label: 'Won' },
  { value: 'dismissed', label: 'Dismissed' },
];
const defaults: IntentSettings = {
  geography: 'United States', industries: '', services: ['marketing', 'consulting', 'ai'],
  minScore: 55, scheduleEnabled: false,
};
const readable = (value: string) => {
  if (!value) return 'Not verified';
  const date = new Date(value.length === 10 ? value + 'T00:00:00Z' : value);
  return Number.isNaN(date.getTime()) ? 'Not verified' : date.toLocaleDateString();
};
const excelSafe = (value: unknown) => {
  const string = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  const guarded = /^[=+\-@\t\r]/.test(string) ? "'" + string : string;
  return '"' + guarded.replace(/"/g, '""') + '"';
};
const safeForExport = (rows: Opportunity[]) => {
  const columns: (keyof Opportunity)[] = [
    'company', 'service', 'score', 'status', 'contactName', 'contactTitle',
    'location', 'signalType', 'summary', 'quote', 'sourceUrl', 'publishedAt',
    'observedAt', 'suggestedOffer', 'note',
  ];
  return [columns.join(','), ...rows.map(row => columns.map(col => excelSafe(row[col])).join(','))].join('\r\n');
};

export default function BuyerIntentRadar() {
  const { toast } = useToast();
  const [radar, setRadar] = useState<RadarResult | null>(null);
  const [settings, setSettings] = useState<IntentSettings>(defaults);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<Service | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [openSettings, setOpenSettings] = useState(false);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const invoke = useCallback(async (action: string, values: Record<string, unknown> = {}): Promise<RadarResult> => {
    const token = await ensureOwnerToken();
    if (!token) throw new Error('Owner session expired. Sign in with your owner PIN again.');
    const { data, error: callError } = await supabase.functions.invoke('owner-buyer-intent', {
      body: { action, ...values }, headers: { 'x-owner-token': token },
    });
    if (callError) {
      let detail = callError.message;
      try {
        const ctx = (callError as { context?: Response }).context;
        if (ctx && typeof ctx.text === 'function') {
          const body = await ctx.text();
          try { detail = JSON.parse(body)?.error || body || detail; } catch { detail = body || detail; }
        }
      } catch { /* keep generic message */ }
      throw new Error('Buyer Intent Radar: ' + detail);
    }
    if (data?.error) throw new Error(data.error);
    return data as RadarResult;
  }, []);

  const refresh = useCallback(async () => {
    setBusy('get'); setError('');
    try {
      const result = await invoke('get');
      setRadar(result); setSettings(result.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load the buyer-intent queue.');
    } finally { setBusy(''); }
  }, [invoke]);
  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (action: string, values: Record<string, unknown>, successMessage: string) => {
    setBusy(action); setError('');
    try {
      const result = await invoke(action, values);
      setRadar(result);
      if (action === 'save_settings') setSettings(result.settings);
      toast({ title: successMessage, description: action === 'scan'
        ? String(result.lastReport?.added ?? 0) + ' new source-verified opportunities saved.'
        : undefined });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed';
      setError(message);
      toast({ title: 'Radar request failed', description: message, variant: 'destructive' });
      return false;
    } finally { setBusy(''); }
  };

  const opportunities = useMemo(() => (radar?.opportunities ?? [])
    .filter(p => serviceFilter === 'all' || p.service === serviceFilter)
    .filter(p => stageFilter === 'all' || p.status === stageFilter)
    .filter(p => [p.company, p.contactName, p.location, p.summary, p.quote]
      .join(' ').toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.score - a.score || b.observedAt.localeCompare(a.observedAt)),
    [radar?.opportunities, query, serviceFilter, stageFilter]);

  const all = radar?.opportunities ?? [];
  const remaining = (radar?.manualDay === new Date().toISOString().slice(0, 10)
    ? (radar?.maxManualPerDay ?? 3) - (radar?.manualCount ?? 0) : radar?.maxManualPerDay ?? 3);
  const changeStage = (item: Opportunity, status: Stage) =>
    void run('update', { id: item.id, status }, 'Opportunity updated');
  const copyBrief = async (item: Opportunity) => {
    const text = [
      'Aetheris | Opportunity brief', item.company + ' · ' + item.service.toUpperCase(),
      'Buying request: ' + item.quote,
      'Source: ' + item.sourceUrl,
      'Suggested service: ' + item.suggestedOffer,
      'Contact: ' + (item.contactName || 'Not independently verified'),
      'Next step: Verify the request is open, identify the authorized contact, and personalize outreach.',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Research brief copied', description: 'No message was sent.' });
    } catch {
      toast({ title: 'Copy unavailable', variant: 'destructive' });
    }
  };
  const downloadCsv = () => {
    const blob = new Blob(['\uFEFF' + safeForExport(opportunities)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'aetheris-buyer-intent.csv'; link.click();
    URL.revokeObjectURL(url);
  };
  const toggleService = (service: Service) => setSettings(previous => ({
    ...previous, services: previous.services.includes(service)
      ? previous.services.filter(s => s !== service) : [...previous.services, service],
  }));

  return (
    <section className="space-y-5" aria-label="Aetheris Buyer Intent Radar">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-amber mb-2">
            <Radar className="h-4 w-4" /> Owner-exclusive · Buyer intelligence
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Buyer Intent Radar</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Find organizations publicly requesting marketing, consulting, and AI vendors.
            Every saved lead includes the original source and a verified request excerpt—not a guessed buyer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={!!busy}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => setOpenSettings(v => !v)} disabled={!radar}>
            <Filter className="w-4 h-4 mr-2" /> {openSettings ? 'Hide filters' : 'Scan settings'}
          </Button>
          <Button onClick={() => void run('scan', {}, 'Buying-signal scan complete')}
            disabled={!!busy || !radar?.searchReady || remaining <= 0}
            className="bg-amber text-background hover:bg-amber/90">
            {busy === 'scan' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Scan public requests
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 text-sm text-foreground">
        <ShieldCheck className="inline h-4 w-4 mr-2 text-amber" />
        <strong>Evidence-first, approval-based.</strong> No private social scraping, guessed contact details,
        automatic email, connection requests, or paid forensic reports. Public intent is an indicator—not
        proof of budget, qualification, or an open opportunity. Verify the posting before outreach.
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{error}</div>}
      {!radar && <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {busy === 'get' ? <><Loader2 className="inline w-4 h-4 animate-spin mr-2" /> Loading private radar…</> : 'Radar backend unavailable. Refresh after deployment.'}
      </div>}
      {radar && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Opportunities', value: all.filter(p => p.status !== 'dismissed').length, icon: Target },
            { label: 'High-priority signals', value: all.filter(p => p.tier === 'high' && p.status !== 'dismissed').length, icon: Sparkles },
            { label: 'Qualified / won', value: all.filter(p => p.status === 'qualified' || p.status === 'won').length, icon: CheckCircle2 },
            { label: 'Manual scans left today', value: Math.max(0, remaining), icon: Clock3 },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-border bg-card/80 p-4">
              <stat.icon className="w-4 h-4 text-amber mb-2" />
              <div className="text-2xl font-semibold tabular-nums">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card/60 p-3 text-sm">
          <p><span className="font-medium">Last scan:</span> {readable(radar.lastRunAt)}
            {radar.lastReport && <span className="text-muted-foreground"> · {radar.lastReport.queries} searches · {radar.lastReport.sources} sources · {radar.lastReport.added} new · {radar.lastReport.rejected} rejected</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            Search: {radar.searchReady ? 'Configured' : 'Unavailable (server search/AI keys missing)'}
            {' · '}Schedule: {radar.settings.scheduleEnabled ? 'Requested' : 'Off'}
            {' · '}Scheduler credential: {radar.cronReady ? 'Configured' : 'Missing'}
          </p>
          {!!radar.lastReport?.errors?.length && <p className="text-xs text-destructive">
            Partial scan errors: {radar.lastReport.errors.join('; ')}
          </p>}
        </div>

        {openSettings && <div className="rounded-xl border border-border bg-card/80 p-4 sm:p-5 space-y-4">
          <h3 className="font-semibold">Discovery targets</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="buyer-geography">Geographic focus</Label>
              <Input id="buyer-geography" value={settings.geography} maxLength={100}
                placeholder="United States, Indiana, Midwest"
                onChange={e => setSettings(s => ({ ...s, geography: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buyer-industries">Industries (optional)</Label>
              <Input id="buyer-industries" value={settings.industries} maxLength={150}
                placeholder="Manufacturing, healthcare, B2B services"
                onChange={e => setSettings(s => ({ ...s, industries: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {serviceOptions.map(option => <label key={option.value}
              className="flex items-start gap-2 rounded-lg border border-border p-3 cursor-pointer hover:border-amber/50">
              <input type="checkbox" className="mt-1 accent-amber"
                checked={settings.services.includes(option.value)}
                onChange={() => toggleService(option.value)} />
              <span><span className="block font-medium text-sm">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.detail}</span></span>
            </label>)}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="buyer-score">Minimum signal score</Label>
            <Input id="buyer-score" type="number" min={45} max={95} step={5}
              className="w-24" value={settings.minScore}
              onChange={e => setSettings(s => ({ ...s, minScore: Number(e.target.value) }))} />
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.scheduleEnabled} className="accent-amber"
                onChange={e => setSettings(s => ({ ...s, scheduleEnabled: e.target.checked }))} />
              Permit daily scheduled scans
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Manual searches are capped at 3 daily, at least 30 minutes apart. Automated scans
            only run when both the schedule and the server-side scheduler credentials are configured.
            The schedule never sends outreach.
          </p>
          <Button onClick={() => void run('save_settings', { settings }, 'Buyer-intent targeting saved')}
            disabled={!!busy || settings.services.length === 0}>
            {busy === 'save_settings' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save targeting
          </Button>
        </div>}

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input aria-label="Search opportunity list" placeholder="Search buyers, requests, location…"
              value={query} onChange={e => setQuery(e.target.value)} className="pl-9" />
          </div>
          <select aria-label="Filter service" value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value as Service | 'all')}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm">
            <option value="all">All services</option>
            {serviceOptions.map(s => <option key={s.value} value={s.value}>{s.title}</option>)}
          </select>
          <select aria-label="Filter opportunity stage" value={stageFilter}
            onChange={e => setStageFilter(e.target.value as Stage | 'all')}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm">
            <option value="all">All stages</option>
            {stageOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <Button variant="outline" disabled={!opportunities.length} onClick={downloadCsv}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>

        {!opportunities.length && <div className="rounded-xl border border-dashed border-border bg-card/40 p-9 text-center space-y-2">
          <Radar className="h-8 w-8 text-amber mx-auto" />
          <p className="font-semibold">No sourced buying signals in this view</p>
          <p className="text-sm text-muted-foreground">
            Save your target services and scan the public web. Only verifiable external-vendor requests are retained.
          </p>
        </div>}
        <div className="grid gap-4 xl:grid-cols-2">
          {opportunities.map(item => (
            <article key={item.id} className="min-w-0 rounded-xl border border-border bg-card/80 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-amber">{item.service} · {item.signalType.replace(/_/g, ' ')}</p>
                  <h3 className="text-lg font-semibold break-words">{item.company}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.location || 'Location not verified'}
                    {item.contactName && ' · ' + item.contactName + (item.contactTitle ? ', ' + item.contactTitle : '')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl text-amber font-bold tabular-nums">{item.score}</div>
                  <div className="text-xs text-muted-foreground">{item.tier} signal</div>
                </div>
              </div>
              <blockquote className="border-l-2 border-amber/70 pl-3 text-sm text-foreground/90">
                “{item.quote}”
              </blockquote>
              {item.summary && <p className="text-sm text-muted-foreground">{item.summary}</p>}
              <div className="flex flex-wrap gap-1.5">
                {(item.reasons ?? []).map(reason => <span key={reason}
                  className="rounded border border-border bg-secondary px-2 py-1 text-[11px]">{reason}</span>)}
              </div>
              <div className="rounded-md bg-background/70 px-3 py-2 text-xs">
                <strong>Best-fit Aetheris offer:</strong> {item.suggestedOffer}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Published: {readable(item.publishedAt)} · Found: {readable(item.observedAt)}</span>
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber hover:underline">
                  Original evidence <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={'buyer-note-' + item.id}>Research / follow-up notes</Label>
                <Textarea id={'buyer-note-' + item.id} rows={2}
                  value={draftNotes[item.id] ?? item.note}
                  onChange={e => setDraftNotes(n => ({ ...n, [item.id]: e.target.value }))}
                  placeholder="Verify request deadline, desired outcomes, buyer, and next step…" maxLength={1200} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label={'Opportunity stage for ' + item.company}
                  value={item.status} disabled={!!busy}
                  onChange={e => changeStage(item, e.target.value as Stage)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm">
                  {stageOptions.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                </select>
                <Button size="sm" variant="outline" disabled={!!busy || (draftNotes[item.id] ?? item.note) === item.note}
                  onClick={() => void run('update', { id: item.id, note: draftNotes[item.id] ?? item.note }, 'Research notes saved')}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => void copyBrief(item)}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Brief
                </Button>
                <Button size="sm" variant="ghost" aria-label={'Remove opportunity for ' + item.company}
                  onClick={() => { if (window.confirm('Remove this opportunity from the radar?')) {
                    void run('delete', { id: item.id }, 'Opportunity removed');
                  } }} disabled={!!busy}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </>}
    </section>
  );
}
