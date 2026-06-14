import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { TrendingDown, Users, DollarSign, BarChart3, AreaChart as AreaIcon, PieChart as PieIcon } from "lucide-react";

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
// Lower avg deal value → more realistic lost-lead counts at the daily/weekly view.
const AVG_DEAL_VALUE = 1800;

type Timeframe = "day" | "week" | "month" | "year";
type ChartKind = "bar" | "area" | "donut";

const TIMEFRAMES: { id: Timeframe; label: string; divisor: number; unit: string }[] = [
  { id: "day", label: "Per Day", divisor: 365, unit: "/ day" },
  { id: "week", label: "Per Week", divisor: 52, unit: "/ week" },
  { id: "month", label: "Per Month", divisor: 12, unit: "/ month" },
  { id: "year", label: "Per Year", divisor: 1, unit: "/ year" },
];

const fmt$ = (n: number) => "$" + Math.round(n).toLocaleString();

interface Props {
  gaps: LeakChartGap[];
  avgDealValue?: number;
  showHeadline?: boolean;
  className?: string;
  /** Default timeframe shown when the chart mounts. */
  defaultTimeframe?: Timeframe;
}

export const LeakChart: React.FC<Props> = ({
  gaps,
  avgDealValue = AVG_DEAL_VALUE,
  showHeadline = true,
  className = "",
  defaultTimeframe = "week",
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [chartKind, setChartKind] = useState<ChartKind>("bar");

  const tf = TIMEFRAMES.find((t) => t.id === timeframe)!;

  const yearlyData = useMemo(() => {
    return gaps
      .map((g) => {
        const raw = parseCost(g.annualCost);
        const capped = Math.min(raw, PER_GAP_CAP);
        return {
          name: (g.title || g.category || "Leak").slice(0, 28),
          full: g.title || g.category || "Leak",
          category: g.category || "",
          severity: (g.severity || "info").toLowerCase(),
          yearly: capped,
        };
      })
      .filter((d) => d.yearly > 0)
      .sort((a, b) => b.yearly - a.yearly)
      .slice(0, 8);
  }, [gaps]);

  const data = useMemo(
    () => yearlyData.map((d) => ({ ...d, leak: d.yearly / tf.divisor })),
    [yearlyData, tf.divisor],
  );

  const totalYearly = useMemo(
    () => Math.min(yearlyData.reduce((s, d) => s + d.yearly, 0), TOTAL_CAP),
    [yearlyData],
  );
  const totalPeriod = totalYearly / tf.divisor;

  // Leads lost in the selected timeframe.
  const rawLeadsYear = totalYearly / avgDealValue;
  const leadsPeriodLow = Math.max(timeframe === "day" ? 0.2 : 1, (rawLeadsYear * 0.7) / tf.divisor);
  const leadsPeriodHigh = Math.max(leadsPeriodLow + (timeframe === "day" ? 0.3 : 1), (rawLeadsYear * 1.2) / tf.divisor);

  const fmtLeads = (n: number) =>
    n >= 10 ? Math.round(n).toLocaleString() : n.toFixed(1).replace(/\.0$/, "");

  const leakLow = totalPeriod * 0.7;
  const leakHigh = totalPeriod * 1.2;

  if (data.length === 0) return null;

  // shared chip styles
  const chipBase = "px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-widest transition-colors border";
  const chipOn = "bg-amber text-background border-amber";
  const chipOff = "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-amber/40";

  return (
    <div className={className}>
      {showHeadline && (
        <>
          {/* Timeframe selector */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
              View leaks
            </span>
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                className={`${chipBase} ${timeframe === t.id ? chipOn : chipOff}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* LOST LEADS FIRST */}
            <div className="rounded-md border-2 border-destructive/40 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <Users className="w-4 h-4" />
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Estimated Lost Leads {tf.unit}
                </span>
              </div>
              <div className="font-forensic text-3xl md:text-4xl font-bold text-destructive mt-1">
                {fmtLeads(leadsPeriodLow)}–{fmtLeads(leadsPeriodHigh)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Leads slipping past your funnel every {timeframe === "day" ? "day" : timeframe === "week" ? "week" : timeframe === "month" ? "month" : "year"}
              </div>
            </div>
            {/* THEN $ */}
            <div className="rounded-md border border-amber/40 bg-amber/5 p-4">
              <div className="flex items-center gap-2 text-amber">
                <DollarSign className="w-4 h-4" />
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Estimated Revenue Leak {tf.unit}
                </span>
              </div>
              <div className="font-forensic text-3xl md:text-4xl font-bold text-amber mt-1">
                {fmt$(leakLow)} – {fmt$(leakHigh)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {timeframe === "day"
                  ? "Bleeding out, one day at a time."
                  : timeframe === "week"
                  ? "What walks out the door every 7 days."
                  : timeframe === "month"
                  ? "Lost while you ran the business."
                  : "Annualized, based on your visible gaps."}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="rounded-md border border-border bg-card/60 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <h4 className="font-forensic text-sm md:text-base font-bold text-foreground">
              Leak Breakdown by Gap
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
              $ {tf.unit}
            </span>
            <div className="flex items-center gap-1 rounded border border-border p-0.5">
              <button
                type="button"
                onClick={() => setChartKind("bar")}
                aria-label="Bar chart"
                className={`p-1.5 rounded ${chartKind === "bar" ? "bg-amber text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartKind("area")}
                aria-label="Area chart"
                className={`p-1.5 rounded ${chartKind === "area" ? "bg-amber text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                <AreaIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartKind("donut")}
                aria-label="Donut chart"
                className={`p-1.5 rounded ${chartKind === "donut" ? "bg-amber text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                <PieIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartKind === "bar" ? (
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`)}
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
                  formatter={(value: number) => [fmt$(value), `Est. Leak ${tf.unit}`]}
                  labelFormatter={(label: string, payload: any) => payload?.[0]?.payload?.full || label}
                />
                <Bar dataKey="leak" radius={[0, 4, 4, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={SEV_COLOR[d.severity] || SEV_COLOR.info} />
                  ))}
                </Bar>
              </BarChart>
            ) : chartKind === "area" ? (
              <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
                <defs>
                  <linearGradient id="leakArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`)}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [fmt$(value), `Est. Leak ${tf.unit}`]}
                  labelFormatter={(label: string, payload: any) => payload?.[0]?.payload?.full || label}
                />
                <Area
                  type="monotone"
                  dataKey="leak"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  fill="url(#leakArea)"
                />
              </AreaChart>
            ) : (
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value: number, _n: any, p: any) => [fmt$(value), p?.payload?.full || "Leak"]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}
                />
                <Pie
                  data={data}
                  dataKey="leak"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={SEV_COLOR[d.severity] || SEV_COLOR.info} />
                  ))}
                </Pie>
              </PieChart>
            )}
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
