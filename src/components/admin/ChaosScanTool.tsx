import React, { useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, FileSearch, Gauge, Ghost, Flame,
  TrendingDown, Unplug, Wallet, Zap, Target, Loader2, Search,
  EyeOff, PhoneOff, Receipt, Clock, Scale, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

type OpId = "scan" | "price" | "fix";
type Mode = "chaos" | "fixed";

interface Symptom {
  id: string;
  label: string;
  icon: string;
  anchor: OpId;
  chaos: string;
  fixed: string;
  dollar_leak?: string;
  cascade?: string[];
  connections?: string[];
}

interface ChaosMap {
  company?: string;
  vertical?: string;
  url?: string;
  source?: { label?: string; chaos?: string; sealed?: string; dollar_leak?: string };
  operators?: { id: OpId; label: string; body: string }[];
  symptoms?: Symptom[];
  contradictions?: string[];
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ghost: Ghost, "trending-down": TrendingDown, unplug: Unplug, wallet: Wallet,
  flame: Flame, zap: Zap, alert: AlertTriangle, "eye-off": EyeOff,
  "phone-off": PhoneOff, receipt: Receipt, clock: Clock, scale: Scale,
};

const OP_ICONS: Record<OpId, React.ComponentType<{ className?: string }>> = {
  scan: FileSearch, price: Gauge, fix: CheckCircle2,
};

const OP_POS: Record<OpId, { x: number; y: number }> = {
  scan: { x: 22, y: 50 }, price: { x: 50, y: 82 }, fix: { x: 78, y: 50 },
};
const HUB = { x: 50, y: 50 };

// Deterministic pseudo-random for chaos tangles
const chaosPath = (sx: number, sy: number, ex: number, ey: number, seed: number) => {
  const rand = (n: number) => {
    const v = Math.sin(seed * 999 + n * 17.13) * 43758.5453;
    return v - Math.floor(v);
  };
  const c1x = sx + (ex - sx) * 0.25 + (rand(1) - 0.5) * 55;
  const c1y = sy + (ey - sy) * 0.25 + (rand(2) - 0.5) * 55;
  const c2x = sx + (ex - sx) * 0.75 + (rand(3) - 0.5) * 55;
  const c2y = sy + (ey - sy) * 0.75 + (rand(4) - 0.5) * 55;
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
};

const orderedPath = (sx: number, sy: number, ex: number, ey: number) => {
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;
  return `M ${sx} ${sy} Q ${mx} ${my}, ${ex} ${ey}`;
};

// Place symptoms in a ring around the hub, avoiding operator anchors
function layoutSymptoms(symptoms: Symptom[]): Array<Symptom & { x: number; y: number }> {
  const n = symptoms.length || 1;
  const rx = 42, ry = 34;
  return symptoms.map((s, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = Math.round((HUB.x + Math.cos(angle) * rx) * 10) / 10;
    const y = Math.round((HUB.y + Math.sin(angle) * ry) * 10) / 10;
    return { ...s, x, y };
  });
}

const AdminChaosScanTool: React.FC = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<ChaosMap | null>(null);
  const [mode, setMode] = useState<Mode>("chaos");
  const [activeId, setActiveId] = useState<string | null>(null);

  const symptoms = useMemo(
    () => layoutSymptoms((data?.symptoms || []).slice(0, 8)),
    [data],
  );
  const operators = useMemo(
    () =>
      (data?.operators || [
        { id: "scan", label: "Scan", body: "" },
        { id: "price", label: "Price", body: "" },
        { id: "fix", label: "Fix", body: "" },
      ]).map((o) => ({ ...o, ...OP_POS[o.id] })),
    [data],
  );
  const active = symptoms.find((s) => s.id === activeId) || null;
  const isFixed = mode === "fixed";

  const runScan = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setData(null);
    setActiveId(null);
    setMode("chaos");
    try {
      const headers: Record<string, string> = {};
      const tok = getAdminToken();
      if (tok) headers["x-admin-token"] = tok;
      const { data: res, error } = await supabase.functions.invoke("chaos-scan", {
        body: { url: url.trim() },
        headers,
      });
      if (error) throw error;
      if (!res?.map) throw new Error("No map returned");
      setData(res.map);
    } catch (e) {
      toast({
        title: "Chaos scan failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <div>
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
              Chaos Scan
            </div>
            <h2 className="font-forensic text-xl md:text-2xl font-bold leading-tight">
              Feed a URL. Watch the leaks connect.
            </h2>
            <p className="text-xs md:text-sm text-foreground/70 mt-1">
              Scrapes the site, then maps every symptom back to the single source feeding them.
            </p>
          </div>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); runScan(); }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://competitor.com"
            className="flex-1"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !url.trim()}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {busy ? "Scanning…" : "Run Chaos Scan"}
          </Button>
        </form>
      </Card>

      {data && (
        <Card className="p-4 md:p-5">
          {/* Header + toggle */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
                {data.vertical || "The case file"} · {data.company || data.url}
              </div>
              <h3 className="font-forensic text-lg md:text-xl font-bold leading-tight">
                {isFixed ? (
                  <>Every thread runs clean to <span className="text-amber">{data.source?.label || "the source"}</span>.</>
                ) : (
                  <>Everything is connected. <span className="text-crimson">{data.source?.label || "The source"} is bleeding.</span></>
                )}
              </h3>
              {data.source?.dollar_leak && (
                <p className="font-mono text-[11px] uppercase tracking-widest text-crimson mt-1">
                  Estimated bleed: {data.source.dollar_leak}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-sm border border-border/60 bg-background/60 p-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => { setMode("chaos"); setActiveId(null); }}
                className={`px-3 py-1.5 text-[11px] font-case uppercase tracking-widest rounded-sm transition-colors ${
                  !isFixed ? "bg-crimson/15 text-crimson border border-crimson/40" : "text-foreground/60 hover:text-foreground"
                }`}
              >Chaos</button>
              <button
                type="button"
                onClick={() => { setMode("fixed"); setActiveId(null); }}
                className={`px-3 py-1.5 text-[11px] font-case uppercase tracking-widest rounded-sm transition-colors ${
                  isFixed ? "bg-amber/15 text-amber border border-amber/40" : "text-foreground/60 hover:text-foreground"
                }`}
              >Source closed</button>
            </div>
          </div>

          {/* Map */}
          <div className="relative w-full rounded-sm border border-border/50 bg-background/40 overflow-hidden">
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10]">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <radialGradient id="chaosScanHub" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={isFixed ? "hsl(var(--amber))" : "hsl(var(--crimson))"} stopOpacity="0.35" />
                    <stop offset="70%" stopColor={isFixed ? "hsl(var(--amber))" : "hsl(var(--crimson))"} stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="chaosScanSpoke" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--crimson))" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0.35" />
                  </linearGradient>
                </defs>

                <circle cx={HUB.x} cy={HUB.y} r="22" fill="url(#chaosScanHub)" />

                {/* Chaos: symptom-hub, symptom-anchor, symptom-symptom cross-links */}
                {!isFixed && symptoms.flatMap((s, si) => {
                  const isActive = active?.id === s.id;
                  const dim = active !== null && !isActive;
                  const anchor = operators.find((o) => o.id === s.anchor) || operators[0];
                  const links: React.ReactNode[] = [
                    <path key={`c-hub-${s.id}`}
                      d={chaosPath(s.x, s.y, HUB.x, HUB.y, si + 1)}
                      fill="none"
                      stroke={isActive ? "hsl(var(--amber))" : "url(#chaosScanSpoke)"}
                      strokeOpacity={dim ? 0.06 : isActive ? 0.95 : 0.4}
                      strokeWidth={isActive ? 1.6 : 0.7}
                      strokeDasharray={isActive ? "0" : "2 4"}
                      vectorEffect="non-scaling-stroke"
                    />,
                    <path key={`c-a-${s.id}`}
                      d={chaosPath(s.x, s.y, anchor.x, anchor.y, si * 7 + 11)}
                      fill="none"
                      stroke="hsl(var(--crimson))"
                      strokeOpacity={dim ? 0.03 : isActive ? 0.7 : 0.18}
                      strokeWidth={isActive ? 1 : 0.5}
                      strokeDasharray="1 3"
                      vectorEffect="non-scaling-stroke"
                    />,
                  ];
                  (s.connections || []).forEach((cid, ci) => {
                    const t = symptoms.find((x) => x.id === cid);
                    if (!t) return;
                    const activePair = isActive || active?.id === cid;
                    links.push(
                      <path key={`c-x-${s.id}-${cid}-${ci}`}
                        d={chaosPath(s.x, s.y, t.x, t.y, si * 13 + ci + 41)}
                        fill="none"
                        stroke="hsl(var(--crimson))"
                        strokeOpacity={dim && !activePair ? 0.03 : activePair ? 0.55 : 0.14}
                        strokeWidth={activePair ? 0.9 : 0.45}
                        strokeDasharray="1 4"
                        vectorEffect="non-scaling-stroke"
                      />,
                    );
                  });
                  return links;
                })}

                {/* Fixed: clean symptom → anchor → hub */}
                {isFixed && symptoms.flatMap((s) => {
                  const anchor = operators.find((o) => o.id === s.anchor) || operators[0];
                  return [
                    <path key={`o-s-${s.id}`}
                      d={orderedPath(s.x, s.y, anchor.x, anchor.y)}
                      fill="none" stroke="hsl(var(--amber))" strokeOpacity={0.7} strokeWidth={1}
                      vectorEffect="non-scaling-stroke" />,
                    <path key={`o-a-${s.id}`}
                      d={orderedPath(anchor.x, anchor.y, HUB.x, HUB.y)}
                      fill="none" stroke="hsl(var(--amber))" strokeOpacity={0.85} strokeWidth={1.3}
                      vectorEffect="non-scaling-stroke" />,
                  ];
                })}
              </svg>

              {/* Operator anchors */}
              {operators.map((o) => {
                const OIcon = OP_ICONS[o.id];
                const dim = active && active.anchor !== o.id && !isFixed;
                return (
                  <div key={o.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${o.x}%`, top: `${o.y}%` }}>
                    <div className={`flex flex-col items-center transition-opacity ${dim ? "opacity-30" : "opacity-100"}`}>
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-sm border-2 flex items-center justify-center bg-background/90 ${
                        isFixed ? "border-amber shadow-[0_0_18px_hsl(var(--amber)/0.45)]" : "border-amber/50"
                      }`}>
                        <OIcon className="w-4 h-4 md:w-5 md:h-5 text-amber" />
                      </div>
                      <div className="mt-1 font-case text-[9px] md:text-[10px] uppercase tracking-widest text-amber">
                        {o.label}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Hub */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}>
                <div className={`relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-background border-2 flex flex-col items-center justify-center text-center px-2 ${
                  isFixed
                    ? "border-amber shadow-[0_0_40px_hsl(var(--amber)/0.5)]"
                    : "border-crimson shadow-[0_0_40px_hsl(var(--crimson)/0.45)]"
                }`}>
                  <Target className={`w-4 h-4 mb-0.5 ${isFixed ? "text-amber" : "text-crimson"}`} />
                  <div className={`font-case text-[9px] uppercase tracking-widest ${isFixed ? "text-amber" : "text-crimson"}`}>
                    The source
                  </div>
                  <div className="font-forensic text-[10px] md:text-xs font-bold text-foreground leading-tight mt-0.5">
                    {data.source?.label || (isFixed ? "Sealed" : "Bleeding")}
                  </div>
                </div>
              </div>

              {/* Symptom nodes */}
              {symptoms.map((s) => {
                const SIcon = ICONS[s.icon] || AlertTriangle;
                const isActive = active?.id === s.id;
                const linked = active?.connections?.includes(s.id);
                const dim = active !== null && !isActive && !linked;
                return (
                  <button key={s.id}
                    type="button"
                    onClick={() => setActiveId((id) => (id === s.id ? null : s.id))}
                    aria-pressed={isActive}
                    aria-label={s.label}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group z-10 transition-all ${dim ? "opacity-30" : "opacity-100"}`}
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                    <div className={`relative flex flex-col items-center transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-background/95 border-2 flex items-center justify-center ${
                        isFixed
                          ? "border-amber/70 shadow-[0_0_14px_hsl(var(--amber)/0.35)]"
                          : isActive
                            ? "border-amber bg-amber/15 shadow-[0_0_20px_hsl(var(--amber)/0.5)]"
                            : "border-crimson/60 group-hover:border-crimson shadow-[0_0_12px_hsl(var(--crimson)/0.3)]"
                      }`}>
                        <SIcon className={`w-4 h-4 md:w-5 md:h-5 ${isFixed ? "text-amber" : isActive ? "text-amber" : "text-crimson"}`} />
                      </div>
                      <div className={`mt-1 font-forensic text-[10px] md:text-xs font-bold leading-tight whitespace-nowrap max-w-[130px] text-center ${
                        isActive ? "text-amber" : "text-foreground/85"
                      }`}>
                        {s.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operator rail */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {operators.map((o) => {
              const OIcon = OP_ICONS[o.id];
              return (
                <div key={o.id} className={`rounded-sm border p-3 ${
                  isFixed ? "border-amber/40 bg-amber/5" : "border-border/60 bg-background/40"
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

          {/* Active symptom */}
          <div className="mt-3 min-h-[92px]">
            {active ? (
              <div className="grid gap-2 sm:grid-cols-2 animate-fade-in">
                <div className="rounded-sm border border-crimson/40 bg-crimson/5 p-3">
                  <div className="flex items-center gap-1.5 font-case text-[9px] uppercase tracking-widest text-crimson mb-1.5">
                    <AlertTriangle className="w-3 h-3" /> {active.label} — the chaos
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-snug">{active.chaos}</p>
                  {active.connections && active.connections.length > 0 && (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-crimson/80">
                      Feeds: {active.connections
                        .map((cid) => symptoms.find((x) => x.id === cid)?.label)
                        .filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="rounded-sm border border-amber/40 bg-amber/5 p-3">
                  <div className="flex items-center gap-1.5 font-case text-[9px] uppercase tracking-widest text-amber mb-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Source closed
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-snug">{active.fixed}</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-[11px] font-mono uppercase tracking-widest text-foreground/50 py-6">
                {isFixed
                  ? "Every symptom now runs a clean line to the sealed source. Tap one to compare."
                  : "Tap a symptom to trace it through the tangle to the source."}
              </p>
            )}
          </div>

          {/* Source + contradictions */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-sm border border-crimson/30 bg-crimson/5 p-3">
              <div className="flex items-center gap-1.5 font-case text-[10px] uppercase tracking-widest text-crimson mb-1.5">
                <Target className="w-3 h-3" /> The source
              </div>
              <div className="font-forensic font-bold text-sm mb-1">{data.source?.label}</div>
              <p className="text-xs text-foreground/85 leading-snug">{data.source?.chaos}</p>
              <p className="text-xs text-amber/90 leading-snug mt-2">→ {data.source?.sealed}</p>
            </div>
            <div className="rounded-sm border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-1.5 font-case text-[10px] uppercase tracking-widest text-amber mb-1.5">
                <Sparkles className="w-3 h-3" /> Contradictions on site
              </div>
              <ul className="space-y-1">
                {(data.contradictions || []).map((c, i) => (
                  <li key={i} className="text-xs text-foreground/85 leading-snug flex gap-2">
                    <span className="text-crimson font-mono">·</span>{c}
                  </li>
                ))}
                {(!data.contradictions || data.contradictions.length === 0) && (
                  <li className="text-xs text-foreground/50">No obvious contradictions surfaced.</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminChaosScanTool;
