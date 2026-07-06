import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Swords, Trophy, AlertTriangle, Target, Zap, TrendingDown, TrendingUp,
  ExternalLink, Crosshair, ShieldAlert, Flag, Megaphone, DollarSign, Skull,
  CheckCircle2, Users, Palette, Search, ShieldCheck, MousePointerClick, Sparkles, BadgeDollarSign,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { TakeoverWarRoom } from "./TakeoverWarRoom";

type Category = {
  name: string;
  youScore: number;
  rivalScore: number;
  winner: "you" | "rival" | "tie";
  why: string;
  youEvidence: string;
  rivalEvidence: string;
  fix: string;
  youMonthlyDollarImpact?: number;
  rivalMonthlyDollarImpact?: number;
  roiIfFixedUsd?: number;
};

type Battlefield = {
  youMonthlyBleedUsd?: number;
  rivalMonthlyBleedUsd?: number;
  recoverableIfFixedUsd?: number;
  stealableFromRivalUsd?: number;
  verdictLine?: string;
};

type Report = {
  headline: string;
  overall: { youScore: number; rivalScore: number; winner: "you" | "rival" | "tie"; gapSummary: string };
  battlefield?: Battlefield;
  categories: Category[];
  youWins: string[];
  rivalWins: string[];
  silentLosses: { area: string; estimatedMonthlyLossUsd: number; why: string }[];
  actionPlan: { priority: "P0" | "P1" | "P2"; action: string; expectedImpact: string; effort: "low" | "medium" | "high" }[];
  quickWins: string[];
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

type Result = {
  you: { url: string; scraped: boolean; title: string };
  rival: { url: string; scraped: boolean; title: string };
  report: Report;
  meta: { model: string; generatedAt: string };
};

const fmt$ = (n?: number) => `$${Math.round(n || 0).toLocaleString()}`;

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Positioning & Messaging": Megaphone,
  "Offer Clarity & Pricing": BadgeDollarSign,
  "Proof & Credibility": Users,
  "Visual & Brand Identity": Palette,
  "Conversion Path & CTAs": MousePointerClick,
  "Content Depth & SEO": Search,
  "Trust & Risk Reduction": ShieldCheck,
  "Differentiation": Sparkles,
};

// Position 8 categories in a ring between YOU (left) and RIVAL (right).
const CATEGORY_POSITIONS: { x: number; y: number }[] = [
  { x: 50, y: 8 },   // top
  { x: 74, y: 20 },  // top-right
  { x: 82, y: 50 },  // right (near rival)
  { x: 74, y: 80 },  // bottom-right
  { x: 50, y: 92 },  // bottom
  { x: 26, y: 80 },  // bottom-left
  { x: 18, y: 50 },  // left (near you)
  { x: 26, y: 20 },  // top-left
];
const YOU_HUB = { x: 8, y: 50 };
const RIVAL_HUB = { x: 92, y: 50 };

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold">{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function WinnerBadge({ winner }: { winner: "you" | "rival" | "tie" }) {
  if (winner === "tie") return <Badge variant="outline" className="font-mono uppercase text-xs">Tie</Badge>;
  const you = winner === "you";
  return (
    <Badge className={`font-mono uppercase text-xs ${you ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "bg-red-500/20 text-red-400 border-red-500/40"}`}>
      {you ? "You win" : "Rival wins"}
    </Badge>
  );
}

// ------- Battlefield mind map -------
function Battlefield({
  report,
  yourTitle,
  rivalTitle,
}: { report: Report; yourTitle: string; rivalTitle: string }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const bf = report.battlefield || {};
  const active = activeIdx !== null ? report.categories[activeIdx] : null;
  const ActiveIcon = active ? CATEGORY_ICONS[active.name] ?? Target : null;

  const totals = useMemo(() => {
    const youBleed = bf.youMonthlyBleedUsd ?? report.categories.reduce((s, c) => s + (c.youMonthlyDollarImpact || 0), 0);
    const rivalBleed = bf.rivalMonthlyBleedUsd ?? report.categories.reduce((s, c) => s + (c.rivalMonthlyDollarImpact || 0), 0);
    const recoverable = bf.recoverableIfFixedUsd ?? Math.round(youBleed * 0.65);
    const stealable = bf.stealableFromRivalUsd ?? Math.round(rivalBleed * 0.35);
    return { youBleed, rivalBleed, recoverable, stealable };
  }, [report, bf]);

  return (
    <Card className="p-4 sm:p-6 border-amber-500/30 bg-gradient-to-br from-background via-background to-red-500/5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-amber-500" />
          <h3 className="font-serif font-bold text-lg">The Battlefield</h3>
          <Badge variant="outline" className="font-mono uppercase text-[10px]">Interactive · $ / mo</Badge>
        </div>
        {bf.verdictLine && (
          <p className="text-xs sm:text-sm italic text-red-400 font-mono">{bf.verdictLine}</p>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="p-2 rounded border border-red-500/30 bg-red-500/5">
          <div className="text-[10px] font-mono uppercase text-red-400 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> You bleed / mo</div>
          <div className="text-lg font-bold font-mono text-red-400">{fmt$(totals.youBleed)}</div>
        </div>
        <div className="p-2 rounded border border-red-500/30 bg-red-500/5">
          <div className="text-[10px] font-mono uppercase text-red-400 flex items-center gap-1"><Skull className="w-3 h-3" /> Rival bleeds / mo</div>
          <div className="text-lg font-bold font-mono text-red-400/80">{fmt$(totals.rivalBleed)}</div>
        </div>
        <div className="p-2 rounded border border-amber-500/40 bg-amber-500/5">
          <div className="text-[10px] font-mono uppercase text-amber-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> ROI if you fix / mo</div>
          <div className="text-lg font-bold font-mono text-amber-500">+{fmt$(totals.recoverable)}</div>
        </div>
        <div className="p-2 rounded border border-amber-500/40 bg-amber-500/5">
          <div className="text-[10px] font-mono uppercase text-amber-500 flex items-center gap-1"><Crosshair className="w-3 h-3" /> Stealable from rival / mo</div>
          <div className="text-lg font-bold font-mono text-amber-500">+{fmt$(totals.stealable)}</div>
        </div>
      </div>

      {/* Mind map */}
      <div className="relative w-full rounded-sm border border-border/50 bg-background/40 overflow-hidden">
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9]">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <radialGradient id="youGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(45 95% 55%)" stopOpacity="0.4" />
                <stop offset="70%" stopColor="hsl(45 95% 55%)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="rivalGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(0 75% 60%)" stopOpacity="0.4" />
                <stop offset="70%" stopColor="hsl(0 75% 60%)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx={YOU_HUB.x} cy={YOU_HUB.y} r="14" fill="url(#youGlow)" />
            <circle cx={RIVAL_HUB.x} cy={RIVAL_HUB.y} r="14" fill="url(#rivalGlow)" />

            {report.categories.map((c, i) => {
              const p = CATEGORY_POSITIONS[i] || { x: 50, y: 50 };
              const isActive = activeIdx === i;
              const dim = activeIdx !== null && !isActive;
              const winnerColor =
                c.winner === "you" ? "hsl(45 95% 55%)"
                : c.winner === "rival" ? "hsl(0 75% 60%)"
                : "hsl(0 0% 60%)";
              return (
                <g key={c.name}>
                  <line
                    x1={YOU_HUB.x} y1={YOU_HUB.y} x2={p.x} y2={p.y}
                    stroke="hsl(45 95% 55%)"
                    strokeOpacity={dim ? 0.08 : c.winner === "you" ? 0.7 : 0.3}
                    strokeWidth={isActive && c.winner === "you" ? 1.6 : 0.8}
                    strokeDasharray={isActive ? "0" : "3 4"}
                    vectorEffect="non-scaling-stroke"
                    style={{ animation: isActive ? undefined : `mindmap-flow 6s linear ${(i % 5) * -0.6}s infinite` }}
                  />
                  <line
                    x1={RIVAL_HUB.x} y1={RIVAL_HUB.y} x2={p.x} y2={p.y}
                    stroke="hsl(0 75% 60%)"
                    strokeOpacity={dim ? 0.08 : c.winner === "rival" ? 0.7 : 0.3}
                    strokeWidth={isActive && c.winner === "rival" ? 1.6 : 0.8}
                    strokeDasharray={isActive ? "0" : "3 4"}
                    vectorEffect="non-scaling-stroke"
                    style={{ animation: isActive ? undefined : `mindmap-flow 6s linear ${(i % 5) * -0.7}s infinite` }}
                  />
                  <circle cx={p.x} cy={p.y} r="4" fill={winnerColor} opacity={isActive ? 0.15 : 0.08} />
                </g>
              );
            })}
          </svg>

          {/* YOU hub */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{ left: `${YOU_HUB.x}%`, top: `${YOU_HUB.y}%` }}>
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-background border-2 border-amber-500 shadow-[0_0_40px_hsl(45_95%_55%/0.5)] flex flex-col items-center justify-center text-center px-2">
              <div className="text-[9px] font-mono uppercase tracking-widest text-amber-500">You</div>
              <div className="text-2xl font-bold font-mono text-amber-500 leading-none mt-0.5">{report.overall.youScore}</div>
              <div className="text-[10px] font-mono text-red-400 mt-1">-{fmt$(totals.youBleed)}/mo</div>
              <div className="text-[9px] font-serif italic text-foreground/70 truncate max-w-[100px]" title={yourTitle}>{yourTitle || "you"}</div>
            </div>
          </div>

          {/* RIVAL hub */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{ left: `${RIVAL_HUB.x}%`, top: `${RIVAL_HUB.y}%` }}>
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-background border-2 border-red-500 shadow-[0_0_40px_hsl(0_75%_60%/0.5)] flex flex-col items-center justify-center text-center px-2">
              <div className="text-[9px] font-mono uppercase tracking-widest text-red-400">Rival</div>
              <div className="text-2xl font-bold font-mono text-red-400 leading-none mt-0.5">{report.overall.rivalScore}</div>
              <div className="text-[10px] font-mono text-red-400/80 mt-1">-{fmt$(totals.rivalBleed)}/mo</div>
              <div className="text-[9px] font-serif italic text-foreground/70 truncate max-w-[100px]" title={rivalTitle}>{rivalTitle || "rival"}</div>
            </div>
          </div>

          {/* Category bubbles */}
          {report.categories.map((c, i) => {
            const p = CATEGORY_POSITIONS[i] || { x: 50, y: 50 };
            const isActive = activeIdx === i;
            const dim = activeIdx !== null && !isActive;
            const Icon = CATEGORY_ICONS[c.name] ?? Target;
            const winColor =
              c.winner === "you" ? "border-amber-500 text-amber-500 shadow-[0_0_18px_hsl(45_95%_55%/0.45)]"
              : c.winner === "rival" ? "border-red-500 text-red-400 shadow-[0_0_18px_hsl(0_75%_60%/0.45)]"
              : "border-muted-foreground/60 text-foreground";
            const impact = Math.max(c.youMonthlyDollarImpact || 0, c.rivalMonthlyDollarImpact || 0);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setActiveIdx((v) => (v === i ? null : i))}
                aria-pressed={isActive}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-all ${dim ? "opacity-40" : "opacity-100"}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <div className={`relative flex flex-col items-center transition-transform ${isActive ? "scale-110" : "hover:scale-105"}`}>
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-background/95 border-2 flex items-center justify-center transition-all ${winColor} ${isActive ? "ring-2 ring-amber-500/60" : ""}`}>
                    <Icon className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <div className="mt-1 font-serif text-[11px] md:text-xs font-bold leading-tight text-center max-w-[110px] text-foreground">
                    {c.name}
                  </div>
                  <div className={`font-mono text-[10px] md:text-[11px] mt-0.5 ${c.winner === "you" ? "text-amber-500" : c.winner === "rival" ? "text-red-400" : "text-muted-foreground"}`}>
                    {c.youScore} vs {c.rivalScore}
                  </div>
                  {impact > 0 && (
                    <div className="font-mono text-[10px] text-red-400/90 mt-0.5">{fmt$(impact)}/mo</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active category detail */}
      <div className="mt-4 min-h-[120px]">
        {active && ActiveIcon ? (
          <div className="animate-fade-in grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1 p-3 rounded border border-border bg-card/60">
              <div className="flex items-center gap-2 mb-2">
                <ActiveIcon className="w-4 h-4 text-amber-500" />
                <div className="font-serif font-bold text-sm">{active.name}</div>
                <div className="ml-auto"><WinnerBadge winner={active.winner} /></div>
              </div>
              <ScoreBar label="You" score={active.youScore} color="hsl(45 95% 55%)" />
              <div className="h-2" />
              <ScoreBar label="Rival" score={active.rivalScore} color="hsl(0 75% 60%)" />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="p-2 rounded border border-red-500/30 bg-red-500/5">
                  <div className="text-[9px] font-mono uppercase text-red-400">Your bleed</div>
                  <div className="text-sm font-bold font-mono text-red-400">{fmt$(active.youMonthlyDollarImpact)}/mo</div>
                </div>
                <div className="p-2 rounded border border-amber-500/30 bg-amber-500/5">
                  <div className="text-[9px] font-mono uppercase text-amber-500">ROI if fixed</div>
                  <div className="text-sm font-bold font-mono text-amber-500">+{fmt$(active.roiIfFixedUsd)}/mo</div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="p-3 rounded border border-border bg-card/60">
                <div className="text-[10px] font-mono uppercase text-amber-500 mb-1">Why</div>
                <p className="text-sm text-foreground/90 leading-snug">{active.why}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5">
                  <div className="text-[10px] font-mono uppercase text-amber-500 mb-1">Your evidence</div>
                  <p className="text-xs text-foreground/85 leading-snug italic">"{active.youEvidence}"</p>
                </div>
                <div className="p-3 rounded border border-red-500/30 bg-red-500/5">
                  <div className="text-[10px] font-mono uppercase text-red-400 mb-1">Rival evidence</div>
                  <p className="text-xs text-foreground/85 leading-snug italic">"{active.rivalEvidence}"</p>
                </div>
              </div>
              <div className="p-3 rounded border border-primary/30 bg-primary/5">
                <div className="text-[10px] font-mono uppercase text-primary mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Fix</div>
                <p className="text-sm text-foreground/95 leading-snug">{active.fix}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs font-mono uppercase tracking-widest text-muted-foreground py-6">
            Tap a category bubble to open the finding — dollars, evidence, and the fix.
          </p>
        )}
      </div>
    </Card>
  );
}

export default function HeadToHeadTool() {
  const [yourUrl, setYourUrl] = useState("");
  const [rivalUrl, setRivalUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [takeover, setTakeover] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (!yourUrl.trim() || !rivalUrl.trim()) {
      toast.error("Enter both URLs");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("head-to-head", {
        body: { yourUrl: yourUrl.trim(), rivalUrl: rivalUrl.trim(), takeover },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as Result);
      toast.success(takeover ? "Takeover playbook ready" : "Head-to-head verdict ready");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const r = result?.report;
  const youColor = "hsl(45 95% 55%)";
  const rivalColor = "hsl(0 75% 60%)";

  return (
    <div className="space-y-6">
      <Card className="p-6 border-amber-500/20 bg-gradient-to-br from-background to-amber-500/5">
        <div className="flex items-center gap-3 mb-4">
          <Swords className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold font-serif">Head-to-Head: URL vs URL</h2>
            <p className="text-sm text-muted-foreground">Drop your URL and a rival's. Get an interactive battlefield mind-map — dollar-quantified, per category, with the fix.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-mono uppercase text-amber-500 mb-1 block">Your URL</label>
            <Input value={yourUrl} onChange={(e) => setYourUrl(e.target.value)} placeholder="https://yourcompany.com" disabled={loading} />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-red-400 mb-1 block">Rival URL</label>
            <Input value={rivalUrl} onChange={(e) => setRivalUrl(e.target.value)} placeholder="https://competitor.com" disabled={loading} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-red-500/30 bg-red-500/5 mb-3">
          <div className="flex items-center gap-3">
            <Crosshair className={`w-5 h-5 ${takeover ? "text-red-400" : "text-muted-foreground"}`} />
            <div>
              <div className="text-sm font-bold font-serif">Takeover Mode</div>
              <div className="text-xs text-muted-foreground">Use rival's chaos as a wedge. Get a takeover playbook that also closes your own leaks first.</div>
            </div>
          </div>
          <Switch checked={takeover} onCheckedChange={setTakeover} disabled={loading} />
        </div>
        <Button onClick={run} disabled={loading} className="w-full md:w-auto">
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {takeover ? "Building takeover playbook…" : "Comparing…"}</>) : (<>{takeover ? <><Crosshair className="w-4 h-4 mr-2" /> Run Takeover Scan</> : <><Swords className="w-4 h-4 mr-2" /> Run Head-to-Head</>}</>)}
        </Button>
      </Card>

      {loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground font-mono">
          Scraping both sites, extracting brand identity, running dollar-weighted synthesis…
        </Card>
      )}

      {result && r && (
        <>
          {/* Verdict */}
          <Card className="p-6 border-amber-500/30">
            <div className="text-xs font-mono uppercase text-muted-foreground mb-2">Verdict</div>
            <h3 className="text-2xl font-serif font-bold mb-3">{r.headline}</h3>
            <p className="text-sm text-muted-foreground mb-4">{r.overall.gapSummary}</p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <a href={result.you.url} target="_blank" rel="noreferrer" className="text-xs text-amber-500 hover:underline flex items-center gap-1">
                {result.you.title || result.you.url} <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-muted-foreground text-xs">vs</span>
              <a href={result.rival.url} target="_blank" rel="noreferrer" className="text-xs text-red-400 hover:underline flex items-center gap-1">
                {result.rival.title || result.rival.url} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center justify-center">
              {r.overall.winner === "tie" ? (
                <Badge variant="outline" className="font-mono uppercase">Dead heat</Badge>
              ) : (
                <Badge className={`font-mono uppercase text-sm px-4 py-1 ${r.overall.winner === "you" ? "bg-amber-500 text-black" : "bg-red-500 text-white"}`}>
                  <Trophy className="w-4 h-4 mr-1" /> {r.overall.winner === "you" ? "You lead overall" : "Rival leads overall"}
                </Badge>
              )}
            </div>
          </Card>

          {/* Interactive battlefield mind map */}
          <Battlefield report={r} yourTitle={result.you.title} rivalTitle={result.rival.title} />

          {/* Wins */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5 border-amber-500/30">
              <h4 className="font-bold font-serif mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Where You Beat Them</h4>
              <ul className="space-y-2 text-sm">
                {r.youWins.map((w, i) => (<li key={i} className="flex gap-2"><span className="text-amber-500 font-mono">▸</span><span>{w}</span></li>))}
              </ul>
            </Card>
            <Card className="p-5 border-red-500/30">
              <h4 className="font-bold font-serif mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Where They Beat You</h4>
              <ul className="space-y-2 text-sm">
                {r.rivalWins.map((w, i) => (<li key={i} className="flex gap-2"><span className="text-red-400 font-mono">▸</span><span>{w}</span></li>))}
              </ul>
            </Card>
          </div>

          {/* Silent losses */}
          {r.silentLosses?.length > 0 && (
            <Card className="p-6 border-red-500/30 bg-red-500/5">
              <h4 className="font-bold font-serif mb-3 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-400" /> Silent Monthly Losses</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {r.silentLosses.map((s, i) => (
                  <div key={i} className="p-3 rounded border border-red-500/30 bg-background">
                    <div className="text-xs font-mono uppercase text-red-400">{s.area}</div>
                    <div className="text-2xl font-bold font-mono text-red-400 my-1">{fmt$(s.estimatedMonthlyLossUsd)}/mo</div>
                    <div className="text-xs text-muted-foreground">{s.why}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm font-mono text-red-400">
                Total estimated bleed: {fmt$(r.silentLosses.reduce((sum, s) => sum + (s.estimatedMonthlyLossUsd || 0), 0))}/mo
              </div>
            </Card>
          )}

          {/* Action plan */}
          <Card className="p-6">
            <h4 className="font-bold font-serif mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Action Plan</h4>
            <div className="space-y-2">
              {r.actionPlan.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded border border-border bg-card/50">
                  <Badge className={`font-mono ${a.priority === "P0" ? "bg-red-500 text-white" : a.priority === "P1" ? "bg-amber-500 text-black" : "bg-muted text-foreground"}`}>{a.priority}</Badge>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{a.action}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-mono uppercase">Impact:</span> {a.expectedImpact} · <span className="font-mono uppercase">Effort:</span> {a.effort}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick wins */}
          {r.quickWins?.length > 0 && (
            <Card className="p-6 border-amber-500/30">
              <h4 className="font-bold font-serif mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Ship This Week</h4>
              <ul className="space-y-2 text-sm">
                {r.quickWins.map((w, i) => (<li key={i} className="flex gap-2"><span className="text-amber-500 font-mono">✓</span><span>{w}</span></li>))}
              </ul>
            </Card>
          )}

          {/* Takeover war room (replaces stacked cards when takeover mode was on) */}
          {r.takeover && (
            <TakeoverWarRoom report={r} yourTitle={result.you.title} rivalTitle={result.rival.title} />
          )}



          <div className="text-xs font-mono text-muted-foreground text-center">
            Model: {result.meta.model} · Generated {new Date(result.meta.generatedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
