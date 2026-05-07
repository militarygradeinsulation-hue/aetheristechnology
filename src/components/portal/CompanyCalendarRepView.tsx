import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CalendarDays, Pin, Paperclip, ExternalLink, RefreshCw,
  List, LayoutGrid, CalendarRange, Lock, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listCompanyCalendar, KIND_META, type CompanyCalendarEntry } from "@/lib/companyCalendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ViewMode = "list" | "week" | "month";

const startOfWeek = (d: Date) => {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); return x;
};
const startOfMonth = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x; };
const endOfMonth = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth() + 1, 0); x.setHours(0,0,0,0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const CompanyCalendarRepView: React.FC = () => {
  const [entries, setEntries] = useState<CompanyCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [anchor, setAnchor] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [selectedEntry, setSelectedEntry] = useState<CompanyCalendarEntry | null>(null);

  const range = useMemo(() => {
    if (view === "week") {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 6) };
    }
    if (view === "month") {
      const from = startOfMonth(anchor);
      const to = endOfMonth(anchor);
      // pad to full grid weeks
      return { from: startOfWeek(from), to: addDays(startOfWeek(to), 41) };
    }
    const from = addDays(anchor, -3);
    const to = addDays(anchor, 30);
    return { from, to };
  }, [view, anchor]);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await listCompanyCalendar({
        from: isoDate(range.from),
        to: isoDate(range.to),
      });
      setEntries(list);
    } catch (e: any) {
      toast.error("Couldn't load company calendar", { description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void refresh();
    const ch = supabase.channel("company_calendar_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "company_calendar" }, () => void refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor]);

  const todayStr = isoDate(new Date());

  const headerLabel = useMemo(() => {
    if (view === "month") return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(anchor); const e = addDays(s, 6);
      return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return "Upcoming";
  }, [view, anchor]);

  const shift = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir * 7);
    setAnchor(d);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber" /> Company Calendar
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Daily goals, vertical focuses, topics to post, sales pushes, and team events from leadership.
              </p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mt-2 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> Read-only — managed by leadership
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-8" onClick={() => setView("list")}>
                  <List className="w-3 h-3 mr-1" /> List
                </Button>
                <Button variant={view === "week" ? "default" : "ghost"} size="sm" className="rounded-none h-8" onClick={() => setView("week")}>
                  <CalendarRange className="w-3 h-3 mr-1" /> Week
                </Button>
                <Button variant={view === "month" ? "default" : "ghost"} size="sm" className="rounded-none h-8" onClick={() => setView("month")}>
                  <LayoutGrid className="w-3 h-3 mr-1" /> Month
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>

          {(view === "week" || view === "month") && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
              <div className="text-sm font-mono uppercase tracking-wider text-amber">{headerLabel}</div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setAnchor(() => { const d = new Date(); d.setHours(0,0,0,0); return d; })}>Today</Button>
                <Button variant="ghost" size="sm" onClick={() => shift(1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {loading ? (
        <div className="glass p-12 rounded-xl text-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber mx-auto" />
        </div>
      ) : view === "list" ? (
        <ListView entries={entries} todayStr={todayStr} onPick={setSelectedEntry} />
      ) : view === "week" ? (
        <WeekView entries={entries} weekStart={startOfWeek(anchor)} todayStr={todayStr} onPick={setSelectedEntry} />
      ) : (
        <MonthView entries={entries} anchor={anchor} todayStr={todayStr} onPick={setSelectedEntry} />
      )}

      {selectedEntry && (
        <EntryDialog entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
};

// ---------- List view ----------
const ListView: React.FC<{ entries: CompanyCalendarEntry[]; todayStr: string; onPick: (e: CompanyCalendarEntry) => void }>
= ({ entries, todayStr, onPick }) => {
  const pinned = entries.filter(e => e.pinned);
  const map = new Map<string, CompanyCalendarEntry[]>();
  for (const e of entries) { if (!map.has(e.date)) map.set(e.date, []); map.get(e.date)!.push(e); }
  const byDate = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));

  const fmtDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    const isToday = d === todayStr;
    const label = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    return isToday ? `Today — ${label}` : label;
  };

  return (
    <>
      {pinned.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-amber flex items-center gap-1">
              <Pin className="w-3 h-3" /> Pinned
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pinned.map(e => <EntryCard key={e.id} e={e} onPick={onPick} />)}
          </CardContent>
        </Card>
      )}
      {byDate.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <p className="text-muted-foreground text-sm">No entries scheduled. Check back later.</p>
        </div>
      ) : byDate.map(([date, list]) => (
        <Card key={date}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-mono ${date === todayStr ? "text-amber" : "text-foreground"}`}>
              {fmtDate(date)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.map(e => <EntryCard key={e.id} e={e} onPick={onPick} />)}
          </CardContent>
        </Card>
      ))}
    </>
  );
};

// ---------- Week view ----------
const WeekView: React.FC<{ entries: CompanyCalendarEntry[]; weekStart: Date; todayStr: string; onPick: (e: CompanyCalendarEntry) => void }>
= ({ entries, weekStart, todayStr, onPick }) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDate = new Map<string, CompanyCalendarEntry[]>();
  for (const e of entries) { if (!byDate.has(e.date)) byDate.set(e.date, []); byDate.get(e.date)!.push(e); }
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map(d => {
        const ds = isoDate(d);
        const list = byDate.get(ds) || [];
        const isToday = ds === todayStr;
        return (
          <Card key={ds} className={isToday ? "border-amber/60" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-mono uppercase ${isToday ? "text-amber" : "text-muted-foreground"}`}>
                {d.toLocaleDateString(undefined, { weekday: "short" })} · {d.getDate()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[80px]">
              {list.length === 0
                ? <p className="text-[11px] text-muted-foreground italic">—</p>
                : list.map(e => <EntryCard key={e.id} e={e} onPick={onPick} compact />)}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ---------- Month view ----------
const MonthView: React.FC<{ entries: CompanyCalendarEntry[]; anchor: Date; todayStr: string; onPick: (e: CompanyCalendarEntry) => void }>
= ({ entries, anchor, todayStr, onPick }) => {
  const gridStart = startOfWeek(startOfMonth(anchor));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const byDate = new Map<string, CompanyCalendarEntry[]>();
  for (const e of entries) { if (!byDate.has(e.date)) byDate.set(e.date, []); byDate.get(e.date)!.push(e); }
  const month = anchor.getMonth();
  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-[10px] font-mono uppercase text-center text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const ds = isoDate(d);
            const list = byDate.get(ds) || [];
            const isToday = ds === todayStr;
            const inMonth = d.getMonth() === month;
            return (
              <div key={ds} className={`min-h-[70px] sm:min-h-[90px] rounded border p-1 text-[10px] flex flex-col gap-0.5
                ${isToday ? "border-amber/60 bg-amber/5" : "border-border"}
                ${inMonth ? "bg-background/40" : "bg-muted/20 opacity-60"}`}>
                <div className={`font-mono ${isToday ? "text-amber font-bold" : "text-muted-foreground"}`}>{d.getDate()}</div>
                {list.slice(0, 3).map(e => {
                  const meta = KIND_META[e.kind];
                  return (
                    <button key={e.id} onClick={() => onPick(e)}
                      className={`text-left truncate rounded px-1 py-0.5 border ${meta.color} hover:opacity-80`}>
                      {meta.icon} {e.title}
                    </button>
                  );
                })}
                {list.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{list.length - 3} more</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- Entry card ----------
const EntryCard: React.FC<{ e: CompanyCalendarEntry; onPick?: (e: CompanyCalendarEntry) => void; compact?: boolean }> = ({ e, onPick, compact }) => {
  const meta = KIND_META[e.kind];
  return (
    <button
      type="button"
      onClick={() => onPick?.(e)}
      className={`w-full text-left rounded-md border p-2.5 ${meta.color} hover:opacity-90 transition`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span>{meta.icon}</span>
        <Badge variant="outline" className="text-[10px] uppercase">{meta.label}</Badge>
        {e.pinned && <Pin className="w-3 h-3" />}
      </div>
      <p className="font-semibold mt-1 text-foreground text-sm">{e.title}</p>
      {!compact && e.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{e.body}</p>}
    </button>
  );
};

// ---------- Detail dialog ----------
const EntryDialog: React.FC<{ entry: CompanyCalendarEntry; onClose: () => void }> = ({ entry, onClose }) => {
  const meta = KIND_META[entry.kind];
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-2xl">{meta.icon}</span>
          <Badge variant="outline" className={`uppercase text-[10px] ${meta.color}`}>{meta.label}</Badge>
          {entry.pinned && <Badge variant="outline" className="text-[10px]"><Pin className="w-3 h-3 mr-1" />Pinned</Badge>}
          <span className="text-xs text-muted-foreground ml-auto font-mono">{new Date(entry.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
        </div>
        <h3 className="text-xl font-display font-bold text-foreground">{entry.title}</h3>
        {entry.body && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{entry.body}</p>}
        {entry.attachments?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background/40 hover:border-primary">
                <Paperclip className="w-3 h-3" /> {a.name} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
        {entry.ai_plan && (entry.ai_plan.summary || entry.ai_plan.tactics?.length || entry.ai_plan.kpis?.length) && (
          <div className="mt-4 p-3 rounded-md border border-amber/30 bg-amber/5">
            <p className="text-[10px] font-mono uppercase text-amber mb-1">Tactical Plan</p>
            {entry.ai_plan.summary && <p className="text-xs text-foreground mb-2">{entry.ai_plan.summary}</p>}
            {entry.ai_plan.tactics?.length ? (
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                {entry.ai_plan.tactics.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            ) : null}
            {entry.ai_plan.kpis?.length ? (
              <div className="mt-2">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">KPIs</p>
                <ul className="text-xs text-foreground list-disc pl-4 space-y-0.5">
                  {entry.ai_plan.kpis.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 inline-flex items-center gap-1">
          <Lock className="w-3 h-3" /> Read-only — only leadership can edit this entry
        </p>
      </div>
    </div>
  );
};

export default CompanyCalendarRepView;
