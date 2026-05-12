import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Check, Calendar as CalendarIcon, Layout, Filter, Clock,
  Paperclip, MessageSquare, Download, FileText, RefreshCw, Loader2, User as UserIcon,
  Users as UsersIcon, Pencil, Save as SaveIcon, X as XIcon,
} from "lucide-react";
import {
  PERSONS, Person, personLabel, SharedTask, SharedNote, SharedFile,
  TaskStatus, TaskPriority, TaskBucket, fileUrl, uploadFile,
} from "@/lib/sharedWorkspace";
import { InterviewsPanel } from "./InterviewsPanel";

type ViewKind = "filter" | "kanban" | "calendar" | "timeline" | "interviews";
const VIEW_LABELS: Record<ViewKind, string> = {
  filter: "My / Their / Shared",
  kanban: "Kanban",
  calendar: "Calendar",
  timeline: "Timeline",
  interviews: "Interviews",
};

interface Props {
  me: Person;
  onUnreadChange?: (count: number) => void;
}

export const SharedWorkspace: React.FC<Props> = ({ me, onUnreadChange }) => {
  const { toast } = useToast();
  const [view, setView] = useState<ViewKind>(() => (localStorage.getItem("ws.view") as ViewKind) || "filter");
  const [calMonth, setCalMonth] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayNewTitle, setDayNewTitle] = useState("");
  const [dayNewTime, setDayNewTime] = useState("09:00");
  const [dayNote, setDayNote] = useState("");
  const [filter, setFilter] = useState<"mine" | "theirs" | "shared">("mine");
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "", description: "", assignee: me as Person, priority: "normal" as TaskPriority,
    bucket: "today" as TaskBucket, due_at: "",
  });
  const [noteBody, setNoteBody] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTaskDraft, setEditTaskDraft] = useState<Partial<SharedTask>>({});
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteBody, setEditNoteBody] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const them: Person = me === "admin" ? "bradon" : "admin";

  useEffect(() => { localStorage.setItem("ws.view", view); }, [view]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchSharedWorkspace } = await import("@/lib/sharedWorkspaceApi");
      const r = await fetchSharedWorkspace();
      setTasks(r.tasks as SharedTask[]);
      setNotes(r.notes as SharedNote[]);
      setFiles(r.files as SharedFile[]);
    } catch (e) {
      console.error("workspace load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => { clearInterval(iv); };
  }, [load]);

  // Push unread count to bell
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { fetchUnreadNotificationCount } = await import("@/lib/sharedWorkspaceApi");
        const n = await fetchUnreadNotificationCount(me);
        onUnreadChange?.(n);
      } catch { /* ignore */ }
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => { clearInterval(iv); };
  }, [me, onUnreadChange]);

  const filtered = useMemo(() => {
    if (view !== "filter") return tasks;
    if (filter === "mine") return tasks.filter(t => t.assignee === me);
    if (filter === "theirs") return tasks.filter(t => t.assignee === them);
    return tasks; // shared = all
  }, [tasks, filter, view, me, them]);

  const createTask = async () => {
    if (!newTask.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setCreating(true);
    const { error } = await supabase.from("shared_tasks").insert({
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      owner: me,
      assignee: newTask.assignee,
      priority: newTask.priority,
      bucket: newTask.bucket,
      due_at: newTask.due_at || null,
    });
    setCreating(false);
    if (error) { toast({ title: "Failed to create", description: error.message, variant: "destructive" }); return; }
    setNewTask({ title: "", description: "", assignee: me, priority: "normal", bucket: "today", due_at: "" });
    toast({ title: "Task created" });
    load();
  };

  const updateTask = async (id: string, patch: Partial<SharedTask>) => {
    const { error } = await supabase.from("shared_tasks").update(patch).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      const { deleteSharedTask } = await import("@/lib/sharedWorkspaceApi");
      await deleteSharedTask(id);
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const openEditTask = (t: SharedTask) => {
    setEditTaskId(t.id);
    setEditTaskDraft({
      title: t.title, description: t.description, assignee: t.assignee,
      priority: t.priority, bucket: t.bucket, status: t.status,
      due_at: t.due_at,
    });
  };
  const saveEditTask = async () => {
    if (!editTaskId) return;
    const patch: any = { ...editTaskDraft };
    if (patch.due_at === "") patch.due_at = null;
    const { error } = await supabase.from("shared_tasks").update(patch).eq("id", editTaskId);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Task updated" });
    setEditTaskId(null); setEditTaskDraft({}); load();
  };

  const startEditNote = (n: SharedNote) => { setEditNoteId(n.id); setEditNoteBody(n.body); };
  const saveEditNote = async () => {
    if (!editNoteId || !editNoteBody.trim()) return;
    const { error } = await supabase.from("shared_notes").update({ body: editNoteBody.trim() }).eq("id", editNoteId);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setEditNoteId(null); setEditNoteBody(""); load();
  };
  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      const { deleteSharedNote } = await import("@/lib/sharedWorkspaceApi");
      await deleteSharedNote(id);
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const deleteFile = async (f: SharedFile) => {
    if (!confirm(`Delete "${f.filename}"?`)) return;
    try {
      const { deleteSharedFile } = await import("@/lib/sharedWorkspaceApi");
      await deleteSharedFile(f.id, f.storage_path);
      toast({ title: "File deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const addNote = async () => {
    if (!noteBody.trim()) return;
    const { error } = await supabase.from("shared_notes").insert({
      author: me, body: noteBody.trim(), task_id: activeTaskId,
    });
    if (error) { toast({ title: "Note failed", description: error.message, variant: "destructive" }); return; }
    setNoteBody("");
    load();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      await uploadFile(file, me, activeTaskId);
      toast({ title: "Uploaded", description: file.name });
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  // ---------- Renderers ----------
  const TaskCard: React.FC<{ task: SharedTask; compact?: boolean }> = ({ task, compact }) => {
    const overdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== "done";
    const prioColor =
      task.priority === "urgent" ? "bg-red-500/15 text-red-400 border-red-500/30" :
      task.priority === "high" ? "bg-amber/15 text-amber border-amber/30" :
      task.priority === "low" ? "bg-muted text-muted-foreground" :
      "bg-secondary text-foreground/80";
    return (
      <div className={`p-3 rounded-lg border ${task.status === "done" ? "opacity-60 border-border/50" : "border-border"} bg-card/50 hover:bg-card transition-colors`}>
        <div className="flex items-start gap-2">
          <button
            onClick={() => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${task.status === "done" ? "bg-amber border-amber" : "border-muted-foreground hover:border-amber"}`}
            title={task.status === "done" ? "Mark not done" : "Mark complete"}
          >
            {task.status === "done" && <Check className="w-3 h-3 text-background" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm ${task.status === "done" ? "line-through" : ""}`}>{task.title}</div>
            {!compact && task.description && (
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge variant="outline" className={`text-[10px] ${prioColor}`}>{task.priority}</Badge>
              <Badge variant="outline" className="text-[10px]">
                <UserIcon className="w-2.5 h-2.5 mr-1" />{personLabel(task.assignee).split(" ")[0]}
              </Badge>
              {task.due_at && (
                <Badge variant="outline" className={`text-[10px] ${overdue ? "bg-red-500/15 text-red-400 border-red-500/30" : ""}`}>
                  <Clock className="w-2.5 h-2.5 mr-1" />{new Date(task.due_at).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditTask(task)} title="Edit">
              <Pencil className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setActiveTaskId(task.id)} title="Notes & files">
              <MessageSquare className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTask(task.id)} title="Delete">
              <Trash2 className="w-3 h-3 text-red-400" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const KanbanView = () => {
    const cols: { key: TaskBucket; label: string }[] = [
      { key: "today", label: "Today" }, { key: "week", label: "This Week" }, { key: "later", label: "Later" },
    ];
    return (
      <div className="grid md:grid-cols-3 gap-4">
        {cols.map(c => (
          <div key={c.key} className="bg-secondary/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm font-display">{c.label}</h4>
              <Badge variant="outline" className="text-[10px]">
                {tasks.filter(t => t.bucket === c.key && t.status !== "done").length}
              </Badge>
            </div>
            <div className="space-y-2">
              {tasks.filter(t => t.bucket === c.key).map(t => <TaskCard key={t.id} task={t} compact />)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const CalendarView = () => {
    const start = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const days = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const startDay = start.getDay();
    const today = new Date();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
    const tasksOn = (date: Date) => tasks.filter(t => t.due_at && new Date(t.due_at).toDateString() === date.toDateString());
    const goPrev = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
    const goNext = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));
    const goToday = () => setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold">{calMonth.toLocaleString("default", { month: "long", year: "numeric" })}</h4>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={goPrev}>‹</Button>
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            <Button variant="outline" size="sm" onClick={goNext}>›</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-muted-foreground font-medium py-1">{d}</div>
          ))}
          {cells.map((d, i) => (
            <button
              key={i}
              type="button"
              disabled={!d}
              onClick={() => d && setSelectedDay(d)}
              className={`text-left min-h-[72px] p-1 rounded border transition-colors ${d ? "border-border bg-card/30 hover:bg-card hover:border-amber/50 cursor-pointer" : "border-transparent cursor-default"}`}
            >
              {d && (
                <>
                  <div className={`text-[10px] font-mono ${d.toDateString() === today.toDateString() ? "text-amber font-bold" : "text-muted-foreground"}`}>{d.getDate()}</div>
                  {tasksOn(d).slice(0, 3).map(t => (
                    <div key={t.id} className={`text-[10px] truncate px-1 rounded mt-0.5 ${t.status === "done" ? "bg-muted text-muted-foreground line-through" : "bg-amber/15 text-amber"}`} title={t.title}>{t.title}</div>
                  ))}
                  {tasksOn(d).length > 3 && <div className="text-[9px] text-muted-foreground">+{tasksOn(d).length - 3}</div>}
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const TimelineView = () => {
    const dated = tasks.filter(t => t.due_at).sort((a, b) => +new Date(a.due_at!) - +new Date(b.due_at!));
    if (dated.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No tasks with due dates yet.</p>;
    const min = +new Date(dated[0].due_at!);
    const max = +new Date(dated[dated.length - 1].due_at!);
    const range = Math.max(max - min, 1);
    return (
      <div className="space-y-2">
        {dated.map(t => {
          const pct = ((+new Date(t.due_at!) - min) / range) * 100;
          return (
            <div key={t.id} className="relative">
              <div className="flex items-center gap-3">
                <div className="w-32 text-xs text-muted-foreground font-mono shrink-0">
                  {new Date(t.due_at!).toLocaleDateString()}
                </div>
                <div className="flex-1 relative h-8 bg-secondary/30 rounded">
                  <div
                    className={`absolute top-1 bottom-1 px-2 rounded text-xs flex items-center ${
                      t.assignee === me ? "bg-amber/20 text-amber" : "bg-primary/20 text-primary"
                    }`}
                    style={{ left: `${pct}%`, minWidth: 120, maxWidth: "60%" }}
                  >
                    <span className="truncate">{t.title}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const FilterView = () => (
    <div className="space-y-2">
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nothing here yet.</p>
      ) : (
        filtered.map(t => <TaskCard key={t.id} task={t} />)
      )}
    </div>
  );

  const activeTask = tasks.find(t => t.id === activeTaskId) || null;
  const taskNotes = activeTask ? notes.filter(n => n.task_id === activeTask.id) : notes.filter(n => !n.task_id).slice(0, 20);
  const taskFiles = activeTask ? files.filter(f => f.task_id === activeTask.id) : files.slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-display flex items-center gap-2">
              <Layout className="w-5 h-5 text-amber" /> Shared Workspace
              <span className="text-xs font-normal text-muted-foreground ml-2">{personLabel(me)} ↔ {personLabel(them)}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
              <Select value={view} onValueChange={(v) => setView(v as ViewKind)}>
                <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VIEW_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Quick add */}
          <div className="flex flex-wrap gap-2 items-end p-3 rounded-lg bg-secondary/30">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">New task</Label>
              <Input value={newTask.title} onChange={e => setNewTask(s => ({ ...s, title: e.target.value }))}
                placeholder="What needs to get done?" />
            </div>
            <div>
              <Label className="text-xs">Assign to</Label>
              <Select value={newTask.assignee} onValueChange={v => setNewTask(s => ({ ...s, assignee: v as Person }))}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERSONS.map(p => <SelectItem key={p} value={p}>{personLabel(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={newTask.priority} onValueChange={v => setNewTask(s => ({ ...s, priority: v as TaskPriority }))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["low", "normal", "high", "urgent"] as TaskPriority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Bucket</Label>
              <Select value={newTask.bucket} onValueChange={v => setNewTask(s => ({ ...s, bucket: v as TaskBucket }))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="later">Later</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Due</Label>
              <Input type="datetime-local" value={newTask.due_at} onChange={e => setNewTask(s => ({ ...s, due_at: e.target.value }))} className="w-[200px]" />
            </div>
            <Button onClick={createTask} disabled={creating} className="bg-amber text-background hover:bg-amber/90">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          {/* Filter chips for filter view */}
          {view === "filter" && (
            <div className="flex gap-2">
              {(["mine", "theirs", "shared"] as const).map(f => (
                <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
                  <Filter className="w-3 h-3 mr-1" />
                  {f === "mine" ? "My Tasks" : f === "theirs" ? `${personLabel(them)}'s Tasks` : "Shared (All)"}
                </Button>
              ))}
            </div>
          )}

          {/* Active view */}
          <div className="pt-2">
            {view === "filter" && <FilterView />}
            {view === "kanban" && <KanbanView />}
            {view === "calendar" && <CalendarView />}
            {view === "timeline" && <TimelineView />}
            {view === "interviews" && <InterviewsPanel me={me} />}
          </div>
        </CardContent>
      </Card>

      {/* Notes + Files panel */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber" /> Notes
              {activeTask && <Badge variant="outline" className="ml-2 text-[10px]">on: {activeTask.title}</Badge>}
              {activeTask && <Button variant="ghost" size="sm" onClick={() => setActiveTaskId(null)} className="ml-auto h-6 text-xs">Clear</Button>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} rows={2} placeholder="Quick note…" />
              <Button onClick={addNote} disabled={!noteBody.trim()}>Save</Button>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {taskNotes.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No notes yet.</p>}
              {taskNotes.map(n => {
                const isEditing = editNoteId === n.id;
                const mine = n.author === me;
                return (
                  <div key={n.id} className="p-2 rounded bg-secondary/30 text-xs group">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px]">{personLabel(n.author).split(" ")[0]}</Badge>
                      <span className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                      {mine && !isEditing && (
                        <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => startEditNote(n)} title="Edit">
                            <Pencil className="w-2.5 h-2.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteNote(n.id)} title="Delete">
                            <Trash2 className="w-2.5 h-2.5 text-red-400" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-1">
                        <Textarea value={editNoteBody} onChange={e => setEditNoteBody(e.target.value)} rows={2} className="text-xs" />
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditNoteId(null); setEditNoteBody(""); }}>
                            <XIcon className="w-3 h-3 mr-1" />Cancel
                          </Button>
                          <Button size="sm" className="h-6 text-xs bg-amber text-background hover:bg-amber/90" onClick={saveEditNote}>
                            <SaveIcon className="w-3 h-3 mr-1" />Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{n.body}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-amber" /> Files
              {activeTask && <Badge variant="outline" className="ml-2 text-[10px]">on: {activeTask.title}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 items-center">
              <input ref={fileRef} type="file" onChange={handleFile} className="text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {taskFiles.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center col-span-2">No files yet.</p>}
              {taskFiles.map(f => {
                const isImage = (f.mime_type || "").startsWith("image/");
                const url = fileUrl(f.storage_path);
                return (
                  <div key={f.id} className="rounded border border-border/50 bg-secondary/30 overflow-hidden flex flex-col">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(f)}
                      className="aspect-video bg-background/50 flex items-center justify-center hover:bg-amber/10 transition-colors"
                    >
                      {isImage ? (
                        <img src={url} alt={f.filename} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <FileText className="w-8 h-8 text-amber" />
                      )}
                    </button>
                    <div className="p-2 text-xs flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{f.filename}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {personLabel(f.uploader).split(" ")[0]} · {new Date(f.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <a href={url} target="_blank" rel="noopener noreferrer" download={f.filename}>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="w-3 h-3" /></Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteFile(f)} title="Delete">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(o) => { if (!o) { setSelectedDay(null); setDayNewTitle(""); setDayNote(""); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber" />
              {selectedDay?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          {selectedDay && (() => {
            const dayTasks = tasks.filter(t => t.due_at && new Date(t.due_at).toDateString() === selectedDay.toDateString());
            const dayNotes = notes.filter(n => {
              if (n.task_id) {
                const lt = tasks.find(t => t.id === n.task_id);
                return lt?.due_at && new Date(lt.due_at).toDateString() === selectedDay.toDateString();
              }
              return new Date(n.created_at).toDateString() === selectedDay.toDateString();
            });
            const moveTask = async (id: string, dir: -1 | 1) => {
              const t = tasks.find(x => x.id === id); if (!t) return;
              const cur = t.due_at ? new Date(t.due_at) : new Date(selectedDay);
              cur.setDate(cur.getDate() + dir);
              await updateTask(id, { due_at: cur.toISOString() });
            };
            const addDayTask = async () => {
              if (!dayNewTitle.trim()) return;
              const [hh, mm] = (dayNewTime || "09:00").split(":").map(Number);
              const dt = new Date(selectedDay); dt.setHours(hh || 9, mm || 0, 0, 0);
              const { error } = await supabase.from("shared_tasks").insert({
                title: dayNewTitle.trim(), owner: me, assignee: me,
                priority: "normal", bucket: "today", due_at: dt.toISOString(),
              });
              if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
              setDayNewTitle(""); load();
            };
            const addDayNote = async () => {
              if (!dayNote.trim()) return;
              const { error } = await supabase.from("shared_notes").insert({ author: me, body: `[${selectedDay.toLocaleDateString()}] ${dayNote.trim()}`, task_id: null });
              if (error) { toast({ title: "Note failed", description: error.message, variant: "destructive" }); return; }
              setDayNote(""); load();
            };
            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tasks ({dayTasks.length})</div>
                  {dayTasks.length === 0 && <p className="text-xs text-muted-foreground italic">No tasks scheduled.</p>}
                  {dayTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-2 rounded border border-border bg-card/40">
                      <button onClick={() => updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.status === "done" ? "bg-amber border-amber" : "border-muted-foreground"}`}>
                        {t.status === "done" && <Check className="w-2.5 h-2.5 text-background" />}
                      </button>
                      <Input value={t.title} onChange={e => updateTask(t.id, { title: e.target.value })} className="h-7 text-xs flex-1" />
                      <Select value={t.assignee} onValueChange={v => updateTask(t.id, { assignee: v as Person })}>
                        <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{PERSONS.map(p => <SelectItem key={p} value={p}>{personLabel(p).split(" ")[0]}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Move back 1 day" onClick={() => moveTask(t.id, -1)}>‹</Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Move forward 1 day" onClick={() => moveTask(t.id, 1)}>›</Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTask(t.id)}>
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 items-center pt-1">
                    <Input value={dayNewTitle} onChange={e => setDayNewTitle(e.target.value)} placeholder="Add task on this day…" className="h-8 text-xs" />
                    <Input type="time" value={dayNewTime} onChange={e => setDayNewTime(e.target.value)} className="h-8 w-[110px] text-xs" />
                    <Button size="sm" onClick={addDayTask} className="bg-amber text-background hover:bg-amber/90 h-8">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</div>
                  <div className="flex gap-2">
                    <Textarea value={dayNote} onChange={e => setDayNote(e.target.value)} rows={2} placeholder="Note for this day…" className="text-xs" />
                    <Button onClick={addDayNote} disabled={!dayNote.trim()}>Save</Button>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {dayNotes.length === 0 && <p className="text-xs text-muted-foreground italic">No notes for this day.</p>}
                    {dayNotes.map(n => (
                      <div key={n.id} className="p-2 rounded bg-secondary/30 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[9px]">{personLabel(n.author).split(" ")[0]}</Badge>
                          <span className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit task dialog */}
      <Dialog open={!!editTaskId} onOpenChange={(o) => { if (!o) { setEditTaskId(null); setEditTaskDraft({}); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber" /> Edit task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={editTaskDraft.title || ""} onChange={e => setEditTaskDraft(s => ({ ...s, title: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={editTaskDraft.description || ""} onChange={e => setEditTaskDraft(s => ({ ...s, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Assignee</Label>
                <Select value={editTaskDraft.assignee as string} onValueChange={v => setEditTaskDraft(s => ({ ...s, assignee: v as Person }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERSONS.map(p => <SelectItem key={p} value={p}>{personLabel(p)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={editTaskDraft.status as string} onValueChange={v => setEditTaskDraft(s => ({ ...s, status: v as TaskStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="doing">Doing</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={editTaskDraft.priority as string} onValueChange={v => setEditTaskDraft(s => ({ ...s, priority: v as TaskPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["low","normal","high","urgent"] as TaskPriority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Bucket</Label>
                <Select value={editTaskDraft.bucket as string} onValueChange={v => setEditTaskDraft(s => ({ ...s, bucket: v as TaskBucket }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="later">Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Due</Label>
              <Input
                type="datetime-local"
                value={editTaskDraft.due_at ? new Date(editTaskDraft.due_at).toISOString().slice(0,16) : ""}
                onChange={e => setEditTaskDraft(s => ({ ...s, due_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" className="text-red-400" onClick={() => { if (editTaskId) { deleteTask(editTaskId); setEditTaskId(null); } }}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setEditTaskId(null); setEditTaskDraft({}); }}>Cancel</Button>
                <Button className="bg-amber text-background hover:bg-amber/90" onClick={saveEditTask}>
                  <SaveIcon className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-amber" /> {previewFile?.filename}
            </DialogTitle>
          </DialogHeader>
          {previewFile && (() => {
            const url = fileUrl(previewFile.storage_path);
            const mime = previewFile.mime_type || "";
            const ext = previewFile.filename.split(".").pop()?.toLowerCase() || "";
            const isImage = mime.startsWith("image/") || ["png","jpg","jpeg","gif","webp","svg"].includes(ext);
            const isPdf = mime === "application/pdf" || ext === "pdf";
            const isVideo = mime.startsWith("video/");
            const isAudio = mime.startsWith("audio/");
            const isText = mime.startsWith("text/") || ["txt","md","csv","json","log"].includes(ext);
            return (
              <div className="space-y-3">
                <div className="rounded border border-border/50 bg-background/50 overflow-hidden flex items-center justify-center min-h-[300px]">
                  {isImage ? (
                    <img src={url} alt={previewFile.filename} className="max-w-full max-h-[70vh] object-contain" />
                  ) : isPdf ? (
                    <iframe src={url} className="w-full h-[70vh]" title={previewFile.filename} />
                  ) : isVideo ? (
                    <video src={url} controls className="max-w-full max-h-[70vh]" />
                  ) : isAudio ? (
                    <audio src={url} controls className="w-full" />
                  ) : isText ? (
                    <iframe src={url} className="w-full h-[70vh] bg-background" title={previewFile.filename} />
                  ) : (
                    <div className="p-12 text-center text-muted-foreground text-sm">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-amber" />
                      Preview not available for this file type.
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {personLabel(previewFile.uploader)} · {new Date(previewFile.created_at).toLocaleString()}
                    {previewFile.size_bytes ? ` · ${(previewFile.size_bytes / 1024).toFixed(0)} KB` : ""}
                  </span>
                  <a href={url} target="_blank" rel="noopener noreferrer" download={previewFile.filename}>
                    <Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" /> Download</Button>
                  </a>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SharedWorkspace;
