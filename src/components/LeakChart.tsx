import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { TrendingDown, Users, DollarSign } from "lucide-react";

export interface LeakChartGap {
  category?: string;
  title?: string;
  severity?: string;
  annualCost?: string;
}

const parseCost = (raw?: string): number => {
  if (!raw) return 0;
  const s = raw.toLowerCase().replace(/,/g, "");
  const m = s.match(/(\d+(?:\.\d+)?)\s*([kmb])?/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1_000;
  else if (m[2] === "m") n *= 1_000_000;
  else if (m[2] === "b") n *= 1_000_000_000;
  return n;
};

const SEV_COLOR: Record<string, string> = {
  critical: "hsl(var(--destructive))",
  warning: "hsl(var(--amber))",
  info: "hsl(var(--muted-foreground))",
};

const PER_GAP_CAP = 500_000;
const TOTAL_CAP = 2_500_000;
// Approx US B2B avg deal value to translate $ leak → # of lost leads/year.
const AVG_DEAL_VALUE = 4200;

const fmt$ = (n: number) => "$" + Math.round(n).toLocaleString();

interface Props {
  gaps: LeakChartGap[];
  /** Optional override for assumed avg deal value when converting $ → leads. */
  avgDealValue?: number;
  /** Show the lost-leads + $ leak headline strip at the top. Default true. */
  showHeadline?: boolean;
  className?: string;
}

export const LeakChart: React.FC<Props> = ({ gaps, avgDealValue = AVG_DEAL_VALUE, showHeadline = true, className = "" }) => {
  const data = useMemo(() => {
    return gaps
      .map((g) => {
        const raw = parseCost(g.annualCost);
        const capped = Math.min(raw, PER_GAP_CAP);
        return {
          name: (g.title || g.category || "Leak").slice(0, 28),
          full: g.title || g.category || "Leak",
          category: g.category || "",
          severity: (g.severity || "info").toLowerCase(),
          leak: capped,
        };
      })
      .filter((d) => d.leak > 0)
      .sort((a, b) => b.leak - a.leak)
      .slice(0, 8);
  }, [gaps]);

  const total = useMemo(
    () => Math.min(data.reduce((sum, d) => sum + d.leak, 0), TOTAL_CAP),
    [data],
  );
  const lostLeadsLow = Math.max(1, Math.round((total * 0.7) / avgDealValue));
  const lostLeadsHigh = Math.max(lostLeadsLow + 1, Math.round((total * 1.2) / avgDealValue));
  const leakLow = Math.round(total * 0.7);
  const leakHigh = Math.round(total * 1.2);

  if (data.length === 0) return null;

  return (
    <div className={className}>
      {showHeadline && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* LOST LEADS FIRST */}
          <div className="rounded-md border-2 border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-center gap-2 text-destructive">
              <Users className="w-4 h-4" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Estimated Lost Leads / yr</span>
            </div>
            <div className="font-forensic text-3xl md:text-4xl font-bold text-destructive mt-1">
              {lostLeadsLow.toLocaleString()}–{lostLeadsHigh.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Leads slipping past your funnel each year
            </div>
          </div>
          {/* THEN $ */}
          <div className="rounded-md border border-amber/40 bg-amber/5 p-4">
            <div className="flex items-center gap-2 text-amber">
              <DollarSign className="w-4 h-4" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Estimated Revenue Leak</span>
            </div>
            <div className="font-forensic text-3xl md:text-4xl font-bold text-amber mt-1">
              {fmt$(leakLow)} – {fmt$(leakHigh)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Annualized, based on your visible gaps
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-card/60 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <h4 className="font-forensic text-sm md:text-base font-bold text-foreground">
              Leak Breakdown by Gap
            </h4>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            $ / year
          </span>
        </div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={140}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value: number) => [fmt$(value), "Est. Leak"]}
                labelFormatter={(label: string, payload: any) => payload?.[0]?.payload?.full || label}
              />
              <Bar dataKey="leak" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={SEV_COLOR[d.severity] || SEV_COLOR.info} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SEV_COLOR.critical }} /> Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SEV_COLOR.warning }} /> Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SEV_COLOR.info }} /> Note
          </span>
        </div>
      </div>
    </div>
  );
};

export default LeakChart;
