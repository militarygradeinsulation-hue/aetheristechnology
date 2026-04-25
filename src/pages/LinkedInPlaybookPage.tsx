import React, { useEffect, useMemo, useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Check, Flame, Eye, Crosshair } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ChoreoBlock {
  time: string;
  gear: 'Borrowed Distribution' | 'Forensic Content' | 'Surgical Outbound';
  action: string;
  detail: string;
}

const CHOREOGRAPHY: ChoreoBlock[] = [
  { time: '08:00', gear: 'Forensic Content', action: 'Drop today\'s post + engage Reciprocity Pod', detail: 'Publish the scheduled post. Within 30 min, get 5–8 pod members to leave additive comments to spike algorithmic velocity.' },
  { time: '09:00', gear: 'Borrowed Distribution', action: 'Comment-Jack 5 industry giants', detail: 'Be in the first 5 comments on 5 high-reach posts. Sharp, additive insights only — never compliments. Their audience clicks your profile.' },
  { time: '11:00', gear: 'Surgical Outbound', action: 'Record + dispatch 10 Loom audits', detail: '3-min screen recording of prospect\'s site pointing out 2–3 visible leaks. Target mid-level Marketing/Ops, not CEOs.' },
  { time: '14:00', gear: 'Surgical Outbound', action: 'Reverse-engineer demand search', detail: 'Search "looking for help with [HubSpot / lead flow / CRM]" → Posts → Latest. Comment thoughtfully on 5–10. NO pitch.' },
  { time: '16:00', gear: 'Forensic Content', action: 'Reply + Soft Front Door DM drop', detail: 'Reply to every comment on today\'s post. DM the asset to anyone who used the keyword. Ask ONE curious question. Never pitch.' },
];

const SCRIPTS = [
  {
    name: 'Loom Audit DM',
    body: 'Hey [Name] — found 3 things on your site probably costing you leads. Recorded a 3-min teardown for you here: [LOOM LINK]. Free, no pitch.',
  },
  {
    name: 'Soft Front Door DM (after they comment keyword)',
    body: 'Here\'s the [asset] you asked for: [LINK]. No strings.\n\nQuick curious question — when\'s the last time anyone audited your [specific system]?',
  },
  {
    name: 'Reverse-Engineered Demand Comment (then DM 24h later)',
    body: 'Saw your post about [X]. I work on exactly this — happy to do a free 20-min teardown of where the leak likely is. No pitch, just curious if my hypothesis is right.',
  },
  {
    name: 'Mid-Level Bypass DM (skip the C-suite)',
    body: 'Noticed your team posted about scaling — I help companies your size find leaks BEFORE scaling makes them worse. Happy to share a 1-page framework with you, no ask.',
  },
  {
    name: 'Comment-Jack Template',
    body: '[Counter-intuitive insight that builds on their point with a specific number]. I see this in [vertical] all the time — usually masks a [specific underlying leak].',
  },
];

const PILLARS = [
  { num: '01', name: 'AI', focus: 'Operational AI, never hype.' },
  { num: '02', name: 'Startups & Scaleups', focus: 'Growth-stage friction patterns.' },
  { num: '03', name: 'Leadership', focus: 'Operator decisions, not platitudes.' },
  { num: '04', name: 'Culture', focus: 'How teams actually break.' },
  { num: '05', name: 'Personal Brand', focus: 'IP series + Operator\'s Journal.' },
  { num: '06', name: 'Digital Business', focus: 'Revenue systems, leak math.' },
];

const HIDDEN_MOVES = [
  { num: 1, name: 'Comment-Jack the Giants', tactic: 'Top-5 commenter on 30 leaders, sharp insight only', soWhat: 'Borrow distribution for free' },
  { num: 2, name: 'The Audit Carousel', tactic: '10-slide teardown of anonymized $2M+ business problem', soWhat: 'Specificity sells without pitching' },
  { num: 3, name: 'The Soft Front Door', tactic: 'End posts with "Comment [KEYWORD] for the PDF"', soWhat: 'Velocity spikes algo + warm DMs' },
  { num: 4, name: 'Expensive Mistake Hook', tactic: '"$4M company lost 31% of leads due to [error]"', soWhat: 'Pain + specificity = scroll-stop' },
  { num: 5, name: 'Reverse-Engineer Buyer Search', tactic: 'Search "looking for help with [service]" → Latest', soWhat: 'Real-time prospects in active pain' },
  { num: 6, name: 'The Loom Audit Weapon', tactic: '3-min video teardown via DM', soWhat: '20–40% reply vs 1% cold InMail' },
  { num: 7, name: 'Content Series Stacking', tactic: 'Numbered series ("Business Autopsy #14")', soWhat: 'Sticky followers fear missing #15' },
  { num: 8, name: 'Mid-Manager DMs', tactic: 'Target Ops/Marketing Directors with helpful observations', soWhat: 'They\'re the actual buyers' },
  { num: 9, name: 'Reciprocity Networks', tactic: '10 non-competing peers comment within 30 min', soWhat: 'Early engagement = quality signal' },
];

const PHASES = [
  { range: 'Days 1–30', label: 'QUIT ZONE', actions: ['Define 6 pillars + Song Sheet', '100 thoughtful comments/week on giants', 'Establish daily choreography rhythm'] },
  { range: 'Days 31–60', label: 'FLATLINE', actions: ['Launch Business Autopsy series', '50 Loom audits/week', 'Carousel cadence stable'] },
  { range: 'Days 61–90', label: 'IGNITION', actions: ['3-step batching system live', 'VA for DM management', 'Newsletter launched (deplatform traffic)'] },
];

const GOLDEN_METRICS = [
  { name: 'Daily Follower Growth', target: 'Trend > zero', why: 'Definitive brand health check' },
  { name: 'Repost-to-Like Ratio', target: '20%', why: 'Proves content is "claimable" by others' },
  { name: 'Newsletter Subscribers', target: 'Compounding', why: 'Rented attention → owned equity' },
];

const STORAGE_KEY = (date: string) => `lkin-playbook-${date}`;
const START_KEY = 'lkin-playbook-start-date';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(start: string) {
  const ms = Date.now() - new Date(start).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

const GEAR_STYLES: Record<ChoreoBlock['gear'], string> = {
  'Borrowed Distribution': 'border-amber/40 bg-amber/5 text-amber',
  'Forensic Content': 'border-foreground/30 bg-foreground/5 text-foreground',
  'Surgical Outbound': 'border-[hsl(var(--crimson))]/40 bg-[hsl(var(--crimson))]/5 text-[hsl(var(--crimson))]',
};

const GEAR_ICONS: Record<ChoreoBlock['gear'], React.ReactNode> = {
  'Borrowed Distribution': <Eye className="w-4 h-4" />,
  'Forensic Content': <Flame className="w-4 h-4" />,
  'Surgical Outbound': <Crosshair className="w-4 h-4" />,
};

const LinkedInPlaybookPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // 90-day curve tracking
  const startDate = useMemo(() => {
    let s = localStorage.getItem(START_KEY);
    if (!s) {
      s = todayKey();
      localStorage.setItem(START_KEY, s);
    }
    return s;
  }, []);
  const dayNumber = daysSince(startDate);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY(todayKey()));
    if (raw) {
      try { setCompleted(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  const toggle = (time: string) => {
    setCompleted((prev) => {
      const next = { ...prev, [time]: !prev[time] };
      localStorage.setItem(STORAGE_KEY(todayKey()), JSON.stringify(next));
      return next;
    });
  };

  const completedCount = CHOREOGRAPHY.filter((b) => completed[b.time]).length;

  const copy = (name: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(name);
    toast({ title: 'Copied', description: `${name} copied to clipboard.` });
    setTimeout(() => setCopiedScript(null), 1500);
  };

  const curveZone =
    dayNumber < 30 ? { label: 'THE QUIT ZONE', color: 'text-[hsl(var(--crimson))]', detail: 'Most consultants quit here. Don\'t.' } :
    dayNumber < 60 ? { label: 'THE FLATLINE', color: 'text-amber', detail: 'First inbound trickles begin. Hold the line.' } :
    dayNumber < 90 ? { label: 'IGNITION', color: 'text-amber' , detail: 'Inbound engine warming up.' } :
    { label: 'INBOUND ENGINE', color: 'text-emerald-500', detail: 'Compounding flywheel active.' };

  const resetStart = () => {
    if (!confirm('Reset the 90-day curve start date to today?')) return;
    localStorage.setItem(START_KEY, todayKey());
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="LinkedIn Daily Choreography — Aetheris Playbook"
        description="The forensic operator's daily LinkedIn execution playbook. Three gears, five timed blocks, copy-paste scripts."
        path="/playbook/linkedin"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <div className="pt-32 pb-16 px-4 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <span className="text-amber font-mono text-xs tracking-widest uppercase mb-2 block">CASE FILE · LINKEDIN OPS</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">
              The Daily <span className="text-gradient-amber">Choreography</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl">
              Three gears. Five timed blocks. Zero ad spend. The forensic operator's playbook for turning LinkedIn into an inbound engine.
            </p>
          </div>

          {/* The Three Gears */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {(['Borrowed Distribution', 'Forensic Content', 'Surgical Outbound'] as const).map((gear, i) => (
              <Card key={gear} className={`p-5 border ${GEAR_STYLES[gear]} backdrop-blur`}>
                <div className="flex items-center gap-2 mb-2">
                  {GEAR_ICONS[gear]}
                  <span className="font-mono text-xs tracking-wider">GEAR {i + 1}</span>
                </div>
                <div className="font-display text-xl font-bold mb-1">{gear}</div>
                <p className="text-muted-foreground text-sm">
                  {gear === 'Borrowed Distribution' && 'Hijack existing attention via Comment-Jacking + Reciprocity Pods.'}
                  {gear === 'Forensic Content' && 'Audit Carousels + Expensive Mistake hooks. Carousels get 7x dwell.'}
                  {gear === 'Surgical Outbound' && 'Loom audits, Soft Front Door DMs, Reverse-Engineered demand search.'}
                </p>
              </Card>
            ))}
          </div>

          {/* Six Content Pillars */}
          <div className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-2xl font-display font-bold text-foreground">The Six Content Pillars</h2>
              <span className="font-mono text-xs text-muted-foreground">EVERY POST MAPS TO ONE</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PILLARS.map((p) => (
                <Card key={p.num} className="p-4 border bg-background/50 backdrop-blur">
                  <div className="font-mono text-xs text-amber tracking-widest mb-1">PILLAR {p.num}</div>
                  <div className="font-display font-bold text-foreground mb-1">{p.name}</div>
                  <p className="text-xs text-muted-foreground">{p.focus}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Main grid: choreography + curve */}
          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            {/* Choreography */}
            <div className="lg:col-span-2">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-display font-bold text-foreground">Today's 5 Blocks</h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {completedCount}/{CHOREOGRAPHY.length} COMPLETE
                </span>
              </div>
              <div className="space-y-3">
                {CHOREOGRAPHY.map((block) => {
                  const done = completed[block.time];
                  return (
                    <Card
                      key={block.time}
                      className={`p-4 border bg-background/50 backdrop-blur transition ${done ? 'opacity-50 border-emerald-500/40' : 'border-border'}`}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox checked={done} onCheckedChange={() => toggle(block.time)} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-amber text-lg">{block.time}</span>
                            <Badge variant="outline" className={`text-xs ${GEAR_STYLES[block.gear]}`}>
                              {block.gear}
                            </Badge>
                          </div>
                          <div className={`font-bold text-foreground mb-1 ${done ? 'line-through' : ''}`}>{block.action}</div>
                          <p className="text-sm text-muted-foreground">{block.detail}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 90-day curve */}
            <div className="space-y-4">
              <Card className="p-5 border bg-background/50 backdrop-blur">
                <div className="font-mono text-xs tracking-wider text-muted-foreground mb-2">ACTIVATION CURVE</div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-display font-bold text-foreground">{dayNumber}</span>
                  <span className="text-muted-foreground">/ 90 days</span>
                </div>
                <div className={`font-mono text-sm font-bold ${curveZone.color} mb-2`}>{curveZone.label}</div>
                <p className="text-xs text-muted-foreground mb-4">{curveZone.detail}</p>

                {/* Visual bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-[hsl(var(--crimson))] via-amber to-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, (dayNumber / 90) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-4">
                  <span>D0</span><span>D30</span><span>D60</span><span>D90</span>
                </div>

                <Button variant="ghost" size="sm" onClick={resetStart} className="text-xs w-full">
                  Reset start date
                </Button>
              </Card>

              <Card className="p-5 border border-amber/30 bg-amber/5 backdrop-blur">
                <div className="font-mono text-xs tracking-wider text-amber mb-2">WEEKLY VOLUME TARGETS</div>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Loom audits</span><span className="font-mono font-bold text-foreground">50</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Comments</span><span className="font-mono font-bold text-foreground">100</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Warm convos</span><span className="font-mono font-bold text-foreground">20</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Discovery calls</span><span className="font-mono font-bold text-foreground">5–15</span></li>
                </ul>
              </Card>
            </div>
          </div>

          {/* Scripts */}
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">Copy-Paste Scripts</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {SCRIPTS.map((s) => (
                <Card key={s.name} className="p-4 border bg-background/50 backdrop-blur">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-mono text-xs tracking-wider text-amber">{s.name}</div>
                    <Button size="sm" variant="ghost" onClick={() => copy(s.name, s.body)} className="h-7 px-2">
                      {copiedScript === s.name ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">{s.body}</pre>
                </Card>
              ))}
            </div>
          </div>

          {/* Doctrine reminders */}
          <Card className="mt-10 p-5 border border-[hsl(var(--crimson))]/30 bg-[hsl(var(--crimson))]/5 backdrop-blur">
            <div className="font-mono text-xs tracking-wider text-[hsl(var(--crimson))] mb-2">FORBIDDEN</div>
            <ul className="text-sm text-foreground/90 space-y-1">
              <li>· Posting on the fly. Batch-write only.</li>
              <li>· Pitching in the first DM. Asset first, question second, pitch never.</li>
              <li>· Targeting CEOs cold. Always mid-level Marketing / Ops.</li>
              <li>· Generic motivational content. Specific teardowns only.</li>
              <li>· Quitting before day 90. The algorithm rewards consistency, not intensity.</li>
            </ul>
          </Card>
        </div>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default LinkedInPlaybookPage;
