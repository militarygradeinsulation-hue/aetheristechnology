import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Copy, CheckCircle2, XCircle, SkipForward, Trash2, Plus, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

type Status = 'pending' | 'claimed' | 'posted' | 'failed' | 'skipped';

interface Row {
  id: string;
  platform: string;
  content: string;
  media_url: string | null;
  notes: string | null;
  status: Status;
  claimed_by: string | null;
  result_url: string | null;
  failure_reason: string | null;
  created_at: string;
}

const PLATFORMS = ['linkedin', 'x', 'facebook', 'instagram', 'other'];

const STATUS_STYLE: Record<Status, string> = {
  pending: 'bg-amber/10 text-amber border-amber/30',
  claimed: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  posted: 'bg-green-500/10 text-green-500 border-green-500/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  skipped: 'bg-muted text-muted-foreground border-border',
};

const AdminSocialQueuePanel: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [platform, setPlatform] = useState('linkedin');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const [resultUrls, setResultUrls] = useState<Record<string, string>>({});
  const [failReasons, setFailReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const token = getAdminToken();
    const { data, error } = await supabase.functions.invoke('social-post-requests', {
      body,
      headers: token ? { 'x-admin-token': token } : {},
    });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: 'list' });
      setRows(data?.requests || []);
    } catch (e) {
      toast({ title: 'Failed to load queue', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  useEffect(() => { load(); }, [load]);

  const addRequest = async () => {
    if (!content.trim()) {
      toast({ title: 'Content is empty', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      await call({ action: 'create', platform, content: content.trim(), mediaUrl: mediaUrl.trim() || undefined });
      setContent('');
      setMediaUrl('');
      toast({ title: 'Added to queue' });
      load();
    } catch (e) {
      toast({ title: 'Failed to add', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied' });
    } catch {
      toast({ title: 'Copy failed — select and copy manually', variant: 'destructive' });
    }
  };

  const markPosted = async (row: Row) => {
    setBusyId(row.id);
    try {
      await call({ action: 'complete', id: row.id, resultUrl: resultUrls[row.id] || undefined });
      toast({ title: 'Marked posted' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const markFailed = async (row: Row) => {
    setBusyId(row.id);
    try {
      await call({ action: 'fail', id: row.id, reason: failReasons[row.id] || undefined });
      toast({ title: 'Marked failed' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const skip = async (row: Row) => {
    setBusyId(row.id);
    try {
      await call({ action: 'skip', id: row.id });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: Row) => {
    if (!confirm('Delete this request?')) return;
    setBusyId(row.id);
    try {
      await call({ action: 'delete', id: row.id });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">Browser-Agent Post Queue</h2>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Nothing here posts automatically. Add content below, then a browser-controlling agent (or you) opens the
        target platform in a browser tab, pastes the content, publishes it, and reports the result back here.
      </p>

      <div className="glass rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Platform</Label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full mt-1.5 text-sm border border-border rounded px-2 py-2 bg-background">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Media URL (optional)</Label>
            <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…/image.jpg" className="mt-1.5 text-sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="mt-1.5 font-mono text-sm" placeholder="What should get posted…" />
        </div>
        <Button onClick={addRequest} disabled={adding || !content.trim()}>
          {adding ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />} Add to queue
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Queue is empty.</div>
        ) : rows.map((row) => (
          <div key={row.id} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wide bg-amber/10 text-amber border border-amber/30">{row.platform}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide border ${STATUS_STYLE[row.status]}`}>{row.status}</span>
                {row.claimed_by && <span className="text-[10px] text-muted-foreground">claimed by {row.claimed_by}</span>}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
            </div>

            <div className="text-sm whitespace-pre-wrap bg-background/40 border border-border rounded p-3">{row.content}</div>
            {row.media_url && <div className="text-xs text-muted-foreground break-all">Media: {row.media_url}</div>}

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(row.content)}>
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy content
              </Button>
              {row.media_url && (
                <Button size="sm" variant="outline" onClick={() => copy(row.media_url!)}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy media URL
                </Button>
              )}
            </div>

            {(row.status === 'pending' || row.status === 'claimed') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Result URL (the live post)"
                    value={resultUrls[row.id] || ''}
                    onChange={(e) => setResultUrls((s) => ({ ...s, [row.id]: e.target.value }))}
                    className="text-xs"
                  />
                  <Button size="sm" onClick={() => markPosted(row)} disabled={busyId === row.id}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Posted
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Failure reason"
                    value={failReasons[row.id] || ''}
                    onChange={(e) => setFailReasons((s) => ({ ...s, [row.id]: e.target.value }))}
                    className="text-xs"
                  />
                  <Button size="sm" variant="destructive" onClick={() => markFailed(row)} disabled={busyId === row.id}>
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Failed
                  </Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => skip(row)} disabled={busyId === row.id}>
                  <SkipForward className="w-3.5 h-3.5 mr-1.5" /> Skip
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(row)} disabled={busyId === row.id}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            )}

            {row.status === 'posted' && row.result_url && (
              <a href={row.result_url} target="_blank" rel="noreferrer" className="text-xs underline text-green-500 break-all">{row.result_url}</a>
            )}
            {row.status === 'failed' && row.failure_reason && (
              <div className="text-xs text-destructive">{row.failure_reason}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSocialQueuePanel;
