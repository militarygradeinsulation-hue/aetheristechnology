import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crosshair, ShieldAlert, Radio, Flag, Megaphone, Target, Skull, Trophy,
  Play, Pause, RotateCcw, Zap, CheckCircle2, ArrowRight, Sparkle, TrendingUp,
} from "lucide-react";

type Report = {
  overall: { youScore: number; rivalScore: number; winner: "you" | "rival" | "tie" };
  battlefield?: {
    youMonthlyBleedUsd?: number;
    rivalMonthlyBleedUsd?: number;
    recoverableIfFixedUsd?: number;
    stealableFromRivalUsd?: number;
  };
  takeover?: {
    thesis: string;
    rivalChaos: { weakness: string; evidence: string; exploitability: "high" | "medium" | "low"; howToExploit: string }[];
    yourFixes: { issue: string; evidence: string; fix: string; blockerLevel: "critical" | "important" | "nice-to-have" }[];
    wedgeMoves: { move: string; leveragesRivalWeakness: string; leveragesYourStrength: string; expectedOutcome: string; timeframe: "week" | "month" | "quarter" }[];
    positioningPivot: { newHeadline: string; newSubhead: string; newCtaLabel: string; keywordsToOwn: string[]; proofToAdd: string[] };
    counterMessaging: { rivalClaim: string; yourCounter: string }[];
    kpis: { metric: string; baseline: string; target30Day: string }[];
  };
};

const fmt$ = (n?: number) => `$${Math.round(n || 0).toLocaleString()}`;

const seeded = (n: number) => {
  const v = Math.sin(n * 137.31) * 43758.5453;
  return v - Math.floor(v);
};

function scatter(n: number, seedBase: number) {
  const pts: { x: number; y: number }[] = [];
  const cols = Math.max(2, Math.ceil(Math.sqrt(n)));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const jitterX = (seeded(seedBase + i) - 0.5) * 14;
    const jitterY = (seeded(seedBase + i * 3.1) - 0.5) * 14;
    const x = ((c + 0.5) / cols) * 100 + jitterX;
    const y = ((r + 0.5) / rows) * 100 + jitterY;
    pts.push({ x: Math.max(12, Math.min(88, x)), y: Math.max(14, Math.min(86, y)) });
  }
  return pts;
}

// Weight -> impact points per node
const weightPts = { high: 12, medium: 7, low: 4 } as const;
const blockerWeight = (b: string) => (b === "critical" ? "high" : b === "important" ? "medium" : "low") as keyof typeof weightPts;

function Bubble({
  x, y, label, weight, side, i, onClick, active, resolved,
}: {
  x: number; y: number; label: string; weight: keyof typeof weightPts;
  side: "you" | "rival"; i: number; onClick: () => void; active: boolean; resolved: boolean;
}) {
  const size = weight === "high" ? 128 : weight === "medium" ? 108 : 92;

  const activeSide = side === "rival" ? "border-red-500/70" : "border-amber-500/70";
  const dimSide = side === "rival" ? "border-red-500/30" : "border-amber-500/30";

  const border = resolved ? "border-emerald-500/70" : (weight === "high" ? activeSide : dimSide);
  const bg = resolved ? "bg-emerald-500/10" : (side === "rival" ? "bg-red-500/10" : "bg-amber-500/10");
  const glow = resolved
    ? "shadow-[0_0_30px_hsl(150_70%_45%/0.35)]"
    : side === "rival"
      ? "shadow-[0_0_30px_hsl(0_80%_55%/0.25)]"
      : "shadow-[0_0_30px_hsl(45_95%_55%/0.25)]";
  const tone = resolved ? "text-emerald-200" : (side === "rival" ? "text-red-200" : "text-amber-200");
  const dur = 8 + ((i * 1.7) % 6);
  const delay = (i * 0.6) % 4;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border ${border} ${bg} ${glow} backdrop-blur-sm p-2 flex flex-col items-center justify-center text-center transition-all hover:scale-110 hover:z-20 ${resolved ? "" : "animate-mindmap-drift"} ${active ? "ring-2 ring-offset-2 ring-offset-background scale-110 z-30" : "z-10"} ${resolved ? "opacity-90" : ""}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        animationDuration: `${dur}s`,
        animationDelay: `${delay}s`,
      }}
      aria-label={label}
    >
      {resolved && (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
      )}
      <div className={`text-[10px] leading-tight font-mono uppercase tracking-tight ${tone}`}>
        {label}
      </div>
      {!resolved && (
        <div className="mt-1 text-[9px] font-mono opacity-70 text-foreground/70">
          +{weightPts[weight]} pts
        </div>
      )}
    </button>
  );
}

function ScoreDial({ label, value, tone, delta }: { label: string; value: number; tone: string; delta?: number }) {
  return (
    <div className="flex flex-col items-end">
      <div className="text-[10px] font-mono uppercase text-muted-foreground">{label}</div>
      <div className={`text-3xl md:text-4xl font-mono font-bold tabular-nums ${tone} transition-all`}>{value}</div>
      {delta !== undefined && delta !== 0 && (
        <div className={`text-[10px] font-mono ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta > 0 ? "+" : ""}{delta} vs baseline
        </div>
      )}
    </div>
  );
}

export function TakeoverWarRoom({
  report, yourTitle, rivalTitle,
}: {
  report: Report;
  yourTitle: string;
  rivalTitle: string;
}) {
  const t = report.takeover;
  const [selected, setSelected] = useState<{ side: "you" | "rival"; index: number } | null>(null);
  const [sealed, setSealed] = useState<Set<number>>(new Set()); // your leaks fixed
  const [exploited, setExploited] = useState<Set<number>>(new Set()); // rival chaos exploited
  const [wedgeDone, setWedgeDone] = useState<Set<number>>(new Set());
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const yourPts = useMemo(() => scatter(t?.yourFixes.length || 0, 11), [t?.yourFixes.length]);
  const rivalPts = useMemo(() => scatter(t?.rivalChaos.length || 0, 71), [t?.rivalChaos.length]);

  // Optimization queue: alternates seal → exploit → wedge for a satisfying rhythm
  const optimizationQueue = useMemo(() => {
    if (!t) return [] as { kind: "seal" | "exploit" | "wedge"; index: number }[];
    const q: { kind: "seal" | "exploit" | "wedge"; index: number }[] = [];
    const yf = t.yourFixes.map((f, i) => ({ i, w: weightPts[blockerWeight(f.blockerLevel)] }))
      .sort((a, b) => b.w - a.w);
    const rc = t.rivalChaos.map((c, i) => ({ i, w: weightPts[c.exploitability] }))
      .sort((a, b) => b.w - a.w);
    const maxLen = Math.max(yf.length, rc.length);
    for (let k = 0; k < maxLen; k++) {
      if (yf[k]) q.push({ kind: "seal", index: yf[k].i });
      if (rc[k]) q.push({ kind: "exploit", index: rc[k].i });
    }
    t.wedgeMoves.forEach((_, i) => q.push({ kind: "wedge", index: i }));
    return q;
  }, [t]);

  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!running) return;
    if (cursor >= optimizationQueue.length) { setRunning(false); return; }
    timerRef.current = window.setTimeout(() => {
      const step = optimizationQueue[cursor];
      if (step.kind === "seal") {
        setSealed(prev => new Set(prev).add(step.index));
        setSelected({ side: "you", index: step.index });
      } else if (step.kind === "exploit") {
        setExploited(prev => new Set(prev).add(step.index));
        setSelected({ side: "rival", index: step.index });
      } else {
        setWedgeDone(prev => new Set(prev).add(step.index));
      }
      setCursor(c => c + 1);
    }, 750);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [running, cursor, optimizationQueue]);

  if (!t) return null;

  const bf = report.battlefield || {};
  const recoverable = bf.recoverableIfFixedUsd || 0;
  const stealable = bf.stealableFromRivalUsd || 0;
  const youBleed = bf.youMonthlyBleedUsd || 0;
  const rivalBleed = bf.rivalMonthlyBleedUsd || 0;

  // Live projected scores
  const sealBoost = t.yourFixes.reduce((sum, f, i) => sum + (sealed.has(i) ? weightPts[blockerWeight(f.blockerLevel)] : 0), 0);
  const exploitDrag = t.rivalChaos.reduce((sum, c, i) => sum + (exploited.has(i) ? weightPts[c.exploitability] : 0), 0);
  const wedgeBoost = Array.from(wedgeDone).reduce((sum, i) => {
    const m = t.wedgeMoves[i];
    return sum + (m?.timeframe === "week" ? 4 : m?.timeframe === "month" ? 7 : 10);
  }, 0);

  const liveYou = Math.min(100, report.overall.youScore + sealBoost + Math.round(wedgeBoost * 0.6));
  const liveRival = Math.max(0, report.overall.rivalScore - exploitDrag - Math.round(wedgeBoost * 0.4));
  const baselineGap = report.overall.youScore - report.overall.rivalScore;
  const liveGap = liveYou - liveRival;

  const totalMoves = t.yourFixes.length + t.rivalChaos.length + t.wedgeMoves.length;
  const doneMoves = sealed.size + exploited.size + wedgeDone.size;
  const pct = totalMoves ? Math.round((doneMoves / totalMoves) * 100) : 0;

  const captured = Math.round(
    (sealed.size / Math.max(1, t.yourFixes.length)) * recoverable +
    (exploited.size / Math.max(1, t.rivalChaos.length)) * stealable
  );

  const won = liveYou > liveRival && doneMoves >= Math.ceil(totalMoves * 0.6);

  const resetAll = () => {
    setSealed(new Set()); setExploited(new Set()); setWedgeDone(new Set());
    setCursor(0); setRunning(false); setSelected(null);
  };

  const activeDetail = selected
    ? selected.side === "rival" ? t.rivalChaos[selected.index] : t.yourFixes[selected.index]
    : null;

  return (
    <div className="space-y-4">
      {/* War room header + live HUD */}
      <Card className="relative overflow-hidden border-red-500/40 bg-[radial-gradient(ellipse_at_top,hsl(0_75%_20%/0.25),transparent_60%),radial-gradient(ellipse_at_bottom,hsl(45_95%_35%/0.15),transparent_60%)]">
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full border border-red-500/50 flex items-center justify-center animate-pulse shrink-0">
              <Radio className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-red-400/80">War Room · Live</div>
              <h3 className="text-xl md:text-2xl font-serif font-bold">Takeover Command</h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-3xl">{t.thesis}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ScoreDial label="You" value={liveYou} tone="text-amber-400" delta={liveYou - report.overall.youScore} />
            <div className="text-muted-foreground font-mono text-xs">vs</div>
            <ScoreDial label="Rival" value={liveRival} tone="text-red-400" delta={liveRival - report.overall.rivalScore} />
          </div>
        </div>

        {/* Progress + auto-optimize controls */}
        <div className="relative px-5 pb-5 grid md:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-muted-foreground mb-1">
              <span className="flex items-center gap-1"><Sparkle className="w-3 h-3 text-amber-500" /> Self-Optimizing Playbook</span>
              <span>
                {doneMoves}/{totalMoves} moves · gap {liveGap >= 0 ? "+" : ""}{liveGap} pts · captured {fmt$(captured)}/mo
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${won ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-red-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {won && (
              <div className="mt-2 text-[11px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1 animate-fade-in">
                <Trophy className="w-3 h-3" /> Takeover complete — you've overtaken the rival by {liveGap} pts.
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              onClick={() => setRunning(r => !r)}
              disabled={cursor >= optimizationQueue.length}
              className={running ? "bg-amber-500 text-black hover:bg-amber-500/90" : "bg-red-500 text-white hover:bg-red-500/90"}
            >
              {running ? <><Pause className="w-3 h-3 mr-1" /> Pause</> : cursor === 0 ? <><Play className="w-3 h-3 mr-1" /> Auto-Optimize</> : <><Play className="w-3 h-3 mr-1" /> Resume</>}
            </Button>
            <Button size="sm" variant="outline" onClick={resetAll} disabled={running || doneMoves === 0}>
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Battlefield */}
      <Card className="relative overflow-hidden border-red-500/30 bg-background/60">
        <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-red-500/40 to-transparent z-10" />
        <div className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2 items-center z-20">
          <div className="text-[10px] font-mono uppercase tracking-widest text-red-400/70 rotate-90 whitespace-nowrap bg-background px-2 py-1 border border-red-500/30 rounded">
            DMZ · No Man's Land
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* YOUR side */}
          <div className="relative min-h-[420px] md:min-h-[520px] p-4 border-b md:border-b-0 md:border-r border-red-500/20 bg-[radial-gradient(circle_at_20%_30%,hsl(45_95%_45%/0.12),transparent_65%)]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500/80">Your Bunker</div>
                <div className="text-sm font-serif font-bold text-amber-200 truncate max-w-[220px]">{yourTitle || "You"}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Sealed</div>
                <div className="text-lg font-mono font-bold text-emerald-400">{sealed.size}/{t.yourFixes.length}</div>
                <div className="text-[10px] font-mono text-red-400">bleed {fmt$(youBleed)}/mo</div>
              </div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500/70 mb-2 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Click a bubble to seal
            </div>
            <div className="relative h-[340px] md:h-[430px]">
              {t.yourFixes.map((f, i) => {
                const p = yourPts[i];
                return (
                  <Bubble
                    key={i}
                    x={p.x} y={p.y}
                    label={f.issue}
                    weight={blockerWeight(f.blockerLevel)}
                    side="you"
                    i={i}
                    onClick={() => {
                      setSelected({ side: "you", index: i });
                      setSealed(prev => {
                        const n = new Set(prev);
                        if (n.has(i)) n.delete(i); else n.add(i);
                        return n;
                      });
                    }}
                    active={selected?.side === "you" && selected.index === i}
                    resolved={sealed.has(i)}
                  />
                );
              })}
            </div>
          </div>

          {/* RIVAL side */}
          <div className="relative min-h-[420px] md:min-h-[520px] p-4 bg-[radial-gradient(circle_at_80%_70%,hsl(0_75%_45%/0.15),transparent_65%)]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-red-400/80">Rival Bunker</div>
                <div className="text-sm font-serif font-bold text-red-300 truncate max-w-[220px]">{rivalTitle || "Rival"}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Exploited</div>
                <div className="text-lg font-mono font-bold text-emerald-400">{exploited.size}/{t.rivalChaos.length}</div>
                <div className="text-[10px] font-mono text-red-400">bleed {fmt$(rivalBleed)}/mo</div>
              </div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-red-400/70 mb-2 flex items-center gap-1">
              <Crosshair className="w-3 h-3" /> Click a bubble to exploit
            </div>
            <div className="relative h-[340px] md:h-[430px]">
              {t.rivalChaos.map((c, i) => {
                const p = rivalPts[i];
                return (
                  <Bubble
                    key={i}
                    x={p.x} y={p.y}
                    label={c.weakness}
                    weight={c.exploitability}
                    side="rival"
                    i={i}
                    onClick={() => {
                      setSelected({ side: "rival", index: i });
                      setExploited(prev => {
                        const n = new Set(prev);
                        if (n.has(i)) n.delete(i); else n.add(i);
                        return n;
                      });
                    }}
                    active={selected?.side === "rival" && selected.index === i}
                    resolved={exploited.has(i)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected bubble insight rail */}
        {activeDetail && selected && (
          <div className="border-t border-red-500/30 bg-background/80 p-4 animate-fade-in">
            {selected.side === "rival" ? (
              <div className="grid md:grid-cols-[1fr_2fr_auto] gap-3 items-center">
                <div>
                  <div className="text-[10px] font-mono uppercase text-red-400/80">Rival weakness</div>
                  <div className="font-serif font-bold text-red-200">{(activeDetail as any).weakness}</div>
                  <div className="text-xs text-muted-foreground italic mt-1">"{(activeDetail as any).evidence}"</div>
                </div>
                <div className="p-3 rounded border border-red-500/30 bg-red-500/5">
                  <div className="text-[10px] font-mono uppercase text-red-400 mb-1">Precision exploit</div>
                  <div className="text-sm">{(activeDetail as any).howToExploit}</div>
                </div>
                <Button
                  size="sm"
                  className={exploited.has(selected.index)
                    ? "bg-emerald-500 text-black hover:bg-emerald-500/90"
                    : "bg-red-500 text-white hover:bg-red-500/90"}
                  onClick={() => setExploited(prev => {
                    const n = new Set(prev);
                    if (n.has(selected.index)) n.delete(selected.index); else n.add(selected.index);
                    return n;
                  })}
                >
                  {exploited.has(selected.index)
                    ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Exploited</>
                    : <><Crosshair className="w-3 h-3 mr-1" /> Mark exploited</>}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-[1fr_2fr_auto] gap-3 items-center">
                <div>
                  <div className="text-[10px] font-mono uppercase text-amber-500/80">Your leak</div>
                  <div className="font-serif font-bold text-amber-200">{(activeDetail as any).issue}</div>
                  <div className="text-xs text-muted-foreground italic mt-1">"{(activeDetail as any).evidence}"</div>
                </div>
                <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5">
                  <div className="text-[10px] font-mono uppercase text-amber-500 mb-1">Seal move</div>
                  <div className="text-sm">{(activeDetail as any).fix}</div>
                </div>
                <Button
                  size="sm"
                  className={sealed.has(selected.index)
                    ? "bg-emerald-500 text-black hover:bg-emerald-500/90"
                    : "bg-amber-500 text-black hover:bg-amber-500/90"}
                  onClick={() => setSealed(prev => {
                    const n = new Set(prev);
                    if (n.has(selected.index)) n.delete(selected.index); else n.add(selected.index);
                    return n;
                  })}
                >
                  {sealed.has(selected.index)
                    ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Sealed</>
                    : <><ShieldAlert className="w-3 h-3 mr-1" /> Mark sealed</>}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Precision Playbook — ordered, clickable steps */}
      <Card className="p-5 border-amber-500/30 bg-gradient-to-br from-background to-amber-500/5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-amber-500" />
          <h4 className="font-serif font-bold text-lg">Precision Playbook</h4>
          <Badge variant="outline" className="font-mono uppercase text-[10px] ml-1">Sequenced to win</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Every wedge move ranked by impact. Tap to lock it in — the score bar above recalculates instantly.
        </p>

        <div className="space-y-2">
          {t.wedgeMoves.map((m, i) => {
            const done = wedgeDone.has(i);
            const pts = m.timeframe === "week" ? 4 : m.timeframe === "month" ? 7 : 10;
            return (
              <button
                key={i}
                onClick={() => setWedgeDone(prev => {
                  const n = new Set(prev);
                  if (n.has(i)) n.delete(i); else n.add(i);
                  return n;
                })}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  done
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-border bg-card/50 hover:border-amber-500/60 hover:bg-amber-500/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs font-bold ${
                    done ? "border-emerald-500 bg-emerald-500 text-black" : "border-amber-500/50 text-amber-400"
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className="font-semibold text-sm">{m.move}</div>
                      <Badge variant="outline" className="font-mono uppercase text-[9px]">{m.timeframe}</Badge>
                      <Badge className="bg-amber-500 text-black font-mono text-[9px]">+{pts} pts</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" /> {m.expectedOutcome}
                    </div>
                    <div className="grid md:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-red-500/5 border border-red-500/20">
                        <span className="font-mono uppercase text-red-400 text-[9px] mr-1">Their weakness:</span>
                        {m.leveragesRivalWeakness}
                      </div>
                      <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                        <span className="font-mono uppercase text-amber-500 text-[9px] mr-1">Your strength:</span>
                        {m.leveragesYourStrength}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 mt-2 ${done ? "text-emerald-400" : "text-muted-foreground"}`} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Positioning + counter-messaging */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 border-amber-500/30">
          <h4 className="font-serif font-bold mb-3 flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-500" /> Positioning Pivot</h4>
          <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5 mb-3">
            <div className="text-lg font-serif font-bold text-amber-100">{t.positioningPivot.newHeadline}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.positioningPivot.newSubhead}</div>
            <Badge className="bg-amber-500 text-black font-mono text-[10px] mt-2">{t.positioningPivot.newCtaLabel}</Badge>
          </div>
          <div className="text-[10px] font-mono uppercase text-amber-500 mb-1">Keywords to own</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {t.positioningPivot.keywordsToOwn.map((k, i) => (
              <Badge key={i} variant="outline" className="font-mono text-[10px]">{k}</Badge>
            ))}
          </div>
          <div className="text-[10px] font-mono uppercase text-amber-500 mb-1">Proof to add</div>
          <ul className="space-y-1 text-xs">
            {t.positioningPivot.proofToAdd.map((p, i) => <li key={i}>▸ {p}</li>)}
          </ul>
        </Card>

        <Card className="p-5 border-red-500/30">
          <h4 className="font-serif font-bold mb-3 flex items-center gap-2"><Crosshair className="w-4 h-4 text-red-400" /> Counter-Messaging</h4>
          <div className="space-y-2">
            {t.counterMessaging.map((c, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-red-500/5 border border-red-500/20">
                  <div className="font-mono uppercase text-red-400 text-[9px] mb-1">They claim</div>
                  <div>{c.rivalClaim}</div>
                </div>
                <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                  <div className="font-mono uppercase text-amber-500 text-[9px] mb-1">You counter</div>
                  <div>{c.yourCounter}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* KPIs */}
      <Card className="p-5 border-red-500/30 bg-gradient-to-r from-red-500/5 via-background to-amber-500/5">
        <h4 className="font-serif font-bold mb-3 text-sm uppercase tracking-widest font-mono text-muted-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> 30-Day Takeover KPIs
        </h4>
        <div className="grid md:grid-cols-3 gap-3">
          {t.kpis.map((k, i) => (
            <div key={i} className="p-3 rounded border border-border bg-background">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">{k.metric}</div>
              <div className="text-[10px] mt-1"><span className="text-muted-foreground">Now:</span> {k.baseline}</div>
              <div className="text-sm font-bold text-amber-400 mt-1">→ {k.target30Day}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default TakeoverWarRoom;
