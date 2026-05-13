// Read-only 90-Day Sprint view for reps. Pulls the canonical week + day plan
// from millionDollarPath so reps and admins always see the same operator math.
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Target, TrendingUp, ChevronRight } from "lucide-react";
import {
  buildWeeks,
  buildDailyGoals,
  buildScenario,
  type WeekPlan,
  type DailyGoal,
} from "@/lib/millionDollarPath";

// Anchor for the current 90-day sprint. Update this when a new sprint kicks off.
// Must be a Monday — buildDailyGoals snaps to the Monday of the week regardless.
export const SPRINT_START = new Date("2026-04-06T12:00:00");

export function getCurrentSprintDay(today = new Date()): { day: number; week: number; total: number } {
  const goals = buildDailyGoals(SPRINT_START);
  const total = goals.length;
  // Find today's working day, or the next upcoming one.
  const todayMs = today.setHours(0, 0, 0, 0);
  for (const g of goals) {
    const d = new Date(g.date).setHours(0, 0, 0, 0);
    if (d >= todayMs) return { day: g.dayNumber, week: g.weekNumber, total };
  }
  return { day: total, week: 13, total };
}

export function getTodaySprintGoal(today = new Date()): DailyGoal | null {
  const goals = buildDailyGoals(SPRINT_START);
  const todayMs = today.setHours(0, 0, 0, 0);
  // Match exact today first
  const exact = goals.find(g => new Date(g.date).setHours(0, 0, 0, 0) === todayMs);
  if (exact) return exact;
  // Otherwise next upcoming working day
  return goals.find(g => new Date(g.date).setHours(0, 0, 0, 0) >= todayMs) || null;
}

const phaseColor: Record<WeekPlan["phase"], string> = {
  Foundation: "bg-amber/20 text-amber border-amber/40",
  Acceleration: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  Compounding: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
};

export const Sprint90View: React.FC = () => {
  const weeks = useMemo(() => buildWeeks(), []);
  const goals = useMemo(() => buildDailyGoals(SPRINT_START), []);
  const scenario = useMemo(() => buildScenario(), []);
  const todayInfo = useMemo(() => getCurrentSprintDay(new Date()), []);
  const [openWeek, setOpenWeek] = useState<number | null>(todayInfo.week);

  const goalsByWeek = useMemo(() => {
    const m = new Map<number, DailyGoal[]>();
    for (const g of goals) {
      const arr = m.get(g.weekNumber) || [];
      arr.push(g);
      m.set(g.weekNumber, arr);
    }
    return m;
  }, [goals]);

  return (
    <div className="space-y-6">
      <Card className="border-amber/30">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
                The 90-Day Sprint
              </p>
              <CardTitle className="font-display text-2xl">
                Day {todayInfo.day} of {todayInfo.total} · Week {todayInfo.week}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Operator math + weekday motion. This is the same plan Joseph and Brandon are running — your daily targets are below.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat icon={<Target className="w-3.5 h-3.5" />} label="Outbound / rep / day" value={`${scenario.outboundPerDay}`} />
              <Stat icon={<Calendar className="w-3.5 h-3.5" />} label="Meetings / week" value={`${scenario.meetingsPerWeek}`} />
              <Stat icon={<TrendingUp className="w-3.5 h-3.5" />} label="Goal" value="$1.0M" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {weeks.map(w => {
          const isOpen = openWeek === w.week;
          const isCurrent = w.week === todayInfo.week;
          return (
            <Card key={w.week} className={isCurrent ? "border-amber/50" : ""}>
              <button
                type="button"
                onClick={() => setOpenWeek(isOpen ? null : w.week)}
                className="w-full text-left"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${phaseColor[w.phase]}`}>
                        {w.phase}
                      </span>
                      <CardTitle className="font-display text-base truncate">
                        Week {w.week}: {w.theme}
                      </CardTitle>
                      {isCurrent && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber text-background">
                          THIS WEEK
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      ${(w.revenueTarget / 100).toLocaleString()} cum · {w.newMeetings} mtgs · {w.newCloses} closes
                    </div>
                  </div>
                </CardHeader>
              </button>
              {isOpen && (
                <CardContent className="space-y-4 border-t border-border/40 pt-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-amber mb-2">Week focus</p>
                    <ul className="space-y-1.5 text-sm">
                      {w.focus.map((f, i) => (
                        <li key={i} className="flex gap-2"><span className="text-amber">•</span><span>{f}</span></li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">Exit: {w.exitCriteria}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-amber mb-2">Daily breakdown</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      {(goalsByWeek.get(w.week) || []).map(g => {
                        const isToday = new Date(g.date).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
                        return (
                          <div key={g.dayNumber} className={`rounded border p-2 text-xs ${isToday ? "border-amber bg-amber/10" : "border-border/40 bg-card/40"}`}>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              Day {g.dayNumber} · {g.weekday}
                            </p>
                            <p className="font-semibold text-foreground mt-0.5">{g.motion}</p>
                            <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                              {g.kpis.slice(0, 2).map((k, i) => (
                                <li key={i}>• {k}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded border border-border/40 bg-card/40 px-2 py-1.5 min-w-[90px]">
    <div className="flex items-center justify-center gap-1 text-amber">{icon}<span className="text-sm font-bold">{value}</span></div>
    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
  </div>
);

export default Sprint90View;
