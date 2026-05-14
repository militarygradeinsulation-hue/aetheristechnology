import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trash2, CalendarClock, ExternalLink, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { toast } from '@/hooks/use-toast';
import { ScheduleSocialButton } from './ScheduleSocialButton';

interface Row {
  id: string;
  ayrshare_id: string | null;
  content: string;
  platforms: string[];
  scheduled_for: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

export const SocialSchedulerPanel: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const [statusRes, listRes] = await Promise.all([
        supabase.functions.invoke('social-scheduler', { body: { action: 'status' }, headers: { 'x-admin-token': token! } }),
        supabase.functions.invoke('social-scheduler', { body: { action: 'list' }, headers: { 'x-admin-token': token! } }),
      ]);
      setEnabled(!!statusRes.data?.enabled);
      setRows(listRes.data?.posts || []);
    } catch (e) {
      toast({ title: 'Failed to load', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (row: Row) => {
    if (!confirm('Cancel this scheduled post?')) return;
    const token = getAdminToken();
    const { error } = await supabase.functions.invoke('social-scheduler', {
      body: { action: 'delete', id: row.id, ayrshareId: row.ayrshare_id },
      headers: { 'x-admin-token': token! },
    });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Canceled' }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">Social Scheduler</h2>
          <span className="text-xs text-muted-foreground ml-2">LinkedIn / FB / IG / X / TikTok / YouTube via Ayrshare</span>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {enabled === false && (
        <div className="glass border border-amber/40 p-4 rounded-xl flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-amber mt-0.5" />
          <div className="text-sm">
            <div className="font-bold text-foreground">Multi-network publishing not configured</div>
            <p className="text-muted-foreground mt-1">
              LinkedIn already works through the built-in queue. To schedule Facebook, Instagram, X, TikTok, YouTube, Threads, Pinterest, or Bluesky from Lovable, add an <code className="text-amber">AYRSHARE_API_KEY</code> secret. Get a key at <a href="https://www.ayrshare.com" target="_blank" rel="noreferrer" className="underline">ayrshare.com</a> (free tier available), then ask Lovable to add the secret.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <ScheduleSocialButton content="" source="manual" label="New scheduled post" variant="default" />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Networks</th>
              <th className="text-left p-3">Content</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">No scheduled posts yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 align-top whitespace-nowrap text-xs">
                  {r.scheduled_for ? new Date(r.scheduled_for).toLocaleString() : <span className="text-muted-foreground">Immediate</span>}
                </td>
                <td className="p-3 align-top">
                  <div className="flex flex-wrap gap-1">
                    {r.platforms.map(p => <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-amber/10 text-amber border border-amber/30">{p}</span>)}
                  </div>
                </td>
                <td className="p-3 align-top max-w-md">
                  <div className="text-xs whitespace-pre-wrap line-clamp-3">{r.content}</div>
                  {r.source && <div className="text-[10px] text-muted-foreground mt-1">from: {r.source}</div>}
                </td>
                <td className="p-3 align-top">
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide ${
                    r.status === 'posted' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                    r.status === 'canceled' ? 'bg-muted text-muted-foreground border border-border' :
                    'bg-amber/10 text-amber border border-amber/30'
                  }`}>{r.status}</span>
                </td>
                <td className="p-3 align-top text-right">
                  {r.status !== 'canceled' && r.status !== 'posted' && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(r)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
