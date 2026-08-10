import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CalendarDays, ListChecks, StickyNote, Plus, Trash2, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listExecItems, createExecItem, updateExecItem, deleteExecItem,
  execPersonLabel, type ExecItem, type ExecKind, type ExecPerson,
} from "@/lib/execDesk";

const PEOPLE = ["all", "joseph", "braden", "dean"] as const;

const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const ExecutiveDesk: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ExecItem[]>([]);
  const [me, setMe] = useState<ExecPerson>("joseph");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<ExecKind>("event");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [draft, setDraft] = useState({ title: "", details: "", date: toISODate(new Date()), time: "09:00", assignee: "all", priority: "normal" });
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [dayDraft, setDayDraft] = useState({ title: "", time: "09:00", assignee: "all", details: "" });
  const [focusId, setFocusId] = useState<string | null>(null);

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

  const add = async () => {
    if (!draft.title.trim()) return;
    try {
      const item = await createExecItem({
        kind: tab,
        title: draft.title.trim(),
        details: draft.details.trim() || null,
        assignee: draft.assignee,
        priority: draft.priority as ExecItem["priority"],
        starts_at: tab === "note" ? null : new Date(`${draft.date}T${draft.time || "09:00"}`).toISOString(),
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
        kind: "event",
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

  
  const tasks = useMemo(() => items.filter((i) => i.kind === "task"), [items]);
  const notes = useMemo(() => items.filter((i) => i.kind === "note"), [items]);

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
      if (e.kind === "note" || !e.starts_at) continue;
      const k = toISODate(new Date(e.starts_at));
      (m[k] ||= []).push(e);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || ""));
    }
    return m;
  }, [items]);


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
            <div className="flex gap-1">
              {([
                { k: "event", label: "Calendar", Icon: CalendarDays },
                { k: "task", label: "Tasks", Icon: ListChecks },
                { k: "note", label: "Notes", Icon: StickyNote },
              ] as const).map(({ k, label, Icon }) => (
                <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>
                  <Icon className="w-4 h-4 mr-1" /> {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto] items-center">
            <Input
              value={draft.title}
              onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
              placeholder={tab === "event" ? "New meeting or event…" : tab === "task" ? "New task…" : "New note title…"}
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

      {tab === "event" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display">
                {month.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </CardTitle>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
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
                return (
                  <div
                    key={k}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setDayOpen(k); setDayDraft({ title: "", time: "09:00", assignee: "all", details: "" }); }}
                    onKeyDown={(ev) => { if (ev.key === "Enter") { setDayOpen(k); setDayDraft({ title: "", time: "09:00", assignee: "all", details: "" }); } }}
                    className={`min-h-[86px] cursor-pointer rounded-md border p-1 text-left transition-colors hover:border-amber/60 hover:bg-amber/5 ${dim ? "opacity-40" : ""} ${today ? "border-amber/60 bg-amber/5" : "border-border/60"}`}
                  >
                    <div className="text-[11px] text-muted-foreground">{d.getDate()}</div>
                    <div className="space-y-1 mt-1">
                      {dayItems.map((e) => (
                        <div
                          key={e.id}
                          role="button"
                          tabIndex={0}
                          title={`${e.title}${e.details ? ` — ${e.details}` : ""}`}
                          onClick={(ev) => { ev.stopPropagation(); setFocusId(e.id); setDayOpen(k); setDayDraft({ title: "", time: "09:00", assignee: "all", details: "" }); }}
                          onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); setFocusId(e.id); setDayOpen(k); } }}
                          className="group cursor-pointer rounded bg-primary/15 px-1 py-0.5 text-[10px] leading-tight hover:bg-primary/25"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="truncate">{e.title}</span>
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

      {tab === "task" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">No executive tasks yet.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <Checkbox
                  checked={t.status === "done"}
                  onCheckedChange={(v) => void patch(t.id, { status: v ? "done" : "open" })}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  {t.details && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.details}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">{execPersonLabel(t.assignee)}</Badge>
                    <Badge variant="outline" className="text-[9px]">by {execPersonLabel(t.author)}</Badge>
                    {t.starts_at && <span className="text-[10px] text-muted-foreground">{new Date(t.starts_at).toLocaleString()}</span>}
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
      )}

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
                  <Input
                    defaultValue={e.title}
                    onBlur={(ev) => { if (ev.target.value.trim() && ev.target.value !== e.title) void patch(e.id, { title: ev.target.value.trim() }); }}
                    className="h-8 text-sm"
                  />
                  <Button size="icon" variant="ghost" onClick={() => void remove(e.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    className="h-8 w-[110px]"
                    defaultValue={e.starts_at ? new Date(e.starts_at).toTimeString().slice(0, 5) : "09:00"}
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
              <Input
                value={dayDraft.title}
                onChange={(ev) => setDayDraft((s) => ({ ...s, title: ev.target.value }))}
                placeholder="New event on this day…"
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
