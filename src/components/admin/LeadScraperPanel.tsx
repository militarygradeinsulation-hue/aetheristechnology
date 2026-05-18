import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Loader2, Sparkles, Trash2, RefreshCw } from 'lucide-react';

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

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rep_leads')
      .select('id,business_name,industry,location,website,score,why_fit,source,status,claimed_by_code,created_at')
      .order('created_at', { ascending: false }).limit(50);
    if (error) toast({ title: 'Failed to load leads', description: error.message, variant: 'destructive' });
    setRecent((data || []) as AdminLead[]);
    setLoading(false);
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
    const { error } = await supabase.from('rep_leads').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setRecent(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="space-y-4">
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
