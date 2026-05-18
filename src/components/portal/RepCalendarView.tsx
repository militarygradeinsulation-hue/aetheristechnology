import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Trash2, CheckCircle2, Circle, Calendar as CalendarIcon,
} from "lucide-react";
import {
  listCalendar, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  type CalendarEvent, type CalendarKind, type LeadSummary, KIND_META,
} from "@/lib/portalCalendar";

// ---- date helpers ----
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfGrid(d: Date) {
  const s = startOfMonth(d);
  const day = s.getDay(); // 0 Sun
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() - day);
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

interface Props {
  /** When true, current user is admin and can attach admin notes / pick rep. */
  isAdmin?: boolean;
  /** When admin, target rep code to view/edit. Reps ignore this and use their own. */
  repCode?: string;
}

export const RepCalendarView: React.FC<Props> = ({ isAdmin = false, repCode }) => {
  const { toast } = useToast();
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<"month" | "day">("month");
  const [dayCursor, setDayCursor] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeLeads, setActiveLeads] = useState<LeadSummary[]>([]);
  const [leadsById, setLeadsById] = useState<Record<string, LeadSummary>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CalendarEvent> | null>(null);
  const [saving, setSaving] = useState(false);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfGrid(cursor);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);

  const refresh = async () => {
    setLoading(true);
    try {
      const from = addDays(gridStart, -1).toISOString();
      const to = addDays(gridStart, 43).toISOString();
      const data = await listCalendar({ rep_code: repCode, from, to });
      setEvents(data.events || []);
      setActiveLeads(data.active_leads || []);
      setLeadsById(data.leads_by_id || {});
    } catch (e) {
      toast({ title: "Couldn't load calendar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [cursor.getMonth(), cursor.getFullYear(), repCode]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const k = ymd(new Date(e.start_at));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [events]);

  const openCreate = (forDate: Date) => {
    const at = new Date(forDate);
    at.setHours(9, 0, 0, 0);
    setDraft({
      kind: "task",
      title: "",
      body: "",
      start_at: at.toISOString(),
      end_at: null,
      all_day: false,
      lead_id: null,
      rep_notes: "",
      admin_notes: "",
      completed: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (e: CalendarEvent) => {
    setDraft({ ...e });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!draft?.title?.trim()) {
      toast({ title: "Title required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await updateCalendarEvent(draft.id, draft);
      } else {
        await createCalendarEvent({ ...draft, rep_code: isAdmin ? repCode : undefined });
      }
      setDialogOpen(false);
      setDraft(null);
      await refresh();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    if (!confirm("Delete this entry?")) return;
    setSaving(true);
    try {
      await deleteCalendarEvent(draft.id);
      setDialogOpen(false);
      setDraft(null);
      await refresh();
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (e: CalendarEvent) => {
    try {
      await updateCalendarEvent(e.id, { completed: !e.completed });
      setEvents((prev) => prev.map((x) => x.id === e.id ? { ...x, completed: !x.completed } : x));
    } catch (err) {
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const today = new Date();
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Quick "Add follow-up for lead" shortcut
  const createFollowUpForLead = (lead: LeadSummary) => {
    const at = addDays(new Date(), 2);
    at.setHours(10, 0, 0, 0);
    setDraft({
      kind: "follow_up",
      title: `Follow up: ${lead.business_name || lead.contact_name || "Lead"}`,
      body: lead.contact_name ? `Contact: ${lead.contact_name}` : "",
      start_at: at.toISOString(),
      lead_id: lead.id,
      all_day: false,
      completed: false,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber" />
              {view === "month"
                ? monthLabel
                : dayCursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex rounded border border-border overflow-hidden mr-1">
                <button
                  onClick={() => setView("month")}
                  className={`text-xs px-2.5 py-1 ${view === "month" ? "bg-amber text-background" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >Month</button>
                <button
                  onClick={() => { setView("day"); setDayCursor(new Date()); }}
                  className={`text-xs px-2.5 py-1 ${view === "day" ? "bg-amber text-background" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >Day</button>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
                else {
                  const next = addDays(dayCursor, -1);
                  setDayCursor(next);
                  setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
                }
              }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const now = new Date();
                setDayCursor(now);
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              }}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => {
                if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
                else {
                  const next = addDays(dayCursor, 1);
                  setDayCursor(next);
                  setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
                }
              }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button size="sm" className="bg-amber text-background hover:bg-amber/90 ml-2" onClick={() => openCreate(view === "day" ? dayCursor : new Date())}>
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === "month" ? (
            <>
              <div className="grid grid-cols-7 gap-px text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-mono">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="px-2 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border/40 rounded overflow-hidden">
                {days.map((d) => {
                  const inMonth = d.getMonth() === monthStart.getMonth();
                  const isToday = isSameDay(d, today);
                  const items = eventsByDay.get(ymd(d)) || [];
                  return (
                    <div
                      key={d.toISOString()}
                      onDoubleClick={() => { setDayCursor(d); setView("day"); }}
                      className={`bg-background min-h-[110px] p-1.5 flex flex-col gap-1 cursor-pointer ${
                        inMonth ? "" : "opacity-40"
                      } ${isToday ? "ring-1 ring-inset ring-amber" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => { setDayCursor(d); setView("day"); }}
                          className={`text-xs font-mono hover:text-amber ${isToday ? "text-amber font-bold" : "text-muted-foreground"}`}
                        >
                          {d.getDate()}
                        </button>
                        <button
                          onClick={() => openCreate(d)}
                          className="text-muted-foreground hover:text-amber"
                          aria-label="Add"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {items.slice(0, 4).map((e) => {
                          const meta = KIND_META[e.kind];
                          return (
                            <button
                              key={e.id}
                              onClick={() => openEdit(e)}
                              className={`text-left text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate ${meta.color} ${
                                e.completed ? "line-through opacity-60" : ""
                              }`}
                              title={`${meta.label} · ${fmtTime(e.start_at)}, ${e.title}`}
                            >
                              <span className="mr-0.5">{meta.icon}</span>
                              {!e.all_day && <span className="opacity-70 mr-1">{fmtTime(e.start_at)}</span>}
                              {e.title}
                            </button>
                          );
                        })}
                        {items.length > 4 && (
                          <span className="text-[10px] text-muted-foreground px-1">+{items.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <DayAgenda
              date={dayCursor}
              items={(eventsByDay.get(ymd(dayCursor)) || []).slice().sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))}
              onOpen={openEdit}
              onAdd={() => openCreate(dayCursor)}
              onToggle={toggleComplete}
            />
          )}
        </CardContent>
      </Card>

      {/* Active leads with quick follow-up button */}
      {activeLeads.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Active leads, schedule a follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeLeads.slice(0, 20).map((l) => (
                <button
                  key={l.id}
                  onClick={() => createFollowUpForLead(l)}
                  className="text-xs px-2.5 py-1.5 rounded border border-border/60 bg-card/40 hover:border-amber/40 hover:bg-amber/5 transition-colors text-foreground"
                >
                  <span className="font-medium">{l.business_name || l.contact_name || "Lead"}</span>
                  {l.status && <span className="ml-2 text-muted-foreground">· {l.status}</span>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setDraft(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {draft?.id ? "Edit entry" : "New entry"}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as CalendarKind })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_META) as CalendarKind[]).map((k) => (
                        <SelectItem key={k} value={k}>{KIND_META[k].icon} {KIND_META[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Lead (optional)</label>
                  <Select
                    value={draft.lead_id || "_none"}
                    onValueChange={(v) => setDraft({ ...draft, lead_id: v === "_none" ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {/* show currently linked lead even if not in active list */}
                      {draft.lead_id && leadsById[draft.lead_id] && !activeLeads.find(l => l.id === draft.lead_id) && (
                        <SelectItem value={draft.lead_id}>
                          {leadsById[draft.lead_id].business_name || leadsById[draft.lead_id].contact_name || "Lead"}
                        </SelectItem>
                      )}
                      {activeLeads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.business_name || l.contact_name || "Lead"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={draft.title || ""}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Call back Acme Plumbing"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">When</label>
                  <Input
                    type="datetime-local"
                    value={draft.start_at ? toLocalInput(draft.start_at) : ""}
                    onChange={(e) => setDraft({ ...draft, start_at: fromLocalInput(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Ends (optional)</label>
                  <Input
                    type="datetime-local"
                    value={draft.end_at ? toLocalInput(draft.end_at) : ""}
                    onChange={(e) => setDraft({ ...draft, end_at: e.target.value ? fromLocalInput(e.target.value) : null })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="all_day"
                  checked={!!draft.all_day}
                  onCheckedChange={(v) => setDraft({ ...draft, all_day: !!v })}
                />
                <label htmlFor="all_day" className="text-sm">All day</label>
                {draft.id && (
                  <>
                    <div className="w-px h-4 bg-border mx-2" />
                    <Checkbox
                      id="done"
                      checked={!!draft.completed}
                      onCheckedChange={(v) => setDraft({ ...draft, completed: !!v })}
                    />
                    <label htmlFor="done" className="text-sm">Completed</label>
                  </>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea
                  rows={2}
                  value={draft.body || ""}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  placeholder="What happened / what to do"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Rep notes</label>
                <Textarea
                  rows={2}
                  value={draft.rep_notes || ""}
                  onChange={(e) => setDraft({ ...draft, rep_notes: e.target.value })}
                  placeholder="Your private notes on this entry"
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="text-xs text-amber font-mono uppercase tracking-wider">Admin notes</label>
                  <Textarea
                    rows={2}
                    value={draft.admin_notes || ""}
                    onChange={(e) => setDraft({ ...draft, admin_notes: e.target.value })}
                    placeholder="Coaching note for the rep"
                    className="border-amber/40"
                  />
                </div>
              )}
              {!isAdmin && draft.admin_notes && (
                <div className="rounded border border-amber/40 bg-amber/5 p-2">
                  <p className="text-[10px] uppercase tracking-wider font-mono text-amber mb-1">Note from admin</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{draft.admin_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between gap-2">
            <div>
              {draft?.id && (
                <Button variant="ghost" size="sm" onClick={remove} disabled={saving} className="text-crimson hover:text-crimson hover:bg-crimson/10">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-amber text-background hover:bg-amber/90">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm

const DayAgenda: React.FC<{
  date: Date;
  items: CalendarEvent[];
  onOpen: (e: CalendarEvent) => void;
  onAdd: () => void;
  onToggle: (e: CalendarEvent) => void;
}> = ({ date, items, onOpen, onAdd, onToggle }) => {
  const allDay = items.filter((e) => e.all_day);
  const timed = items.filter((e) => !e.all_day);
  const byHour = new Map<number, CalendarEvent[]>();
  for (const e of timed) {
    const h = new Date(e.start_at).getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(e);
  }
  const earlyOrLate = timed.filter((e) => {
    const h = new Date(e.start_at).getHours();
    return h < HOURS[0] || h > HOURS[HOURS.length - 1];
  });

  return (
    <div className="space-y-3">
      {allDay.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1">All day</p>
          <div className="flex flex-wrap gap-1.5">
            {allDay.map((e) => {
              const meta = KIND_META[e.kind];
              return (
                <button key={e.id} onClick={() => onOpen(e)}
                  className={`text-xs px-2 py-1 rounded border ${meta.color} ${e.completed ? "line-through opacity-60" : ""}`}>
                  <span className="mr-1">{meta.icon}</span>{e.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded border border-border/60 divide-y divide-border/40">
        {HOURS.map((h) => {
          const slot = byHour.get(h) || [];
          const label = new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });
          return (
            <div key={h} className="flex gap-3 px-3 py-2 min-h-[52px]">
              <div className="w-14 text-[11px] font-mono text-muted-foreground pt-0.5">{label}</div>
              <div className="flex-1 flex flex-col gap-1">
                {slot.length === 0 ? (
                  <button onClick={onAdd} className="text-[11px] text-muted-foreground/40 hover:text-amber text-left">
                    + add
                  </button>
                ) : slot.map((e) => {
                  const meta = KIND_META[e.kind];
                  return (
                    <div key={e.id} className={`flex items-start gap-2 px-2 py-1.5 rounded border ${meta.color}`}>
                      <button onClick={() => onToggle(e)} className="mt-0.5">
                        {e.completed
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : <Circle className="w-4 h-4 opacity-60" />}
                      </button>
                      <button onClick={() => onOpen(e)} className="flex-1 text-left">
                        <div className={`text-sm font-medium ${e.completed ? "line-through opacity-60" : ""}`}>
                          <span className="mr-1">{meta.icon}</span>{e.title}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          {e.end_at && ` – ${new Date(e.end_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                          {" · "}{meta.label}
                        </div>
                        {e.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.body}</div>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {earlyOrLate.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1">Outside 7a–8p</p>
          <div className="flex flex-col gap-1">
            {earlyOrLate.map((e) => {
              const meta = KIND_META[e.kind];
              return (
                <button key={e.id} onClick={() => onOpen(e)}
                  className={`text-left text-xs px-2 py-1 rounded border ${meta.color}`}>
                  <span className="mr-1">{meta.icon}</span>
                  <span className="font-mono opacity-70 mr-1">
                    {new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                  {e.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Nothing scheduled. Click + New to add an entry.</p>
      )}
    </div>
  );
};

export default RepCalendarView;
