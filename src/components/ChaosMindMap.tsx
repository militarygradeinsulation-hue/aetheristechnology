import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Gauge,
  Ghost,
  Flame,
  TrendingDown,
  TrendingUp,
  Unplug,
  Plug,
  Wallet,
  PiggyBank,
  ShieldCheck,
  Zap,
  Link2,
  LineChart,
  Target,
  Chrome,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

type Mode = 'chaos' | 'fixed';

type Symptom = {
  id: string;
  label: string;
  fixedLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  fixedIcon: React.ComponentType<{ className?: string }>;
  // position in a 100x100 viewBox
  x: number;
  y: number;
  // which operator anchor this ties to when ordered (0=Scan, 1=Price, 2=Fix)
  anchor: 0 | 1 | 2;
  chaos: string;
  fixed: string;
};

const SYMPTOMS: Symptom[] = [
  { id: 'ghosted',  label: 'Ghosted leads',      fixedLabel: 'Leads worked in-window', icon: Ghost,        fixedIcon: CheckCircle2, x: 18, y: 24, anchor: 0, chaos: 'Hot leads die in the inbox before anyone touches them.', fixed: 'Every lead named, timed, and worked inside the window.' },
  { id: 'churn',    label: 'Silent churn',       fixedLabel: 'Churn caught early',     icon: TrendingDown, fixedIcon: TrendingUp,   x: 82, y: 22, anchor: 2, chaos: 'Anchor accounts leave two weeks after they already decided.', fixed: 'Churn signals surface before the cancel email lands.' },
  { id: 'missed',   label: 'Missed follow-ups',  fixedLabel: 'Follow-up on rails',     icon: Unplug,       fixedIcon: Plug,         x: 14, y: 60, anchor: 0, chaos: 'Quotes and bids sit in a truck, a phone, a sticky note.', fixed: 'Follow-up cadence runs on rails, not on memory.' },
  { id: 'cash',     label: 'Cash bleed',         fixedLabel: 'Cash reclaimed',         icon: Wallet,       fixedIcon: PiggyBank,    x: 86, y: 60, anchor: 1, chaos: 'Profitable on paper. Broke in the account.', fixed: 'Every dollar the leak took is quantified and reclaimed.' },
  { id: 'burnout',  label: 'Team burnout',       fixedLabel: 'Load sequenced',         icon: Flame,        fixedIcon: ShieldCheck,  x: 28, y: 88, anchor: 2, chaos: 'The best people carry the broken system on their backs.', fixed: 'Ops sequence the load. Nobody heroes at midnight.' },
  { id: 'handoff',  label: 'Broken handoffs',    fixedLabel: 'Clean handoffs',         icon: Zap,          fixedIcon: Link2,        x: 72, y: 88, anchor: 0, chaos: 'Deals fall in the gap between sales and delivery.', fixed: 'Handoffs mapped, timed, and instrumented end-to-end.' },
  { id: 'pipeline', label: 'Dead pipeline',      fixedLabel: 'Pipeline reads true',    icon: AlertTriangle,fixedIcon: LineChart,    x: 50, y: 10, anchor: 1, chaos: 'Forecast looks fine, until suddenly it doesn\'t.', fixed: 'Pipeline reads true. Leadership stops getting surprised.' },
];

const OPERATORS = [
  { id: 'scan',  label: 'Scan',  icon: FileSearch,  x: 22, y: 50, body: 'Website, sales, follow-up, ops — audited end-to-end.' },
  { id: 'price', label: 'Price', icon: Gauge,       x: 50, y: 78, body: 'Every leak quantified in dollars per year.' },
  { id: 'fix',   label: 'Fix',   icon: CheckCircle2,x: 78, y: 50, body: 'Prioritized ledger. Fee credits toward the build.' },
] as const;

const HUB = { x: 50, y: 50 };

// Deterministic pseudo-random for chaos tangles
const chaosPath = (sx: number, sy: number, ex: number, ey: number, seed: number) => {
  const rand = (n: number) => {
    const x = Math.sin(seed * 999 + n * 17.13) * 43758.5453;
    return x - Math.floor(x);
  };
  const c1x = sx + (ex - sx) * 0.25 + (rand(1) - 0.5) * 60;
  const c1y = sy + (ey - sy) * 0.25 + (rand(2) - 0.5) * 60;
  const c2x = sx + (ex - sx) * 0.75 + (rand(3) - 0.5) * 60;
  const c2y = sy + (ey - sy) * 0.75 + (rand(4) - 0.5) * 60;
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
};

const orderedPath = (sx: number, sy: number, ex: number, ey: number) => {
  // gentle curve toward hub via operator anchor
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  return `M ${sx} ${sy} Q ${mx} ${my}, ${ex} ${ey}`;
};

export const ChaosMindMap: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chaos');
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(() => SYMPTOMS.find((s) => s.id === activeId) ?? null, [activeId]);

  const isFixed = mode === 'fixed';

  return (
    <div className="relative">
      {/* Header + mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
            The mind map
          </div>
          <h3 className="font-forensic text-xl md:text-2xl font-bold leading-tight">
            {isFixed ? (
              <>Every thread runs clean to <span className="text-amber">the source</span>.</>
            ) : (
              <>Everything is connected. <span className="text-crimson">You just can't see the source.</span></>
            )}
          </h3>
          <p className="text-xs md:text-sm text-foreground/70 mt-1">
            {isFixed
              ? 'Chaos resolved. Scan → Price → Fix, each thread traceable to a named source.'
              : 'Tap any symptom. Watch it trace back through the tangle to the one thing feeding it.'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-sm border border-border/60 bg-background/60 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setMode('chaos'); setActiveId(null); }}
            className={`px-3 py-1.5 text-[11px] font-case uppercase tracking-widest rounded-sm transition-colors ${
              !isFixed ? 'bg-crimson/15 text-crimson border border-crimson/40' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Chaos
          </button>
          <button
            type="button"
            onClick={() => { setMode('fixed'); setActiveId(null); }}
            className={`px-3 py-1.5 text-[11px] font-case uppercase tracking-widest rounded-sm transition-colors ${
              isFixed ? 'bg-amber/15 text-amber border border-amber/40' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Source closed
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative w-full rounded-sm border border-border/50 bg-background/40">
        <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] lg:aspect-[16/10] px-8 py-10 sm:px-12 sm:py-12">
          <div className="absolute inset-8 sm:inset-12">

          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <radialGradient id="chaosHubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={isFixed ? 'hsl(var(--amber))' : 'hsl(var(--crimson))'} stopOpacity="0.35" />
                <stop offset="70%" stopColor={isFixed ? 'hsl(var(--amber))' : 'hsl(var(--crimson))'} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="chaosSpoke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--crimson))" stopOpacity="0.7" />
                <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            {/* hub glow */}
            <circle cx={HUB.x} cy={HUB.y} r="22" fill="url(#chaosHubGlow)" />

            {/* Chaos tangle: every symptom to every operator anchor + hub */}
            {!isFixed && SYMPTOMS.flatMap((s, si) => {
              const isActive = active?.id === s.id;
              const dim = active !== null && !isActive;
              return [
                <path
                  key={`c-hub-${s.id}`}
                  d={chaosPath(s.x, s.y, HUB.x, HUB.y, si + 1)}
                  fill="none"
                  stroke={isActive ? 'hsl(var(--amber))' : 'url(#chaosSpoke)'}
                  strokeOpacity={dim ? 0.06 : isActive ? 0.95 : 0.45}
                  strokeWidth={isActive ? 1.6 : 0.7}
                  strokeDasharray={isActive ? '0' : '2 4'}
                  vectorEffect="non-scaling-stroke"
                  style={{ animation: isActive ? undefined : `mindmap-flow 8s linear ${(si % 5) * -0.7}s infinite` }}
                />,
                ...OPERATORS.map((o, oi) => (
                  <path
                    key={`c-${s.id}-${o.id}`}
                    d={chaosPath(s.x, s.y, o.x, o.y, si * 7 + oi + 11)}
                    fill="none"
                    stroke="hsl(var(--crimson))"
                    strokeOpacity={dim ? 0.03 : isActive && o.id === OPERATORS[s.anchor].id ? 0.7 : 0.18}
                    strokeWidth={isActive && o.id === OPERATORS[s.anchor].id ? 1 : 0.5}
                    strokeDasharray="1 3"
                    vectorEffect="non-scaling-stroke"
                  />
                )),
              ];
            })}

            {/* Ordered lines: symptom → operator anchor → hub */}
            {isFixed && SYMPTOMS.flatMap((s) => {
              const anchor = OPERATORS[s.anchor];
              return [
                <path
                  key={`o-s-${s.id}`}
                  d={orderedPath(s.x, s.y, anchor.x, anchor.y)}
                  fill="none"
                  stroke="hsl(var(--amber))"
                  strokeOpacity={0.7}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />,
                <path
                  key={`o-a-${s.id}`}
                  d={orderedPath(anchor.x, anchor.y, HUB.x, HUB.y)}
                  fill="none"
                  stroke="hsl(var(--amber))"
                  strokeOpacity={0.85}
                  strokeWidth={1.3}
                  vectorEffect="non-scaling-stroke"
                />,
              ];
            })}
          </svg>

          {/* Operator anchors */}
          {OPERATORS.map((o) => {
            const OIcon = o.icon;
            return (
              <div
                key={o.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${o.x}%`, top: `${o.y}%` }}
              >
                <div className={`flex flex-col items-center transition-opacity ${active && OPERATORS[active.anchor].id !== o.id && !isFixed ? 'opacity-30' : 'opacity-100'}`}>
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-sm border-2 flex items-center justify-center bg-background/90 transition-all ${
                    isFixed ? 'border-amber shadow-[0_0_18px_hsl(var(--amber)/0.45)]' : 'border-amber/50'
                  }`}>
                    <OIcon className="w-6 h-6 md:w-7 md:h-7 text-amber" />
                  </div>
                  <div className="mt-1.5 font-case text-xs md:text-sm uppercase tracking-widest text-amber">
                    {o.label}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Central hub */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}
          >
            <div className="relative">
              <span
                aria-hidden
                className={`absolute inset-0 rounded-full border ${isFixed ? 'border-amber/50' : 'border-crimson/50'}`}
                style={{ animation: 'mindmap-pulse 2.4s ease-out infinite' }}
              />
              <span
                aria-hidden
                className={`absolute inset-0 rounded-full border ${isFixed ? 'border-amber/30' : 'border-crimson/30'}`}
                style={{ animation: 'mindmap-pulse 2.4s ease-out 1.2s infinite' }}
              />
              <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-background border-2 flex flex-col items-center justify-center text-center px-2 transition-all ${
                isFixed
                  ? 'border-amber shadow-[0_0_40px_hsl(var(--amber)/0.5)]'
                  : 'border-crimson shadow-[0_0_40px_hsl(var(--crimson)/0.45)]'
              }`}>
                <Target className={`w-6 h-6 mb-1 ${isFixed ? 'text-amber' : 'text-crimson'}`} />
                <div className={`font-case text-[11px] md:text-xs uppercase tracking-widest ${isFixed ? 'text-amber' : 'text-crimson'}`}>
                  The source
                </div>
                <div className="font-forensic text-sm md:text-base font-bold text-foreground leading-tight mt-1">
                  {isFixed ? 'Sealed' : 'Bleeding'}
                </div>
              </div>
            </div>
          </div>

          {/* Symptom nodes */}
          {SYMPTOMS.map((s) => {
            const SIcon = isFixed ? s.fixedIcon : s.icon;
            const displayLabel = isFixed ? s.fixedLabel : s.label;
            const isActive = active?.id === s.id;
            const dim = active !== null && !isActive;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId((id) => (id === s.id ? null : s.id))}
                aria-pressed={isActive}
                aria-label={displayLabel}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group z-10 transition-all ${
                  dim ? 'opacity-30' : 'opacity-100'
                }`}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <div className={`relative flex flex-col items-center transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-background/95 border-2 flex items-center justify-center transition-all ${
                    isFixed
                      ? 'border-amber/70 shadow-[0_0_14px_hsl(var(--amber)/0.35)]'
                      : isActive
                        ? 'border-amber bg-amber/15 shadow-[0_0_20px_hsl(var(--amber)/0.5)]'
                        : 'border-crimson/60 group-hover:border-crimson shadow-[0_0_12px_hsl(var(--crimson)/0.3)]'
                  }`}>
                    <SIcon className={`w-6 h-6 md:w-7 md:h-7 ${isFixed ? 'text-amber' : isActive ? 'text-amber' : 'text-crimson'}`} />
                  </div>
                  <div className={`mt-1.5 font-forensic text-[11px] md:text-sm font-bold leading-tight text-center w-24 md:w-28 ${
                    isActive ? 'text-amber' : isFixed ? 'text-foreground' : 'text-foreground/85'
                  }`}>
                    {displayLabel}
                  </div>
                </div>
              </button>
            );
          })}
          </div>
        </div>
      </div>


      {/* Detail rail */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {OPERATORS.map((o) => {
          const OIcon = o.icon;
          return (
            <div key={o.id} className={`rounded-sm border p-3 transition-colors ${
              isFixed ? 'border-amber/40 bg-amber/5' : 'border-border/60 bg-background/40'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <OIcon className="w-4 h-4 text-amber" />
                <div className="font-case text-[10px] uppercase tracking-widest text-amber">{o.label}</div>
              </div>
              <p className="text-xs text-foreground/85 leading-snug">{o.body}</p>
            </div>
          );
        })}
      </div>

      {/* Active symptom info dialog — center-screen every time a bubble is clicked */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {React.createElement(isFixed ? active.fixedIcon : active.icon, { className: 'w-5 h-5 text-amber' })}
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber">
                    {isFixed ? 'Source closed' : 'Leak signal'}
                  </div>
                </div>
                <DialogTitle className="font-forensic text-2xl">
                  {isFixed ? active.fixedLabel : active.label}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed pt-1">
                  {isFixed
                    ? 'This thread now runs clean to a named source.'
                    : 'Tap any symptom to trace the chain back to the source of the chaos.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-1">
                {!isFixed && (
                  <div className="rounded-sm border border-crimson/40 bg-crimson/5 p-3">
                    <div className="flex items-center gap-1.5 font-case text-[9px] uppercase tracking-widest text-crimson mb-1.5">
                      <AlertTriangle className="w-3 h-3" /> {active.label} — the chaos
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/90 leading-snug">{active.chaos}</p>
                  </div>
                )}
                <div className="rounded-sm border border-amber/40 bg-amber/5 p-3">
                  <div className="flex items-center gap-1.5 font-case text-[9px] uppercase tracking-widest text-amber mb-1.5">
                    <CheckCircle2 className="w-3 h-3" /> {isFixed ? `${active.fixedLabel} — source closed` : 'Source closed'}
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-snug">{active.fixed}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {!active && (
        <p className="text-center text-[11px] font-mono uppercase tracking-widest text-foreground/50 py-6">
          {isFixed
            ? 'Every symptom now runs a clean line to a named source. Tap one to compare.'
            : 'Tap a symptom to trace its chain back to the source of the chaos.'}
        </p>
      )}

      {/* Brand Voice Extension — companion to the ecosystem */}
      <Link
        to="/brand-voice-extension"
        className="mt-6 group block rounded-sm border border-amber/40 bg-gradient-to-br from-amber/10 via-background to-background hover:border-amber transition-colors overflow-hidden"
      >
        <div className="grid sm:grid-cols-[auto_1fr_auto] gap-4 items-center p-4 sm:p-5">
          <div className="w-12 h-12 rounded-sm border border-amber/50 bg-background/70 flex items-center justify-center shrink-0">
            <Chrome className="w-6 h-6 text-amber" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">§ Extension · $60 lifetime</span>
              <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-crimson/50 text-crimson">New</span>
            </div>
            <div className="font-forensic text-lg md:text-xl font-bold leading-tight">
              Your brand voice, <span className="text-amber">in every text field on the web</span>.
            </div>
            <p className="text-xs md:text-sm text-foreground/70 mt-1 leading-snug">
              We scan your site once, remember your URL + tone, hand you an activation code.
              A <span className="text-amber font-semibold">Brand Voice</span> button appears on LinkedIn, X, Reddit, and any comment box —
              one click drafts posts and replies that actually sound like you.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber group-hover:translate-x-0.5 transition-transform justify-self-start sm:justify-self-end">
            <KeyRound className="w-3.5 h-3.5" />
            Get code
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ChaosMindMap;
