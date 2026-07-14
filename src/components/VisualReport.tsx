import React, { useMemo } from "react";
import { DollarSign, TrendingDown, Percent, Award, AlertTriangle, Gauge, CheckCircle2, XCircle, ArrowRight, Target, Wrench } from "lucide-react";

/**
 * Visual enhancers for markdown tool output.
 * - <SignalStrip /> — scans the raw markdown for grades, $ leaks, %s and renders colored stat cards + a mini bar chart.
 * - markdownVisualComponents — ReactMarkdown `components` map that upgrades table cells:
 *     • percentages get an inline gradient bar
 *     • dollar amounts get an amber/crimson chip
 *     • single-letter grades (A–F) get a color-coded pill
 */

// ---------- helpers ----------

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-300 border-emerald-400/50 bg-emerald-400/10",
  B: "text-lime-300 border-lime-400/50 bg-lime-400/10",
  C: "text-amber border-amber/50 bg-amber/10",
  D: "text-orange-300 border-orange-400/50 bg-orange-400/10",
  F: "text-crimson border-crimson/50 bg-crimson/10",
};

const isGradeCell = (s: string) => /^[A-F][+\-]?$/.test(s.trim());
const isPercentCell = (s: string) => /^\s*\d{1,3}\s*%\s*$/.test(s);
const isDollarCell = (s: string) => /^\s*\$[\d,]+(?:\.\d+)?\s*(?:\/mo|\/yr|\/month|\/year|k|K|M)?\s*$/.test(s.trim());

const parsePct = (s: string) => Math.max(0, Math.min(100, parseInt(s.replace(/[^\d]/g, ""), 10) || 0));
const parseDollar = (s: string): number => {
  const raw = s.replace(/[^\d.kKM]/g, "");
  let n = parseFloat(raw);
  if (/M/i.test(raw)) n *= 1_000_000;
  else if (/k/i.test(raw)) n *= 1_000;
  return isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
};

// ---------- signal strip ----------

export const SignalStrip: React.FC<{ markdown: string }> = ({ markdown }) => {
  const signals = useMemo(() => {
    if (!markdown) return null;

    // Dollar amounts — take top 3 largest.
    const dollars: number[] = [];
    for (const m of markdown.matchAll(/\$\s?([\d,]+(?:\.\d+)?)\s?([kKMm])?(?:\/mo|\/yr|\/month|\/year)?/g)) {
      let n = parseFloat(m[1].replace(/,/g, ""));
      if (m[2] === "M" || m[2] === "m") n *= 1_000_000;
      else if (m[2] === "k" || m[2] === "K") n *= 1_000;
      if (n >= 100) dollars.push(n);
    }
    dollars.sort((a, b) => b - a);
    const topDollar = dollars[0] || 0;
    const totalLeak = dollars.slice(0, 5).reduce((s, n) => s + n, 0);

    // Percentages — collect for bar chart (unique-ish, cap 6).
    const pcts: { label: string; value: number }[] = [];
    const seenPct = new Set<number>();
    for (const m of markdown.matchAll(/([A-Za-z][A-Za-z /&-]{2,40})[:\s—\-]+(\d{1,3})\s?%/g)) {
      const v = parseInt(m[2], 10);
      if (v < 1 || v > 100) continue;
      if (seenPct.has(v) && pcts.length > 2) continue;
      seenPct.add(v);
      pcts.push({ label: m[1].trim().slice(0, 28), value: v });
      if (pcts.length >= 6) break;
    }

    // Grade — first standalone grade letter after "Grade" or in a bold call-out.
    const gradeMatch = markdown.match(/\b[Gg]rade[:\s]+\*{0,2}([A-F][+\-]?)\*{0,2}/) ||
                       markdown.match(/\bScore[:\s]+\*{0,2}([A-F][+\-]?)\*{0,2}/) ||
                       markdown.match(/\bVerdict[:\s]+\*{0,2}([A-F][+\-]?)\*{0,2}/);
    const grade = gradeMatch?.[1] || null;

    // Score /100
    const scoreMatch = markdown.match(/\b(\d{1,3})\s?\/\s?100\b/);
    const score = scoreMatch ? Math.min(100, parseInt(scoreMatch[1], 10)) : null;

    if (!topDollar && !pcts.length && !grade && score === null) return null;

    return { topDollar, totalLeak, pcts, grade, score };
  }, [markdown]);

  if (!signals) return null;

  const { topDollar, totalLeak, pcts, grade, score } = signals;

  return (
    <div className="mb-5 rounded-sm border border-amber/30 bg-background/60 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-amber/20 bg-amber/[0.04]">
        <Gauge className="w-3.5 h-3.5 text-amber" />
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">
          // signal_readout
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-amber/10 border-b border-amber/10">
        {grade && (
          <StatCard
            icon={<Award className="w-3.5 h-3.5" />}
            label="Verdict"
            valueEl={
              <span className={`inline-flex items-center justify-center min-w-[3rem] h-10 px-3 rounded-sm border font-forensic text-2xl font-bold ${GRADE_COLOR[grade[0]] || "text-amber border-amber/50 bg-amber/10"}`}>
                {grade}
              </span>
            }
            tone="amber"
          />
        )}
        {score !== null && (
          <StatCard
            icon={<Percent className="w-3.5 h-3.5" />}
            label="Score"
            valueEl={
              <div className="w-full">
                <div className="font-forensic text-2xl font-bold text-foreground leading-none">
                  {score}<span className="text-sm text-muted-foreground font-mono">/100</span>
                </div>
                <div className="h-1.5 mt-2 bg-background rounded-full overflow-hidden border border-amber/15">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      score >= 75 ? "bg-emerald-400" : score >= 50 ? "bg-amber" : "bg-crimson"
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            }
            tone="amber"
          />
        )}
        {topDollar > 0 && (
          <StatCard
            icon={<TrendingDown className="w-3.5 h-3.5" />}
            label="Top Leak"
            valueEl={
              <div className="font-forensic text-2xl font-bold text-crimson leading-none">
                {fmtMoney(topDollar)}
              </div>
            }
            tone="crimson"
          />
        )}
        {totalLeak > topDollar && (
          <StatCard
            icon={<DollarSign className="w-3.5 h-3.5" />}
            label="Total Exposure"
            valueEl={
              <div className="font-forensic text-2xl font-bold text-amber leading-none">
                {fmtMoney(totalLeak)}
              </div>
            }
            tone="amber"
          />
        )}
        {!grade && score === null && !topDollar && !totalLeak && pcts.length > 0 && (
          <StatCard
            icon={<Percent className="w-3.5 h-3.5" />}
            label="Signals Found"
            valueEl={<div className="font-forensic text-2xl font-bold text-amber leading-none">{pcts.length}</div>}
            tone="amber"
          />
        )}
      </div>

      {/* Percentage bar chart */}
      {pcts.length > 0 && (
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3 h-3 text-amber" />
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber/80">
              // measured_signals
            </div>
          </div>
          {pcts.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-32 md:w-48 shrink-0 text-[11px] text-foreground/80 truncate font-mono">
                {p.label}
              </div>
              <div className="flex-1 h-2.5 bg-background rounded-full overflow-hidden border border-amber/10">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    p.value >= 66 ? "bg-gradient-to-r from-crimson to-crimson/70"
                      : p.value >= 33 ? "bg-gradient-to-r from-amber to-amber/70"
                      : "bg-gradient-to-r from-emerald-400 to-emerald-500/70"
                  }`}
                  style={{ width: `${p.value}%` }}
                />
              </div>
              <div className="w-10 text-right font-mono text-[11px] text-amber shrink-0">
                {p.value}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; valueEl: React.ReactNode; tone: "amber" | "crimson";
}> = ({ icon, label, valueEl, tone }) => (
  <div className="p-4 flex flex-col gap-2">
    <div className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.3em] ${tone === "crimson" ? "text-crimson/80" : "text-amber/80"}`}>
      {icon}
      {label}
    </div>
    {valueEl}
  </div>
);

// ---------- markdown table cell enhancer ----------

const VisualCell: React.FC<{ children?: React.ReactNode; isHeader?: boolean }> = ({ children, isHeader }) => {
  const raw = React.Children.toArray(children).map(c => (typeof c === "string" ? c : "")).join("").trim();
  const Tag = (isHeader ? "th" : "td") as keyof JSX.IntrinsicElements;

  if (!isHeader && raw && isGradeCell(raw)) {
    const g = raw[0].toUpperCase();
    return (
      <Tag>
        <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-sm border font-forensic text-sm font-bold ${GRADE_COLOR[g] || "text-amber border-amber/50 bg-amber/10"}`}>
          {raw}
        </span>
      </Tag>
    );
  }

  if (!isHeader && raw && isPercentCell(raw)) {
    const v = parsePct(raw);
    const color = v >= 66 ? "from-crimson to-crimson/70" : v >= 33 ? "from-amber to-amber/70" : "from-emerald-400 to-emerald-500/70";
    return (
      <Tag>
        <div className="flex items-center gap-2 min-w-[6rem]">
          <div className="flex-1 h-2 bg-background rounded-full overflow-hidden border border-amber/10">
            <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${v}%` }} />
          </div>
          <span className="font-mono text-[11px] text-foreground/90 shrink-0">{v}%</span>
        </div>
      </Tag>
    );
  }

  if (!isHeader && raw && isDollarCell(raw)) {
    const n = parseDollar(raw);
    const big = n >= 5_000;
    return (
      <Tag>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border font-mono text-[11px] font-semibold ${
          big ? "border-crimson/40 bg-crimson/10 text-crimson" : "border-amber/40 bg-amber/10 text-amber"
        }`}>
          <DollarSign className="w-2.5 h-2.5" />
          {raw.replace(/^\$/, "")}
        </span>
      </Tag>
    );
  }

  return <Tag>{children}</Tag>;
};

export const markdownVisualComponents = {
  td: (props: any) => <VisualCell>{props.children}</VisualCell>,
  th: (props: any) => <VisualCell isHeader>{props.children}</VisualCell>,
};
