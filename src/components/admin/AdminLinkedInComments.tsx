import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Sparkles, Copy, ExternalLink, Trash2, CheckCircle2,
  Save, MessageSquare, RefreshCw,
} from 'lucide-react';

type Draft = {
  id: string;
  post_url: string | null;
  post_author: string | null;
  post_context: string | null;
  draft_text: string;
  tone: string | null;
  status: string;
  posted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const TONES = ['forensic-operator', 'contrarian', 'supportive', 'question', 'short-jab'];
const STATUSES = ['all', 'draft', 'ready', 'posted', 'archived'];

const invoke = async (action: string, body: Record<string, unknown> = {}) => {
  const token = getAdminToken();
  const { data, error } = await supabase.functions.invoke('linkedin-comments', {
    body: { action, ...body },
    headers: token ? { 'x-admin-token': token } : {},
  });
  if (error) {
    const detail = (error as any)?.context ? await (error as any).context.text().catch(() => '') : '';
    throw new Error(detail || error.message);
  }
  return data;
};

export const AdminLinkedInComments: React.FC = () => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Composer state
  const [postUrl, setPostUrl] = useState('');
  const [postAuthor, setPostAuthor] = useState('');
  const [postContext, setPostContext] = useState('');
  const [tone, setTone] = useState('forensic-operator');
  const [variants, setVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [customDraft, setCustomDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await invoke('list', { status: filter });
      setDrafts(data?.drafts ?? []);
    } catch (e) {
      toast({ title: 'Failed to load drafts', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const generate = async () => {
    if (!postContext.trim()) {
      toast({ title: 'Paste the post text or context first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setVariants([]);
    try {
      const data = await invoke('generate', {
        post_context: postContext.trim(),
        post_author: postAuthor || undefined,
        tone,
        variants: 3,
      });
      const list: string[] = data?.variants ?? [];
      setVariants(list);
      setSelectedVariant(0);
      setCustomDraft(list[0] ?? '');
    } catch (e) {
      toast({ title: 'AI generation failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async (status: 'draft' | 'ready' = 'draft') => {
    const text = customDraft.trim();
    if (!text) {
      toast({ title: 'Draft is empty', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = await invoke('create', {
        post_url: postUrl || null,
        post_author: postAuthor || null,
        post_context: postContext || null,
        draft_text: text,
        tone,
      });
      if (status === 'ready' && data?.draft?.id) {
        await invoke('update', { id: data.draft.id, status: 'ready' });
      }
      toast({ title: status === 'ready' ? 'Saved as ready to post' : 'Draft saved' });
      // Reset composer
      setVariants([]);
      setCustomDraft('');
      await load();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const copyText = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const mark = async (id: string, status: string, url?: string | null) => {
    try {
      await invoke('update', { id, status });
      toast({ title: `Marked as ${status}` });
      if (status === 'posted' && url) window.open(url, '_blank', 'noopener');
      await load();
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this draft?')) return;
    try {
      await invoke('delete', { id });
      await load();
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const editInline = async (id: string, patch: Partial<Draft>) => {
    try {
      await invoke('update', { id, ...patch });
      await load();
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const grouped = useMemo(() => drafts, [drafts]);

  return (
    <div className="space-y-6">
      {/* Composer */}
      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber" />
          <h3 className="font-semibold text-sm">Draft a comment reply</h3>
          <span className="ml-auto text-[10px] font-mono uppercase text-muted-foreground">
            Manual paste — LinkedIn API doesn't allow bot-posted comments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            placeholder="LinkedIn post URL (optional)"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
          />
          <Input
            placeholder="Post author (optional)"
            value={postAuthor}
            onChange={(e) => setPostAuthor(e.target.value)}
          />
        </div>

        <Textarea
          rows={5}
          placeholder="Paste the LinkedIn post text or context you're replying to…"
          value={postContext}
          onChange={(e) => setPostContext(e.target.value)}
          className="text-sm"
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-mono uppercase text-muted-foreground">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="text-sm border border-border rounded px-2 py-1 bg-background"
          >
            {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button onClick={generate} disabled={generating} size="sm">
            {generating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Drafting…</>
              : <><Sparkles className="w-4 h-4 mr-2" />Generate 3 replies</>}
          </Button>
        </div>

        {variants.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase text-muted-foreground">Variants</div>
            <div className="grid grid-cols-1 gap-2">
              {variants.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelectedVariant(i); setCustomDraft(v); }}
                  className={`text-left text-sm p-3 rounded border transition-colors ${
                    selectedVariant === i
                      ? 'border-amber bg-amber/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                    Variant {i + 1} · {v.length} chars
                  </div>
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-mono uppercase text-muted-foreground mb-1 block">
            Final reply text (editable)
          </label>
          <Textarea
            rows={4}
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            placeholder="Write or edit your reply. This is what you'll paste into LinkedIn."
            className="text-sm"
          />
          <div className="text-[10px] font-mono uppercase text-muted-foreground mt-1">
            {customDraft.length} chars
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => saveDraft('draft')} disabled={saving || !customDraft.trim()} variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" /> Save draft
          </Button>
          <Button onClick={() => saveDraft('ready')} disabled={saving || !customDraft.trim()} size="sm">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Save as ready
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyText(customDraft)}
            disabled={!customDraft.trim()}
          >
            <Copy className="w-4 h-4 mr-2" /> Copy
          </Button>
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Open post
            </a>
          )}
        </div>
      </div>

      {/* Queue */}
      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">Comment queue</h3>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs border border-border rounded px-2 py-1 bg-background"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {grouped.length === 0 && (
          <div className="text-xs text-muted-foreground py-6 text-center">
            {loading ? 'Loading…' : 'No drafts yet. Generate one above.'}
          </div>
        )}

        <div className="space-y-2">
          {grouped.map((d) => (
            <div key={d.id} className="border border-border rounded p-3 space-y-2 bg-background/40">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={d.status === 'posted' ? 'default' : 'secondary'} className="text-[10px]">
                  {d.status}
                </Badge>
                {d.post_author && <span className="text-xs text-muted-foreground">→ {d.post_author}</span>}
                {d.tone && <span className="text-[10px] font-mono text-muted-foreground">{d.tone}</span>}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(d.created_at).toLocaleString()}
                </span>
              </div>

              <Textarea
                rows={3}
                defaultValue={d.draft_text}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== d.draft_text) {
                    editInline(d.id, { draft_text: e.target.value });
                  }
                }}
                className="text-sm"
              />

              {d.post_context && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Original post context</summary>
                  <div className="whitespace-pre-wrap mt-1 p-2 bg-muted/30 rounded">{d.post_context}</div>
                </details>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => copyText(d.draft_text)}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                </Button>
                {d.post_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={d.post_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open post
                    </a>
                  </Button>
                )}
                {d.status !== 'ready' && (
                  <Button size="sm" variant="ghost" onClick={() => editInline(d.id, { status: 'ready' })}>
                    Mark ready
                  </Button>
                )}
                {d.status !== 'posted' && (
                  <Button size="sm" onClick={() => mark(d.id, 'posted', d.post_url)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Copy & mark posted
                  </Button>
                )}
                {d.status !== 'archived' && (
                  <Button size="sm" variant="ghost" onClick={() => editInline(d.id, { status: 'archived' })}>
                    Archive
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => remove(d.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLinkedInComments;
