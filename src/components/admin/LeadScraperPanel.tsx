import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Loader2, Sparkles, Trash2, RefreshCw, Search, UserPlus, ExternalLink } from 'lucide-react';

interface LookupCandidate {
  business_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  title?: string;
  linkedin?: string;
  industry?: string;
  location?: string;
  confidence: number;
  why: string;
  sources?: string[];
}

interface AdminLead {
  id: string;
  business_name: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  score: number | null;
  why_fit: string | null;
  source: string;
  status: string;
  claimed_by_code: string | null;
  created_at: string;
}

export const LeadScraperPanel: React.FC = () => {
  const { toast } = useToast();
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('Indianapolis, Indiana');
  const [count, setCount] = useState(15);
  const [running, setRunning] = useState(false);
  const [recent, setRecent] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);

  // Contact lookup state
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupRunning, setLookupRunning] = useState(false);
  const [lookupResults, setLookupResults] = useState<LookupCandidate[] | null>(null);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  const runLookup = async () => {
    const q = lookupQuery.trim();
    if (!q) return;
    setLookupRunning(true);
    setLookupResults(null);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired, log in again.');
      const { data, error } = await supabase.functions.invoke('admin-lookup-contact', {
        body: { action: 'lookup', query: q },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setLookupResults((data?.candidates || []) as LookupCandidate[]);
      if (!data?.candidates?.length) toast({ title: 'No matches found', description: 'Try a different name, email, or company.' });
    } catch (e) {
      toast({ title: 'Lookup failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setLookupRunning(false);
    }
  };

  const addCandidate = async (idx: number) => {
    const c = lookupResults?.[idx];
    if (!c) return;
    setAddingIdx(idx);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired, log in again.');
      const { data, error } = await supabase.functions.invoke('admin-lookup-contact', {
        body: { action: 'add', candidate: c },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Added to lead pool' });
      setLookupResults(prev => (prev ? prev.filter((_, i) => i !== idx) : prev));
      load();
    } catch (e) {
      toast({ title: 'Add failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setAddingIdx(null);
    }
  };


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired, log in again.');
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'lead_pool_recent', limit: 50 },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setRecent((data?.leads || []) as AdminLead[]);
    } catch (e) {
      toast({ title: 'Failed to load leads', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const scrape = async () => {
    setRunning(true);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired, log in again.');
      const { data, error } = await supabase.functions.invoke('admin-scrape-leads', {
        body: { industry, location, count },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: `Pushed ${data.inserted} leads to the rep pool` });
      load();
    } catch (e) {
      toast({ title: 'Scrape failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setRunning(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired, log in again.');
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'delete_lead', id },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setRecent(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Contact Lookup */}
      <Card className="border-amber/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Search className="w-5 h-5 text-amber" /> Find a Contact
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Paste a name, email, phone number, or company. AI scrapes the web for their contact info — review the matches, then add the ones you want to the lead pool.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={lookupQuery}
              onChange={e => setLookupQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !lookupRunning) runLookup(); }}
              placeholder="e.g. Jane Smith Acme Corp, jane@acme.com, (317) 555-1234"
              className="flex-1"
            />
            <Button onClick={runLookup} disabled={lookupRunning || !lookupQuery.trim()} className="bg-amber text-background hover:bg-amber/90">
              {lookupRunning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Searching...</> : <><Search className="w-4 h-4 mr-1" /> Search web</>}
            </Button>
          </div>

          {lookupResults && lookupResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                {lookupResults.length} candidate{lookupResults.length === 1 ? '' : 's'} found
              </p>
              {lookupResults.map((c, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border bg-secondary/30 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{c.contact_name || c.business_name || 'Unknown'}</span>
                        {c.title && <span className="text-xs text-muted-foreground">· {c.title}</span>}
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber/15 text-amber">conf {c.confidence}</span>
                      </div>
                      {c.business_name && c.contact_name && (
                        <div className="text-sm text-muted-foreground">{c.business_name}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {c.email && <div>📧 {c.email}</div>}
                        {c.phone && <div>📞 {c.phone}</div>}
                        {c.website && <div>🌐 {c.website}</div>}
                        {(c.industry || c.location) && <div>{[c.industry, c.location].filter(Boolean).join(' · ')}</div>}
                        {c.linkedin && (
                          <a href={c.linkedin} target="_blank" rel="noreferrer" className="text-amber hover:underline inline-flex items-center gap-1">
                            LinkedIn <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-foreground/80 mt-2 italic">{c.why}</p>
                      {c.sources && c.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.sources.slice(0, 3).map((s, i) => (
                            <a key={i} href={s} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-amber underline truncate max-w-[200px]">
                              src {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addCandidate(idx)}
                      disabled={addingIdx === idx}
                      className="bg-amber text-background hover:bg-amber/90 shrink-0"
                    >
                      {addingIdx === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-1" /> Add to leads</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>

        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Sparkles className="w-5 h-5 text-amber" /> Lead Scraper → Rep Pool
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI scrapes the web for ICP-fit prospects, scores them, and pushes them into the shared portal pool. Reps claim from there.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
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
              <Label className="text-xs">Count (5–50)</Label>
              <Input type="number" min={5} max={50} value={count} onChange={e => setCount(Number(e.target.value) || 15)} />
            </div>
          </div>
          <Button onClick={scrape} disabled={running} className="bg-amber text-background hover:bg-amber/90">
            {running ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scraping & scoring...</> : 'Run scrape & push to pool'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display">Recent Leads</CardTitle>
            <p className="text-sm text-muted-foreground">Last 50 in the rep pool, admin scraped, rep uploaded, or manually added.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">No leads yet. Run a scrape above.</p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {recent.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{l.business_name || ', '}</span>
                      {typeof l.score === 'number' && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber/15 text-amber">{l.score}</span>}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{l.status}</span>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">{l.source.replace('_',' ')}</span>
                      {l.claimed_by_code && <span className="text-xs text-amber">→ {l.claimed_by_code}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[l.industry, l.location].filter(Boolean).join(' · ')}
                      {l.website && ` · ${l.website}`}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(l.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
