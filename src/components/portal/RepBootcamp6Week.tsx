import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Flame, Clock, Target,
  BookOpen, Link as LinkIcon, GraduationCap, Trophy
} from "lucide-react";
import { getPortalProfile } from "@/lib/portalAuth";
import { CURRICULUM_6W, type DayPlan6W } from "@/lib/bootcamp6WeekCurriculum";

const ALL_TASK_IDS = CURRICULUM_6W.flatMap(d => d.sessions.flatMap(s => s.tasks.map(t => t.id)));

function storageKey(code: string | null) { return `aetheris_bootcamp_6w_v1_${code || "anon"}`; }

export const RepBootcamp6Week: React.FC = () => {
  const profile = getPortalProfile();
  const code = profile?.code || null;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [openWeek, setOpenWeek] = useState<number>(1);
  const [openDay, setOpenDay] = useState<number>(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(code));
      if (raw) setDone(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [code]);

  const persist = (next: Record<string, boolean>) => {
    setDone(next);
    try { localStorage.setItem(storageKey(code), JSON.stringify(next)); } catch { /* ignore */ }
  };
  const toggle = (id: string) => persist({ ...done, [id]: !done[id] });
  const reset = () => { if (confirm("Reset all 6-week academy progress?")) persist({}); };

  const completedCount = useMemo(() => ALL_TASK_IDS.filter(id => done[id]).length, [done]);
  const totalCount = ALL_TASK_IDS.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  const weeks = useMemo(() => {
    const map = new Map<number, DayPlan6W[]>();
    CURRICULUM_6W.forEach(d => {
      if (!map.has(d.week)) map.set(d.week, []);
      map.get(d.week)!.push(d);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, []);

  const dayStats = (d: DayPlan6W) => {
    const ids = d.sessions.flatMap(s => s.tasks.map(t => t.id));
    const c = ids.filter(id => done[id]).length;
    return { c, t: ids.length, pct: Math.round((c / Math.max(ids.length, 1)) * 100) };
  };
  const weekStats = (days: DayPlan6W[]) => {
    const ids = days.flatMap(d => d.sessions.flatMap(s => s.tasks.map(t => t.id)));
    const c = ids.filter(id => done[id]).length;
    return { c, t: ids.length, pct: Math.round((c / Math.max(ids.length, 1)) * 100) };
  };

  return (
    <Card className="border-amber/40 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-1">Aetheris Academy · 42-Day Program</div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="w-5 h-5 text-amber" />
              6-Week Operator Academy
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Daily plan with goals, readings, drills, and proof-of-work. Learn how to sell, what to sell, and why we're doing it.
              Every task is checkable — partners and admin see your progress.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mastery</div>
            <div className="text-3xl font-bold text-amber">{pct}%</div>
            <div className="text-xs text-muted-foreground">{completedCount} / {totalCount} tasks</div>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-3">
          <div className="h-full bg-amber transition-all" style={{ width: `${pct}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {weeks.map(([weekNum, days]) => {
          const ws = weekStats(days);
          const wOpen = openWeek === weekNum;
          const wDone = ws.c === ws.t && ws.t > 0;
          return (
            <div key={weekNum} className={`border rounded-lg overflow-hidden transition ${wDone ? "border-emerald-500/40" : "border-amber/30"}`}>
              <button
                type="button"
                onClick={() => setOpenWeek(wOpen ? 0 : weekNum)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition bg-gradient-to-r from-amber/5 to-transparent"
              >
                <div className={`w-12 h-12 rounded-md flex items-center justify-center font-bold flex-shrink-0 ${wDone ? "bg-emerald-500/20 text-emerald-500" : "bg-amber/15 text-amber"}`}>
                  {wDone ? <Trophy className="w-6 h-6" /> : <span className="text-lg">W{weekNum}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">Week {weekNum}</span>
                    <span className="font-semibold">{days[0]?.weekTheme || ""}</span>
                    <Badge variant="outline" className="text-[10px]">{ws.c}/{ws.t}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{days[0]?.weekOutcome || ""}</p>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden mt-2">
                    <div className="h-full bg-amber transition-all" style={{ width: `${ws.pct}%` }} />
                  </div>
                </div>
                {wOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {wOpen && (
                <div className="border-t border-border/60 bg-background/40 p-3 space-y-2">
                  {days.map((day) => {
                    const ds = dayStats(day);
                    const dOpen = openDay === day.day;
                    const dDone = ds.c === ds.t && ds.t > 0;
                    return (
                      <div key={day.day} className={`border rounded-md overflow-hidden ${dDone ? "border-emerald-500/30" : "border-border/40"}`}>
                        <button
                          type="button"
                          onClick={() => setOpenDay(dOpen ? 0 : day.day)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/20 transition"
                        >
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${dDone ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-foreground"}`}>
                            {dDone ? <CheckCircle2 className="w-4 h-4" /> : `D${day.day}`}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{day.theme}</span>
                              <Badge variant="outline" className="text-[9px]">{ds.c}/{ds.t}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{day.tagline}</p>
                          </div>
                          {dOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        {dOpen && (
                          <div className="border-t border-border/40 bg-background/60 p-3 space-y-4">
                            {day.lesson && (
                              <div className="rounded-md border border-amber/20 bg-amber/5 p-3">
                                <div className="flex items-center gap-2 text-amber font-mono text-[10px] uppercase tracking-[0.2em] mb-1">
                                  <BookOpen className="w-3 h-3" /> Today's Lesson · {day.lesson.title}
                                </div>
                                <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{day.lesson.body}</div>
                                {day.lesson.keyTakeaways && day.lesson.keyTakeaways.length > 0 && (
                                  <ul className="mt-2 space-y-0.5">
                                    {day.lesson.keyTakeaways.map((k, i) => (
                                      <li key={i} className="text-[11px] text-foreground/80 pl-3 border-l-2 border-amber/40">{k}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {day.resources && day.resources.length > 0 && (
                              <div className="rounded-md border border-border/50 p-3">
                                <div className="flex items-center gap-2 text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em] mb-1.5">
                                  <LinkIcon className="w-3 h-3" /> Required Reading & Materials
                                </div>
                                <div className="grid sm:grid-cols-2 gap-1.5">
                                  {day.resources.map((r, i) => (
                                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                       className="text-[11px] text-amber hover:underline font-mono inline-flex items-center gap-1">
                                      → {r.label}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {day.sessions.map((s) => (
                              <div key={s.id} className="space-y-2">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="font-semibold text-sm">{s.title}</span>
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {s.minutes} min</span>
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Target className="w-3 h-3" /> {s.goal}</span>
                                </div>
                                <div className="space-y-1.5 pl-1">
                                  {s.tasks.map((t) => {
                                    const checked = !!done[t.id];
                                    return (
                                      <label key={t.id}
                                        className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer transition ${
                                          checked ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 hover:border-amber/30"
                                        }`}>
                                        <Checkbox checked={checked} onCheckedChange={() => toggle(t.id)} className="mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                          <div className={`text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>{t.label}</div>
                                          {t.detail && <div className="text-[11px] text-muted-foreground mt-0.5">{t.detail}</div>}
                                          {t.route && (
                                            <a href={t.route} target="_blank" rel="noopener noreferrer"
                                               onClick={(e) => e.stopPropagation()}
                                               className="text-[11px] text-amber hover:underline font-mono mt-0.5 inline-block">
                                              open → {t.route} ↗
                                            </a>
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                            {day.successMetric && (
                              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                                <div className="flex items-center gap-2 text-emerald-500 font-mono text-[10px] uppercase tracking-[0.2em] mb-0.5">
                                  <Flame className="w-3 h-3" /> Day Win Condition
                                </div>
                                <div className="text-xs text-foreground/90">{day.successMetric}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground hover:text-amber">
            Reset academy progress
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepBootcamp6Week;
