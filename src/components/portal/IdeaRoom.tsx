import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import { getAdminToken } from '@/lib/adminAuth';
import { Lightbulb, Plus, Trash2, Pencil, Check, MessageSquare, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Idea {
  id: string;
  rep_code: string;
  rep_name: string | null;
  title: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  admin_notes: string | null;
  admin_reply: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Structured topic library — reps pick from these so admin can filter by subject.
// Stored in the existing `category` column on rep_ideas (no migration needed).
const TOPIC_GROUPS: Array<{ group: string; topics: string[] }> = [
  { group: 'Company & Strategy', topics: ['company-vision', 'positioning', 'pricing', 'commission-structure', 'partnerships'] },
  { group: 'Sales Process', topics: ['cold-outreach', 'discovery-calls', 'objection-handling', 'follow-up', 'closing', 'pipeline-management'] },
  { group: 'Leads & Prospecting', topics: ['lead-quality', 'lead-sources', 'scraping', 'enrichment', 'territory'] },
  { group: 'Tools & Software', topics: ['portal-ui', 'scanner-tool', 'crm', 'extension', 'outlook-mail', 'ai-coach', 'mobile'] },
  { group: 'Training & Onboarding', topics: ['rep-training', 'playbook', 'scripts', 'product-knowledge', 'role-play'] },
  { group: 'Marketing & Content', topics: ['linkedin', 'blog', 'webinars', 'social-content', 'case-studies', 'collateral'] },
  { group: 'Operations', topics: ['workflow', 'documentation', 'meetings', 'reporting', 'admin-tasks'] },
  { group: 'Client Experience', topics: ['onboarding-clients', 'deliverables', 'retention', 'upsell'] },
  { group: 'Bugs & Issues', topics: ['bug-report', 'broken-feature', 'data-issue', 'performance'] },
  { group: 'Other', topics: ['general', 'feature-request', 'team-culture'] },
];
const ALL_TOPICS: string[] = TOPIC_GROUPS.flatMap(g => g.topics);
const topicLabel = (t: string) => t.split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
const groupForTopic = (t: string): string => TOPIC_GROUPS.find(g => g.topics.includes(t))?.group ?? 'Other';
const PRIORITIES: Array<{ key: string; label: string }> = [
  { key: 'low', label: 'Low' },
  { key: 'normal', label: 'Normal' },
  { key: 'high', label: 'High' },
  { key: 'urgent', label: 'Urgent' },
];
const STATUSES: Array<{ key: string; label: string; tone: string }> = [
  { key: 'new', label: 'New', tone: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  { key: 'reviewing', label: 'Reviewing', tone: 'bg-amber/15 text-amber border-amber/30' },
  { key: 'approved', label: 'Approved', tone: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { key: 'in_progress', label: 'In Progress', tone: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  { key: 'done', label: 'Done ✓', tone: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' },
  { key: 'rejected', label: 'Rejected', tone: 'bg-crimson/15 text-crimson border-crimson/30' },
];
const statusTone = (s: string) => STATUSES.find(x => x.key === s)?.tone ?? 'bg-muted text-foreground';
const statusLabel = (s: string) => STATUSES.find(x => x.key === s)?.label ?? s;

interface Props { isAdmin?: boolean }

export const IdeaRoom: React.FC<Props> = ({ isAdmin = false }) => {
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', body: '', category: 'general', priority: 'normal' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Idea>>>({});

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const headers: Record<string, string> = {};
    if (isAdmin) {
      const t = getAdminToken();
      if (t) headers['x-admin-token'] = t;
    } else {
      const t = getPortalToken();
      if (t) headers['x-portal-token'] = t;
    }
    const { data, error } = await supabase.functions.invoke('rep-ideas', { body: payload, headers });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await call({ action: 'list' });
      setIdeas(d.ideas || []);
    } catch (e) {
      toast({ title: 'Failed to load ideas', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (form.title.trim().length < 3 || form.body.trim().length < 3) {
      toast({ title: 'Add a title and idea', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await call({ action: 'create', ...form });
      setForm({ title: '', body: '', category: 'general', priority: 'normal' });
      toast({ title: 'Idea submitted', description: isAdmin ? 'Logged.' : 'Joseph will review it.' });
      load();
    } catch (e) {
      toast({ title: 'Submit failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const removeIdea = async (id: string) => {
    if (!confirm('Delete this idea?')) return;
    try {
      await call({ action: 'delete', id });
      setIdeas(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const saveEdit = async (id: string) => {
    const patch = edits[id] || {};
    try {
      const action = isAdmin ? 'admin_update' : 'update_own';
      const d = await call({ action, id, ...patch });
      setIdeas(prev => prev.map(i => i.id === id ? d.idea : i));
      setEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      toast({ title: 'Saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      const d = await call({ action: 'admin_update', id, status });
      setIdeas(prev => prev.map(i => i.id === id ? d.idea : i));
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = ideas.filter(i =>
    (filter === 'all' || i.status === filter) &&
    (topicFilter === 'all' || i.category === topicFilter || groupForTopic(i.category) === topicFilter) &&
    (!q || i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q) || (i.rep_name || '').toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
  );
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => { acc[s.key] = ideas.filter(i => i.status === s.key).length; return acc; }, {});
  const topicCounts: Record<string, number> = {};
  for (const i of ideas) topicCounts[i.category] = (topicCounts[i.category] || 0) + 1;
  const topicsInUse = Object.keys(topicCounts).sort();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber" /> Idea Room
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? 'Every idea your team has posted. Review, reply, edit, change status, or delete. Saves meetings.'
            : 'Got an idea to improve the system, the tools, the process — anything? Drop it here. Joseph reads every one.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber" /> Submit a new idea
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Short title (e.g. 'Add a 1-click lead skip')"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            maxLength={200}
          />
          <Textarea
            placeholder="Explain the idea, the problem it solves, and any proposed approach…"
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={5}
            maxLength={5000}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {TOPIC_GROUPS.map(g => (
                  <div key={g.group}>
                    <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{g.group}</div>
                    {g.topics.map(t => <SelectItem key={t} value={t}>{topicLabel(t)}</SelectItem>)}
                  </div>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={submit} disabled={creating} className="w-full">
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : <><Plus className="w-4 h-4 mr-2" /> Submit Idea</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${filter === 'all' ? 'bg-amber/15 text-amber border-amber/40' : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          All ({ideas.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${filter === s.key ? s.tone : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            {s.label} ({counts[s.key] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading ideas…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          No ideas {filter !== 'all' && `in "${statusLabel(filter)}"`} yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(idea => {
            const isOpen = expanded === idea.id;
            const editing = !!edits[idea.id];
            const e = edits[idea.id] || {};
            const canRepEdit = !isAdmin && (idea.status === 'new' || idea.status === 'reviewing');
            const canRepDelete = !isAdmin && idea.status === 'new';
            return (
              <Card key={idea.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${statusTone(idea.status)}`}>{statusLabel(idea.status)}</Badge>
                        <Badge variant="outline" className="text-xs">{idea.category}</Badge>
                        {idea.priority !== 'normal' && <Badge variant="outline" className="text-xs uppercase">{idea.priority}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {idea.rep_name || idea.rep_code} · {new Date(idea.created_at).toLocaleDateString()}
                        </span>
                        {idea.reviewed_at && (
                          <span className="text-xs text-emerald-400/80">✓ Reviewed {new Date(idea.reviewed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <CardTitle className="text-base mt-2 font-display">{idea.title}</CardTitle>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : idea.id)}>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-4 border-t border-border/40 pt-4">
                    {editing ? (
                      <>
                        <Input
                          value={e.title ?? idea.title}
                          onChange={ev => setEdits(p => ({ ...p, [idea.id]: { ...p[idea.id], title: ev.target.value } }))}
                        />
                        <Textarea
                          rows={4}
                          value={e.body ?? idea.body}
                          onChange={ev => setEdits(p => ({ ...p, [idea.id]: { ...p[idea.id], body: ev.target.value } }))}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{idea.body}</p>
                    )}

                    {isAdmin && (
                      <div className="space-y-3 rounded-lg bg-amber/5 border border-amber/20 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-amber">
                          <MessageSquare className="w-3.5 h-3.5" /> Admin tools
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Select value={idea.status} onValueChange={v => setStatus(idea.id, v)}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select
                            value={e.priority ?? idea.priority}
                            onValueChange={v => {
                              setEdits(p => ({ ...p, [idea.id]: { ...p[idea.id], priority: v } }));
                            }}
                          >
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PRIORITIES.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Textarea
                          placeholder="Reply to the rep (they'll see this)…"
                          rows={2}
                          value={e.admin_reply ?? idea.admin_reply ?? ''}
                          onChange={ev => setEdits(p => ({ ...p, [idea.id]: { ...p[idea.id], admin_reply: ev.target.value } }))}
                        />
                        <Textarea
                          placeholder="Private admin notes (rep does NOT see this)…"
                          rows={2}
                          value={e.admin_notes ?? idea.admin_notes ?? ''}
                          onChange={ev => setEdits(p => ({ ...p, [idea.id]: { ...p[idea.id], admin_notes: ev.target.value } }))}
                        />
                      </div>
                    )}

                    {!isAdmin && idea.admin_reply && (
                      <div className="rounded-lg bg-amber/5 border border-amber/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-amber font-mono mb-1">Joseph's reply</p>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{idea.admin_reply}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {isAdmin && idea.status !== 'done' && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(idea.id, 'done')}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Mark done
                        </Button>
                      )}
                      {(isAdmin || canRepEdit) && !editing && (
                        <Button size="sm" variant="outline" onClick={() => setEdits(p => ({ ...p, [idea.id]: {} }))}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      )}
                      {editing && (
                        <>
                          <Button size="sm" onClick={() => saveEdit(idea.id)}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEdits(p => { const n = { ...p }; delete n[idea.id]; return n; })}>
                            <X className="w-3.5 h-3.5 mr-1" /> Cancel
                          </Button>
                        </>
                      )}
                      {isAdmin && !editing && (
                        <Button size="sm" onClick={() => saveEdit(idea.id)} variant="ghost" disabled={!edits[idea.id]}>
                          Save admin fields
                        </Button>
                      )}
                      {(isAdmin || canRepDelete) && (
                        <Button size="sm" variant="ghost" className="text-crimson hover:text-crimson ml-auto" onClick={() => removeIdea(idea.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IdeaRoom;
