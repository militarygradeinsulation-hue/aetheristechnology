import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { DetectiveMode } from '@/components/portal/DetectiveMode';
import {
  Loader2, RefreshCw, Search, Trash2, Send, ScanLine, ExternalLink,
  Sparkles, AlertTriangle, MessageSquare, UserPlus, X, Shuffle, Zap,
} from 'lucide-react';

interface Lead {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  score: number | null;
  why_fit: string | null;
  status: string;
  source: string;
  claimed_by_code: string | null;
  assigned_to_code: string | null;
  assignment_expires_at: string | null;
  enrichment: any;
  enriched_at: string | null;
  created_at: string;
}

interface Rep { code: string; rep_name: string | null; is_active: boolean; role: string | null; }

const STATUS_FILTERS = [
  { value: 'pool', label: 'Unassigned pool' },
  { value: 'assigned', label: 'Dripped (held for rep)' },
  { value: 'claimed', label: 'Claimed / working' },
  { value: 'all', label: 'All leads' },
];

export const AdminLeadBrowser: React.FC = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pool' | 'assigned' | 'claimed' | 'all'>('pool');
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Record<string, 'scan' | 'assign' | 'delete' | null>>({});
  const [bulkRep, setBulkRep] = useState('');
  const [holdHours, setHoldHours] = useState(72);
  const [detail, setDetail] = useState<Lead | null>(null);
  // Auto-assign panel
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoCodes, setAutoCodes] = useState<Set<string>>(new Set());
  const [autoPerRep, setAutoPerRep] = useState(10);
  const [autoIndustry, setAutoIndustry] = useState('');
  const [autoMinScore, setAutoMinScore] = useState<number | ''>('');
  const [autoBusy, setAutoBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState<string | null>(null);
  const [dripCounts, setDripCounts] = useState<Record<string, number>>({});
  const [claimedCounts, setClaimedCounts] = useState<Record<string, number>>({});
  const [totalCounts, setTotalCounts] = useState<Record<string, number>>({});
  const [confirmPush, setConfirmPush] = useState<null | { codes: string[]; perRep: number }>(null);
  const [resultDialog, setResultDialog] = useState<null | { title: string; assigned: number; perRep: Record<string, number>; message?: string }>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired, log in again at /admin/login');
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: {
          action: 'leads_browser',
          filter,
          search,
          minScore: typeof minScore === 'number' ? minScore : null,
        },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setLeads((data?.leads || []) as Lead[]);
      setReps(((data?.reps || []) as Rep[]).filter(r => r.is_active));
      setDripCounts((data?.dripCounts || {}) as Record<string, number>);
      setClaimedCounts((data?.claimedCounts || {}) as Record<string, number>);
      setTotalCounts((data?.totalCounts || {}) as Record<string, number>);
      setSelected(new Set());
    } catch (e) {
      toast({ title: 'Failed to load leads', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filter, search, minScore, toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => setSelected(prev => prev.size === leads.length ? new Set() : new Set(leads.map(l => l.id)));

  const callAdmin = async (path: string, body: Record<string, unknown>) => {
    const token = getAdminToken();
    if (!token) throw new Error('Admin session expired, log in again at /admin/login');
    const { data, error } = await supabase.functions.invoke(path, { body, headers: { 'x-admin-token': token } });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const scan = async (ids: string[]) => {
    if (ids.length === 0) return;
    ids.forEach(id => setBusy(b => ({ ...b, [id]: 'scan' })));
    try {
      const res = await callAdmin('admin-enrich-lead', { ids });
      const okCount = (res.results || []).filter((r: any) => r.ok).length;
      toast({ title: `Scanned ${okCount}/${ids.length} leads` });
      load();
    } catch (e) {
      toast({ title: 'Scan failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      ids.forEach(id => setBusy(b => ({ ...b, [id]: null })));
    }
  };

  const assign = async (ids: string[], code: string) => {
    if (!code) return toast({ title: 'Pick a rep first', variant: 'destructive' });
    if (ids.length === 0) return;
    ids.forEach(id => setBusy(b => ({ ...b, [id]: 'assign' })));
    try {
      await callAdmin('admin-assign-lead', { action: 'assign', ids, code, hold_hours: holdHours });
      const rep = reps.find(r => r.code === code);
      toast({ title: `Assigned ${ids.length} lead${ids.length > 1 ? 's' : ''} → ${rep?.rep_name || code}` });
      load();
    } catch (e) {
      toast({ title: 'Assign failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      ids.forEach(id => setBusy(b => ({ ...b, [id]: null })));
    }
  };

  const unassign = async (ids: string[]) => {
    try {
      await callAdmin('admin-assign-lead', { action: 'unassign', ids });
      toast({ title: `Recalled ${ids.length} from drip` }); load();
    } catch (e) { toast({ title: 'Failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }); }
  };

  const release = async (ids: string[]) => {
    try {
      await callAdmin('admin-assign-lead', { action: 'release', ids });
      toast({ title: `Released ${ids.length} back to pool` }); load();
    } catch (e) { toast({ title: 'Failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }); }
  };

  const remove = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} lead${ids.length > 1 ? 's' : ''}?`)) return;
    try {
      await callAdmin('admin-assign-lead', { action: 'delete', ids });
      toast({ title: `Deleted ${ids.length}` }); load();
    } catch (e) { toast({ title: 'Failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }); }
  };

  const refreshRep = async (code: string, count = 10) => {
    setRefreshBusy(code);
    try {
      const res = await callAdmin('admin-assign-lead', {
        action: 'refresh_rep', code, count, hold_hours: holdHours,
        industry: autoIndustry || undefined,
        min_score: typeof autoMinScore === 'number' ? autoMinScore : undefined,
      });
      const rep = reps.find(r => r.code === code);
      toast({ title: `${rep?.rep_name || code}: +${res.assigned} new (now ${res.current}/${count})`, description: res.message || undefined });
      load();
    } catch (e) {
      toast({ title: 'Refresh failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setRefreshBusy(null); }
  };

  const autoAssign = async (codesArg?: string[], perRepArg?: number) => {
    const codes = codesArg ?? Array.from(autoCodes);
    const perRep = perRepArg ?? autoPerRep;
    if (codes.length === 0) return toast({ title: 'Pick at least one rep', variant: 'destructive' });
    setAutoBusy(true);
    try {
      const res = await callAdmin('admin-assign-lead', {
        action: 'auto_assign', codes, per_rep: perRep, hold_hours: holdHours,
        industry: autoIndustry || undefined,
        min_score: typeof autoMinScore === 'number' ? autoMinScore : undefined,
        respect_current: true,
      });
      setResultDialog({
        title: res.assigned > 0 ? `✓ Assigned ${res.assigned} leads` : 'No new leads assigned',
        assigned: res.assigned || 0,
        perRep: (res.per_rep || {}) as Record<string, number>,
        message: res.message,
      });
      load();
    } catch (e) {
      toast({ title: 'Auto-assign failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setAutoBusy(false); }
  };

  const requestPush = (codes: string[], perRep: number) => {
    if (codes.length === 0) return toast({ title: 'Pick at least one rep', variant: 'destructive' });
    setConfirmPush({ codes, perRep });
  };

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const repName = (code: string | null) => code ? (reps.find(r => r.code === code)?.rep_name || code) : ', ';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber" /> Lead Browser & Assigner
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Scan leads with AI to surface weak points, talking points, and a refined fit score. Then push them to a specific rep.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs">View</Label>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_FILTERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Business, website, industry" className="pl-8" />
            </div>
          </div>
          <div className="w-24">
            <Label className="text-xs">Min score</Label>
            <Input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        {/* Auto-assign panel */}
        <div className="rounded-lg border border-border/50 bg-secondary/20">
          <button
            type="button"
            onClick={() => setAutoOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-mono uppercase tracking-wider text-amber hover:bg-amber/5"
          >
            <span className="flex items-center gap-2"><Shuffle className="w-4 h-4" /> Auto-assign & per-rep refresh</span>
            <span className="text-xs text-muted-foreground">{autoOpen ? 'Hide' : 'Show'}</span>
          </button>
          {autoOpen && (
            <div className="p-3 space-y-3 border-t border-border/40">
              {/* Quick count control */}
              <div className="rounded-md border border-amber/30 bg-amber/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="text-[11px] font-mono uppercase tracking-wider text-amber">Leads per rep</Label>
                  <div className="flex items-center gap-1">
                    {[5, 10, 25, 50, 100].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAutoPerRep(n)}
                        className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                          autoPerRep === n ? 'border-amber bg-amber text-background' : 'border-border/50 hover:border-amber/60'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={Math.min(autoPerRep, 100)}
                    onChange={e => setAutoPerRep(Number(e.target.value))}
                    className="flex-1 accent-amber"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={autoPerRep}
                    onChange={e => setAutoPerRep(Number(e.target.value) || 1)}
                    className="h-8 w-20"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="bg-amber text-background hover:bg-amber/90"
                    disabled={autoBusy || reps.length === 0}
                    onClick={() => requestPush(reps.map(r => r.code), autoPerRep)}
                  >
                    {autoBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                    Push {autoPerRep} to ALL {reps.length} reps
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Tops each rep up to {autoPerRep}. Already-met reps skipped.
                  </span>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Hold hrs</Label>
                  <Input type="number" min={1} max={720} value={holdHours} onChange={e => setHoldHours(Number(e.target.value) || 72)} className="h-8" />
                </div>
                <div>
                  <Label className="text-[10px]">Industry filter</Label>
                  <Input value={autoIndustry} onChange={e => setAutoIndustry(e.target.value)} placeholder="e.g. roofing" className="h-8" />
                </div>
                <div>
                  <Label className="text-[10px]">Min score</Label>
                  <Input type="number" min={0} max={100} value={autoMinScore} onChange={e => setAutoMinScore(e.target.value === '' ? '' : Number(e.target.value))} className="h-8" />
                </div>
              </div>
              <div>
                <Label className="text-[10px] block mb-1">Reps in rotation (top-up to target each)</Label>
                <div className="flex flex-wrap gap-2">
                  {reps.map(r => {
                    const active = autoCodes.has(r.code);
                    const drip = dripCounts[r.code] || 0;
                    const claimed = claimedCounts[r.code] || 0;
                    const total = totalCounts[r.code] || (drip + claimed);
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => setAutoCodes(prev => { const n = new Set(prev); n.has(r.code) ? n.delete(r.code) : n.add(r.code); return n; })}
                        className={`px-2.5 py-1.5 rounded border text-xs flex items-center gap-2 transition-colors ${
                          active ? 'border-amber bg-amber/15 text-amber' : 'border-border/50 text-muted-foreground hover:border-amber/40'
                        }`}
                        title={`Drip ${drip} • Claimed ${claimed} • Total ${total}`}
                      >
                        <span className="font-semibold">{r.rep_name || r.code}</span>
                        <span className="font-mono text-[10px] opacity-80">
                          <span className="text-amber">{drip}</span>/<span>{claimed}</span>
                          <span className="opacity-60"> · {total} total</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); refreshRep(r.code, autoPerRep); }}
                          disabled={refreshBusy === r.code}
                          className="p-0.5 rounded hover:bg-amber/20"
                          title="Refresh just this rep"
                        >
                          {refreshBusy === r.code
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RefreshCw className="w-3 h-3" />}
                        </button>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-amber text-background hover:bg-amber/90" onClick={() => requestPush(Array.from(autoCodes), autoPerRep)} disabled={autoBusy || autoCodes.size === 0}>
                  {autoBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                  Auto-assign to {autoCodes.size || 0} rep{autoCodes.size === 1 ? '' : 's'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAutoCodes(new Set(reps.map(r => r.code)))}>Select all</Button>
                <Button size="sm" variant="ghost" onClick={() => setAutoCodes(new Set())}>Clear</Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Round-robin distributes highest-score pool leads. Reps already at target are skipped.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-amber/10 border border-amber/30">
            <div className="text-sm font-mono text-amber mr-2">{selectedIds.length} selected</div>
            <Button size="sm" variant="outline" onClick={() => scan(selectedIds)}>
              <ScanLine className="w-3 h-3 mr-1" /> Scan all
            </Button>
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-[10px]">Assign to rep</Label>
                <Select value={bulkRep} onValueChange={setBulkRep}>
                  <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Pick rep" /></SelectTrigger>
                  <SelectContent>
                    {reps.map(r => <SelectItem key={r.code} value={r.code}>{r.rep_name || r.code} {r.role === 'partner' ? '(P)' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-20">
                <Label className="text-[10px]">Hold hrs</Label>
                <Input type="number" min={1} max={720} value={holdHours} onChange={e => setHoldHours(Number(e.target.value) || 72)} className="h-8" />
              </div>
              <Button size="sm" className="bg-amber text-background hover:bg-amber/90" onClick={() => assign(selectedIds, bulkRep)}>
                <Send className="w-3 h-3 mr-1" /> Assign
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={() => unassign(selectedIds)}>Unassign</Button>
            <Button size="sm" variant="outline" onClick={() => release(selectedIds)}>Release</Button>
            <Button size="sm" variant="outline" className="text-red-400" onClick={() => remove(selectedIds)}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="w-3 h-3" /></Button>
          </div>
        )}

        {/* Table */}
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[28px_1fr_60px_120px_140px_180px] gap-2 px-3 py-2 bg-secondary/40 text-[10px] font-mono uppercase text-muted-foreground">
            <Checkbox checked={selected.size === leads.length && leads.length > 0} onCheckedChange={toggleAll} />
            <span>Lead</span>
            <span>Score</span>
            <span>Status</span>
            <span>Assigned</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border/30">
            {leads.length === 0 && !loading && (
              <div className="p-8 text-center text-sm text-muted-foreground">No leads match.</div>
            )}
            {leads.map(l => (
              <div key={l.id} className="grid grid-cols-[28px_1fr_60px_120px_140px_180px] gap-2 px-3 py-2 items-center text-sm hover:bg-secondary/20">
                <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
                <button onClick={() => setDetail(l)} className="text-left min-w-0">
                  <div className="font-semibold text-foreground truncate flex items-center gap-1">
                    {l.business_name || ', '}
                    {l.enriched_at && <Sparkles className="w-3 h-3 text-amber shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[l.industry, l.location].filter(Boolean).join(' · ') || l.website || l.email || ', '}
                  </div>
                </button>
                <span className={`font-mono text-sm ${(l.score ?? 0) >= 70 ? 'text-green-400' : (l.score ?? 0) >= 40 ? 'text-amber' : 'text-muted-foreground'}`}>
                  {l.score ?? ', '}
                </span>
                <span>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase">{l.status}</Badge>
                </span>
                <span className="text-xs truncate">
                  {l.claimed_by_code ? <span className="text-blue-400">✓ {repName(l.claimed_by_code)}</span>
                    : l.assigned_to_code ? <span className="text-amber">→ {repName(l.assigned_to_code)}</span>
                    : <span className="text-muted-foreground">pool</span>}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => scan([l.id])} disabled={busy[l.id] === 'scan'} title="Scan with AI">
                    {busy[l.id] === 'scan' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
                  </Button>
                  <Select value="" onValueChange={(v) => assign([l.id], v)}>
                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue placeholder="→ rep" /></SelectTrigger>
                    <SelectContent>
                      {reps.map(r => <SelectItem key={r.code} value={r.code}>{r.rep_name || r.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => remove([l.id])} title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  {detail.business_name || 'Untitled lead'}
                  {detail.score != null && <Badge className="bg-amber text-background">{detail.score}</Badge>}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono">
                  {[detail.industry, detail.location].filter(Boolean).join(' · ')}
                  {detail.website && <> · <a href={detail.website.startsWith('http') ? detail.website : `https://${detail.website}`} target="_blank" rel="noreferrer" className="text-amber inline-flex items-center gap-0.5">visit <ExternalLink className="w-3 h-3" /></a></>}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {detail.contact_name && <div><span className="text-muted-foreground">Contact:</span> {detail.contact_name}</div>}
                  {detail.email && <div><span className="text-muted-foreground">Email:</span> {detail.email}</div>}
                  {detail.phone && <div><span className="text-muted-foreground">Phone:</span> {detail.phone}</div>}
                  <div><span className="text-muted-foreground">Source:</span> {detail.source}</div>
                </div>

                {!detail.enrichment ? (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                    <p className="text-muted-foreground mb-2">No AI scan yet.</p>
                    <Button size="sm" className="bg-amber text-background hover:bg-amber/90" onClick={() => { scan([detail.id]); setDetail(null); }}>
                      <ScanLine className="w-3 h-3 mr-1" /> Run AI scan
                    </Button>
                  </div>
                ) : (
                  <>
                    {detail.enrichment.score_reason && (
                      <div className="p-3 rounded-lg bg-amber/10 border border-amber/30 text-xs">
                        <div className="font-mono uppercase text-[10px] text-amber mb-1">Score reason</div>
                        {detail.enrichment.score_reason}
                      </div>
                    )}
                    {Array.isArray(detail.enrichment.weak_points) && detail.enrichment.weak_points.length > 0 && (
                      <div>
                        <div className="font-display flex items-center gap-1 mb-1"><AlertTriangle className="w-4 h-4 text-red-400" /> Weak points</div>
                        <ul className="text-xs space-y-1 list-disc pl-5">
                          {detail.enrichment.weak_points.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(detail.enrichment.talking_points) && detail.enrichment.talking_points.length > 0 && (
                      <div>
                        <div className="font-display flex items-center gap-1 mb-1"><MessageSquare className="w-4 h-4 text-amber" /> Talking points</div>
                        <ul className="text-xs space-y-1 list-disc pl-5">
                          {detail.enrichment.talking_points.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                    {detail.enrichment.icebreaker && (
                      <div className="p-3 rounded-lg bg-secondary/40 border border-border/50 text-xs italic">
                        "{detail.enrichment.icebreaker}"
                      </div>
                    )}
                    {Array.isArray(detail.enrichment.decision_makers) && detail.enrichment.decision_makers.length > 0 && (
                      <div className="text-xs">
                        <div className="font-display mb-1">Likely decision makers</div>
                        {detail.enrichment.decision_makers.map((d: any, i: number) => (
                          <div key={i}>· <strong>{d.role}</strong>, {d.why}</div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 text-[10px] font-mono uppercase text-muted-foreground pt-2 border-t border-border/30">
                      {detail.enrichment.estimated_revenue_band && <span>Rev: {detail.enrichment.estimated_revenue_band}</span>}
                      {detail.enrichment.confidence && <span>Confidence: {detail.enrichment.confidence}</span>}
                      {detail.enriched_at && <span>Scanned: {new Date(detail.enriched_at).toLocaleString()}</span>}
                    </div>
                  </>
                )}
                {/* Detective Mode — picks best angle, shows deduction, writes the message */}
                <div className="pt-3 border-t border-border/30">
                  <DetectiveMode
                    auth="admin"
                    lead={detail as any}
                    scan={detail.enrichment?.scan || null}
                    rr={detail.enrichment?.rocketreach || null}
                    fc={detail.enrichment?.firecrawl || null}
                    enrichment={detail.enrichment}
                  />
                </div>


                {/* Assign */}
                <div className="pt-3 border-t border-border/30 flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[160px]">
                    <Label className="text-xs">Assign to rep</Label>
                    <Select value={bulkRep} onValueChange={setBulkRep}>
                      <SelectTrigger><SelectValue placeholder="Pick rep" /></SelectTrigger>
                      <SelectContent>
                        {reps.map(r => <SelectItem key={r.code} value={r.code}>{r.rep_name || r.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="bg-amber text-background hover:bg-amber/90" onClick={() => { assign([detail.id], bulkRep); setDetail(null); }}>
                    <UserPlus className="w-4 h-4 mr-1" /> Send to rep
                  </Button>
                  <Button variant="outline" onClick={() => { scan([detail.id]); }}>
                    <ScanLine className="w-4 h-4 mr-1" /> Re-scan
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm push dialog */}
      <Dialog open={!!confirmPush} onOpenChange={(o) => !o && setConfirmPush(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber" /> Confirm push
            </DialogTitle>
            <DialogDescription>
              Top up <span className="text-amber font-mono">{confirmPush?.codes.length}</span> rep{confirmPush?.codes.length === 1 ? '' : 's'} to <span className="text-amber font-mono">{confirmPush?.perRep}</span> active drip leads each. Reps already at target are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-auto rounded border border-border/40 p-2 space-y-1">
            {(confirmPush?.codes || []).map(code => {
              const r = reps.find(x => x.code === code);
              const drip = dripCounts[code] || 0;
              const claimed = claimedCounts[code] || 0;
              const total = totalCounts[code] || 0;
              const need = Math.max(0, (confirmPush?.perRep || 0) - drip);
              return (
                <div key={code} className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{r?.rep_name || code}</span>
                  <span className="font-mono text-muted-foreground">
                    drip {drip} · claimed {claimed} · total {total}
                    {need > 0 && <span className="text-amber"> → +{need}</span>}
                    {need === 0 && <span className="text-green-400"> ✓ full</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmPush(null)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-amber text-background hover:bg-amber/90"
              disabled={autoBusy}
              onClick={async () => {
                const c = confirmPush;
                setConfirmPush(null);
                if (c) await autoAssign(c.codes, c.perRep);
              }}
            >
              {autoBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
              Push now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={!!resultDialog} onOpenChange={(o) => !o && setResultDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{resultDialog?.title}</DialogTitle>
            {resultDialog?.message && <DialogDescription>{resultDialog.message}</DialogDescription>}
          </DialogHeader>
          <div className="max-h-72 overflow-auto rounded border border-border/40 p-2 space-y-1">
            {Object.entries(resultDialog?.perRep || {}).map(([code, n]) => {
              const r = reps.find(x => x.code === code);
              const total = totalCounts[code] || 0;
              return (
                <div key={code} className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{r?.rep_name || code}</span>
                  <span className="font-mono">
                    <span className={n > 0 ? 'text-amber' : 'text-muted-foreground'}>+{n} new</span>
                    <span className="text-muted-foreground"> · {total} total</span>
                  </span>
                </div>
              );
            })}
            {Object.keys(resultDialog?.perRep || {}).length === 0 && (
              <div className="text-xs text-muted-foreground">No per-rep breakdown returned.</div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setResultDialog(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
