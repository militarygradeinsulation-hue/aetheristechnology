import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import {
  Loader2, Inbox, ListChecks, Upload as UploadIcon, Download, ExternalLink,
  RotateCcw, Sparkles, Search, FileText, Phone, Mail, Zap, X, Crosshair, Trash2,
} from 'lucide-react';
import {
  portalLeads, leadsToCsv, downloadCsv, parseCsv,
  STATUS_LABEL, STATUS_COLOR, type RepLead, type LeadStatus,
} from '@/lib/portalLeads';
import { upsertRepNote } from '@/lib/portalWorkspace';
import { LeadGamePlan } from './LeadGamePlan';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { openRepMail } from '@/lib/repMail';
import { createCalendarEvent } from '@/lib/portalCalendar';

function nextBusinessMorningISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  // skip Sat (6) → Mon, Sun (0) → Mon
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

const mailHandler = (email: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  openRepMail(email);
};

type SubTab = 'drip' | 'pool' | 'hunt' | 'mine' | 'upload';

const STATUSES: LeadStatus[] = ['new','outreach','touched','replied','meeting','won','lost','dead'];

const INDUSTRY_PRESETS = [
  'Roofing', 'HVAC', 'Dental', 'Med Spa', 'Law Firms', 'Accounting',
  'Real Estate Brokerages', 'Auto Dealers', 'Home Services', 'Manufacturing',
  'SaaS', 'Marketing Agencies',
];

const SAMPLE_CSV = `business_name,contact_name,email,phone,website,industry,location,notes
Acme Roofing,Jane Smith,jane@acme.com,317-555-0100,https://acme.com,Roofing,Indianapolis IN,Met at chamber event
Bright Dental,,info@brightdental.com,,https://brightdental.com,Dental,Carmel IN,Referral from John`;

export const LeadsBoard: React.FC = () => {
  const { toast } = useToast();
  const [sub, setSub] = useState<SubTab>('drip');
  const [drip, setDrip] = useState<RepLead[]>([]);
  const [pool, setPool] = useState<RepLead[]>([]);
  const [mine, setMine] = useState<RepLead[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [maxActive, setMaxActive] = useState(25);
  const [dripCount, setDripCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ industry: '', location: '', minScore: '' });
  const [preview, setPreview] = useState<RepLead | null>(null);
  const [bulkScanning, setBulkScanning] = useState(false);

  const refreshDrip = useCallback(async () => {
    setLoading(true);
    try {
      const { leads, activeClaimed, maxActive, dripCount } = await portalLeads.list('drip');
      setDrip(leads);
      setActiveCount(activeClaimed);
      setMaxActive(maxActive);
      setDripCount(dripCount);
    } catch (e) {
      toast({ title: "Couldn't load today's drop", description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  const refreshPool = useCallback(async () => {
    setLoading(true);
    try {
      const { leads, activeClaimed, maxActive, dripCount } = await portalLeads.list('pool', {
        industry: filters.industry || undefined,
        location: filters.location || undefined,
        minScore: filters.minScore ? Number(filters.minScore) : undefined,
      });
      setPool(leads);
      setActiveCount(activeClaimed);
      setMaxActive(maxActive);
      setDripCount(dripCount);
    } catch (e) {
      toast({ title: 'Failed to load pool', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [filters, toast]);

  const refreshMine = useCallback(async () => {
    setLoading(true);
    try {
      const { leads, activeClaimed, maxActive, dripCount } = await portalLeads.list('mine');
      setMine(leads);
      setActiveCount(activeClaimed);
      setMaxActive(maxActive);
      setDripCount(dripCount);
    } catch (e) {
      toast({ title: 'Failed to load your leads', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (sub === 'drip') refreshDrip();
    else if (sub === 'pool') refreshPool();
    else if (sub === 'mine') refreshMine();
  }, [sub, refreshDrip, refreshPool, refreshMine]);

  const handleClaim = async (lead: RepLead, source: 'drip' | 'pool') => {
    try {
      await portalLeads.claim(lead.id);
      toast({ title: `Claimed: ${lead.business_name || lead.email}` });
      if (source === 'drip') refreshDrip(); else refreshPool();
    } catch (e) {
      toast({ title: 'Claim failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const handleSkipDrip = async (lead: RepLead) => {
    try {
      await portalLeads.skipDrip(lead.id);
      toast({ title: 'Skipped — back to pool' });
      refreshDrip();
    } catch (e) {
      toast({ title: 'Skip failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const grouped = useMemo(() => {
    const g: Record<LeadStatus, RepLead[]> = { new:[],outreach:[],touched:[],replied:[],meeting:[],won:[],lost:[],dead:[] };
    mine.forEach(l => g[l.status].push(l));
    return g;
  }, [mine]);

  const bulkDeepScan = useCallback(async () => {
    // Pick up to 10 unscanned leads (no rocketreach yet) that have a website or email
    const candidates = mine
      .filter(l => !l.enrichment?.rocketreach && (l.website || l.email))
      .slice(0, 10);
    if (candidates.length === 0) {
      toast({ title: 'Nothing to scan', description: 'All your leads are already deep-scanned (or missing website/email).' });
      return;
    }
    setBulkScanning(true);
    toast({ title: `Deep-scanning ${candidates.length} leads in parallel…` });
    try {
      const results = await Promise.allSettled(
        candidates.map(l => portalLeads.rocketReach(l.id, {}))
      );
      const ok = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      // Schedule follow-ups for the freshly scanned leads (best-effort, parallel)
      await Promise.allSettled(
        candidates.map(async (l, i) => {
          const r = results[i];
          if (r.status !== 'fulfilled') return;
          const data: any = r.value;
          if (data?.cached || data?.note) return;
          const businessName = l.business_name || l.email || 'Lead';
          await createCalendarEvent({
            kind: 'follow_up',
            title: `Follow up: ${businessName}`,
            body: `Lead: ${businessName}\nDeep scan complete — review insights and reach out.`,
            start_at: nextBusinessMorningISO(),
            all_day: false,
            lead_id: l.id,
          });
        })
      );
      toast({
        title: `Bulk deep scan finished`,
        description: `${ok} succeeded${failed ? `, ${failed} failed` : ''}. Follow-ups added to your calendar.`,
        variant: failed && !ok ? 'destructive' : 'default',
      });
      refreshMine();
    } catch (e) {
      toast({ title: 'Bulk scan failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setBulkScanning(false);
    }
  }, [mine, refreshMine, toast]);


  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border/50">
        {([
          { id: 'drip', label: `Today's Drop${dripCount ? ` (${dripCount})` : ''}`, icon: Zap },
          { id: 'pool', label: 'Lead Pool', icon: Inbox },
          { id: 'hunt', label: 'Hunt', icon: Crosshair },
          { id: 'mine', label: `My Leads (${activeCount}/${maxActive})`, icon: ListChecks },
          { id: 'upload', label: 'Upload / Download', icon: UploadIcon },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
              sub === t.id ? 'border-amber text-amber' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* DRIP — Today's Drop */}
      {sub === 'drip' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber" /> Today's Drop
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Fresh leads assigned to you. Accept what you'll work, skip the rest. They expire in 24h if you don't decide.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && drip.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : drip.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">
                No new leads in your drop right now. Check back tomorrow morning, or browse the Lead Pool.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {drip.map(l => (
                  <div
                    key={l.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreview(l)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPreview(l); }}
                    className="rounded-lg border border-amber/30 bg-amber/5 p-3 cursor-pointer hover:bg-amber/10 hover:border-amber/50 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{l.business_name || l.email || '—'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[l.industry, l.location].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      {typeof l.score === 'number' && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber/20 text-amber border border-amber/40 flex-shrink-0">
                          {l.score}
                        </span>
                      )}
                    </div>
                    {l.why_fit && <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">{l.why_fit}</p>}
                    <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                      {l.email && <p className="truncate"><Mail className="w-3 h-3 inline mr-1" />{l.email}</p>}
                      {l.phone && <p className="truncate"><Phone className="w-3 h-3 inline mr-1" />{l.phone}</p>}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => handleSkipDrip(l)} className="text-muted-foreground">
                        <X className="w-3 h-3 mr-1" /> Skip
                      </Button>
                      <Button size="sm" className="bg-amber text-background hover:bg-amber/90" onClick={() => handleClaim(l, 'drip')}>
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* POOL */}
      {sub === 'pool' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber" /> Admin-Pushed Leads
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Vetted prospects scraped by the company. Claim one and it's yours to work — others can't see it once claimed.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Industry filter" value={filters.industry}
                  onChange={e => setFilters(f => ({ ...f, industry: e.target.value }))} />
              </div>
              <Input className="flex-1 min-w-[140px]" placeholder="Location"
                value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} />
              <Input className="w-32" type="number" placeholder="Min score"
                value={filters.minScore} onChange={e => setFilters(f => ({ ...f, minScore: e.target.value }))} />
              <Button variant="outline" onClick={refreshPool} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </Button>
            </div>

            {loading && pool.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : pool.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">
                No leads in the pool yet. The admin can push new prospects from the Lead Scraper.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {pool.map(l => (
                  <div key={l.id} className="rounded-lg border border-border/50 bg-card/40 p-3 hover:border-amber/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{l.business_name || l.email || '—'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[l.industry, l.location].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      {typeof l.score === 'number' && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber/15 text-amber border border-amber/30 flex-shrink-0">
                          {l.score}
                        </span>
                      )}
                    </div>
                    {l.why_fit && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{l.why_fit}</p>}
                    {l.website && (
                      <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-amber/80 hover:text-amber inline-flex items-center gap-1 mt-2 truncate max-w-full">
                        {l.website} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{l.source.replace('_',' ')}</span>
                      <Button size="sm" className="bg-amber text-background hover:bg-amber/90" onClick={() => handleClaim(l, 'pool')}>
                        Claim
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MINE */}
      {sub === 'mine' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="font-display flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-amber" /> My Active Leads
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Move them through the pipeline. Click "Log touch" each time you contact them. {activeCount}/{maxActive} active slots used.
                </p>
              </div>
              <Button
                size="sm"
                onClick={bulkDeepScan}
                disabled={bulkScanning || mine.length === 0}
                className="bg-amber text-background hover:bg-amber/90"
              >
                {bulkScanning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Deep Scan Next 10
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && mine.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : mine.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">
                No claimed leads yet. Pull some from the Lead Pool or upload your own.
              </p>
            ) : (
              STATUSES.map(s => grouped[s].length > 0 && (
                <div key={s}>
                  <p className={`inline-block text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLOR[s]} mb-2`}>
                    {STATUS_LABEL[s]} · {grouped[s].length}
                  </p>
                  <div className="space-y-2">
                    {grouped[s].map(l => <LeadRow key={l.id} lead={l} onChanged={refreshMine} />)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* HUNT — AI scraper */}
      {sub === 'hunt' && (
        <HuntPanel onScraped={(toMine) => {
          if (toMine) { setSub('drip'); refreshDrip(); }
          else { setSub('pool'); refreshPool(); }
        }} />
      )}

      {/* UPLOAD/DOWNLOAD */}
      {sub === 'upload' && <UploadDownloadPanel onUploaded={() => { setSub('mine'); refreshMine(); }} />}

      {/* LEAD PREVIEW DIALOG */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  {preview.business_name || preview.email || 'Lead'}
                  {typeof preview.score === 'number' && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber/20 text-amber border border-amber/40">
                      Score {preview.score}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {[preview.industry, preview.location].filter(Boolean).join(' · ') || '—'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {preview.contact_name && (
                  <p><span className="text-muted-foreground">Contact:</span> <span className="text-foreground">{preview.contact_name}</span></p>
                )}
                {preview.email && (
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-amber" />
                    <a href={`mailto:${preview.email}`} onClick={mailHandler(preview.email!)} className="text-amber hover:underline break-all">{preview.email}</a>
                  </p>
                )}
                {preview.phone && (
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-amber" />
                    <a href={`tel:${preview.phone}`} className="text-amber hover:underline">{preview.phone}</a>
                  </p>
                )}
                {preview.website && (
                  <p className="flex items-center gap-2"><ExternalLink className="w-4 h-4 text-amber" />
                    <a href={preview.website.startsWith('http') ? preview.website : `https://${preview.website}`}
                       target="_blank" rel="noopener noreferrer"
                       className="text-amber hover:underline break-all">{preview.website}</a>
                  </p>
                )}
                {preview.why_fit && (
                  <div className="border-l-2 border-amber/40 pl-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Why this fits</p>
                    <p className="text-foreground italic">{preview.why_fit}</p>
                  </div>
                )}
                {preview.notes && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                    <p className="text-foreground whitespace-pre-wrap">{preview.notes}</p>
                  </div>
                )}
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Source: {preview.source.replace('_', ' ')}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                <Button variant="ghost" onClick={() => { handleSkipDrip(preview); setPreview(null); }}>
                  <X className="w-4 h-4 mr-1" /> Skip
                </Button>
                <Button className="bg-amber text-background hover:bg-amber/90"
                        onClick={() => { handleClaim(preview, 'drip'); setPreview(null); }}>
                  Accept lead
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================
const HuntPanel: React.FC<{ onScraped: (toMine: boolean) => void }> = ({ onScraped }) => {
  const { toast } = useToast();
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('Indianapolis, Indiana');
  const [count, setCount] = useState(10);
  const [assignToMe, setAssignToMe] = useState(true);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const token = getPortalToken();
      if (!token) throw new Error('Portal session expired — sign in again.');
      const { data, error } = await supabase.functions.invoke('portal-scrape-leads', {
        body: { industry, location, count, assign_to_me: assignToMe },
        headers: { 'x-portal-token': token },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const inserted = (data as any)?.inserted || 0;
      toast({
        title: inserted > 0 ? `Scraped ${inserted} new leads` : 'No new leads found',
        description: inserted > 0
          ? (assignToMe ? "Dropped into your Today's Drop." : 'Pushed to the shared pool.')
          : 'Try a different industry, broader location, or run again.',
      });
      if (inserted > 0) onScraped(assignToMe);
    } catch (e) {
      toast({ title: 'Scrape failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setRunning(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-amber" /> Hunt Mode — AI Web Scraper
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI scrapes the web for ICP-fit prospects in your chosen industry and location, scores them, and drops them into your queue.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Quick industries</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {INDUSTRY_PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setIndustry(p)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  industry === p
                    ? 'bg-amber text-background border-amber'
                    : 'border-border/50 text-muted-foreground hover:border-amber/40 hover:text-amber'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Industry (optional)</Label>
            <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. dental, roofing, SaaS" />
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Count (3–25)</Label>
            <Input type="number" min={3} max={25} value={count}
              onChange={e => setCount(Math.min(25, Math.max(3, Number(e.target.value) || 10)))} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAssignToMe(true)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              assignToMe ? 'bg-amber/15 border-amber/40 text-amber' : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Drop into my queue
          </button>
          <button
            type="button"
            onClick={() => setAssignToMe(false)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              !assignToMe ? 'bg-amber/15 border-amber/40 text-amber' : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Push to shared pool
          </button>
        </div>

        <Button onClick={run} disabled={running} className="bg-amber text-background hover:bg-amber/90">
          {running
            ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scraping & scoring...</>
            : <><Crosshair className="w-4 h-4 mr-1" /> Run scrape</>
          }
        </Button>

        <p className="text-xs text-muted-foreground italic">
          Tip: leave industry blank for a broad sweep of HubSpot/Salesforce-using SMBs in your location.
        </p>
      </CardContent>
    </Card>
  );
};

// ============================================================
const LeadRow: React.FC<{ lead: RepLead; onChanged: () => void }> = ({ lead, onChanged }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<any>(lead.enrichment?.scan || null);
  const [scanUrl, setScanUrl] = useState(lead.website || '');
  const [rr, setRr] = useState<any>(lead.enrichment?.rocketreach || null);
  const [fc, setFc] = useState<any>(lead.enrichment?.firecrawl || null);
  const [rrLoading, setRrLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    business_name: lead.business_name || '',
    contact_name: lead.contact_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    website: lead.website || '',
    industry: lead.industry || '',
    location: lead.location || '',
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEditFields({
      business_name: lead.business_name || '',
      contact_name: lead.contact_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      website: lead.website || '',
      industry: lead.industry || '',
      location: lead.location || '',
    });
  }, [lead.id, lead.business_name, lead.contact_name, lead.email, lead.phone, lead.website, lead.industry, lead.location]);

  useEffect(() => { setNotes(lead.notes || ''); }, [lead.notes]);
  useEffect(() => { setScan(lead.enrichment?.scan || null); }, [lead.enrichment]);
  useEffect(() => { setRr(lead.enrichment?.rocketreach || null); }, [lead.enrichment]);
  useEffect(() => { setFc(lead.enrichment?.firecrawl || null); }, [lead.enrichment]);
  useEffect(() => { if (lead.website) setScanUrl(lead.website); }, [lead.website]);

  const scheduleSaveNotes = (val: string) => {
    setNotes(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await portalLeads.updateStatus(lead.id, { notes: val });
      } catch (e) { /* silent */ }
    }, 800);
  };

  const setStatus = async (status: LeadStatus) => {
    setSaving(true);
    try { await portalLeads.updateStatus(lead.id, { status }); onChanged(); }
    catch (e) { toast({ title: 'Update failed', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const logTouch = async () => {
    setSaving(true);
    try {
      await portalLeads.updateStatus(lead.id, { touch: true, status: lead.status === 'new' ? 'touched' : lead.status });
      toast({ title: 'Touch logged' });
      onChanged();
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const release = async () => {
    if (!confirm('Release this lead back to the pool? Other reps will be able to claim it.')) return;
    try { await portalLeads.release(lead.id); toast({ title: 'Released to pool' }); onChanged(); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  const remove = async () => {
    if (!confirm('Permanently delete this lead? This cannot be undone.')) return;
    try { await portalLeads.remove(lead.id); toast({ title: 'Lead deleted' }); onChanged(); }
    catch (e) { toast({ title: 'Delete failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }); }
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      await portalLeads.updateStatus(lead.id, { ...editFields });
      toast({ title: 'Lead updated' });
      setEditing(false);
      onChanged();
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const runScan = async (force = false) => {
    if (!scanUrl) { toast({ title: 'Add a website URL first', variant: 'destructive' }); return; }
    setOpen(true); // keep the row expanded while scan runs
    setScanning(true);
    try {
      const res = await portalLeads.scan(lead.id, { url: scanUrl, force });
      setScan(res.scan);
      setOpen(true); // ensure still open after data lands
      toast({ title: res.cached ? 'Loaded saved scan' : 'Scan complete — saved to lead' });
      // Skip onChanged() so parent re-render doesn't collapse this row
    } catch (e) {
      toast({ title: 'Scan failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setScanning(false); }
  };

  const runRocketReach = async (force = false) => {
    setOpen(true);
    setRrLoading(true);
    try {
      const res: any = await portalLeads.rocketReach(lead.id, { force });
      setRr(res.person);
      if (res.firecrawl) setFc(res.firecrawl);
      setOpen(true);
      if (res.note) {
        toast({ title: 'Deep scan note', description: res.note });
      } else {
        toast({ title: res.cached ? 'Loaded saved deep scan' : 'Deep scan complete (RocketReach + Firecrawl)' });
      }
      // Auto-add follow-up to workspace calendar on fresh deep scan
      if (!res.cached && !res.note) {
        try {
          const businessName = lead.business_name || lead.email || 'Lead';
          await createCalendarEvent({
            kind: 'follow_up',
            title: `Follow up: ${businessName}`,
            body: [
              `Lead: ${businessName}`,
              lead.contact_name ? `Contact: ${lead.contact_name}` : null,
              lead.email ? `Email: ${lead.email}` : null,
              lead.phone ? `Phone: ${lead.phone}` : null,
              lead.website ? `Website: ${lead.website}` : null,
              '',
              'Deep scan complete — review insights and reach out.',
            ].filter(Boolean).join('\n'),
            start_at: nextBusinessMorningISO(),
            all_day: false,
            lead_id: lead.id,
          });
          toast({ title: 'Follow-up added to your calendar' });
        } catch (calErr) {
          console.warn('calendar autosave failed:', calErr);
        }
      }
    } catch (e) {
      toast({ title: 'Deep scan failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setRrLoading(false); }
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/40">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-amber/5 transition-colors">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{lead.business_name || lead.email || '—'}</p>
          <p className="text-xs text-muted-foreground truncate">
            {[lead.contact_name, lead.email, lead.phone].filter(Boolean).join(' · ') || lead.industry || '—'}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground flex-shrink-0">
          {scan?.score != null && (
            <p className="font-mono text-amber">Scan {scan.grade || ''} · {scan.score}</p>
          )}
          <p>{lead.touch_count} touch{lead.touch_count === 1 ? '' : 'es'}</p>
          {lead.last_touched_at && <p>{new Date(lead.last_touched_at).toLocaleDateString()}</p>}
        </div>
      </button>
      {open && (
        <ErrorBoundary label="LeadRow">
        <div className="border-t border-border/50 p-3 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
            {lead.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
            {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
            {lead.website && (
              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber/80 hover:text-amber">
                <ExternalLink className="w-3 h-3" /> {lead.website}
              </a>
            )}
            <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs"
              onClick={() => setEditing(e => !e)}>
              {editing ? 'Cancel' : 'Edit lead'}
            </Button>
          </div>
          {editing && (
            <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                ['business_name', 'Business name'],
                ['contact_name', 'Contact name'],
                ['email', 'Email'],
                ['phone', 'Phone'],
                ['website', 'Website'],
                ['industry', 'Industry'],
                ['location', 'Location'],
              ] as const).map(([k, label]) => (
                <div key={k} className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</label>
                  <Input
                    value={editFields[k] ?? ''}
                    onChange={e => setEditFields(f => ({ ...f, [k]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setEditFields({ business_name: lead.business_name||'', contact_name: lead.contact_name||'', email: lead.email||'', phone: lead.phone||'', website: lead.website||'', industry: lead.industry||'', location: lead.location||'' }); setEditing(false); }}>Reset</Button>
                <Button size="sm" disabled={saving} onClick={saveEdits} className="bg-amber text-background hover:bg-amber/90">
                  {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Save changes
                </Button>
              </div>
            </div>
          )}
          {lead.why_fit && (
            <div className="text-xs text-muted-foreground italic border-l-2 border-amber/40 pl-2">{lead.why_fit}</div>
          )}

          {/* Rep Game Plan — adaptive coaching */}
          <LeadGamePlan lead={lead} scan={scan} rr={rr} fc={fc} />
          <div className="flex flex-wrap gap-2">
            <select
              value={lead.status}
              onChange={e => setStatus(e.target.value as LeadStatus)}
              disabled={saving}
              className="bg-background border border-input rounded-md px-2 h-8 text-xs"
            >
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={logTouch} disabled={saving}>Log touch</Button>
            <Button size="sm" variant="ghost" onClick={release} className="text-muted-foreground">
              <RotateCcw className="w-3 h-3 mr-1" /> Repool
            </Button>
            <Button size="sm" variant="ghost" onClick={remove} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>

          {/* Company Scan */}
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-mono uppercase tracking-wider text-amber flex items-center gap-1">
                <Search className="w-3 h-3" /> Company Scan
              </p>
              {scan?.scanned_at && (
                <span className="text-[10px] text-muted-foreground">
                  Last scanned {new Date(scan.scanned_at).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={scanUrl}
                onChange={e => setScanUrl(e.target.value)}
                placeholder="https://company.com"
                className="flex-1 min-w-[200px] h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={() => runScan(!!scan)}
                disabled={scanning}
                className="bg-amber text-background hover:bg-amber/90"
              >
                {scanning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {scan ? 'Re-scan' : 'Scan company'}
              </Button>
            </div>
            {scan && (
              <div className="space-y-2 mt-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {scan.score != null && (
                    <span className="font-mono px-2 py-0.5 rounded bg-amber/20 text-amber border border-amber/40">
                      {scan.grade || ''} · Score {scan.score}
                    </span>
                  )}
                  {scan.companyName && <span className="text-foreground font-semibold">{scan.companyName}</span>}
                </div>
                {scan.executiveSummary && (
                  <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">{scan.executiveSummary}</p>
                )}
                {Array.isArray(scan.gaps) && scan.gaps.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Top Gaps</p>
                    {scan.gaps.slice(0, 6).map((g: any, i: number) => (
                      <div key={i} className="text-xs border-l-2 border-amber/40 pl-2">
                        <p className="font-semibold text-foreground">{g.title} <span className="text-[10px] font-mono text-muted-foreground">[{g.category}]</span></p>
                        <p className="text-muted-foreground">{g.description}</p>
                        <p className="text-amber text-[11px]">Cost: {g.annualCost} → Fix: {g.recommendedFix} (ROI {g.projectedROI})</p>
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(scan.nextSteps) && scan.nextSteps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Next Steps</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                      {scan.nextSteps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Deep Scan: RocketReach + Firecrawl */}
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-mono uppercase tracking-wider text-amber flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Deep Scan — Person + Company
              </p>
              {(rr?.fetched_at || fc?.fetched_at) && (
                <span className="text-[10px] text-muted-foreground">
                  Last lookup {new Date(rr?.fetched_at || fc?.fetched_at).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                RocketReach: emails, phones, LinkedIn, work history. Firecrawl: company facts, services, leadership, sitemap.
              </p>
              <Button
                size="sm"
                onClick={() => runRocketReach(!!(rr || fc))}
                disabled={rrLoading}
                className="bg-amber text-background hover:bg-amber/90 flex-shrink-0"
              >
                {rrLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {rr || fc ? 'Re-run deep scan' : 'Deep scan'}
              </Button>
            </div>
            {rr && (
              <div className="space-y-2 mt-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {rr.profile_pic && <img src={rr.profile_pic} alt="" className="w-10 h-10 rounded-full" />}
                  <div>
                    <p className="font-semibold text-foreground text-sm">{rr.name}</p>
                    <p className="text-muted-foreground">{[rr.title, rr.employer].filter(Boolean).join(' · ')}</p>
                    {rr.location && <p className="text-muted-foreground">{rr.location}</p>}
                  </div>
                </div>
                {rr.linkedin_url && (
                  <a href={rr.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber hover:underline">
                    <ExternalLink className="w-3 h-3" /> LinkedIn
                  </a>
                )}
                {Array.isArray(rr.emails) && rr.emails.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Emails</p>
                    {rr.best_email && (
                      <div className="mb-2 p-2 rounded border border-amber/40 bg-amber/10">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-amber mb-0.5">★ Use This Email</p>
                        <a href={`mailto:${rr.best_email}`} onClick={mailHandler(rr.best_email)} className="text-amber font-semibold hover:underline">{rr.best_email}</a>
                        {rr.best_email_reason && <p className="text-[10px] text-muted-foreground mt-0.5">{rr.best_email_reason}</p>}
                      </div>
                    )}
                    {rr.emails.map((e: any, i: number) => {
                      const isBest = rr.best_email && e.email === rr.best_email;
                      return (
                        <p key={i} className={isBest ? 'opacity-60' : ''}>
                          <a href={`mailto:${e.email}`} onClick={mailHandler(e.email)} className="text-amber hover:underline">{e.email}</a>
                          <span className="text-muted-foreground ml-2">[{e.type || '—'}{e.grade ? ` · ${e.grade}` : ''}{e.smtp_valid ? ` · ${e.smtp_valid}` : ''}]</span>
                          {isBest && <span className="ml-2 text-[10px] text-amber">★ best</span>}
                        </p>
                      );
                    })}
                  </div>
                )}
                {Array.isArray(rr.phones) && rr.phones.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Phones</p>
                    {rr.phones.map((p: any, i: number) => (
                      <p key={i}>
                        <a href={`tel:${p.number}`} className="text-amber hover:underline">{p.number}</a>
                        <span className="text-muted-foreground ml-2">[{p.type || '—'}]</span>
                      </p>
                    ))}
                  </div>
                )}
                {Array.isArray(rr.job_history) && rr.job_history.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Work History</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {rr.job_history.map((j: any, i: number) => (
                        <li key={i}>{j.title} @ {j.company_name} <span className="text-[10px]">({j.start_date || '?'} – {j.end_date || 'present'})</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(rr.additional_contacts) && rr.additional_contacts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber/20">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-amber mb-2">
                      ★ Other Decision-Makers ({rr.additional_contacts.length})
                    </p>
                    <div className="space-y-2">
                      {rr.additional_contacts.map((c: any, i: number) => (
                        <div key={i} className="rounded border border-amber/20 bg-background/40 p-2">
                          <div className="flex items-center gap-2">
                            {c.profile_pic && <img src={c.profile_pic} alt="" className="w-7 h-7 rounded-full" />}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground truncate">{c.name}</p>
                              <p className="text-muted-foreground text-[11px] truncate">{[c.title, c.employer].filter(Boolean).join(' · ')}</p>
                            </div>
                            {c.linkedin_url && (
                              <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-amber hover:underline text-[11px] inline-flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> LI
                              </a>
                            )}
                          </div>
                          {c.best_email && (
                            <p className="mt-1">
                              <a href={`mailto:${c.best_email}`} onClick={mailHandler(c.best_email)} className="text-amber hover:underline">{c.best_email}</a>
                            </p>
                          )}
                          {Array.isArray(c.phones) && c.phones[0]?.number && (
                            <p><a href={`tel:${c.phones[0].number}`} className="text-amber hover:underline">{c.phones[0].number}</a> <span className="text-muted-foreground text-[10px]">[{c.phones[0].type || '—'}]</span></p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {fc && (
              <div className="space-y-2 mt-3 pt-3 border-t border-amber/20 text-xs">
                <p className="text-[10px] font-mono uppercase tracking-wider text-amber">Firecrawl — Company Intel</p>
                {fc.json && (
                  <div className="space-y-1">
                    {fc.json.legal_name && <p><span className="text-muted-foreground">Legal name:</span> <span className="text-foreground font-semibold">{fc.json.legal_name}</span></p>}
                    {fc.json.tagline && <p className="italic text-muted-foreground">"{fc.json.tagline}"</p>}
                    {fc.json.description && <p className="text-muted-foreground">{fc.json.description}</p>}
                    {fc.json.founded_year && <p><span className="text-muted-foreground">Founded:</span> {fc.json.founded_year}</p>}
                    {fc.json.employee_count && <p><span className="text-muted-foreground">Employees:</span> {fc.json.employee_count}</p>}
                    {fc.json.headquarters && <p><span className="text-muted-foreground">HQ:</span> {fc.json.headquarters}</p>}
                    {Array.isArray(fc.json.services) && fc.json.services.length > 0 && (
                      <p><span className="text-muted-foreground">Services:</span> {fc.json.services.join(', ')}</p>
                    )}
                    {Array.isArray(fc.json.industries) && fc.json.industries.length > 0 && (
                      <p><span className="text-muted-foreground">Industries:</span> {fc.json.industries.join(', ')}</p>
                    )}
                    {Array.isArray(fc.json.tech_stack) && fc.json.tech_stack.length > 0 && (
                      <p><span className="text-muted-foreground">Tech:</span> {fc.json.tech_stack.join(', ')}</p>
                    )}
                    {Array.isArray(fc.json.leadership) && fc.json.leadership.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">Leadership:</p>
                        <ul className="pl-4 list-disc">
                          {fc.json.leadership.slice(0, 8).map((p: any, i: number) => (
                            <li key={i}>{p.name}{p.title ? ` — ${p.title}` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(fc.json.emails) && fc.json.emails.length > 0 && (
                      <p><span className="text-muted-foreground">Emails on site:</span> {fc.json.emails.map((e: string, i: number) => (
                        <a key={i} href={`mailto:${e}`} onClick={mailHandler(e)} className="text-amber hover:underline mr-2">{e}</a>
                      ))}</p>
                    )}
                    {Array.isArray(fc.json.phones) && fc.json.phones.length > 0 && (
                      <p><span className="text-muted-foreground">Phones on site:</span> {fc.json.phones.join(', ')}</p>
                    )}
                    {fc.json.social_links && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(fc.json.social_links).filter(([, v]) => !!v).map(([k, v]) => (
                          <a key={k} href={String(v)} target="_blank" rel="noopener noreferrer" className="text-amber hover:underline">{k}</a>
                        ))}
                      </div>
                    )}
                    {Array.isArray(fc.json.unique_selling_points) && fc.json.unique_selling_points.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">USPs:</p>
                        <ul className="pl-4 list-disc text-muted-foreground">
                          {fc.json.unique_selling_points.slice(0, 6).map((u: string, i: number) => <li key={i}>{u}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {fc.summary && (
                  <details className="text-muted-foreground">
                    <summary className="cursor-pointer text-amber/80">AI Summary</summary>
                    <p className="mt-1 whitespace-pre-wrap">{fc.summary}</p>
                  </details>
                )}
                {Array.isArray(fc.web_results) && fc.web_results.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-amber/80">Web mentions ({fc.web_results.length})</summary>
                    <ul className="pl-4 list-disc mt-1 space-y-0.5">
                      {fc.web_results.map((w: any, i: number) => (
                        <li key={i}><a href={w.url} target="_blank" rel="noopener noreferrer" className="text-amber hover:underline">{w.title || w.url}</a>{w.description ? ` — ${w.description}` : ''}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {Array.isArray(fc.sitemap) && fc.sitemap.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-amber/80">Site map ({fc.sitemap.length} pages)</summary>
                    <ul className="pl-4 list-disc mt-1 space-y-0.5 max-h-40 overflow-auto">
                      {fc.sitemap.map((u: string, i: number) => (
                        <li key={i}><a href={u} target="_blank" rel="noopener noreferrer" className="text-amber/80 hover:underline break-all">{u}</a></li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Lead notes — autosaves (visible to admin)
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={async () => {
                  const trimmed = (notes || '').trim();
                  if (!trimmed) {
                    toast({ title: 'Nothing to save', description: 'Write something in the lead note first.' });
                    return;
                  }
                  try {
                    await upsertRepNote({
                      title: `Lead: ${lead.business_name || lead.contact_name || 'Untitled'}`,
                      body: `${trimmed}\n\n— from lead ${lead.id}`,
                      pinned: false,
                      tags: ['lead'],
                      attachments: [],
                    });
                    toast({ title: 'Saved to My Notes' });
                  } catch (e: any) {
                    toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
                  }
                }}
              >
                <FileText className="w-3 h-3 mr-1" /> Save copy to My Notes
              </Button>
            </div>
            <Textarea
              value={notes}
              onChange={e => scheduleSaveNotes(e.target.value)}
              placeholder="Notes about this lead — autosaves and visible on the lead. Use 'Save copy to My Notes' to keep a private snapshot in your workspace."
              className="min-h-[80px] text-sm"
            />
          </div>
        </div>
        </ErrorBoundary>
      )}
    </div>
  );
};

// ============================================================
const UploadDownloadPanel: React.FC<{ onUploaded: () => void }> = ({ onUploaded }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [filename, setFilename] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    setFilename(file.name);
    setRows(parsed);
  };

  const upload = async () => {
    if (!rows.length) return;
    setUploading(true);
    try {
      const { inserted } = await portalLeads.upload(rows);
      toast({ title: `Uploaded ${inserted} leads`, description: 'They\'re now under "My Leads".' });
      setRows([]); setFilename('');
      onUploaded();
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const download = async () => {
    try {
      const { rows } = await portalLeads.download();
      if (!rows.length) { toast({ title: 'No leads to download yet' }); return; }
      downloadCsv(`my-leads-${new Date().toISOString().slice(0,10)}.csv`, leadsToCsv(rows));
    } catch (e) {
      toast({ title: 'Download failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <UploadIcon className="w-5 h-5 text-amber" /> Upload Your Leads
          </CardTitle>
          <p className="text-sm text-muted-foreground">CSV with columns: <code className="text-amber">business_name, contact_name, email, phone, website, industry, location, notes</code></p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept=".csv,text/csv" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button
            type="button"
            onClick={() => downloadCsv('rep-leads-template.csv', SAMPLE_CSV)}
            className="text-xs text-amber hover:underline inline-flex items-center gap-1"
          >
            <FileText className="w-3 h-3" /> Download sample template
          </button>
          {rows.length > 0 && (
            <div className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-2">
              <p className="text-sm text-foreground font-semibold">{filename} — {rows.length} row{rows.length === 1 ? '' : 's'}</p>
              <div className="text-xs text-muted-foreground max-h-40 overflow-y-auto space-y-1">
                {rows.slice(0, 5).map((r, i) => (
                  <p key={i} className="truncate">• {r.business_name || r.email || '—'} {r.industry && `(${r.industry})`}</p>
                ))}
                {rows.length > 5 && <p>… and {rows.length - 5} more</p>}
              </div>
              <Button onClick={upload} disabled={uploading} className="bg-amber text-background hover:bg-amber/90 w-full">
                {uploading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading...</> : `Upload ${rows.length} leads`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Download className="w-5 h-5 text-amber" /> Download My Leads
          </CardTitle>
          <p className="text-sm text-muted-foreground">Export everything you've claimed (with status, touch count, and notes) as a CSV.</p>
        </CardHeader>
        <CardContent>
          <Button onClick={download} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-1" /> Download CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
