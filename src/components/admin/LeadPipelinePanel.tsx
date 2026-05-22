import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Loader2, Database, Download, Zap, Settings, Play, RefreshCw, Ban } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface DripSettings {
  id: string;
  daily_per_rep: number;
  enabled: boolean;
  require_email: boolean;
  indianapolis_only: boolean;
  excluded_lifecycle_stages: string[];
  scraper_enabled: boolean;
  scraper_frequency: string;
  scraper_target_per_run: number;
  hold_hours: number;
  blocked_keywords: string[];
}

interface PoolStats {
  total: number;
  unassigned: number;
  dripped: number;
  claimed: number;
  worked: number;
  dead: number;
}

export const LeadPipelinePanel: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DripSettings | null>(null);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [dripping, setDripping] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [importCursor, setImportCursor] = useState<string | null>(null);
  const [scrapeIndustry, setScrapeIndustry] = useState('professional services');
  const [blockedText, setBlockedText] = useState('');
  const [purging, setPurging] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const [tot, un, dr, cl, wo, dd] = await Promise.all([
        supabase.from('rep_leads').select('id', { count: 'exact', head: true }),
        supabase.from('rep_leads').select('id', { count: 'exact', head: true }).is('claimed_by_code', null).is('assigned_to_code', null),
        supabase.from('rep_leads').select('id', { count: 'exact', head: true }).is('claimed_by_code', null).not('assigned_to_code', 'is', null),
        supabase.from('rep_leads').select('id', { count: 'exact', head: true }).not('claimed_by_code', 'is', null).not('status', 'in', '(won,lost,dead)'),
        supabase.from('rep_leads').select('id', { count: 'exact', head: true }).in('status', ['won']),
        supabase.from('rep_leads').select('id', { count: 'exact', head: true }).in('status', ['lost', 'dead']),
      ]);
      setStats({
        total: tot.count ?? 0,
        unassigned: un.count ?? 0,
        dripped: dr.count ?? 0,
        claimed: cl.count ?? 0,
        worked: wo.count ?? 0,
        dead: dd.count ?? 0,
      });
    } catch (e) {
      console.error('stats error', e);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from('lead_drip_settings').select('*').maybeSingle();
    if (data) setSettings(data as DripSettings);
  }, []);

  useEffect(() => {
    refreshStats();
    refreshSettings();
  }, [refreshStats, refreshSettings]);

  const saveSettings = async () => {
    if (!settings) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('lead_drip_settings').update({
        daily_per_rep: settings.daily_per_rep,
        enabled: settings.enabled,
        require_email: settings.require_email,
        indianapolis_only: settings.indianapolis_only,
        scraper_enabled: settings.scraper_enabled,
        scraper_target_per_run: settings.scraper_target_per_run,
        hold_hours: settings.hold_hours,
        updated_at: new Date().toISOString(),
      }).eq('id', settings.id);
      if (error) throw error;
      toast({ title: 'Drip settings saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const runImport = async () => {
    const token = getAdminToken();
    if (!token) return toast({ title: 'Admin session expired', variant: 'destructive' });
    setImporting(true);
    setImportProgress('Scanning HubSpot contacts…');
    try {
      const { data, error } = await supabase.functions.invoke('admin-import-hubspot-leads', {
        body: { batchSize: 1000, maxBatches: 5, cursor: importCursor },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setImportCursor(data.nextCursor);
      setImportProgress(`Inserted ${data.inserted} · Skipped ${data.skipped} · Scanned ${data.scanned}${data.hasMore ? ' (more available, click again)' : ' (done)'}`);
      toast({ title: `Imported ${data.inserted} leads`, description: `Scanned ${data.scanned}, skipped ${data.skipped}` });
      refreshStats();
    } catch (e) {
      toast({ title: 'Import failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setImporting(false); }
  };

  const runScraper = async () => {
    const token = getAdminToken();
    if (!token) return toast({ title: 'Admin session expired', variant: 'destructive' });
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-scrape-leads', {
        body: { industry: scrapeIndustry, location: 'Indianapolis, Indiana', count: settings?.scraper_target_per_run ?? 50 },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: `Scraped ${data.inserted} new leads` });
      refreshStats();
    } catch (e) {
      toast({ title: 'Scrape failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setScraping(false); }
  };

  const runDrip = async () => {
    setDripping(true);
    try {
      const { data, error } = await supabase.functions.invoke('cron-drip-leads', { body: {} });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const totalAssigned = (data.summary || []).reduce((s: number, r: any) => s + (r.assigned || 0), 0);
      toast({ title: `Drip released ${totalAssigned} leads`, description: `Recovered ${data.released} expired holds` });
      refreshStats();
    } catch (e) {
      toast({ title: 'Drip failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setDripping(false); }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { label: 'Total', value: stats?.total, color: 'text-foreground' },
          { label: 'Unassigned', value: stats?.unassigned, color: 'text-muted-foreground' },
          { label: 'In Drop', value: stats?.dripped, color: 'text-amber' },
          { label: 'Working', value: stats?.claimed, color: 'text-blue-400' },
          { label: 'Won', value: stats?.worked, color: 'text-green-400' },
          { label: 'Dead', value: stats?.dead, color: 'text-red-400' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-display ${s.color}`}>{s.value?.toLocaleString() ?? ', '}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* HubSpot Import */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Database className="w-5 h-5 text-amber" /> Import HubSpot Contacts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pulls eligible contacts from your HubSpot mirror into the rep lead pool. Runs in 5,000-row batches, click again to continue. Idempotent on contact ID.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runImport} disabled={importing} className="bg-amber text-background hover:bg-amber/90 w-full">
              {importing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importing…</> : <><Download className="w-4 h-4 mr-1" /> Import Next Batch</>}
            </Button>
            {importProgress && <p className="text-xs text-muted-foreground font-mono">{importProgress}</p>}
            {importCursor && (
              <Button variant="outline" size="sm" onClick={() => setImportCursor(null)}>
                <RefreshCw className="w-3 h-3 mr-1" /> Reset cursor (start over)
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Scraper */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber" /> Indianapolis Web Scraper
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Firecrawl + AI scoring → adds fresh net-new prospects to the pool. Scoped to Indianapolis metro.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Industry focus</Label>
              <Input value={scrapeIndustry} onChange={e => setScrapeIndustry(e.target.value)} placeholder="e.g. healthcare, manufacturing" />
            </div>
            <Button onClick={runScraper} disabled={scraping} className="bg-amber text-background hover:bg-amber/90 w-full">
              {scraping ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scraping…</> : <><Play className="w-4 h-4 mr-1" /> Run Now</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Drip settings */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber" /> Daily Drip Settings
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Each rep wakes up to N new leads in "Today's Drop". Skipped or expired leads recycle back to the pool.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Leads per rep / day</Label>
                <Input type="number" min={1} max={50} value={settings.daily_per_rep}
                  onChange={e => setSettings({ ...settings, daily_per_rep: Number(e.target.value) || 10 })} />
              </div>
              <div>
                <Label className="text-xs">Hold hours (until expire)</Label>
                <Input type="number" min={1} max={168} value={settings.hold_hours}
                  onChange={e => setSettings({ ...settings, hold_hours: Number(e.target.value) || 24 })} />
              </div>
              <div>
                <Label className="text-xs">Scraper target / run</Label>
                <Input type="number" min={5} max={50} value={settings.scraper_target_per_run}
                  onChange={e => setSettings({ ...settings, scraper_target_per_run: Number(e.target.value) || 50 })} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: 'enabled' as const, label: 'Daily drip enabled' },
                { key: 'require_email' as const, label: 'Only leads with email' },
                { key: 'indianapolis_only' as const, label: 'Indianapolis-only filter' },
                { key: 'scraper_enabled' as const, label: 'Scraper enabled' },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between rounded-lg border border-border/50 p-2">
                  <Label className="text-sm">{opt.label}</Label>
                  <Switch checked={settings[opt.key]} onCheckedChange={v => setSettings({ ...settings, [opt.key]: v })} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveSettings} disabled={loading} className="bg-amber text-background hover:bg-amber/90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Settings'}
              </Button>
              <Button variant="outline" onClick={runDrip} disabled={dripping}>
                {dripping ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Dripping…</> : <><Zap className="w-4 h-4 mr-1" /> Run Drip Now</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
