import { useCallback, useEffect, useMemo, useState } from 'react';
import BuyerIntentRadar from './BuyerIntentRadar';
import { supabase } from '@/integrations/supabase/client';
import { ensureOwnerToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpRight, Check, CheckCircle2, Clipboard, Compass, Database, Filter, Loader2, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';

type Profile = { industries: string[]; titles: string[]; locations: string[]; painPoints: string[]; companySize: string; offer: string };
type Stage = 'identified' | 'approved' | 'invited' | 'connected' | 'replied' | 'archived';
type Prospect = {
  id: string; name: string; title: string; company: string; industry: string; location: string;
  sourceUrl: string; linkedinUrl: string; context: string; score: number; reasons: string[];
  note: string; stage: Stage; createdAt: string; updatedAt: string; origin: 'discovery' | 'manual';
};
type Dashboard = { profile: Profile; prospects: Prospect[]; updatedAt?: string; added?: number; searched?: number; discovered?: number };
type ProfileDraft = { industries: string; titles: string; locations: string; painPoints: string; companySize: string; offer: string };
const stages: Stage[] = ['identified', 'approved', 'invited', 'connected', 'replied', 'archived'];
const names: Record<Stage, string> = { identified: 'Identified', approved: 'Approved', invited: 'Invitation sent', connected: 'Connected', replied: 'Replied', archived: 'Archived' };
const emptyDraft: ProfileDraft = { industries: '', titles: '', locations: '', painPoints: '', companySize: '', offer: '' };
const emptyPerson = { name: '', title: '', company: '', industry: '', location: '', linkedinUrl: '', sourceUrl: '', context: '' };
const readDraft = (p: Profile): ProfileDraft => ({
  industries: (p.industries || []).join(', '), titles: (p.titles || []).join(', '),
  locations: (p.locations || []).join(', '), painPoints: (p.painPoints || []).join(', '),
  companySize: p.companySize || '', offer: p.offer || '',
});
const toProfile = (d: ProfileDraft): Profile => {
  const items = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean).slice(0, 12);
  return { industries: items(d.industries), titles: items(d.titles), locations: items(d.locations),
    painPoints: items(d.painPoints), companySize: d.companySize.trim(), offer: d.offer.trim() };
};
const peopleSearchUrl = (p: Prospect) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${p.name} ${p.company}`)}`;
const validLinkedin = (u: string) => { try { return new URL(u).protocol === 'https:' && /(^|\.)linkedin\.com$/i.test(new URL(u).hostname); } catch { return false; } };

export default function OwnerIcpProspector() {
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<'intent' | 'connections'>('intent');
  const [data, setData] = useState<Dashboard | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<Stage | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [person, setPerson] = useState(emptyPerson);
  const [editableNotes, setEditableNotes] = useState<Record<string, string>>({});
  const [editableLinks, setEditableLinks] = useState<Record<string, string>>({});

  const invoke = useCallback(async (action: string, payload: Record<string, unknown> = {}): Promise<Dashboard> => {
    const token = await ensureOwnerToken();
    if (!token) throw new Error('Owner session expired. Sign out and sign in with your owner PIN.');
    const { data: result, error: callError } = await supabase.functions.invoke('owner-icp-prospector', {
      body: { action, ...payload }, headers: { 'x-owner-token': token },
    });
    if (callError) throw new Error(callError.message);
    if (result?.error) throw new Error(result.error);
    return result as Dashboard;
  }, []);

  const useServerData = useCallback((result: Dashboard, resetDraft = false) => {
    setData(result);
    if (resetDraft) setDraft(readDraft(result.profile));
    setEditableNotes({});
    setEditableLinks({});
  }, []);

  const refresh = useCallback(async () => {
    setBusy('loading'); setError('');
    try { useServerData(await invoke('get'), true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load prospecting workspace.'); }
    finally { setBusy(''); }
  }, [invoke, useServerData]);

  useEffect(() => { void refresh(); }, [refresh]);

  const action = async (name: string, payload: Record<string, unknown>, message: string, resetDraft = false) => {
    setBusy(name); setError('');
    try {
      const result = await invoke(name, payload);
      useServerData(result, resetDraft);
      toast({ title: message });
      return result;
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Request failed.';
      setError(detail);
      toast({ title: 'Prospecting action failed', description: detail, variant: 'destructive' });
    } finally { setBusy(''); }
    return null;
  };

  const saveProfile = () => action('save_profile', { profile: toProfile(draft) }, 'ICP targeting saved', true);
  const discover = async () => {
    const result = await action('discover', {}, 'Discovery search finished');
    if (result) toast({ title: `${result.added ?? 0} new prospects added`, description: `${result.searched ?? 0} source pages checked; ${result.discovered ?? 0} sourced profiles identified.` });
  };
  const update = (p: Prospect, payload: Record<string, unknown>, message: string) => action('update', { id: p.id, ...payload }, message);
  const addManual = async () => {
    const result = await action('add', { prospect: person }, 'Prospect saved');
    if (result) { setPerson(emptyPerson); setShowAdd(false); }
  };

  const copy = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: 'Invitation note copied', description: 'Open LinkedIn and send the invitation yourself.' });
    } catch { toast({ title: 'Copy failed', description: 'Select and copy the note manually.', variant: 'destructive' }); }
  };

  const prospects = useMemo(() => (data?.prospects || [])
    .filter(p => stage === 'all' || p.stage === stage)
    .filter(p => [p.name, p.title, p.company, p.industry, p.location].join(' ').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt)), [data?.prospects, search, stage]);
  const count = (s: Stage) => (data?.prospects || []).filter(x => x.stage === s).length;
  const all = data?.prospects.length || 0;
  const field = (key: keyof ProfileDraft, label: string, hint?: string) => (
    <div className="space-y-1.5" key={key}>
      <Label htmlFor={`icp-${key}`} className="text-foreground">{label}</Label>
      <Input id={`icp-${key}`} aria-label={label} value={draft[key]}
        onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={hint} className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5 text-foreground">
      <div role="tablist" aria-label="Prospecting workspace" className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Button role="tab" aria-selected={workspace === 'intent'} variant={workspace === 'intent' ? 'default' : 'outline'}
          onClick={() => setWorkspace('intent')}>Buyer Intent Radar</Button>
        <Button role="tab" aria-selected={workspace === 'connections'} variant={workspace === 'connections' ? 'default' : 'outline'}
          onClick={() => setWorkspace('connections')}>ICP Connections</Button>
      </div>
      {workspace === 'intent' ? <BuyerIntentRadar /> : (
    <section className="space-y-6 text-foreground" aria-label="Owner ICP Prospecting workspace">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-amber mb-2">
            <ShieldCheck className="w-4 h-4" /> Owner workspace
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display">ICP Connection Engine</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">Find evidenced decision-makers, rank their fit, and build a focused relationship queue. Invitations remain manual and under your control.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={!!busy} className="gap-2"><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button type="button" onClick={() => void discover()} disabled={!!busy || !data} className="gap-2">
            {busy === 'discover' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
            Discover prospects
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-sm">
        <strong className="font-semibold">LinkedIn-safe workflow:</strong> Public-source discovery and drafts can be automated. This tool never sends connection requests, scrapes protected LinkedIn pages, or impersonates you. Click through to LinkedIn to personally approve each invitation.
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-sm text-foreground">{error}</div>}
      {!data ? (
        <div className="min-h-52 flex items-center justify-center text-muted-foreground gap-3">
          {busy === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
          {busy === 'loading' ? 'Loading your private queue…' : 'Your workspace is unavailable. Use Refresh to try again.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Saved prospects', value: all, icon: Database },
              { label: 'Awaiting approval', value: count('identified'), icon: Users },
              { label: 'Invitations logged', value: count('invited'), icon: Clipboard },
              { label: 'Connections', value: count('connected') + count('replied'), icon: CheckCircle2 },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-border bg-card/80 p-4">
                <stat.icon className="w-4 h-4 text-amber mb-3" aria-hidden />
                <div className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card/80 p-5 space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2"><Filter className="w-4 h-4 text-amber" /> Your target profile</h3>
              <p className="text-xs text-muted-foreground mt-1">Separate target industries, job titles, locations and pain points with commas. Save before running discovery.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field('industries', 'Target industries', 'HVAC, Construction, Manufacturing')}
              {field('titles', 'Decision-maker titles', 'CEO, Founder, Owner, COO')}
              {field('locations', 'Locations', 'Indiana, United States')}
              {field('companySize', 'Company size preference', '10–500 employees')}
            </div>
            {field('painPoints', 'Problems you solve', 'CRM gaps, revenue leaks, poor follow-up')}
            <div className="space-y-1.5">
              <Label htmlFor="icp-offer">Your positioning for connection notes</Label>
              <Textarea id="icp-offer" value={draft.offer} onChange={e => setDraft(p => ({ ...p, offer: e.target.value }))}
                rows={2} maxLength={400} className="bg-background border-border text-foreground" />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">Scores reflect visible matches only. Company size and revenue are never inferred without evidence.</p>
              <Button onClick={() => void saveProfile()} disabled={!!busy} variant="outline" className="gap-2"><Save className="w-4 h-4" /> Save ICP</Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <h3 className="text-lg font-semibold">Relationship queue <span className="text-muted-foreground font-normal text-sm">({prospects.length})</span></h3>
              <Button type="button" variant="outline" className="gap-2" onClick={() => setShowAdd(x => !x)}>
                {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAdd ? 'Close entry' : 'Add known prospect'}
              </Button>
            </div>
            {showAdd && (
              <div className="rounded-xl border border-border bg-card/80 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Add someone you researched or met. No guessed personal details are required.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {(['name','title','company','industry','location','linkedinUrl','sourceUrl'] as const).map(k => (
                    <Input key={k} aria-label={k} placeholder={k === 'linkedinUrl' ? 'https://www.linkedin.com/in/… (optional)' : k === 'sourceUrl' ? 'Evidence URL (optional)' : k.replace(/([A-Z])/g, ' $1')}
                      value={person[k]} onChange={e => setPerson(p => ({ ...p, [k]: e.target.value }))}
                      className="bg-background border-border text-foreground" />
                  ))}
                </div>
                <Textarea aria-label="Relevant context" placeholder="Observed business context, with no assumptions…" rows={2}
                  value={person.context} onChange={e => setPerson(p => ({ ...p, context: e.target.value }))} className="bg-background border-border text-foreground" />
                <Button onClick={() => void addManual()} disabled={!!busy || !person.name.trim() || !person.title.trim() || !person.company.trim()}>Save prospect</Button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input aria-label="Search prospects" placeholder="Search name, company, title or location…" value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-background text-foreground border-border" />
              </div>
              <select aria-label="Filter prospect stage" className="h-10 rounded-md border border-border bg-background text-foreground px-3 text-sm" value={stage}
                onChange={e => setStage(e.target.value as Stage | 'all')}>
                <option value="all">All stages</option>
                {stages.map(s => <option key={s} value={s}>{names[s]}</option>)}
              </select>
            </div>
            {prospects.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center space-y-2">
                <Compass className="w-8 h-8 text-amber mx-auto" />
                <p className="font-semibold text-foreground">No prospects in this view</p>
                <p className="text-sm text-muted-foreground">Save your ICP, discover public-source decision-makers, or add someone you already know.</p>
              </div>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {prospects.map(p => {
                const note = editableNotes[p.id] ?? p.note;
                const url = editableLinks[p.id] ?? p.linkedinUrl;
                const profileUrl = validLinkedin(p.linkedinUrl) ? p.linkedinUrl : peopleSearchUrl(p);
                return (
                  <article key={p.id} className="rounded-xl border border-border bg-card/80 p-4 sm:p-5 space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs text-amber uppercase tracking-wide mb-1">{p.origin === 'discovery' ? 'Public web evidence' : 'Manually added'}</div>
                        <h4 className="font-semibold text-lg break-words">{p.name}</h4>
                        <p className="text-sm text-foreground">{p.title} · {p.company}</p>
                        <p className="text-xs text-muted-foreground">{[p.industry, p.location].filter(Boolean).join(' · ') || 'Industry/location not verified'}</p>
                      </div>
                      <div className="text-right shrink-0"><span className="text-2xl font-bold tabular-nums text-amber">{p.score}</span><p className="text-[11px] text-muted-foreground">fit / 100</p></div>
                    </div>
                    {p.reasons?.length > 0 && <div className="flex flex-wrap gap-1.5">{p.reasons.map(x =>
                      <span key={x} className="px-2 py-1 bg-secondary text-secondary-foreground border border-border rounded text-xs">{x}</span>
                    )}</div>}
                    {p.context && <p className="text-sm text-muted-foreground">{p.context}</p>}
                    {p.sourceUrl ? <a className="inline-flex gap-1 items-center text-sm text-amber hover:underline" href={p.sourceUrl} target="_blank" rel="noopener noreferrer">View supporting source <ArrowUpRight className="w-3.5 h-3.5" /></a> :
                      <p className="text-xs text-muted-foreground">No supporting source supplied — verify before sending.</p>}
                    <div className="space-y-1.5">
                      <Label htmlFor={`prospect-note-${p.id}`}>Connection note (editable, max 300 characters)</Label>
                      <Textarea id={`prospect-note-${p.id}`} rows={3} maxLength={300} value={note}
                        onChange={e => setEditableNotes(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="bg-background border-border text-foreground" />
                      <div className="flex items-center gap-2 justify-between">
                        <span className="text-xs text-muted-foreground">{note.length}/300</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={!!busy || note === p.note} onClick={() => void update(p, { note }, 'Note saved')}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                          <Button size="sm" variant="outline" onClick={() => void copy(note)}><Clipboard className="w-3.5 h-3.5 mr-1" /> Copy</Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`prospect-link-${p.id}`}>LinkedIn profile (optional, verified by you)</Label>
                      <div className="flex gap-2">
                        <Input id={`prospect-link-${p.id}`} aria-label={`LinkedIn URL for ${p.name}`} placeholder="https://www.linkedin.com/in/…"
                          value={url} onChange={e => setEditableLinks(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="bg-background border-border text-foreground min-w-0" />
                        <Button size="sm" variant="outline" disabled={!!busy || url === p.linkedinUrl || (!!url && !validLinkedin(url))}
                          onClick={() => void update(p, { linkedinUrl: url }, 'LinkedIn URL saved')}>Save</Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-md border border-amber/50 text-sm font-semibold text-foreground hover:bg-amber/10">
                        {validLinkedin(p.linkedinUrl) ? 'Open LinkedIn' : 'Find on LinkedIn'} <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      <select aria-label={`Stage for ${p.name}`} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                        value={p.stage} disabled={!!busy} onChange={e => void update(p, { stage: e.target.value }, 'Status updated')}>
                        {stages.map(s => <option key={s} value={s}>{names[s]}</option>)}
                      </select>
                      {p.stage === 'identified' && <Button size="sm" onClick={() => void update(p, { stage: 'approved' }, 'Prospect approved')} disabled={!!busy} className="gap-1"><Check className="w-4 h-4" /> Approve</Button>}
                      {p.stage === 'approved' && <Button size="sm" variant="outline" onClick={() => void update(p, { stage: 'invited' }, 'Invitation logged — not sent by this app')} disabled={!!busy}>Mark sent manually</Button>}
                      <Button size="sm" variant="ghost" aria-label={`Delete ${p.name}`} disabled={!!busy}
                        onClick={() => { if (window.confirm(`Remove ${p.name} from your prospect queue?`)) void action('delete', { id: p.id }, 'Prospect removed'); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
      )}
    </div>
  );
}
