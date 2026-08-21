// Substack publishing assistant.
// Substack has no public write API, so this turns LinkedIn posts into
// ready to paste long form drafts, tracks their status, and can email the
// finished draft on a schedule.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, RefreshCw, Sparkles, Copy, Check, Trash2, Save, Mail, ExternalLink, FileText,
} from 'lucide-react';

const SUBSTACK_EDITOR = 'https://substack.com/publish/post';

type Source = {
  kind: 'linkedin' | 'calendar';
  id: string;
  urn: string | null;
  text: string;
  image_url: string | null;
  date: string | null;
};

type Draft = {
  id: string;
  source_post_id: string | null;
  source_urn: string | null;
  source_kind: string;
  title: string;
  subtitle: string;
  body: string;
  image_url: string | null;
  status: string;
  scheduled_for: string | null;
  emailed_at: string | null;
  email_to: string | null;
  published_url: string | null;
  created_at: string;
};

async function callSubstack(action: string, payload: Record<string, unknown> = {}) {
  const token = getAdminToken();
  const { data, error } = await supabase.functions.invoke('substack-draft', {
    body: { action, ...payload },
    headers: token ? { 'x-admin-token': token } : {},
  });
  if (error) {
    const detail = (error as any)?.context ? await (error as any).context.text().catch(() => '') : '';
    throw new Error(detail || error.message);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

const statusTone: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  ready: 'bg-amber/20 text-amber',
  published: 'bg-emerald-500/20 text-emerald-400',
};

export const AdminSubstackPanel: React.FC = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [direction, setDirection] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: '', subtitle: '', body: '' });
  const [emailTo, setEmailTo] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [copied, setCopied] = useState<string>('');

  const active = useMemo(() => drafts.find((d) => d.id === activeId) ?? null, [drafts, activeId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([callSubstack('sources'), callSubstack('list')]);
      setSources(s?.sources ?? []);
      setDrafts(d?.drafts ?? []);
    } catch (e) {
      toast({ title: 'Could not load Substack data', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openDraft = (d: Draft) => {
    setActiveId(d.id);
    setEdit({ title: d.title, subtitle: d.subtitle, body: d.body });
    setEmailTo(d.email_to ?? '');
    setScheduledFor(d.scheduled_for ? d.scheduled_for.slice(0, 16) : '');
  };

  const generate = async () => {
    if (!selectedSource) return;
    setGenerating(true);
    try {
      const res = await callSubstack('generate', {
        sourceText: selectedSource.text,
        direction,
        sourcePostId: selectedSource.kind === 'calendar' ? selectedSource.id : null,
        sourceUrn: selectedSource.urn,
        sourceKind: selectedSource.kind,
        imageUrl: selectedSource.image_url,
      });
      const draft = res.draft as Draft;
      setDrafts((prev) => [draft, ...prev]);
      openDraft(draft);
      setDirection('');
      toast({ title: 'Draft ready', description: 'Review it, then copy into Substack.' });
    } catch (e) {
      toast({ title: 'Generation failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const save = async (patch: Record<string, unknown> = {}) => {
    if (!active) return;
    setBusy('save');
    try {
      const res = await callSubstack('save', { id: active.id, ...edit, emailTo, scheduledFor: scheduledFor || null, ...patch });
      setDrafts((prev) => prev.map((d) => (d.id === active.id ? res.draft : d)));
      toast({ title: 'Saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this Substack draft?')) return;
    setBusy('delete');
    try {
      await callSubstack('delete', { id });
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const email = async () => {
    if (!active) return;
    setBusy('email');
    try {
      await callSubstack('email', { id: active.id, emailTo: emailTo || undefined });
      toast({ title: 'Draft emailed', description: emailTo || 'Sent to the default address.' });
      load();
    } catch (e) {
      toast({ title: 'Email failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading Substack workspace…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Substack</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Substack has no public posting API, so this expands a LinkedIn post into a full essay,
            keeps it here, and hands you clean copy blocks to paste. You can also have the finished
            draft emailed to you at a set time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh</Button>
          <a href={SUBSTACK_EDITOR} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline"><ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Substack editor</Button>
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Left: sources + drafts */}
        <div className="space-y-6">
          <div className="border border-border rounded-lg p-4">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Source posts</div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sources.length === 0 && <p className="text-sm text-muted-foreground">No LinkedIn posts found yet.</p>}
              {sources.map((s) => (
                <button
                  key={`${s.kind}-${s.id}`}
                  onClick={() => setSelectedSource(s)}
                  className={`w-full text-left text-xs p-2 rounded border transition ${
                    selectedSource?.id === s.id ? 'border-amber bg-amber/10' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{s.kind}</Badge>
                    <span className="text-muted-foreground">{s.date ? new Date(s.date).toLocaleDateString() : ''}</span>
                  </div>
                  <span className="line-clamp-2 text-foreground/80">{s.text.slice(0, 160)}</span>
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3 text-xs"
              rows={2}
              placeholder="Optional editorial direction for the essay"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            />
            <Button className="w-full mt-2" size="sm" disabled={!selectedSource || generating} onClick={generate}>
              {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Expand into Substack essay
            </Button>
          </div>

          <div className="border border-border rounded-lg p-4">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Drafts</div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {drafts.length === 0 && <p className="text-sm text-muted-foreground">Nothing drafted yet.</p>}
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className={`p-2 rounded border cursor-pointer transition ${
                    activeId === d.id ? 'border-amber bg-amber/10' : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => openDraft(d)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium line-clamp-1">{d.title || 'Untitled'}</span>
                    <Badge className={`text-[10px] ${statusTone[d.status] ?? ''}`}>{d.status}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(d.created_at).toLocaleDateString()}
                    {d.emailed_at ? ' · emailed' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: editor */}
        <div className="border border-border rounded-lg p-4 min-h-[400px]">
          {!active ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2 py-16">
              <FileText className="w-8 h-8 opacity-40" />
              <p className="text-sm">Pick a source post and expand it, or open an existing draft.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => copy('title', edit.title)}>
                  {copied === 'title' ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />} Title
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy('subtitle', edit.subtitle)}>
                  {copied === 'subtitle' ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />} Subtitle
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy('body', edit.body)}>
                  {copied === 'body' ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />} Body
                </Button>
              </div>

              <Input value={edit.title} onChange={(e) => setEdit((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="text-lg font-semibold" />
              <Input value={edit.subtitle} onChange={(e) => setEdit((p) => ({ ...p, subtitle: e.target.value }))} placeholder="Subtitle" />
              <Textarea value={edit.body} onChange={(e) => setEdit((p) => ({ ...p, body: e.target.value }))} rows={20} className="font-serif text-sm leading-relaxed" />

              {active.image_url && (
                <img src={active.image_url} alt="Draft header" className="rounded border border-border max-h-48 object-cover" />
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Email draft to</label>
                  <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="you@aetheris.technology" />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Send at</label>
                  <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Published URL</label>
                <Input
                  defaultValue={active.published_url ?? ''}
                  placeholder="https://yourpub.substack.com/p/..."
                  onBlur={(e) => save({ published_url: e.target.value || null })}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" disabled={busy !== ''} onClick={() => save()}>
                  {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Save
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== ''} onClick={email}>
                  {busy === 'email' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1.5" />} Email it now
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== ''} onClick={() => save({ status: 'ready' })}>Mark ready</Button>
                <Button size="sm" variant="outline" disabled={busy !== ''} onClick={() => save({ status: 'published' })}>Mark published</Button>
                <Button size="sm" variant="destructive" disabled={busy !== ''} onClick={() => remove(active.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSubstackPanel;
