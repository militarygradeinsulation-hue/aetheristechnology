import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar, Sparkles, Settings, ChevronLeft, ChevronRight, Copy, Check, Trash2,
  RefreshCw, X, Edit3, Download, Save, RotateCw, CalendarDays, CopyPlus, Clock, Zap, Loader2,
  PenLine,
} from 'lucide-react';
import { PostImageGenerator } from './PostImageGenerator';
import LinkedInPostStudio from './LinkedInPostStudio';
import { saveToAdminLibrary } from '@/lib/adminLibrary';

type Strategy = {
  id: string;
  business_description: string;
  niche: string;
  target_buyer: string;
  goals: string[];
  frequency: string;
  posting_days: string[];
  posting_times: string[];
  format_mix: Record<string, number>;
  voice_reference: string;
  cta_link: string;
};

type Post = {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  format: string;
  topic_angle: string;
  target_emotion: string | null;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  status: string;
  generated_at: string;
  thumbnail_url?: string | null;
  thumbnail_status?: string | null;
  thumbnail_reference_id?: string | null;
  thumbnail_generated_at?: string | null;
};

type Headshot = {
  id: string;
  public_url: string;
  tag: string;
  label: string;
  is_default: boolean;
  disabled: boolean;
};

const NICHES = [
  'Commercial Playground Equipment','Specialty Manufacturing','Commercial Signage',
  'Modular Buildings','Custom Fabrication','MEP Contractors','Industrial Coatings','Other',
];
const GOAL_OPTIONS = [
  'Generate inbound leads','Build authority in niche','Drive shadow audit signups',
  'Recruit partners','Educate the market',
];
const FREQUENCIES = ['1x/week','2x/week','3x/week','4x/week','5x/week','7x/week','2x/day'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const FORMAT_INFO: Record<string, { name: string; ring: string; bg: string; text: string; bar: string; description: string }> = {
  auditRoast:    { name: 'Audit Roast',    ring: 'border-amber/50',                bg: 'bg-amber/10',                  text: 'text-amber',                bar: 'bg-amber',                description: 'Brutally specific takedown with real numbers. Ends with "wonder what\'s broken in yours?"' },
  patternReveal: { name: 'Pattern Reveal', ring: 'border-cyan-500/50',             bg: 'bg-cyan-500/10',               text: 'text-cyan-400',             bar: 'bg-cyan-500',             description: 'Expose a leak found in 80% of niche businesses. Give away the recipe.' },
  founderPOV:    { name: 'Founder POV',    ring: 'border-purple-500/50',           bg: 'bg-purple-500/10',             text: 'text-purple-400',           bar: 'bg-purple-500',           description: 'Behind-the-scenes building, deploying, finding wins. Builds operator credibility.' },
  counterTake:   { name: 'Counter-Take',   ring: 'border-yellow-500/50',           bg: 'bg-yellow-500/10',             text: 'text-yellow-400',           bar: 'bg-yellow-500',           description: 'Disagree with conventional wisdom. "Everyone says X. That\'s wrong. Here\'s why."' },
};

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Draft',    cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Approved', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  posted:   { label: 'Posted',   cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const PREMADE_TITLE_GROUPS: Record<string, string[]> = {
  'Leak Audit': [
    'The 5 silent leaks bleeding 6-figures from your ops',
    'Why your "best" rep is actually your biggest leak',
    'The follow-up gap that costs $40k/month (and nobody tracks it)',
    'Stop calling it a pipeline problem — it\'s a process leak',
    'The ghosted-proposal autopsy: where the deal actually died',
    'Three questions that expose a leaking sales process in 10 minutes',
    'The retention leak hiding in your onboarding (and how to seal it)',
    'Quote-to-cash: where most B2B operators lose 8-12% margin',
    'The 7 leaks every $5M-$50M business has (and refuses to look at)',
    'Why "more leads" is the wrong fix 70% of the time',
    'The Leak Audit™ explained in 90 seconds',
    'What a leak actually looks like on a P&L (it doesn\'t say "leak")',
  ],
  'Forensic Diagnostic': [
    'How a $7M shop found $1.2M in 14 days without hiring',
    'What I found inside a $30M company\'s revenue ops in 90 minutes',
    'The 14-day Forensic Diagnostic framework I run on every engagement',
    'Why I charge $2,500 flat to look — and why it\'s the cheapest thing you\'ll buy this year',
    'Inside a real diagnostic: 4 leaks, $480k recovered, no new tools',
    'The case for a forensic diagnostic before any tech stack rebuild',
    'Diagnostic vs. consulting call: why one finds money and the other wastes time',
    'The 3 numbers I ask for before I\'ll take a diagnostic engagement',
  ],
  'Operator POV': [
    'Owner-operators: the 4 reports your finance lead should be running',
    'The 3 metrics every operator should run weekly (most don\'t)',
    'How to stop your ops team from being a glorified inbox',
    'Why discounting is a symptom, not a strategy',
    'Operator > consultant: what the difference looks like in the field',
    'The CEO dashboard I rebuild on every engagement (and why)',
    'When to fire your "rockstar" — the operator\'s checklist',
    'Stop measuring activity. Start measuring leaks.',
  ],
  'AI / Tech': [
    'AI won\'t fix a broken process — it\'ll just speed up the bleed',
    'Why "we tried automation" usually means "we bought software"',
    'Your CRM is lying to you. Here\'s how to prove it.',
    'The 3-question test before you let AI touch your sales pipeline',
    'Why most "AI consultants" are just SaaS resellers in a hoodie',
    'Triple-AI architecture: how I stack models so one keeps the others honest',
    'The cheapest AI win in any business: dead-lead resurrection',
    'When AI replaces a hire vs. when it replaces a process',
  ],
  'Sales & Pipeline': [
    'The follow-up SLA that doubled close rate at a $12M services firm',
    'Stuck-deal triage: the 4 questions that move (or kill) a deal in 1 call',
    'Why "warm leads" go cold in 72 hours — and the fix takes 20 minutes',
    'The proposal template I rewrote that closed an extra $310k in Q2',
    'Discovery calls are leaking deals. Here\'s the script that plugs it.',
    'Why your CRM stages are lying about your pipeline value',
  ],
  'Indianapolis / Local': [
    'Indianapolis owner-operators: the 3 leaks I see in every shop on Mass Ave',
    'Why Indy\'s mid-market is leaving $500k+/yr on the table (and not noticing)',
    'A Forensic Diagnostic for an Indianapolis manufacturer: what we found',
    'Indianapolis vs. Chicago: why Indy operators get squeezed harder on margin',
  ],
  'Trust & Positioning': [
    'I don\'t do retainers until I find the leak. Here\'s why.',
    'What a "Business Forensics Operator" actually does (it\'s not consulting)',
    'Why I refuse to pitch — and what I do instead',
    'The 3 kinds of clients I turn away (and why you should too)',
    'How to vet anyone selling you "AI for your business" in 4 questions',
  ],
};

const PREMADE_TITLES: string[] = Object.values(PREMADE_TITLE_GROUPS).flat();

function pad(n: number) { return String(n).padStart(2, '0'); }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function dayShort(d: Date) { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]; }

async function call(action: string, payload: Record<string, unknown> = {}) {
  const token = getAdminToken();
  const { data, error } = await supabase.functions.invoke('content-engine-generate', {
    body: { action, ...payload },
    headers: token ? { 'x-admin-token': token } : undefined,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function callThumb(action: string, payload: Record<string, unknown> = {}) {
  const token = getAdminToken();
  const { data, error } = await supabase.functions.invoke('content-engine-thumbnail', {
    body: { action, ...payload },
    headers: token ? { 'x-admin-token': token } : undefined,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const ContentEngine: React.FC = () => {
  const { toast } = useToast();
  const [view, setView] = useState<'calendar' | 'generator' | 'studio' | 'strategy'>('calendar');
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [saveIndicator, setSaveIndicator] = useState<'' | 'saving' | 'saved' | 'error'>('');

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const [s, p] = await Promise.all([call('get_strategy'), call('get_posts')]);
        setStrategy(s.strategy);
        setPosts(p.posts || []);
      } catch (e) {
        toast({ title: 'Failed to load Content Engine', description: String((e as Error).message), variant: 'destructive' });
      } finally { setLoading(false); }
    })();
  }, [toast]);

  // Debounced strategy save
  useEffect(() => {
    if (!strategy || loading) return;
    setSaveIndicator('saving');
    const t = setTimeout(async () => {
      try {
        await call('save_strategy', { strategy });
        setSaveIndicator('saved');
      } catch { setSaveIndicator('error'); }
      setTimeout(() => setSaveIndicator(''), 1500);
    }, 600);
    return () => clearTimeout(t);
  }, [strategy, loading]);

  async function handleGenerate(numPosts: number, opts?: { userPrompt?: string; blogIds?: string[]; playbookIds?: string[]; topicSeeds?: string[] }) {
    if (generating) return;
    setGenerating(true);
    setGenerationStatus('Planning slots and writing scripts in parallel...');
    try {
      const res = await call('plan_and_generate', { numPosts, ...(opts || {}) });
      const newPosts = (res.posts || []) as Post[];
      setPosts((prev) => [...prev, ...newPosts].sort((a, b) => (a.scheduled_date + a.scheduled_time).localeCompare(b.scheduled_date + b.scheduled_time)));

      // Snapshot each new post into the cross-tool Admin Library so it's always retrievable.
      let librarySaved = 0;
      await Promise.all(newPosts.map(async (p) => {
        try {
          const title = (p.hook || p.topic_angle || `${FORMAT_INFO[p.format]?.name || p.format} post`).slice(0, 120);
          await saveToAdminLibrary({
            tool_type: 'content_engine_post',
            title,
            input_data: {
              format: p.format,
              topic_angle: p.topic_angle,
              target_emotion: p.target_emotion,
              scheduled_date: p.scheduled_date,
              scheduled_time: p.scheduled_time,
              source_post_id: p.id,
            },
            output_data: {
              hook: p.hook,
              script: p.script,
              caption: p.caption,
              hashtags: p.hashtags,
              format: p.format,
              status: p.status,
            },
            created_at: new Date(`${p.scheduled_date}T${p.scheduled_time || '12:00'}:00`).toISOString(),
          });
          librarySaved++;
        } catch (err) {
          console.warn('Library snapshot failed for post', p.id, err);
        }
      }));

      setGenerationStatus(`✓ Generated ${res.generated} posts${res.failures ? ` (${res.failures} failed)` : ''}${librarySaved ? ` · Saved ${librarySaved} to Library` : ''}`);
      setView('calendar');
      toast({ title: 'Content generated', description: `${res.generated} posts ready in the calendar${librarySaved ? ` and saved to the Library.` : '.'}` });
      setTimeout(() => setGenerationStatus(''), 4000);
    } catch (e) {
      const msg = (e as Error).message;
      setGenerationStatus(`Error: ${msg}`);
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
      setTimeout(() => setGenerationStatus(''), 6000);
    } finally { setGenerating(false); }
  }

  async function handleRegenerate(id: string) {
    try {
      const res = await call('regenerate_post', { id });
      setPosts((prev) => prev.map((p) => p.id === id ? res.post : p));
      setSelectedPost((prev) => prev && prev.id === id ? res.post : prev);
      toast({ title: 'Regenerated' });
    } catch (e) {
      toast({ title: 'Regenerate failed', description: String((e as Error).message), variant: 'destructive' });
    }
  }

  async function handleUpdatePost(id: string, updates: Partial<Post>) {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
    setSelectedPost((prev) => prev && prev.id === id ? { ...prev, ...updates } : prev);
    try { await call('update_post', { id, updates }); } catch (e) {
      toast({ title: 'Save failed', description: String((e as Error).message), variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setSelectedPost(null);
    try { await call('delete_post', { id }); } catch (e) {
      toast({ title: 'Delete failed', description: String((e as Error).message), variant: 'destructive' });
    }
  }

  async function handleClearCalendar() {
    const previous = posts;
    setPosts([]);
    setSelectedPost(null);
    try {
      await call('clear_posts');
      toast({ title: 'Calendar cleared', description: 'All saved Content Engine posts were removed.' });
    } catch (e) {
      setPosts(previous);
      toast({ title: 'Clear failed', description: String((e as Error).message), variant: 'destructive' });
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await call('duplicate_post', { id });
      setPosts((prev) => [...prev, res.post].sort((a, b) => (a.scheduled_date + a.scheduled_time).localeCompare(b.scheduled_date + b.scheduled_time)));
      setSelectedPost(null);
      toast({ title: 'Duplicated +7 days' });
    } catch (e) {
      toast({ title: 'Duplicate failed', description: String((e as Error).message), variant: 'destructive' });
    }
  }

  // Headshots library — loaded once
  const [headshots, setHeadshots] = useState<Headshot[]>([]);
  useEffect(() => {
    callThumb('list_headshots').then((d) => setHeadshots(d.headshots || [])).catch(() => {});
  }, []);

  async function handleGenerateThumbnail(id: string, headshotId?: string) {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, thumbnail_status: 'generating' } : p));
    setSelectedPost((prev) => prev && prev.id === id ? { ...prev, thumbnail_status: 'generating' } : prev);
    try {
      const res = await callThumb('generate', { post_id: id, headshot_id: headshotId });
      setPosts((prev) => prev.map((p) => p.id === id
        ? { ...p, thumbnail_url: res.url, thumbnail_status: 'ready', thumbnail_reference_id: res.headshot_id, thumbnail_generated_at: new Date().toISOString() }
        : p));
      setSelectedPost((prev) => prev && prev.id === id
        ? { ...prev, thumbnail_url: res.url, thumbnail_status: 'ready', thumbnail_reference_id: res.headshot_id, thumbnail_generated_at: new Date().toISOString() }
        : prev);
      toast({ title: 'Thumbnail ready' });
    } catch (e) {
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, thumbnail_status: 'error' } : p));
      setSelectedPost((prev) => prev && prev.id === id ? { ...prev, thumbnail_status: 'error' } : prev);
      toast({ title: 'Thumbnail failed', description: String((e as Error).message), variant: 'destructive' });
    }
  }

  function exportTSV() {
    const csv = [
      ['Date','Time','Format','Status','Hook','Script','Caption','Hashtags'].join('\t'),
      ...posts.map((p) => [
        p.scheduled_date, p.scheduled_time, FORMAT_INFO[p.format]?.name || p.format, p.status,
        p.hook, p.script.replace(/\n/g, ' '), p.caption.replace(/\n/g, ' '),
        (p.hashtags || []).join(' '),
      ].join('\t')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `content-engine-${ymd(new Date())}.tsv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="glass p-12 rounded-xl text-center"><Loader2 className="w-6 h-6 animate-spin text-amber mx-auto" /></div>;
  }
  if (!strategy) {
    return <div className="glass p-12 rounded-xl text-center text-muted-foreground">No strategy row found. Run the migration.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber to-orange-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-foreground text-lg leading-tight">Content Engine</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">LinkedIn Authority Builder</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveIndicator && (
            <div className={`text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 ${
              saveIndicator === 'saved' ? 'text-emerald-500' : saveIndicator === 'saving' ? 'text-amber' : 'text-crimson'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {saveIndicator === 'saved' ? 'Saved' : saveIndicator === 'saving' ? 'Saving...' : 'Failed'}
            </div>
          )}
          <div className="flex gap-1 p-1 rounded-lg bg-background border border-border">
            {([
              { id: 'calendar', label: 'Calendar', Icon: Calendar },
              { id: 'generator', label: 'Generator', Icon: Sparkles },
              { id: 'studio', label: 'Post Studio', Icon: PenLine },
              { id: 'strategy', label: 'Strategy', Icon: Settings },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                  view === t.id ? 'bg-amber text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      {generationStatus && (
        <div className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
          generating ? 'bg-amber/10 text-amber border border-amber/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
        }`}>
          {generating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          {generationStatus}
        </div>
      )}

      {view === 'calendar' && (
        <CalendarView
          posts={posts}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          onSelectPost={setSelectedPost}
          onGenerate={handleGenerate}
          generating={generating}
          onExport={exportTSV}
          onClear={handleClearCalendar}
          strategy={strategy}
        />
      )}

      {view === 'generator' && (
        <GeneratorView strategy={strategy} onGenerate={handleGenerate} generating={generating} postsCount={posts.length} />
      )}

      {view === 'studio' && (
        <LinkedInPostStudio />
      )}

      {view === 'strategy' && (
        <StrategyView strategy={strategy} setStrategy={(s) => setStrategy(s)} />
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={handleUpdatePost}
          onDelete={handleDelete}
          onRegenerate={handleRegenerate}
          onDuplicate={handleDuplicate}
          onGenerateThumbnail={handleGenerateThumbnail}
          headshots={headshots}
        />
      )}
    </div>
  );
};

// ----------------- Calendar View -----------------

function CalendarView({ posts, calendarMonth, setCalendarMonth, onSelectPost, onGenerate, generating, onExport, onClear, strategy }: {
  posts: Post[]; calendarMonth: Date; setCalendarMonth: (d: Date) => void;
  onSelectPost: (p: Post) => void; onGenerate: (n: number, opts?: { userPrompt?: string; blogIds?: string[]; playbookIds?: string[]; topicSeeds?: string[] }) => void; generating: boolean;
  onExport: () => void; onClear: () => void; strategy: Strategy;
}) {
  const monthName = calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d));
  }

  const postsByDate = useMemo(() => {
    const m: Record<string, Post[]> = {};
    posts.forEach((p) => { (m[p.scheduled_date] ||= []).push(p); });
    return m;
  }, [posts]);

  const today = ymd(new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="font-display font-bold text-2xl text-foreground min-w-[220px]">{monthName}</div>
          <Button variant="outline" size="icon" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          {posts.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={onClear} className="border-crimson/40 text-crimson hover:bg-crimson/10">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear Calendar
              </Button>
            </>
          )}
          <Button onClick={() => onGenerate(12)} disabled={generating} className="bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90">
            {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            Generate 12 Posts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground py-1.5 px-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="min-h-[110px]" />;
          const dateStr = ymd(date);
          const dayPosts = postsByDate[dateStr] || [];
          const isToday = dateStr === today;
          const isPast = dateStr < today;
          const isPostingDay = strategy.posting_days.includes(dayShort(date));

          return (
            <div
              key={i}
              className={`min-h-[110px] rounded-lg p-2 border transition ${
                isToday ? 'bg-amber/5 border-amber' :
                isPostingDay && !isPast ? 'bg-card/50 border-border' :
                'bg-card/30 border-border/50'
              } ${isPast ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`text-sm font-bold ${isToday ? 'text-amber' : 'text-foreground'}`}>{date.getDate()}</div>
                {isPostingDay && dayPosts.length === 0 && !isPast && (
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                {dayPosts.map((p) => {
                  const fmt = FORMAT_INFO[p.format] || FORMAT_INFO.auditRoast;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelectPost(p)}
                      className={`text-left rounded p-1.5 ${fmt.bg} border ${fmt.ring} border-l-[3px] hover:scale-[1.02] transition`}
                      style={{ borderLeftColor: 'currentColor' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${fmt.text}`}>{p.scheduled_time}</span>
                        <span className="text-[8px]" style={{ color: STATUS_INFO[p.status]?.cls.includes('emerald') ? '#10b981' : STATUS_INFO[p.status]?.cls.includes('blue') ? '#3b82f6' : '#eab308' }}>●</span>
                      </div>
                      <div className="text-[10px] leading-tight text-foreground/90 line-clamp-2 mt-0.5">{p.hook}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {posts.length === 0 && (
        <div className="mt-8 text-center p-12 glass rounded-xl border-dashed border-border">
          <Sparkles className="w-8 h-8 text-amber mx-auto mb-3" />
          <div className="font-display text-xl font-bold mb-2">No posts scheduled</div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">
            Click "Generate 12 Posts" to fill the next two weeks with audit-driven LinkedIn video scripts.
          </p>
          <Button onClick={() => onGenerate(12)} disabled={generating} className="bg-gradient-to-r from-amber to-orange-500 text-background">
            <Sparkles className="w-4 h-4 mr-2" /> Generate Your First Batch
          </Button>
        </div>
      )}

      {posts.length > 0 && (
        <div className="mt-5 p-4 glass rounded-lg flex flex-wrap gap-5">
          {Object.entries(FORMAT_INFO).map(([k, fmt]) => (
            <div key={k} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`w-3 h-3 rounded-sm ${fmt.bar}`} />
              {fmt.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------- Generator View -----------------

function GeneratorView({ strategy, onGenerate, generating, postsCount }: {
  strategy: Strategy;
  onGenerate: (n: number, opts?: { userPrompt?: string; blogIds?: string[]; playbookIds?: string[]; topicSeeds?: string[] }) => void;
  generating: boolean;
  postsCount: number;
}) {
  const [batchSize, setBatchSize] = useState(12);
  const [userPrompt, setUserPrompt] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [topicSeeds, setTopicSeeds] = useState<string[]>([]);
  const [blogs, setBlogs] = useState<{ id: string; title: string }[]>([]);
  const [playbooks, setPlaybooks] = useState<{ id: string; title: string }[]>([]);
  const [blogIds, setBlogIds] = useState<string[]>([]);
  const [playbookIds, setPlaybookIds] = useState<string[]>([]);
  const [titleCategory, setTitleCategory] = useState<string>('All');

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: p }] = await Promise.all([
        supabase.from('blog_posts').select('id, title').eq('is_published', true).order('published_at', { ascending: false }).limit(80),
        supabase.from('playbooks').select('id, title').order('created_at', { ascending: false }).limit(80),
      ]);
      setBlogs(b || []);
      setPlaybooks(p || []);
    })();
  }, []);

  const toggle = (id: string, set: (v: string[]) => void, current: string[]) => {
    set(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (!t) return;
    if (topicSeeds.includes(t)) { setTopicInput(''); return; }
    setTopicSeeds([...topicSeeds, t]);
    setTopicInput('');
  };

  const fire = () => onGenerate(batchSize, {
    userPrompt: userPrompt.trim() || undefined,
    blogIds: blogIds.length ? blogIds : undefined,
    playbookIds: playbookIds.length ? playbookIds : undefined,
    topicSeeds: topicSeeds.length ? topicSeeds : undefined,
  });

  const hasDirection = !!(userPrompt.trim() || topicSeeds.length || blogIds.length || playbookIds.length);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-3xl font-bold mb-1">Content Generator</h2>
        <p className="text-muted-foreground text-sm">
          Tell the engine what you want, mix in blogs/playbooks/topics, or just hit generate to use your strategy defaults.
        </p>
      </div>

      <Card className="p-5 glass border-border space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Your Prompt</div>
            {userPrompt && (
              <button onClick={() => setUserPrompt('')} className="text-[10px] text-muted-foreground hover:text-crimson uppercase tracking-wider">Clear</button>
            )}
          </div>
          <Textarea
            rows={4}
            placeholder="e.g. Focus this batch on stuck deals + slow follow-up. Hammer the dollar figures. Use the new $7M shop story as a recurring example."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">Free-text direction. Highest priority — every post in the batch will obey this.</p>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Topic Seeds</div>
          <div className="flex gap-2 mb-2">
            <Input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
              placeholder="e.g. ghosted proposals over 30 days"
            />
            <Button type="button" variant="outline" onClick={addTopic}>Add</Button>
          </div>
          {topicSeeds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topicSeeds.map((t) => (
                <button key={t} onClick={() => setTopicSeeds(topicSeeds.filter(x => x !== t))}
                  className="text-[11px] bg-amber/10 text-amber border border-amber/30 rounded-full px-2.5 py-1 hover:bg-amber/20">
                  {t} <span className="ml-1 opacity-60">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Premade Title Ideas</div>
            <span className="text-[10px] text-muted-foreground">Click to add as a topic seed</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {['All', ...Object.keys(PREMADE_TITLE_GROUPS)].map((cat) => {
              const on = titleCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTitleCategory(cat)}
                  className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition ${
                    on ? 'bg-amber text-background border-amber font-bold' : 'bg-background/40 border-border text-muted-foreground hover:text-amber hover:border-amber/50'
                  }`}
                >{cat}</button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto p-2 border border-border/40 rounded-md bg-background/30">
            {(titleCategory === 'All' ? PREMADE_TITLES : PREMADE_TITLE_GROUPS[titleCategory] || []).map((t) => {
              const on = topicSeeds.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopicSeeds(on ? topicSeeds.filter(x => x !== t) : [...topicSeeds, t])}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                    on
                      ? 'bg-amber/15 border-amber text-amber'
                      : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                  }`}
                >{t}</button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
              Blogs <span className="text-amber">({blogIds.length})</span>
            </div>
            <div className="border border-border rounded-md max-h-48 overflow-y-auto bg-background/40">
              {blogs.length === 0 && <div className="p-3 text-xs text-muted-foreground">No published blogs.</div>}
              {blogs.map(b => (
                <label key={b.id} className="flex items-start gap-2 p-2 hover:bg-card/40 cursor-pointer text-xs border-b border-border/50 last:border-0">
                  <input type="checkbox" checked={blogIds.includes(b.id)} onChange={() => toggle(b.id, setBlogIds, blogIds)} className="mt-0.5" />
                  <span className="text-foreground/90 line-clamp-2">{b.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
              Playbooks <span className="text-amber">({playbookIds.length})</span>
            </div>
            <div className="border border-border rounded-md max-h-48 overflow-y-auto bg-background/40">
              {playbooks.length === 0 && <div className="p-3 text-xs text-muted-foreground">No playbooks.</div>}
              {playbooks.map(p => (
                <label key={p.id} className="flex items-start gap-2 p-2 hover:bg-card/40 cursor-pointer text-xs border-b border-border/50 last:border-0">
                  <input type="checkbox" checked={playbookIds.includes(p.id)} onChange={() => toggle(p.id, setPlaybookIds, playbookIds)} className="mt-0.5" />
                  <span className="text-foreground/90 line-clamp-2">{p.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 glass border-border">
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Current Strategy</div>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Niche" value={strategy.niche} />
          <Stat label="Frequency" value={strategy.frequency} />
          <Stat label="Posting Days" value={strategy.posting_days.join(', ')} />
          <Stat label="Posting Times" value={strategy.posting_times.join(', ')} />
          <Stat label="Posts in Calendar" value={String(postsCount)} />
          <Stat label="CTA Link" value={strategy.cta_link} />
        </div>
      </Card>

      <Card className="p-5 glass border-border">
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Format Mix</div>
        <div className="space-y-3">
          {Object.entries(strategy.format_mix).map(([key, pct]) => {
            const fmt = FORMAT_INFO[key];
            if (!fmt) return null;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-bold ${fmt.text}`}>{fmt.name}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${fmt.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 glass border-border">
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Batch Size</div>
        <div className="flex items-center gap-4 mb-4">
          <Slider min={4} max={24} step={1} value={[batchSize]} onValueChange={(v) => setBatchSize(v[0])} className="flex-1" />
          <div className="font-display text-2xl font-bold text-amber w-12 text-right">{batchSize}</div>
        </div>
        <Button
          onClick={fire}
          disabled={generating}
          className="w-full bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
        >
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate {batchSize} Posts {hasDirection ? 'with your direction' : ''}
        </Button>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="text-sm text-foreground truncate">{value}</div>
    </div>
  );
}

// ----------------- Strategy View -----------------

function StrategyView({ strategy, setStrategy }: { strategy: Strategy; setStrategy: (s: Strategy) => void }) {
  const update = <K extends keyof Strategy>(field: K, value: Strategy[K]) => setStrategy({ ...strategy, [field]: value });
  const toggleArr = (field: 'goals' | 'posting_days', value: string) => {
    const arr = strategy[field];
    update(field, arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };
  const updateMix = (key: string, val: number) => update('format_mix', { ...strategy.format_mix, [key]: val });
  const updateTime = (idx: number, val: string) => {
    const newTimes = [...strategy.posting_times];
    newTimes[idx] = val;
    update('posting_times', newTimes);
  };
  const totalMix = Object.values(strategy.format_mix).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-3xl font-bold mb-1">Strategy</h2>
        <p className="text-muted-foreground text-sm">All changes save automatically.</p>
      </div>

      <Section title="Business">
        <Field label="Business Description">
          <Textarea rows={4} value={strategy.business_description} onChange={(e) => update('business_description', e.target.value)} />
        </Field>
        <Field label="Primary Niche">
          <Select value={strategy.niche} onValueChange={(v) => update('niche', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Target Buyer">
          <Textarea rows={2} value={strategy.target_buyer} onChange={(e) => update('target_buyer', e.target.value)} />
        </Field>
        <Field label="CTA Link">
          <Input value={strategy.cta_link} onChange={(e) => update('cta_link', e.target.value)} />
        </Field>
      </Section>

      <Section title="Goals">
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((g) => {
            const on = strategy.goals.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleArr('goals', g)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                  on ? 'bg-amber/15 border-amber text-amber' : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >{g}</button>
            );
          })}
        </div>
      </Section>

      <Section title="Posting Schedule">
        <Field label="Frequency">
          <Select value={strategy.frequency} onValueChange={(v) => update('frequency', v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Posting Days">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = strategy.posting_days.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleArr('posting_days', d)}
                  className={`min-w-[56px] py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    on ? 'bg-amber/15 border-amber text-amber' : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >{d}</button>
              );
            })}
          </div>
        </Field>
        <Field label="Posting Times">
          <div className="flex items-center gap-3">
            <Input type="time" className="w-32" value={strategy.posting_times[0] || '07:30'} onChange={(e) => updateTime(0, e.target.value)} />
            {strategy.frequency === '2x/day' && (
              <Input type="time" className="w-32" value={strategy.posting_times[1] || '12:00'} onChange={(e) => updateTime(1, e.target.value)} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">LinkedIn engagement peaks 7-9am and noon-1pm in your buyer's timezone.</p>
        </Field>
      </Section>

      <Section title="Format Mix">
        <div className={`text-xs mb-3 ${totalMix === 100 ? 'text-emerald-500' : 'text-amber'}`}>
          Total: {totalMix}% {totalMix === 100 ? '✓' : '(should equal 100)'}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const keys = Object.keys(strategy.format_mix);
            if (!keys.length) return;
            const even = Math.floor(100 / keys.length / 5) * 5;
            const next: Record<string, number> = {};
            keys.forEach((k, i) => { next[k] = i === 0 ? 100 - even * (keys.length - 1) : even; });
            update('format_mix', next);
          }}>Even split</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const keys = Object.keys(strategy.format_mix);
            const total = totalMix || 1;
            const next: Record<string, number> = {};
            let running = 0;
            keys.forEach((k, i) => {
              if (i === keys.length - 1) next[k] = 100 - running;
              else { const v = Math.round((strategy.format_mix[k] / total) * 100 / 5) * 5; next[k] = v; running += v; }
            });
            update('format_mix', next);
          }}>Normalize to 100%</Button>
        </div>
        {Object.entries(strategy.format_mix).map(([k, pct]) => {
          const fmt = FORMAT_INFO[k];
          if (!fmt) return null;
          const bump = (delta: number) => updateMix(k, Math.max(0, Math.min(100, pct + delta)));
          return (
            <div key={k} className="mb-4">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className={`font-bold text-xs ${fmt.text}`}>{fmt.name}</span>
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => bump(-5)}>−</Button>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={pct}
                    onChange={(e) => updateMix(k, Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))))}
                    className="h-7 w-16 text-center text-xs"
                  />
                  <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => bump(5)}>+</Button>
                  <span className="text-[10px] text-muted-foreground w-6">%</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${fmt.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{fmt.description}</p>
            </div>
          );
        })}
      </Section>

      <Section title="Voice">
        <Field label="Voice Reference (paste your writing samples — the more specific, the better the mimicry)">
          <Textarea rows={6} value={strategy.voice_reference} onChange={(e) => update('voice_reference', e.target.value)} />
        </Field>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 glass border-border">
      <div className="font-display text-base font-bold text-amber mb-4">{title}</div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}

// ----------------- Post Modal -----------------

function PostModal({ post, onClose, onUpdate, onDelete, onRegenerate, onDuplicate, onGenerateThumbnail, headshots }: {
  post: Post;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Post>) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => Promise<void>;
  onDuplicate: (id: string) => void;
  onGenerateThumbnail: (id: string, headshotId?: string) => Promise<void>;
  headshots: Headshot[];
}) {
  const fmt = FORMAT_INFO[post.format] || FORMAT_INFO.auditRoast;
  const status = STATUS_INFO[post.status];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Post>(post);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => { setDraft(post); setEditing(false); }, [post.id, post.generated_at]);

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  function saveEdits() {
    onUpdate(post.id, {
      hook: draft.hook,
      script: draft.script,
      caption: draft.caption,
      hashtags: typeof draft.hashtags === 'string'
        ? (draft.hashtags as unknown as string).split(',').map((h) => h.trim().replace(/^#/, '')).filter(Boolean)
        : draft.hashtags,
      scheduled_date: draft.scheduled_date,
      scheduled_time: draft.scheduled_time,
      topic_angle: draft.topic_angle,
    });
    setEditing(false);
  }

  async function regen() {
    setRegenerating(true);
    await onRegenerate(post.id);
    setRegenerating(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className={`${fmt.bg} ${fmt.text} ${fmt.ring} text-[10px] font-bold uppercase`}>{fmt.name}</Badge>
            {editing ? (
              <div className="flex items-center gap-2">
                <Input type="date" className="h-7 w-36 text-xs" value={draft.scheduled_date} onChange={(e) => setDraft({ ...draft, scheduled_date: e.target.value })} />
                <Input type="time" className="h-7 w-24 text-xs" value={draft.scheduled_time} onChange={(e) => setDraft({ ...draft, scheduled_time: e.target.value })} />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-normal">
                <CalendarDays className="w-3 h-3" /> {post.scheduled_date}
                <Clock className="w-3 h-3 ml-2" /> {post.scheduled_time}
              </span>
            )}
            <Badge variant="outline" className={`${status?.cls} text-[10px] font-bold uppercase`}>{status?.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2 bg-card/30">
          {!editing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Edit3 className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
              <Button size="sm" variant="outline" onClick={regen} disabled={regenerating} className="border-amber/40 text-amber hover:bg-amber/10">
                {regenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5 mr-1.5" />}
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDuplicate(post.id)}><CopyPlus className="w-3.5 h-3.5 mr-1.5" />Duplicate +7d</Button>
              <div className="flex-1" />
              <Button
                size="sm" variant="outline"
                onClick={() => {
                  if (confirmDelete) onDelete(post.id);
                  else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
                }}
                className={confirmDelete ? 'border-crimson text-crimson hover:bg-crimson/10' : ''}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />{confirmDelete ? 'Click to confirm' : 'Delete'}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={saveEdits} className="bg-emerald-500 text-background hover:bg-emerald-500/90"><Save className="w-3.5 h-3.5 mr-1.5" />Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setDraft(post); setEditing(false); }}><X className="w-3.5 h-3.5 mr-1.5" />Cancel</Button>
            </>
          )}
        </div>

        <div className="p-6 space-y-5">
          <UnifiedImageStudio
            post={post}
            headshots={headshots}
            onUpdate={onUpdate}
            onGenerateThumbnail={onGenerateThumbnail}
          />
          <Field label="Topic Angle">
            {editing
              ? <Textarea rows={2} value={draft.topic_angle} onChange={(e) => setDraft({ ...draft, topic_angle: e.target.value })} />
              : <div className="text-sm text-muted-foreground italic">{post.topic_angle}</div>}
          </Field>

          <EditableBlock
            label="Hook (first 1.5 seconds)"
            value={editing ? draft.hook : post.hook}
            editing={editing}
            onChange={(v) => setDraft({ ...draft, hook: v })}
            onCopy={() => copy(post.hook, 'hook')}
            copied={copiedField === 'hook'}
            accent
            rows={2}
          />
          <EditableBlock
            label="Video Script"
            value={editing ? draft.script : post.script}
            editing={editing}
            onChange={(v) => setDraft({ ...draft, script: v })}
            onCopy={() => copy(post.script, 'script')}
            copied={copiedField === 'script'}
            rows={10}
          />
          <EditableBlock
            label="LinkedIn Caption"
            value={editing ? draft.caption : post.caption}
            editing={editing}
            onChange={(v) => setDraft({ ...draft, caption: v })}
            onCopy={() => copy(post.caption, 'caption')}
            copied={copiedField === 'caption'}
            rows={6}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Hashtags</div>
              {!editing && post.hashtags?.length > 0 && (
                <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                  onClick={() => copy(post.hashtags.map((h) => `#${h}`).join(' '), 'hashtags')}>
                  {copiedField === 'hashtags' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedField === 'hashtags' ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
            {editing ? (
              <Input
                value={Array.isArray(draft.hashtags) ? draft.hashtags.join(', ') : (draft.hashtags as unknown as string)}
                onChange={(e) => setDraft({ ...draft, hashtags: e.target.value as unknown as string[] })}
                placeholder="comma, separated, tags"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(post.hashtags || []).map((h, i) => (
                  <div key={i} className="bg-background border border-border px-2.5 py-1 rounded text-xs text-cyan-400">#{h}</div>
                ))}
                {(!post.hashtags || post.hashtags.length === 0) && (
                  <div className="text-xs text-muted-foreground italic">No hashtags</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-between items-center sticky bottom-0 bg-background gap-3">
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Set Status:</div>
          <div className="flex gap-2">
            {Object.entries(STATUS_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => onUpdate(post.id, { status: key })}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition ${
                  post.status === key ? info.cls : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >{info.label}</button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditableBlock({ label, value, editing, onChange, onCopy, copied, accent, rows }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
  onCopy: () => void; copied: boolean; accent?: boolean; rows: number;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className={`text-[10px] uppercase tracking-widest font-bold ${accent ? 'text-amber' : 'text-muted-foreground'}`}>{label}</div>
        {!editing && (
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onCopy}>
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </div>
      {editing
        ? <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
        : <div className={`text-sm whitespace-pre-wrap leading-relaxed ${accent ? 'text-foreground font-bold' : 'text-foreground/90'}`}>{value}</div>}
    </div>
  );
}

function ThumbnailBlock({ post, headshots, onGenerate }: {
  post: Post; headshots: Headshot[]; onGenerate: (id: string, headshotId?: string) => Promise<void>;
}) {
  const [selectedHeadshot, setSelectedHeadshot] = useState<string>(post.thumbnail_reference_id || '');
  const isGenerating = post.thumbnail_status === 'generating';
  const hasThumb = !!post.thumbnail_url;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Case File Thumbnail</div>
        {hasThumb && (
          <a href={post.thumbnail_url!} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1">
            <Download className="w-3 h-3" /> Download
          </a>
        )}
      </div>
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <div className="aspect-square bg-card/50 flex items-center justify-center relative">
          {isGenerating ? (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber mx-auto mb-2" />
              <div className="text-xs text-muted-foreground">Generating with OpenAI gpt-image-1...</div>
              <div className="text-[10px] text-muted-foreground mt-1">~10–20 seconds</div>
            </div>
          ) : hasThumb ? (
            <img src={post.thumbnail_url!} alt="Post thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center px-6">
              <div className="text-xs text-muted-foreground mb-3">No thumbnail yet</div>
              <div className="text-[10px] text-muted-foreground">Pick a reference photo + Generate</div>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-border flex flex-wrap gap-2 items-center bg-card/30">
          <Select value={selectedHeadshot} onValueChange={setSelectedHeadshot}>
            <SelectTrigger className="h-8 text-xs flex-1 min-w-[180px]">
              <SelectValue placeholder="Auto-pick by format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-pick by format</SelectItem>
              {headshots.filter((h) => !h.disabled).map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm" variant="outline"
            disabled={isGenerating}
            onClick={() => onGenerate(post.id, selectedHeadshot && selectedHeadshot !== 'auto' ? selectedHeadshot : undefined)}
            className="border-amber/40 text-amber hover:bg-amber/10"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            {hasThumb ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
        {post.thumbnail_status === 'error' && (
          <div className="px-3 py-2 text-[11px] text-crimson border-t border-crimson/30 bg-crimson/5">
            Last attempt failed — check edge function logs.
          </div>
        )}
      </div>
    </div>
  );
}

function UnifiedImageStudio({ post, headshots, onUpdate, onGenerateThumbnail }: {
  post: Post;
  headshots: Headshot[];
  onUpdate: (id: string, updates: Partial<Post>) => void;
  onGenerateThumbnail: (id: string, headshotId?: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'ai' | 'headshot'>('ai');
  const hasThumb = !!post.thumbnail_url;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Post Image</div>
        <div className="inline-flex rounded-md border border-border overflow-hidden text-[10px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`px-3 py-1.5 transition-colors ${mode === 'ai' ? 'bg-amber text-background' : 'bg-background text-muted-foreground hover:text-foreground'}`}
          >
            AI Image
          </button>
          <button
            type="button"
            onClick={() => setMode('headshot')}
            className={`px-3 py-1.5 transition-colors border-l border-border ${mode === 'headshot' ? 'bg-amber text-background' : 'bg-background text-muted-foreground hover:text-foreground'}`}
          >
            Use My Headshot
          </button>
        </div>
      </div>

      {hasThumb && (
        <div className="mb-2 flex justify-end">
          <a href={post.thumbnail_url!} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1">
            <Download className="w-3 h-3" /> Download current image
          </a>
        </div>
      )}

      {mode === 'ai' ? (
        <PostImageGenerator
          key={`ai-${post.id}`}
          prompt={`${post.hook}\n\n${post.caption?.slice(0, 400) || ''}`}
          editablePrompt
          existingImageUrl={post.thumbnail_url || ''}
          onImageGenerated={(url) => onUpdate(post.id, { thumbnail_url: url, thumbnail_status: 'ready' })}
        />
      ) : (
        <ThumbnailBlock post={post} headshots={headshots} onGenerate={onGenerateThumbnail} />
      )}

      <p className="text-[11px] text-muted-foreground mt-2">
        {mode === 'ai'
          ? 'Free prompt — generate any image you want with AI.'
          : 'Generates a branded thumbnail from one of your reference photos.'}
      </p>
    </div>
  );
}

export default ContentEngine;
