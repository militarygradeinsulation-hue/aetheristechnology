import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair, ShieldAlert, Radio, Flag, Megaphone, Target, Skull, Trophy } from "lucide-react";

type Takeover = NonNullable<Report["takeover"]>;

// Re-declare minimal shape to avoid circular import
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

// Deterministic pseudo-random so bubbles don't jump between renders
const seeded = (n: number) => {
  const v = Math.sin(n * 137.31) * 43758.5453;
  return v - Math.floor(v);
};

// Layout N bubbles inside a rectangle (percentage coords) without overlap-ish spread
function scatter(n: number, seedBase: number) {
  const pts: { x: number; y: number }[] = [];
  const cols = Math.max(2, Math.ceil(Math.sqrt(n)));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const jitterX = (seeded(seedBase + i) - 0.5) * 12;
    const jitterY = (seeded(seedBase + i * 3.1) - 0.5) * 12;
    const x = ((c + 0.5) / cols) * 100 + jitterX;
    const y = ((r + 0.5) / rows) * 100 + jitterY;
    pts.push({ x: Math.max(10, Math.min(90, x)), y: Math.max(12, Math.min(88, y)) });
  }
  return pts;
}

function ChaosBubble({
  x, y, label, detail, weight, side, i, onClick, active,
}: {
  x: number; y: number; label: string; detail: string; weight: "high" | "medium" | "low";
  side: "you" | "rival"; i: number; onClick: () => void; active: boolean;
}) {
  const size = weight === "high" ? 130 : weight === "medium" ? 110 : 92;
  const border =
    side === "rival"
      ? weight === "high" ? "border-red-500/70" : "border-red-500/40"
      : weight === "high" ? "border-amber-500/70" : "border-amber-500/40";
  const glow =
    side === "rival" ? "shadow-[0_0_30px_hsl(0_80%_55%/0.25)]" : "shadow-[0_0_30px_hsl(45_95%_55%/0.25)]";
  const bg = side === "rival" ? "bg-red-500/10" : "bg-amber-500/10";
  const tone = side === "rival" ? "text-red-300" : "text-amber-200";
  const dur = 8 + ((i * 1.7) % 6);
  const delay = (i * 0.6) % 4;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border ${border} ${bg} ${glow} backdrop-blur-sm p-2 flex items-center justify-center text-center transition-all hover:scale-110 hover:z-20 animate-mindmap-drift ${active ? "ring-2 ring-offset-2 ring-offset-background scale-110 z-30" : "z-10"}`}
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
      <div className={`text-[10px] leading-tight font-mono uppercase tracking-tight ${tone}`}>
        {label}
      </div>
    </button>
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
  const [scenarioIdx, setScenarioIdx] = useState<number>(0);

  const yourPts = useMemo(() => scatter(t?.yourFixes.length || 0, 11), [t?.yourFixes.length]);
  const rivalPts = useMemo(() => scatter(t?.rivalChaos.length || 0, 71), [t?.rivalChaos.length]);

  if (!t) return null;

  const bf = report.battlefield || {};
  const recoverable = bf.recoverableIfFixedUsd || 0;
  const stealable = bf.stealableFromRivalUsd || 0;
  const youBleed = bf.youMonthlyBleedUsd || 0;
  const rivalBleed = bf.rivalMonthlyBleedUsd || 0;

  // Score of the "what if" — derive from wedge move + battlefield
  function scenarioScore(move: Takeover["wedgeMoves"][number]): {
    swing: number; you: number; rival: number; note: string;
  } {
    const base = report.overall.youScore - report.overall.rivalScore;
    const tfMult = move.timeframe === "week" ? 0.35 : move.timeframe === "month" ? 0.7 : 1;
    const boost = Math.round(8 * tfMult + Math.min(12, stealable / 5000));
    const drag = Math.round(4 * tfMult + Math.min(8, rivalBleed / 4000));
    const you = Math.min(100, report.overall.youScore + boost);
    const rival = Math.max(0, report.overall.rivalScore - drag);
    const swing = (you - rival) - base;
    return {
      swing,
      you,
      rival,
      note: `+${fmt$(Math.round((recoverable + stealable) * tfMult / 12))}/mo captured within one ${move.timeframe}`,
    };
  }

  const activeDetail = selected
    ? selected.side === "rival"
      ? t.rivalChaos[selected.index]
      : t.yourFixes[selected.index]
    : null;

  return (
    <div className="space-y-4">
      {/* War room header */}
      <Card className="relative overflow-hidden border-red-500/40 bg-[radial-gradient(ellipse_at_top,hsl(0_75%_20%/0.25),transparent_60%),radial-gradient(ellipse_at_bottom,hsl(45_95%_35%/0.15),transparent_60%)]">
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-red-500/50 flex items-center justify-center animate-pulse">
            <Radio className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-red-400/80">War Room · Live</div>
            <h3 className="text-xl md:text-2xl font-serif font-bold">Takeover Command</h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-3xl">{t.thesis}</p>
          </div>
          <Badge className="bg-red-500 text-white font-mono uppercase text-[10px]">Offensive</Badge>
        </div>
      </Card>

      {/* Two-side battlefield */}
      <Card className="relative overflow-hidden border-red-500/30 bg-background/60">
        {/* Center divider / DMZ */}
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
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Score</div>
                <div className="text-2xl font-mono font-bold text-amber-400">{report.overall.youScore}</div>
                <div className="text-[10px] font-mono text-red-400">bleed {fmt$(youBleed)}/mo</div>
              </div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500/70 mb-2 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Chaos to seal — {t.yourFixes.length}
            </div>
            <div className="relative h-[340px] md:h-[430px]">
              {t.yourFixes.map((f, i) => {
                const p = yourPts[i];
                const w = f.blockerLevel === "critical" ? "high" : f.blockerLevel === "important" ? "medium" : "low";
                return (
                  <ChaosBubble
                    key={i}
                    x={p.x} y={p.y}
                    label={f.issue}
                    detail={f.fix}
                    weight={w as any}
                    side="you"
                    i={i}
                    onClick={() => setSelected({ side: "you", index: i })}
                    active={selected?.side === "you" && selected.index === i}
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
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Score</div>
                <div className="text-2xl font-mono font-bold text-red-400">{report.overall.rivalScore}</div>
                <div className="text-[10px] font-mono text-red-400">bleed {fmt$(rivalBleed)}/mo</div>
              </div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-red-400/70 mb-2 flex items-center gap-1">
              <Crosshair className="w-3 h-3" /> Chaos to exploit — {t.rivalChaos.length}
            </div>
            <div className="relative h-[340px] md:h-[430px]">
              {t.rivalChaos.map((c, i) => {
                const p = rivalPts[i];
                return (
                  <ChaosBubble
                    key={i}
                    x={p.x} y={p.y}
                    label={c.weakness}
                    detail={c.howToExploit}
                    weight={c.exploitability as any}
                    side="rival"
                    i={i}
                    onClick={() => setSelected({ side: "rival", index: i })}
                    active={selected?.side === "rival" && selected.index === i}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected bubble detail rail */}
        {activeDetail && (
          <div className="border-t border-red-500/30 bg-background/80 p-4">
            {selected?.side === "rival" ? (
              <div className="grid md:grid-cols-[1fr_2fr] gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase text-red-400/80">Rival weakness</div>
                  <div className="font-serif font-bold text-red-200">{(activeDetail as any).weakness}</div>
                  <div className="text-xs text-muted-foreground italic mt-1">"{(activeDetail as any).evidence}"</div>
                </div>
                <div className="p-3 rounded border border-red-500/30 bg-red-500/5">
                  <div className="text-[10px] font-mono uppercase text-red-400 mb-1">How to exploit</div>
                  <div className="text-sm">{(activeDetail as any).howToExploit}</div>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-[1fr_2fr] gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase text-amber-500/80">Your leak</div>
                  <div className="font-serif font-bold text-amber-200">{(activeDetail as any).issue}</div>
                  <div className="text-xs text-muted-foreground italic mt-1">"{(activeDetail as any).evidence}"</div>
                </div>
                <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5">
                  <div className="text-[10px] font-mono uppercase text-amber-500 mb-1">Seal move</div>
                  <div className="text-sm">{(activeDetail as any).fix}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Chaos-theory What-If board */}
      <Card className="p-5 border-amber-500/30 bg-gradient-to-br from-background to-amber-500/5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-amber-500" />
          <h4 className="font-serif font-bold text-lg">What-If Scenarios</h4>
          <Badge variant="outline" className="font-mono uppercase text-[10px] ml-1">Chaos theory</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Tiny cause → outsized effect. Each wedge move recalculates the projected score gap after impact.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {t.wedgeMoves.map((m, i) => (
            <button
              key={i}
              onClick={() => setScenarioIdx(i)}
              className={`text-left rounded-lg border px-3 py-2 transition-all min-w-[220px] max-w-[300px] ${
                scenarioIdx === i
                  ? "border-amber-500 bg-amber-500/10 shadow-[0_0_20px_hsl(45_95%_55%/0.2)]"
                  : "border-border bg-card/50 hover:border-amber-500/50"
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-amber-500 mb-1 flex items-center gap-1">
                <Flag className="w-3 h-3" /> If: {m.timeframe}
              </div>
              <div className="text-xs font-semibold leading-snug">{m.move}</div>
            </button>
          ))}
        </div>

        {t.wedgeMoves[scenarioIdx] && (() => {
          const s = scenarioScore(t.wedgeMoves[scenarioIdx]);
          const m = t.wedgeMoves[scenarioIdx];
          return (
            <div className="grid md:grid-cols-[1.2fr_1fr] gap-4">
              <div className="p-4 rounded-lg border border-amber-500/30 bg-background">
                <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Projected outcome</div>
                <div className="text-sm mb-3">{m.expectedOutcome}</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-amber-500 mb-1">You after move</div>
                    <div className="text-3xl font-mono font-bold text-amber-400">{s.you}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">from {report.overall.youScore}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-red-400 mb-1">Rival after move</div>
                    <div className="text-3xl font-mono font-bold text-red-400">{s.rival}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">from {report.overall.rivalScore}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between p-2 rounded bg-amber-500/10 border border-amber-500/30">
                  <span className="text-[10px] font-mono uppercase text-amber-500">Gap swing</span>
                  <span className="text-lg font-mono font-bold text-amber-400 flex items-center gap-1">
                    {s.swing >= 0 ? <Trophy className="w-4 h-4" /> : <Skull className="w-4 h-4 text-red-400" />}
                    {s.swing >= 0 ? "+" : ""}{s.swing} pts
                  </span>
                </div>
                <div className="mt-2 text-xs font-mono text-emerald-400">{s.note}</div>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded border border-red-500/30 bg-red-500/5">
                  <div className="text-[10px] font-mono uppercase text-red-400 mb-1">Leverages their weakness</div>
                  <div className="text-xs">{m.leveragesRivalWeakness}</div>
                </div>
                <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5">
                  <div className="text-[10px] font-mono uppercase text-amber-500 mb-1">Leverages your strength</div>
                  <div className="text-xs">{m.leveragesYourStrength}</div>
                </div>
                <div className="p-3 rounded border border-border bg-card/50">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Recoverable pool</div>
                  <div className="text-xs">Fix your leaks: <span className="font-mono text-amber-400">{fmt$(recoverable)}/mo</span></div>
                  <div className="text-xs">Steal from rival: <span className="font-mono text-red-400">{fmt$(stealable)}/mo</span></div>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Positioning + counter-messaging in compact command panels */}
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

      {/* KPIs strip */}
      <Card className="p-5 border-red-500/30 bg-gradient-to-r from-red-500/5 via-background to-amber-500/5">
        <h4 className="font-serif font-bold mb-3 text-sm uppercase tracking-widest font-mono text-muted-foreground">30-Day Takeover KPIs</h4>
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
