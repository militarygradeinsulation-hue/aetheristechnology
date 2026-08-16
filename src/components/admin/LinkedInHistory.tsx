import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Trash2, Save, ExternalLink, History, MessageSquare } from 'lucide-react';

export type LinkedInPublication = {
  id: string;
  post_urn: string | null;
  content_post_id: string | null;
  text: string;
  visibility: string;
  image_url: string | null;
  auto_comment: string | null;
  auto_comment_status: string | null;
  source: string;
  status: string;
  published_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

async function callLinkedIn(action: string, payload: Record<string, unknown> = {}) {
  const token = getAdminToken();
  const { data, error } = await supabase.functions.invoke('linkedin-publish', {
    body: { action, ...payload },
    headers: token ? { 'x-admin-token': token } : {},
  });
  if (error) {
    const detail = (error as any)?.context ? await (error as any).context.text().catch(() => '') : '';
    throw new Error(detail || error.message);
  }
  if ((data as any)?.error) throw new Error(`${(data as any).error}${(data as any).details ? `: ${(data as any).details}` : ''}`);
  return data;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

export const LinkedInHistory: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<LinkedInPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LinkedInPublication | null>(null);
  const [draft, setDraft] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'' | 'save' | 'delete' | 'comment'>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callLinkedIn('history', { limit: 100 });
      setRows((data?.history ?? []) as LinkedInPublication[]);
    } catch (e) {
      toast({ title: 'Could not load LinkedIn history', description: (e as Error).message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const open = (row: LinkedInPublication) => {
    setSelected(row);
    setDraft(row.text);
    setComment('');
  };

  const saveEdit = async () => {
    if (!selected?.post_urn) return;
    setBusy('save');
    try {
      await callLinkedIn('update', { postUrn: selected.post_urn, text: draft.trim() });
      setRows((prev) => prev.map((r) => r.id === selected.id ? { ...r, text: draft.trim(), edited_at: new Date().toISOString() } : r));
      toast({ title: 'LinkedIn post updated' });
      setSelected(null);
    } catch (e) {
      toast({ title: 'Edit failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(''); }
  };

  const remove = async () => {
    if (!selected) return;
    setBusy('delete');
    try {
      if (selected.post_urn && selected.status !== 'deleted') {
        await callLinkedIn('delete', { postUrn: selected.post_urn });
        setRows((prev) => prev.map((r) => r.id === selected.id ? { ...r, status: 'deleted', deleted_at: new Date().toISOString() } : r));
        toast({ title: 'Deleted from LinkedIn' });
      } else {
        await callLinkedIn('forget', { id: selected.id });
        setRows((prev) => prev.filter((r) => r.id !== selected.id));
        toast({ title: 'Removed from history' });
      }
      setSelected(null);
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(''); }
  };

  const sendComment = async () => {
    if (!selected?.post_urn || !comment.trim()) return;
    setBusy('comment');
    try {
      await callLinkedIn('comment', { postUrn: selected.post_urn, message: comment.trim() });
      setRows((prev) => prev.map((r) => r.id === selected.id ? { ...r, auto_comment: comment.trim(), auto_comment_status: 'posted' } : r));
      toast({ title: 'Comment posted' });
      setComment('');
    } catch (e) {
      toast({ title: 'Comment failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(''); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Live post history
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {loading && rows.length === 0 && (
        <div className="text-xs text-muted-foreground">Loading…</div>
      )}
      {!loading && rows.length === 0 && (
        <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
          Nothing published yet. Posts sent from here or from the calendar appear with their exact date and time.
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => open(r)}
            className="w-full text-left border border-border rounded-lg p-3 hover:border-amber transition bg-card"
          >
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-[11px] text-amber">{fmtDate(r.published_at)}</span>
              <Badge variant="outline" className="text-[9px] uppercase">{r.source}</Badge>
              <Badge
                variant="outline"
                className={`text-[9px] uppercase ${r.status === 'deleted' ? 'text-destructive border-destructive/40' : 'text-emerald-500 border-emerald-500/40'}`}
              >
                {r.status}
              </Badge>
              {r.edited_at && <span className="text-[10px] text-muted-foreground">edited</span>}
              {r.auto_comment_status && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />{r.auto_comment_status}
                </span>
              )}
            </div>
            <div className="text-xs text-foreground/90 line-clamp-2 whitespace-pre-wrap">{r.text}</div>
          </button>
        ))}
      </div>

      {selected && (
        <Dialog open onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">
                Published {fmtDate(selected.published_at)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {selected.image_url && (
                <img src={selected.image_url} alt="Published LinkedIn post image" className="w-full max-h-64 object-contain rounded-md border border-border" />
              )}
              <Textarea rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-sm" />

              <div className="flex flex-wrap gap-2">
                <Button onClick={saveEdit} disabled={busy !== '' || !draft.trim() || selected.status === 'deleted' || !selected.post_urn}>
                  {busy === 'save' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save edit to LinkedIn
                </Button>
                {selected.post_urn && (
                  <Button asChild variant="outline">
                    <a
                      href={`https://www.linkedin.com/feed/update/${selected.post_urn}/`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />View on LinkedIn
                    </a>
                  </Button>
                )}
                <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={remove} disabled={busy !== ''}>
                  {busy === 'delete' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  {selected.status === 'deleted' ? 'Remove from history' : 'Delete from LinkedIn'}
                </Button>
              </div>

              {selected.status !== 'deleted' && selected.post_urn && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Add a comment</div>
                  <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment on this post…" />
                  <Button size="sm" onClick={sendComment} disabled={busy !== '' || !comment.trim()}>
                    {busy === 'comment' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                    Post comment
                  </Button>
                  {selected.auto_comment && (
                    <div className="text-[11px] text-muted-foreground">
                      Auto-comment ({selected.auto_comment_status}): {selected.auto_comment}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LinkedInHistory;
