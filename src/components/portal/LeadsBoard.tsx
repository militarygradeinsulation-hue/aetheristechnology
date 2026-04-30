import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Inbox, ListChecks, Upload as UploadIcon, Download, ExternalLink,
  RotateCcw, Sparkles, Search, FileText, Phone, Mail,
} from 'lucide-react';
import {
  portalLeads, leadsToCsv, downloadCsv, parseCsv,
  STATUS_LABEL, STATUS_COLOR, type RepLead, type LeadStatus,
} from '@/lib/portalLeads';

type SubTab = 'pool' | 'mine' | 'upload';

const STATUSES: LeadStatus[] = ['new','outreach','touched','replied','meeting','won','lost','dead'];

const SAMPLE_CSV = `business_name,contact_name,email,phone,website,industry,location,notes
Acme Roofing,Jane Smith,jane@acme.com,317-555-0100,https://acme.com,Roofing,Indianapolis IN,Met at chamber event
Bright Dental,,info@brightdental.com,,https://brightdental.com,Dental,Carmel IN,Referral from John`;

export const LeadsBoard: React.FC = () => {
  const { toast } = useToast();
  const [sub, setSub] = useState<SubTab>('pool');
  const [pool, setPool] = useState<RepLead[]>([]);
  const [mine, setMine] = useState<RepLead[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [maxActive, setMaxActive] = useState(25);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ industry: '', location: '', minScore: '' });

  const refreshPool = useCallback(async () => {
    setLoading(true);
    try {
      const { leads, activeClaimed, maxActive } = await portalLeads.list('pool', {
        industry: filters.industry || undefined,
        location: filters.location || undefined,
        minScore: filters.minScore ? Number(filters.minScore) : undefined,
      });
      setPool(leads);
      setActiveCount(activeClaimed);
      setMaxActive(maxActive);
    } catch (e) {
      toast({ title: 'Failed to load pool', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [filters, toast]);

  const refreshMine = useCallback(async () => {
    setLoading(true);
    try {
      const { leads, activeClaimed, maxActive } = await portalLeads.list('mine');
      setMine(leads);
      setActiveCount(activeClaimed);
      setMaxActive(maxActive);
    } catch (e) {
      toast({ title: 'Failed to load your leads', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (sub === 'pool') refreshPool();
    else if (sub === 'mine') refreshMine();
  }, [sub, refreshPool, refreshMine]);

  const handleClaim = async (lead: RepLead) => {
    try {
      await portalLeads.claim(lead.id);
      toast({ title: `Claimed: ${lead.business_name || lead.email}` });
      refreshPool();
    } catch (e) {
      toast({ title: 'Claim failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const grouped = useMemo(() => {
    const g: Record<LeadStatus, RepLead[]> = { new:[],outreach:[],touched:[],replied:[],meeting:[],won:[],lost:[],dead:[] };
    mine.forEach(l => g[l.status].push(l));
    return g;
  }, [mine]);

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border/50">
        {([
          { id: 'pool', label: 'Lead Pool', icon: Inbox },
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
                      <Button size="sm" className="bg-amber text-background hover:bg-amber/90" onClick={() => handleClaim(l)}>
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
            <CardTitle className="font-display flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-amber" /> My Active Leads
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Move them through the pipeline. Click "Log touch" each time you contact them. {activeCount}/{maxActive} active slots used.
            </p>
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

      {/* UPLOAD/DOWNLOAD */}
      {sub === 'upload' && <UploadDownloadPanel onUploaded={() => { setSub('mine'); refreshMine(); }} />}
    </div>
  );
};

// ============================================================
const LeadRow: React.FC<{ lead: RepLead; onChanged: () => void }> = ({ lead, onChanged }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setNotes(lead.notes || ''); }, [lead.notes]);

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
    if (!confirm('Release this lead back to the pool?')) return;
    try { await portalLeads.release(lead.id); toast({ title: 'Released' }); onChanged(); }
    catch { toast({ title: 'Failed', variant: 'destructive' }); }
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
          <p>{lead.touch_count} touch{lead.touch_count === 1 ? '' : 'es'}</p>
          {lead.last_touched_at && <p>{new Date(lead.last_touched_at).toLocaleDateString()}</p>}
        </div>
      </button>
      {open && (
        <div className="border-t border-border/50 p-3 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {lead.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
            {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
            {lead.website && (
              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber/80 hover:text-amber">
                <ExternalLink className="w-3 h-3" /> {lead.website}
              </a>
            )}
          </div>
          {lead.why_fit && (
            <div className="text-xs text-muted-foreground italic border-l-2 border-amber/40 pl-2">{lead.why_fit}</div>
          )}
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
              <RotateCcw className="w-3 h-3 mr-1" /> Release
            </Button>
          </div>
          <Textarea
            value={notes}
            onChange={e => scheduleSaveNotes(e.target.value)}
            placeholder="Notes — autosaves"
            className="min-h-[80px] text-sm"
          />
        </div>
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
