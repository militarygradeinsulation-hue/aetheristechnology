import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords, Trophy, AlertTriangle, Target, Zap, TrendingDown, ExternalLink, Crosshair, ShieldAlert, Flag, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Category = {
  name: string;
  youScore: number;
  rivalScore: number;
  winner: "you" | "rival" | "tie";
  why: string;
  youEvidence: string;
  rivalEvidence: string;
  fix: string;
};

type Report = {
  headline: string;
  overall: { youScore: number; rivalScore: number; winner: "you" | "rival" | "tie"; gapSummary: string };
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

const fmt$ = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;

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
  const youColor = "hsl(45 95% 55%)"; // amber
  const rivalColor = "hsl(0 75% 60%)"; // crimson

  return (
    <div className="space-y-6">
      <Card className="p-6 border-amber-500/20 bg-gradient-to-br from-background to-amber-500/5">
        <div className="flex items-center gap-3 mb-4">
          <Swords className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold font-serif">Head-to-Head: URL vs URL</h2>
            <p className="text-sm text-muted-foreground">Drop your URL and a rival's. Get a forensic verdict on who's winning where — and exactly what to do about it.</p>
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
        <Button onClick={run} disabled={loading} className="w-full md:w-auto">
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Comparing…</>) : (<><Swords className="w-4 h-4 mr-2" /> Run Head-to-Head</>)}
        </Button>
      </Card>

      {loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground font-mono">
          Scraping both sites, extracting brand identity, and running Gemini synthesis…
        </Card>
      )}

      {result && r && (
        <>
          {/* Verdict */}
          <Card className="p-6 border-amber-500/30">
            <div className="text-xs font-mono uppercase text-muted-foreground mb-2">Verdict</div>
            <h3 className="text-2xl font-serif font-bold mb-3">{r.headline}</h3>
            <p className="text-sm text-muted-foreground mb-6">{r.overall.gapSummary}</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-mono uppercase text-amber-500">You</div>
                    <a href={result.you.url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline flex items-center gap-1">
                      {result.you.title || result.you.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-3xl font-bold font-mono text-amber-500">{r.overall.youScore}</div>
                </div>
                <ScoreBar label="Overall" score={r.overall.youScore} color={youColor} />
              </div>
              <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-mono uppercase text-red-400">Rival</div>
                    <a href={result.rival.url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline flex items-center gap-1">
                      {result.rival.title || result.rival.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-3xl font-bold font-mono text-red-400">{r.overall.rivalScore}</div>
                </div>
                <ScoreBar label="Overall" score={r.overall.rivalScore} color={rivalColor} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center">
              {r.overall.winner === "tie" ? (
                <Badge variant="outline" className="font-mono uppercase">Dead heat</Badge>
              ) : (
                <Badge className={`font-mono uppercase text-sm px-4 py-1 ${r.overall.winner === "you" ? "bg-amber-500 text-black" : "bg-red-500 text-white"}`}>
                  <Trophy className="w-4 h-4 mr-1" /> {r.overall.winner === "you" ? "You lead overall" : "Rival leads overall"}
                </Badge>
              )}
            </div>
          </Card>

          {/* Category breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-bold font-serif mb-4">Category Breakdown</h3>
            <div className="space-y-4">
              {r.categories.map((c, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">{c.name}</div>
                    <WinnerBadge winner={c.winner} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <ScoreBar label="You" score={c.youScore} color={youColor} />
                    <ScoreBar label="Rival" score={c.rivalScore} color={rivalColor} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2"><span className="font-mono uppercase text-xs text-amber-500">Why: </span>{c.why}</p>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div className="p-2 rounded border border-amber-500/20 bg-amber-500/5">
                      <div className="font-mono uppercase text-amber-500 mb-1">Your evidence</div>
                      <div className="text-muted-foreground">{c.youEvidence}</div>
                    </div>
                    <div className="p-2 rounded border border-red-500/20 bg-red-500/5">
                      <div className="font-mono uppercase text-red-400 mb-1">Rival evidence</div>
                      <div className="text-muted-foreground">{c.rivalEvidence}</div>
                    </div>
                  </div>
                  <div className="mt-3 p-2 rounded bg-muted/30 text-sm">
                    <span className="font-mono uppercase text-xs text-primary">Fix: </span>{c.fix}
                  </div>
                </div>
              ))}
            </div>
          </Card>

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

          <div className="text-xs font-mono text-muted-foreground text-center">
            Model: {result.meta.model} · Generated {new Date(result.meta.generatedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
