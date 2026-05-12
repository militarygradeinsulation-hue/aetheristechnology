import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Copy, Check, Shuffle, Wand2, CalendarPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { saveToAdminLibrary } from '@/lib/adminLibrary';

const PILLARS = [
  'Revenue Leak Diagnosis',
  'System Failure Stories',
  'AI Demystification',
  'CRM & Follow-Up Gaps',
  'Founder Mindset',
  'Industry Specifics (Manufacturing/Construction)',
];

const POST_TYPES = [
  'Standard LinkedIn Post',
  'Carousel/List Post',
  'Contrarian Take',
  'Story-Based Post',
  'Data/Stat-Led Post',
];

const CREATORS = [
  { name: 'Alex Hormozi', niche: 'Revenue & Offers', handle: '@AlexHormozi' },
  { name: 'Gary Vaynerchuk', niche: 'Brand & Attention', handle: '@GaryVaynerchuk' },
  { name: 'Chris Walker', niche: 'Demand Gen', handle: '@chriswalker171' },
  { name: 'Codie Sanchez', niche: 'Business Operations', handle: '@CodieSanchez' },
  { name: 'Keenan', niche: 'Gap Selling', handle: '@Keenan' },
  { name: 'Morgan J Ingram', niche: 'Outbound Sales', handle: '@MorganJIngram' },
  { name: 'James Clear', niche: 'Systems & Habits', handle: '@jamesclear' },
  { name: 'Simon Sinek', niche: 'Leadership', handle: '@simonsinek' },
  { name: 'Noah Kagan', niche: 'Simplicity & Execution', handle: '@noahkagan' },
  { name: 'Justin Welsh', niche: 'Lean Systems', handle: '@JustinWelsh' },
  { name: 'Ethan Mollick', niche: 'Applied AI', handle: '@emollick' },
  { name: 'Allie K. Miller', niche: 'AI for Business', handle: '@alliekmiller' },
];

const PREMADE_TOPICS: Record<string, string[]> = {
  'Revenue Leaks': [
    'Most manufacturers have no idea how many leads fall through the cracks after a trade show.',
    'The follow-up gap that quietly costs commercial services firms $40k/month.',
    'Quote-to-cash leakage: where B2B operators lose 8-12% margin without noticing.',
    'Your "best" rep is your biggest leak — and your CRM proves it.',
    'The 3 silent leaks every $5M-$50M business has but refuses to look at.',
  ],
  'Systems & Ops': [
    'James Clear nailed it: you don\'t rise to your goals, you fall to your systems.',
    'Stop hiring more reps. Fix the process the existing reps are drowning in.',
    'The CEO dashboard most growth-stage owners refuse to build (and what it costs them).',
    'Your tech stack isn\'t the problem. The handoffs between tools are.',
  ],
  'AI / Practical': [
    'AI won\'t fix a broken process — it\'ll just speed up the bleed.',
    'The cheapest AI win in any business: dead-lead resurrection.',
    'Most "AI consultants" are just SaaS resellers in a hoodie. Here\'s the test.',
    'Ethan Mollick calls AI your co-pilot. In ops, it\'s the diagnostic engine.',
  ],
  'Sales & Pipeline': [
    'Stuck-deal triage: the 4 questions that move (or kill) a deal in one call.',
    '"Warm leads" go cold in 72 hours. The fix takes 20 minutes.',
    'Discovery calls are leaking deals. Here\'s the script that plugs it.',
    'Your CRM stages are lying about pipeline value. Here\'s how to prove it.',
  ],
  'Founder POV': [
    'Owner-operators: the 4 reports your finance lead should be running weekly.',
    'Why discounting is a symptom, not a strategy.',
    'When to fire your "rockstar" — the operator\'s checklist.',
    'Stop measuring activity. Start measuring leaks.',
  ],
  'Industry-Specific': [
    'Specialty manufacturers: the trade-show lead-decay curve nobody tracks.',
    'Commercial services: why your dispatch system is your biggest revenue leak.',
    'Construction: the change-order leak that bleeds 4-7% of every project.',
    'Why Indianapolis mid-market operators get squeezed harder on margin than Chicago.',
  ],
};

const PREMADE_PROMPTS = [
  'Open with a hard stat. Use a numbered list of 3-5 leak points. End with one sharp question.',
  'Tell a 200-word case story (no names). One specific dollar figure. Mid-post, pivot to the lesson.',
  'Contrarian take. Disagree with conventional wisdom in line 1. Defend it with 3 reasons. Cite a real example.',
  'Tag one creator naturally as a pivot. Use their stance to extend, not echo.',
  'Carousel-ready. 5 numbered slides. Each slide is one sentence + one supporting line.',
  'Founder-to-founder voice. Blunt. No buzzwords. End with "What\'s leaking in yours?"',
];

const ALL_TOPICS = Object.values(PREMADE_TOPICS).flat();
const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function LinkedInPostStudio() {
  const [topic, setTopic] = useState('');
  const [pillar, setPillar] = useState<string>('auto');
  const [postType, setPostType] = useState<string>('auto');
  const [creator, setCreator] = useState<string>('auto');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [topicCategory, setTopicCategory] = useState<string>('All');
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Add a topic first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setGenerated('');
    setSavedId(null);
    try {
      const adminToken = getAdminToken();
      const { data, error } = await supabase.functions.invoke('linkedin-post-studio', {
        body: {
          topic: topic.trim(),
          pillar: pillar === 'auto' ? '' : pillar,
          postType: postType === 'auto' ? '' : postType,
          creator,
          extraPrompt: extraPrompt.trim(),
        },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGenerated(data.post || '');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      toast({ title: 'Failed to generate', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyPost = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast({ title: 'Copied to clipboard' });
  };

  const cycleTopic = () => {
    const pool = topicCategory === 'All' ? ALL_TOPICS : (PREMADE_TOPICS[topicCategory] || ALL_TOPICS);
    setTopic(rand(pool));
  };

  const cyclePrompt = () => setExtraPrompt(rand(PREMADE_PROMPTS));

  const visibleTopics = topicCategory === 'All' ? ALL_TOPICS : (PREMADE_TOPICS[topicCategory] || []);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-3xl font-bold mb-1">Post Studio</h2>
        <p className="text-muted-foreground text-sm">
          On-brand LinkedIn posts with creator tagging, hashtag strategy, and operator voice.
          Cycle through premade topics + prompts or write your own.
        </p>
      </div>

      <Card className="p-5 glass border-border space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">01 — Topic</div>
            <button onClick={cycleTopic} className="text-[10px] text-muted-foreground hover:text-amber uppercase tracking-wider flex items-center gap-1">
              <Shuffle className="w-3 h-3" /> Cycle
            </button>
          </div>
          <Textarea
            rows={3}
            placeholder="What's the post about? Specific is better."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Premade topics — click to use</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {['All', ...Object.keys(PREMADE_TOPICS)].map((cat) => {
                const on = topicCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTopicCategory(cat)}
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition ${
                      on ? 'bg-amber text-background border-amber font-bold' : 'bg-background/40 border-border text-muted-foreground hover:text-amber hover:border-amber/50'
                    }`}
                  >{cat}</button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 border border-border/40 rounded-md bg-background/30">
              {visibleTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                    topic === t
                      ? 'bg-amber/15 border-amber text-amber'
                      : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 glass border-border space-y-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">02 — Parameters</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Content Pillar</div>
            <Select value={pillar} onValueChange={setPillar}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-select</SelectItem>
                {PILLARS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Post Format</div>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-select</SelectItem>
                {POST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Extra Direction (optional)</div>
            <button onClick={cyclePrompt} className="text-[10px] text-muted-foreground hover:text-amber uppercase tracking-wider flex items-center gap-1">
              <Wand2 className="w-3 h-3" /> Cycle prompt
            </button>
          </div>
          <Input
            placeholder="e.g. Open with a stat. Mid-post pivot. End with a sharp question."
            value={extraPrompt}
            onChange={(e) => setExtraPrompt(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PREMADE_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setExtraPrompt(p)}
                className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                  extraPrompt === p
                    ? 'bg-amber/15 border-amber text-amber'
                    : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                }`}
              >{p}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5 glass border-border space-y-3">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">03 — Creator Tag</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[
            { key: 'auto', name: 'Auto-Select', niche: 'AI picks best fit' },
            { key: 'none', name: 'No Creator', niche: 'Skip tagging' },
            ...CREATORS.map((c) => ({ key: c.name, name: c.name, niche: c.niche, handle: c.handle })),
          ].map((c) => {
            const on = creator === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCreator(c.key)}
                className={`text-left p-2 rounded-md border transition ${
                  on ? 'bg-amber/10 border-amber' : 'bg-background/40 border-border hover:border-amber/50'
                }`}
              >
                <div className={`text-xs font-bold ${on ? 'text-amber' : 'text-foreground'}`}>{c.name}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{c.niche}</div>
                {'handle' in c && c.handle && <div className="text-[10px] text-amber/70 mt-0.5">{c.handle}</div>}
              </button>
            );
          })}
        </div>
      </Card>

      <Button
        onClick={generate}
        disabled={loading || !topic.trim()}
        className="w-full bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        {loading ? 'Generating Post…' : 'Generate LinkedIn Post'}
      </Button>

      {(loading || generated) && (
        <Card className="p-5 glass border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Generated Post</div>
            {generated && (
              <Button variant="outline" size="sm" onClick={copyPost} className="h-7 text-[10px]">
                {copied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[100, 80, 90, 60, 75].map((w, i) => (
                <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{generated}</div>
          )}
        </Card>
      )}
    </div>
  );
}
