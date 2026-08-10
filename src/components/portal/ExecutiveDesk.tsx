import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Loader2, CalendarDays, ListChecks, StickyNote, Plus, Trash2, ShieldCheck,
  ChevronLeft, ChevronRight, Bell, Handshake, GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listExecItems, createExecItem, updateExecItem, deleteExecItem,
  execPersonLabel, type ExecItem, type ExecKind, type ExecPerson,
} from "@/lib/execDesk";

const PEOPLE = ["all", "joseph", "braden", "dean"] as const;

/** Scheduled kinds shown on the calendar. */
const SCHEDULED: ExecKind[] = ["event", "meeting", "task"];

const KIND_META: Record<string, { label: string; chip: string; dot: string }> = {
  event:   { label: "Event",   chip: "bg-primary/15 hover:bg-primary/25",             dot: "bg-primary" },
  meeting: { label: "Meeting", chip: "bg-fuchsia-500/15 hover:bg-fuchsia-500/25",     dot: "bg-fuchsia-500" },
  task:    { label: "Task",    chip: "bg-emerald-500/15 hover:bg-emerald-500/25",     dot: "bg-emerald-500" },
  note:    { label: "Note",    chip: "bg-muted hover:bg-muted/80",                    dot: "bg-muted-foreground" },
};

type ViewTab = "calendar" | "event" | "meeting" | "task" | "note";
type CalFilter = "all" | "event" | "meeting" | "task";

const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const timeOf = (iso: string | null) => (iso ? new Date(iso).toTimeString().slice(0, 5) : "09:00");

export const ExecutiveDesk: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ExecItem[]>([]);
  const [me, setMe] = useState<ExecPerson>("joseph");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<ViewTab>("calendar");
  const [calFilter, setCalFilter] = useState<CalFilter>("all");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [draft, setDraft] = useState<{ title: string; details: string; date: string; time: string; assignee: string; priority: string; kind: ExecKind }>(
    { title: "", details: "", date: toISODate(new Date()), time: "09:00", assignee: "all", priority: "normal", kind: "event" }
  );
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [dayDraft, setDayDraft] = useState<{ title: string; time: string; assignee: string; details: string; kind: ExecKind }>({ title: "", time: "09:00", assignee: "all", details: "", kind: "event" });
  const [focusId, setFocusId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const d = await listExecItems();
      setItems(d.items);
      setMe(d.me);
      setDenied(false);
    } catch (e) {
      const msg = (e as Error).message || "";
      if (/Executive access|401|Unauthorized/i.test(msg)) setDenied(true);
      else toast({ title: "Couldn't load the Executive Desk", description: msg, variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void refresh(); }, [refresh]);
  // Keep the desk fresh so teammates' changes show up.
  useEffect(() => {
    const t = setInterval(() => { void refresh(); }, 120000);
    return () => clearInterval(t);
  }, [refresh]);

  const add = async () => {
    if (!draft.title.trim()) return;
    const kind: ExecKind = tab === "calendar" ? draft.kind : (tab as ExecKind);
    try {
      const item = await createExecItem({
        kind,
        title: draft.title.trim(),
        details: draft.details.trim() || null,
        assignee: draft.assignee,
        priority: draft.priority as ExecItem["priority"],
        starts_at: kind === "note" ? null : new Date(`${draft.date}T${draft.time || "09:00"}`).toISOString(),
      });
      setItems((p) => [item, ...p]);
      setDraft((s) => ({ ...s, title: "", details: "" }));
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const addOnDay = async () => {
    if (!dayOpen || !dayDraft.title.trim()) return;
    try {
      const item = await createExecItem({
        kind: dayDraft.kind,
        title: dayDraft.title.trim(),
        details: dayDraft.details.trim() || null,
        assignee: dayDraft.assignee,
        priority: "normal",
        starts_at: new Date(`${dayOpen}T${dayDraft.time || "09:00"}`).toISOString(),
      });
      setItems((p) => [item, ...p]);
      setDayDraft((s) => ({ ...s, title: "", details: "" }));
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const patch = async (id: string, p: Partial<ExecItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } as ExecItem : i)));
    try { await updateExecItem(id, p); } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
      void refresh();
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try { await deleteExecItem(id); } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
      void refresh();
    }
  };

  /** Drop a dragged item onto a day — keeps the time, changes the date. */
  const dropOnDay = async (day: string) => {
    const id = dragId;
    setDragId(null);
    setDragOverDay(null);
    if (!id) return;
    const it = items.find((i) => i.id === id);
    if (!it) return;
    const current = it.starts_at ? toISODate(new Date(it.starts_at)) : null;
    if (current === day) return;
    const iso = new Date(`${day}T${timeOf(it.starts_at)}`).toISOString();
    await patch(id, { starts_at: iso });
    toast({ title: "Rescheduled", description: `${it.title} → ${new Date(`${day}T12:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}` });
  };

  const byKind = useCallback((k: ExecKind) => items.filter((i) => i.kind === k), [items]);
  const notes = useMemo(() => byKind("note"), [byKind]);

  const grid = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const byDay = useMemo(() => {
    const m: Record<string, ExecItem[]> = {};
    for (const e of items) {
      if (!SCHEDULED.includes(e.kind) || !e.starts_at) continue;
      if (calFilter !== "all" && e.kind !== calFilter) continue;
      const k = toISODate(new Date(e.starts_at));
      (m[k] ||= []).push(e);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || ""));
    return m;
  }, [items, calFilter]);

  // ===== Notifications =====
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const alerts = useMemo(() => {
    const soon: ExecItem[] = [];
    const overdue: ExecItem[] = [];
    for (const i of items) {
      if (!i.starts_at || i.kind === "note") continue;
      if (i.kind === "task" && i.status === "done") continue;
      const t = new Date(i.starts_at).getTime();
      if (t < nowTs) { if (i.kind === "task") overdue.push(i); }
      else if (t - nowTs <= 48 * 3600 * 1000) soon.push(i);
    }
    soon.sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || ""));
    overdue.sort((a, b) => (b.starts_at || "").localeCompare(a.starts_at || ""));
    return { soon, overdue };
  }, [items, nowTs]);

  // Fire a toast + browser notification 15 minutes before anything starts.
  useEffect(() => {
    for (const i of alerts.soon) {
      const t = new Date(i.starts_at as string).getTime();
      const mins = (t - nowTs) / 60000;
      if (mins > 15 || mins < 0 || notifiedRef.current.has(i.id)) continue;
      notifiedRef.current.add(i.id);
      const body = `${new Date(i.starts_at as string).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${execPersonLabel(i.assignee)}`;
      toast({ title: `${KIND_META[i.kind]?.label ?? "Item"} starting soon: ${i.title}`, description: body });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification(`Executive Desk — ${i.title}`, { body }); } catch { /* ignore */ }
      }
    }
  }, [alerts.soon, nowTs, toast]);

  const askNotifPermission = async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Not supported", description: "This browser can't show desktop notifications." });
      return;
    }
    const p = await Notification.requestPermission();
    toast({ title: p === "granted" ? "Desktop alerts on" : "Desktop alerts not enabled" });
  };

  const alertCount = alerts.soon.length + alerts.overdue.length;

  const openDay = (k: string, id?: string) => {
    setDayOpen(k);
    setFocusId(id ?? null);
    setDayDraft({ title: "", time: "09:00", assignee: "all", details: "", kind: "event" });
  };

  if (loading) {
    return <Card><CardContent className="py-10 flex items-center justify-center text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading the Executive Desk…
    </CardContent></Card>;
  }

  if (denied) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
      This desk is private to Joseph, Braden and Dean.
    </CardContent></Card>;
  }

  const listView = (kind: ExecKind) => {
    const rows = byKind(kind).slice().sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || ""));
    return (
      <Card>
        <CardContent className="pt-6 space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
          {rows.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              {kind === "task" && (
                <Checkbox
                  checked={t.status === "done"}
                  onCheckedChange={(v) => void patch(t.id, { status: v ? "done" : "open" })}
                  className="mt-1"
                />
              )}
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${KIND_META[kind].dot}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                {t.details && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.details}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-[9px]">by {execPersonLabel(t.author)}</Badge>
                  {t.starts_at && (
                    <button
                      className="text-[10px] text-amber underline-offset-2 hover:underline"
                      onClick={() => { const d = new Date(t.starts_at as string); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setTab("calendar"); openDay(toISODate(d), t.id); }}
                    >
                      {new Date(t.starts_at).toLocaleString()}
                    </button>
                  )}
                  <Select value={t.assignee} onValueChange={(v) => void patch(t.id, { assignee: v })}>
                    <SelectTrigger className="h-6 w-[120px] text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{PEOPLE.map((p) => <SelectItem key={p} value={p}>{execPersonLabel(p)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => void remove(t.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-amber/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber" /> Executive Desk
              </CardTitle>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mt-1">
                Private to Joseph · Braden · Dean — signed in as {execPersonLabel(me)}
              </p>
            </div>
            <div className="flex gap-1 flex-wrap items-center">
              {([
                { k: "calendar", label: "Calendar", Icon: CalendarDays },
                { k: "event", label: "Events", Icon: CalendarDays },
                { k: "meeting", label: "Meetings", Icon: Handshake },
                { k: "task", label: "Tasks", Icon: ListChecks },
                { k: "note", label: "Notes", Icon: StickyNote },
              ] as const).map(({ k, label, Icon }) => (
                <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>
                  <Icon className="w-4 h-4 mr-1" /> {label}
                </Button>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="relative">
                    <Bell className="w-4 h-4" />
                    {alertCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] rounded-full bg-crimson px-1 text-[9px] font-bold leading-4 text-white">
                        {alertCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between border-b border-border/60 p-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">Notifications</span>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => void askNotifPermission()}>Enable desktop alerts</Button>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                    {alertCount === 0 && <p className="p-2 text-sm text-muted-foreground">You're clear — nothing due in the next 48 hours.</p>}
                    {alerts.overdue.map((i) => (
                      <button
                        key={i.id}
                        className="w-full rounded-md border border-crimson/40 bg-crimson/5 p-2 text-left hover:bg-crimson/10"
                        onClick={() => { const d = new Date(i.starts_at as string); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setTab("calendar"); openDay(toISODate(d), i.id); }}
                      >
                        <div className="text-xs font-medium">Overdue · {i.title}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(i.starts_at as string).toLocaleString()} · {execPersonLabel(i.assignee)}</div>
                      </button>
                    ))}
                    {alerts.soon.map((i) => (
                      <button
                        key={i.id}
                        className="w-full rounded-md border border-border/60 p-2 text-left hover:bg-muted/50"
                        onClick={() => { const d = new Date(i.starts_at as string); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setTab("calendar"); openDay(toISODate(d), i.id); }}
                      >
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span className={`h-2 w-2 rounded-full ${KIND_META[i.kind]?.dot}`} /> {i.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{new Date(i.starts_at as string).toLocaleString()} · {execPersonLabel(i.assignee)}</div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[auto_1fr_auto_auto_auto] items-center">
            {tab === "calendar" && (
              <Select value={draft.kind} onValueChange={(v) => setDraft((s) => ({ ...s, kind: v as ExecKind }))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input
              value={draft.title}
              onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
              placeholder={tab === "note" ? "New note title…" : tab === "task" ? "New task…" : tab === "meeting" ? "New meeting…" : "New item…"}
              onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
            />
            {tab !== "note" && (
              <div className="flex gap-2">
                <Input type="date" value={draft.date} onChange={(e) => setDraft((s) => ({ ...s, date: e.target.value }))} className="w-[150px]" />
                <Input type="time" value={draft.time} onChange={(e) => setDraft((s) => ({ ...s, time: e.target.value }))} className="w-[110px]" />
              </div>
            )}
            <Select value={draft.assignee} onValueChange={(v) => setDraft((s) => ({ ...s, assignee: v }))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PEOPLE.map((p) => <SelectItem key={p} value={p}>{execPersonLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => void add()}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
          <Textarea
            value={draft.details}
            onChange={(e) => setDraft((s) => ({ ...s, details: e.target.value }))}
            placeholder="Details (optional)"
            rows={2}
          />
        </CardContent>
      </Card>

      {tab === "calendar" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-display">
                {month.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1">
                  {(["all", "event", "meeting", "task"] as CalFilter[]).map((f) => (
                    <Button key={f} size="sm" variant={calFilter === f ? "secondary" : "ghost"} className="h-7 text-[11px]" onClick={() => setCalFilter(f)}>
                      {f === "all" ? "All" : `${KIND_META[f].label}s`}
                    </Button>
                  ))}
                </div>
                <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Drag any item to another day to reschedule it.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d) => {
                const k = toISODate(d);
                const dayItems = byDay[k] || [];
                const dim = d.getMonth() !== month.getMonth();
                const today = k === toISODate(new Date());
                const over = dragOverDay === k;
                return (
                  <div
                    key={k}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDay(k)}
                    onKeyDown={(ev) => { if (ev.key === "Enter") openDay(k); }}
                    onDragOver={(ev) => { if (dragId) { ev.preventDefault(); setDragOverDay(k); } }}
                    onDragLeave={() => setDragOverDay((c) => (c === k ? null : c))}
                    onDrop={(ev) => { ev.preventDefault(); void dropOnDay(k); }}
                    className={`min-h-[86px] cursor-pointer rounded-md border p-1 text-left transition-colors hover:border-amber/60 hover:bg-amber/5 ${dim ? "opacity-40" : ""} ${over ? "border-amber bg-amber/10 ring-1 ring-amber" : today ? "border-amber/60 bg-amber/5" : "border-border/60"}`}
                  >
                    <div className="text-[11px] text-muted-foreground">{d.getDate()}</div>
                    <div className="space-y-1 mt-1">
                      {dayItems.map((e) => (
                        <div
                          key={e.id}
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(ev) => { ev.stopPropagation(); setDragId(e.id); ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", e.id); } catch { /* ignore */ } }}
                          onDragEnd={() => { setDragId(null); setDragOverDay(null); }}
                          title={`${KIND_META[e.kind]?.label}: ${e.title}${e.details ? ` — ${e.details}` : ""}`}
                          onClick={(ev) => { ev.stopPropagation(); openDay(k, e.id); }}
                          onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); openDay(k, e.id); } }}
                          className={`group cursor-grab active:cursor-grabbing rounded px-1 py-0.5 text-[10px] leading-tight ${KIND_META[e.kind]?.chip} ${dragId === e.id ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className={`flex min-w-0 items-center gap-1 truncate ${e.kind === "task" && e.status === "done" ? "line-through opacity-60" : ""}`}>
                              <GripVertical className="w-2.5 h-2.5 shrink-0 opacity-50" />
                              <span className="truncate">{e.kind === "task" ? "✓ " : e.kind === "meeting" ? "🤝 " : ""}{e.title}</span>
                            </span>
                            <button onClick={(ev) => { ev.stopPropagation(); void remove(e.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-muted-foreground">{execPersonLabel(e.assignee)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "event" && listView("event")}
      {tab === "meeting" && listView("meeting")}
      {tab === "task" && listView("task")}

      {tab === "note" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No executive notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{n.title}</div>
                  <Button size="icon" variant="ghost" onClick={() => void remove(n.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <Textarea
                  defaultValue={n.details || ""}
                  onBlur={(e) => { if (e.target.value !== (n.details || "")) void patch(n.id, { details: e.target.value }); }}
                  rows={3}
                  className="mt-2 text-sm"
                />
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px]">by {execPersonLabel(n.author)}</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!dayOpen} onOpenChange={(o) => { if (!o) { setDayOpen(null); setFocusId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {dayOpen ? new Date(`${dayOpen}T12:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {(dayOpen ? byDay[dayOpen] || [] : []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing scheduled. Add something below.</p>
            )}
            {(dayOpen ? byDay[dayOpen] || [] : []).map((e) => (
              <div
                key={e.id}
                ref={(el) => { if (el && focusId === e.id) el.scrollIntoView({ block: "nearest" }); }}
                className={`rounded-lg border p-3 space-y-2 ${focusId === e.id ? "border-amber/70 bg-amber/5" : "border-border/60"}`}
              >
                <div className="flex items-start gap-2">
                  {e.kind === "task" && (
                    <Checkbox
                      checked={e.status === "done"}
                      onCheckedChange={(v) => void patch(e.id, { status: v ? "done" : "open" })}
                      className="mt-2"
                    />
                  )}
                  <Input
                    defaultValue={e.title}
                    onBlur={(ev) => { if (ev.target.value.trim() && ev.target.value !== e.title) void patch(e.id, { title: ev.target.value.trim() }); }}
                    className={`h-8 text-sm ${e.kind === "task" && e.status === "done" ? "line-through text-muted-foreground" : ""}`}
                  />
                  <Button size="icon" variant="ghost" onClick={() => void remove(e.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={e.kind} onValueChange={(v) => void patch(e.id, { kind: v as ExecKind })}>
                    <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    className="h-8 w-[150px]"
                    defaultValue={e.starts_at ? toISODate(new Date(e.starts_at)) : dayOpen || ""}
                    onChange={(ev) => { if (ev.target.value) void patch(e.id, { starts_at: new Date(`${ev.target.value}T${timeOf(e.starts_at)}`).toISOString() }); }}
                  />
                  <Input
                    type="time"
                    className="h-8 w-[110px]"
                    defaultValue={timeOf(e.starts_at)}
                    onChange={(ev) => { if (ev.target.value && dayOpen) void patch(e.id, { starts_at: new Date(`${dayOpen}T${ev.target.value}`).toISOString() }); }}
                  />
                  <Select value={e.assignee} onValueChange={(v) => void patch(e.id, { assignee: v })}>
                    <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{PEOPLE.map((p) => <SelectItem key={p} value={p}>{execPersonLabel(p)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-[9px] self-center">by {execPersonLabel(e.author)}</Badge>
                </div>

                <Textarea
                  defaultValue={e.details || ""}
                  rows={2}
                  placeholder="Details"
                  className="text-sm"
                  onBlur={(ev) => { if (ev.target.value !== (e.details || "")) void patch(e.id, { details: ev.target.value }); }}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 pt-3 space-y-2">
            <div className="flex gap-2">
              <Select value={dayDraft.kind} onValueChange={(v) => setDayDraft((s) => ({ ...s, kind: v as ExecKind }))}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={dayDraft.title}
                onChange={(ev) => setDayDraft((s) => ({ ...s, title: ev.target.value }))}
                placeholder={dayDraft.kind === "task" ? "New task on this day…" : dayDraft.kind === "meeting" ? "New meeting on this day…" : "New event on this day…"}
                onKeyDown={(ev) => { if (ev.key === "Enter") void addOnDay(); }}
              />
              <Input type="time" className="w-[110px]" value={dayDraft.time} onChange={(ev) => setDayDraft((s) => ({ ...s, time: ev.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Select value={dayDraft.assignee} onValueChange={(v) => setDayDraft((s) => ({ ...s, assignee: v }))}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PEOPLE.map((p) => <SelectItem key={p} value={p}>{execPersonLabel(p)}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={dayDraft.details} onChange={(ev) => setDayDraft((s) => ({ ...s, details: ev.target.value }))} placeholder="Details (optional)" />
              <Button onClick={() => void addOnDay()}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExecutiveDesk;
