import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CalendarDays, Pin, Paperclip, ExternalLink, RefreshCw,
  List, LayoutGrid, CalendarRange, Lock, ChevronLeft, ChevronRight, Plus, Trash2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listCompanyCalendar, upsertCompanyEntry, deleteCompanyEntry,
  createRepMeeting, deleteRepMeeting,
  CATEGORY_META, entryDisplay, type CompanyCalendarEntry,
} from "@/lib/companyCalendar";
import { listCalendar, type LeadSummary } from "@/lib/portalCalendar";
import { getPortalProfile } from "@/lib/portalAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

export const CompanyCalendarRepView: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const [entries, setEntries] = useState<CompanyCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [selectedEntry, setSelectedEntry] = useState<CompanyCalendarEntry | null>(null);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const dialogOpenRef = useRef(false);
  const profile = useMemo(() => getPortalProfile(), []);
  const myRepPrefix = profile?.code ? `rep:${profile.code}` : null;

  const people = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) {
      const name = e.owner_name || (e.ai_plan?.meta?.rep_name ?? null);
      if (name) s.add(name);
    }
    return Array.from(s).sort();
  }, [entries]);

  const kindOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) {
      const cat = e.color && e.color.startsWith("cat:") ? e.color.slice(4) : null;
      s.add(cat || e.kind);
    }
    return Array.from(s).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (personFilter !== "all") {
        const name = e.owner_name || (e.ai_plan?.meta?.rep_name ?? null);
        if (personFilter === "__mine") {
          if (!myRepPrefix || e.created_by !== myRepPrefix) return false;
        } else if (name !== personFilter) return false;
      }
      if (kindFilter !== "all") {
        const cat = e.color && e.color.startsWith("cat:") ? e.color.slice(4) : null;
        const key = cat || e.kind;
        if (key !== kindFilter) return false;
      }
      return true;
    });
  }, [entries, personFilter, kindFilter, myRepPrefix]);


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

  const rangeFrom = useMemo(() => isoDate(range.from), [range.from]);
  const rangeTo = useMemo(() => isoDate(range.to), [range.to]);

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const list = await listCompanyCalendar({
        from: rangeFrom,
        to: rangeTo,
      });
      setEntries(list);
      setSelectedEntry(current => {
        if (!current) return null;
        return list.find(e => e.id === current.id) || current;
      });
    } catch (e: any) {
      toast.error("Couldn't load company calendar", { description: e.message });
    } finally { if (showLoading) setLoading(false); }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    dialogOpenRef.current = !!selectedEntry;
  }, [selectedEntry]);

  useEffect(() => {
    void refresh(true);
    // Polling fallback — paused while a dialog is open so reads don't clobber the popup.
    const id = setInterval(() => { if (!dialogOpenRef.current) void refresh(false); }, 15000);
    return () => { clearInterval(id); };
  }, [refresh]);

  const todayStr = isoDate(new Date());

  const headerLabel = useMemo(() => {
    if (view === "month") return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(anchor); const e = addDays(s, 6);
      return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
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
                Daily goals, vertical focuses, topics to post, sales pushes, and every rep's booked meetings — all in one view.
              </p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mt-2 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> Leadership entries read-only · every rep's meetings & bookings show here for the whole team
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isAdmin && (
                <Button size="sm" className="h-8 bg-amber text-black hover:bg-amber/90" onClick={() => setMeetingOpen(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Schedule Meeting
                </Button>
              )}
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
              <Button variant="outline" size="sm" onClick={() => refresh(true)} disabled={loading}>
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

          {/* Color legend */}
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-3 gap-y-1.5">
            {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map(k => {
              const m = CATEGORY_META[k];
              return (
                <div key={k} className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span className={`inline-block w-2.5 h-2.5 rounded ${m.swatch}`} />
                  <span>{m.icon} {m.label}</span>
                </div>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="glass p-12 rounded-xl text-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber mx-auto" />
        </div>
      ) : view === "list" ? (
        <ListView entries={entries} todayStr={todayStr} onPick={setSelectedEntry} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div>
            {view === "week" ? (
              <WeekView entries={entries} weekStart={startOfWeek(anchor)} todayStr={todayStr} onPick={setSelectedEntry} />
            ) : (
              <MonthView entries={entries} anchor={anchor} todayStr={todayStr} onPick={setSelectedEntry} />
            )}
          </div>
          <UpcomingSidebar entries={entries} todayStr={todayStr} onPick={setSelectedEntry} />
        </div>
      )}

      {selectedEntry && (
        <EntryDialog
          entry={selectedEntry}
          isAdmin={isAdmin}
          myRepPrefix={myRepPrefix}
          onClose={() => setSelectedEntry(null)}
          onSaved={(e) => { setSelectedEntry(e); void refresh(false); }}
          onDeleted={() => { setSelectedEntry(null); void refresh(true); }}
        />
      )}

      {meetingOpen && (
        <ScheduleMeetingDialog
          onClose={() => setMeetingOpen(false)}
          onCreated={() => { setMeetingOpen(false); void refresh(true); }}
        />
      )}

    </div>
  );
};

// ---------- Upcoming events sidebar ----------
const UpcomingSidebar: React.FC<{ entries: CompanyCalendarEntry[]; todayStr: string; onPick: (e: CompanyCalendarEntry) => void }>
= ({ entries, todayStr, onPick }) => {
  const upcoming = useMemo(() => {
    return [...entries]
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.title || "").localeCompare(b.title || ""));
  }, [entries, todayStr]);

  const fmt = (d: string) => {
    const date = new Date(d + "T12:00:00");
    if (d === todayStr) return "Today";
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <Card className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-amber flex items-center gap-1">
          <CalendarDays className="w-3 h-3" /> Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 overflow-y-auto">
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nothing on the schedule.</p>
        ) : upcoming.map(e => {
          const meta = entryDisplay(e);
          return (
            <button key={e.id} onClick={() => onPick(e)}
              className={`w-full text-left rounded-md border p-2 text-xs ${meta.color} hover:opacity-90 transition`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono uppercase text-[10px] text-muted-foreground">{fmt(e.date)}</span>
                {e.pinned && <Pin className="w-3 h-3" />}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span>{meta.icon}</span>
                <span className="font-semibold text-foreground line-clamp-2">{e.title}</span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
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
    return isToday ? `Today, ${label}` : label;
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
                ? <p className="text-[11px] text-muted-foreground italic">, </p>
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
                  const meta = entryDisplay(e);
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
  const meta = entryDisplay(e);
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
const EntryDialog: React.FC<{
  entry: CompanyCalendarEntry;
  isAdmin?: boolean;
  myRepPrefix?: string | null;
  onClose: () => void;
  onSaved?: (e: CompanyCalendarEntry) => void;
  onDeleted?: () => void;
}> = ({ entry, isAdmin = false, myRepPrefix = null, onClose, onSaved, onDeleted }) => {
  const isMyMeeting = entry.kind === "meeting" && !!myRepPrefix && entry.created_by === myRepPrefix;
  const meetingMeta = entry.ai_plan?.meta as { lead_label?: string; rep_name?: string; notes?: string } | undefined;

  const meta = entryDisplay(entry);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title || "");
  const [body, setBody] = useState(entry.body || "");
  const [date, setDate] = useState(entry.date || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(entry.title || ""); setBody(entry.body || ""); setDate(entry.date || "");
  }, [entry.id]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await upsertCompanyEntry({ id: entry.id, title, body, date });
      toast.success("Entry updated");
      setEditing(false);
      onSaved?.(saved);
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this calendar entry? This cannot be undone.")) return;
    setSaving(true);
    try {
      await deleteCompanyEntry(entry.id);
      toast.success("Entry deleted");
      onDeleted?.();
    } catch (e: any) {
      toast.error("Delete failed", { description: e.message });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-2xl">{meta.icon}</span>
          <Badge variant="outline" className={`uppercase text-[10px] ${meta.color}`}>{meta.label}</Badge>
          {entry.pinned && <Badge variant="outline" className="text-[10px]"><Pin className="w-3 h-3 mr-1" />Pinned</Badge>}
          <span className="text-xs text-muted-foreground ml-auto font-mono">{new Date(entry.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Body</label>
              <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-display font-bold text-foreground">{entry.title}</h3>
            {entry.body && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{entry.body}</p>}
            {entry.kind === "meeting" && meetingMeta && (
              <div className="mt-3 p-3 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/5 space-y-1 text-xs">
                {meetingMeta.rep_name && <div><span className="font-mono uppercase text-muted-foreground">Scheduled by:</span> <span className="text-foreground">{meetingMeta.rep_name}</span></div>}
                {meetingMeta.lead_label && <div><span className="font-mono uppercase text-muted-foreground">Lead:</span> <span className="text-foreground">{meetingMeta.lead_label}</span></div>}
                {entry.due_time && <div><span className="font-mono uppercase text-muted-foreground">Time:</span> <span className="text-foreground">{entry.due_time.slice(0,5)}</span></div>}
              </div>
            )}
          </>
        )}


        {entry.attachments?.length > 0 && !editing && (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background/40 hover:border-primary">
                <Paperclip className="w-3 h-3" /> {a.name} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
        {!editing && entry.ai_plan && (entry.ai_plan.summary || entry.ai_plan.tactics?.length || entry.ai_plan.kpis?.length) && (
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

        <div className="mt-4 flex justify-end gap-2 flex-wrap">
          {isMyMeeting && !isAdmin && (
            <Button variant="destructive" size="sm" onClick={async () => {
              if (!confirm("Delete your meeting from the company calendar?")) return;
              setSaving(true);
              try { await deleteRepMeeting(entry.id); toast.success("Meeting removed"); onDeleted?.(); }
              catch (e: any) { toast.error("Delete failed", { description: e.message }); }
              finally { setSaving(false); }
            }} disabled={saving}><Trash2 className="w-3 h-3 mr-1" />Delete Meeting</Button>
          )}
          {isAdmin && !editing && (
            <>
              <Button variant="destructive" size="sm" onClick={remove} disabled={saving}>Delete</Button>
              <Button variant="default" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            </>
          )}
          {isAdmin && editing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
              <Button variant="default" size="sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>

        {!isAdmin && !isMyMeeting && (
          <p className="text-[10px] text-muted-foreground mt-3 inline-flex items-center gap-1">
            <Lock className="w-3 h-3" /> Read-only, only leadership can edit this entry
          </p>
        )}
      </div>
    </div>
  );
};

// ---------- Rep meeting scheduler ----------
const ScheduleMeetingDialog: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [leadId, setLeadId] = useState<string>("");
  const [customLead, setCustomLead] = useState("");
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCalendar({}).then(r => setLeads(r.active_leads || [])).catch(() => {});
  }, []);

  const submit = async () => {
    if (!title.trim() || !date) { toast.error("Title and date required"); return; }
    setSaving(true);
    try {
      const chosenLead = leadId ? leads.find(l => l.id === leadId) : null;
      const leadLabel = chosenLead ? (chosenLead.business_name || chosenLead.contact_name || null) : (customLead.trim() || null);
      await createRepMeeting({
        title: title.trim(),
        date,
        due_time: time || undefined,
        notes: notes.trim(),
        lead_id: chosenLead?.id || null,
        lead_label: leadLabel,
      });
      toast.success("Meeting scheduled — team notified");
      onCreated();
    } catch (e: any) {
      toast.error("Could not schedule", { description: e.message });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User className="w-4 h-4 text-amber" />Schedule a Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Discovery call with Acme Roofing" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Date *</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Time</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Attach a lead (optional)</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={leadId}
              onChange={e => setLeadId(e.target.value)}
            >
              <option value="">— pick one of your active leads —</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.business_name || l.contact_name || l.id}</option>
              ))}
            </select>
            {!leadId && (
              <Input className="mt-2" placeholder="Or type a lead / prospect name" value={customLead} onChange={e => setCustomLead(e.target.value)} />
            )}
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Notes</label>
            <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context, agenda, prep links…" />
          </div>
          <p className="text-[11px] text-muted-foreground">This posts on the company calendar and notifies every active rep.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-amber text-black hover:bg-amber/90">
            {saving ? "Scheduling…" : "Schedule & Notify Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyCalendarRepView;

