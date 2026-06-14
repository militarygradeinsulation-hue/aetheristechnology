import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CalendarRange, Compass, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { portalBlueprint, type BlueprintResponse } from "@/lib/portalBlueprint";
import {
  NEW_REP_BLUEPRINT,
  blueprintDayForRep,
  totalBlueprintDays,
  type BlueprintDay,
} from "@/lib/newRepBlueprint";

const TOTAL = totalBlueprintDays();

export const NewRepBlueprintCard: React.FC = () => {
  const [data, setData] = useState<BlueprintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDay, setShowDay] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    portalBlueprint
      .get()
      .then((r) => {
        if (!live) return;
        setData(r);
        const d = blueprintDayForRep(r.first_login_at);
        setShowDay(Math.min(d, TOTAL));
      })
      .catch((e) => console.error("blueprint load:", e))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  const currentDay = useMemo(
    () => (data ? blueprintDayForRep(data.first_login_at) : 1),
    [data],
  );

  // Hide for partners and for reps past the 14-day window.
  if (loading) {
    return (
      <Card className="border-amber/30 bg-amber/5">
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your new-rep blueprint…
        </CardContent>
      </Card>
    );
  }
  if (!data || data.is_partner || currentDay > TOTAL) return null;

  const doneIds = new Set(data.progress.map((p) => `${p.day_index}::${p.task_id}`));
  const totalTasks = NEW_REP_BLUEPRINT.reduce((s, d) => s + d.tasks.length, 0);
  const doneCount = data.progress.length;
  const pct = Math.round((doneCount / totalTasks) * 100);
  const day: BlueprintDay = NEW_REP_BLUEPRINT[(showDay || currentDay) - 1] || NEW_REP_BLUEPRINT[0];

  const toggle = async (taskId: string, isDone: boolean) => {
    const key = `${day.day}::${taskId}`;
    setBusy(key);
    try {
      const next = await portalBlueprint.toggle(day.day, taskId, !isDone);
      setData(next);
    } catch (e: any) {
      toast({ title: "Could not update", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-amber/40 bg-gradient-to-br from-amber/10 via-background to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <Compass className="w-4 h-4 text-amber" /> New Operator Blueprint
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber bg-amber/10 border border-amber/30 px-2 py-0.5 rounded">
              Day {currentDay} of {TOTAL}
            </span>
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {doneCount}/{totalTasks} tasks done
          </div>
        </div>
        <Progress value={pct} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day picker */}
        <div className="flex flex-wrap gap-1.5">
          {NEW_REP_BLUEPRINT.map((d) => {
            const isCurrent = d.day === currentDay;
            const isLocked = d.day > currentDay;
            const isSelected = (showDay || currentDay) === d.day;
            const dayDone =
              d.tasks.filter((t) => doneIds.has(`${d.day}::${t.id}`)).length === d.tasks.length;
            return (
              <button
                key={d.day}
                onClick={() => !isLocked && setShowDay(d.day)}
                disabled={isLocked}
                className={[
                  "min-w-[2.25rem] h-9 px-2 rounded-md text-xs font-mono font-bold border transition-all",
                  isSelected
                    ? "bg-amber text-background border-amber"
                    : isCurrent
                      ? "bg-amber/15 text-amber border-amber/50"
                      : dayDone
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : isLocked
                          ? "bg-muted/30 text-muted-foreground/40 border-border/30 cursor-not-allowed"
                          : "bg-card text-foreground border-border hover:border-amber/40",
                ].join(" ")}
                title={isLocked ? `Unlocks Day ${d.day}` : d.title}
              >
                {d.day}
                {dayDone && <CheckCircle2 className="inline w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Day detail */}
        <div className="rounded-md border border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 text-amber font-mono text-[10px] uppercase tracking-widest mb-1">
            <CalendarRange className="w-3 h-3" /> {day.title}
          </div>
          <p className="text-sm text-foreground/90 mb-3 italic">{day.focus}</p>
          <ul className="space-y-2">
            {day.tasks.map((t) => {
              const isDone = doneIds.has(`${day.day}::${t.id}`);
              const isBusy = busy === `${day.day}::${t.id}`;
              return (
                <li
                  key={t.id}
                  className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                    isDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-background/40"
                  }`}
                >
                  <Checkbox
                    checked={isDone}
                    disabled={isBusy}
                    onCheckedChange={() => toggle(t.id, isDone)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {t.label}
                    </div>
                    {t.detail && (
                      <div className="text-xs text-muted-foreground mt-0.5">{t.detail}</div>
                    )}
                  </div>
                  {t.link && (
                    <Button asChild size="sm" variant="ghost" className="text-amber hover:text-amber hover:bg-amber/10 shrink-0">
                      {t.link.startsWith("http") ? (
                        <a href={t.link} target="_blank" rel="noopener noreferrer">
                          Open <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ) : (
                        <Link to={t.link}>
                          Open <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Your blueprint started <span className="font-mono text-amber">{
            data.first_login_at ? new Date(data.first_login_at).toLocaleDateString() : "today"
          }</span>. Day {currentDay} is what we expect from you today.
        </p>
      </CardContent>
    </Card>
  );
};

export default NewRepBlueprintCard;
