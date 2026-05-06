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
} from "lucide-react";
import {
  PERSONS, Person, personLabel, SharedTask, SharedNote, SharedFile,
  TaskStatus, TaskPriority, TaskBucket, fileUrl, uploadFile,
} from "@/lib/sharedWorkspace";

type ViewKind = "filter" | "kanban" | "calendar" | "timeline";
const VIEW_LABELS: Record<ViewKind, string> = {
  filter: "My / Their / Shared",
  kanban: "Kanban",
  calendar: "Calendar",
  timeline: "Timeline",
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "", description: "", assignee: me as Person, priority: "normal" as TaskPriority,
    bucket: "today" as TaskBucket, due_at: "",
  });
  const [noteBody, setNoteBody] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const them: Person = me === "admin" ? "bradon" : "admin";

  useEffect(() => { localStorage.setItem("ws.view", view); }, [view]);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, n, f] = await Promise.all([
      supabase.from("shared_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("shared_notes").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("shared_files").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (t.data) setTasks(t.data as SharedTask[]);
    if (n.data) setNotes(n.data as SharedNote[]);
    if (f.data) setFiles(f.data as SharedFile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("shared-workspace")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_notes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_files" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // Push unread count to bell
  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("shared_notifications").select("id", { head: true, count: "exact" })
        .eq("recipient", me).is("read_at", null);
      onUnreadChange?.(count || 0);
    };
    fetchUnread();
    const ch = supabase.channel("shared-notifs-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_notifications" }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
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
    const { error } = await supabase.from("shared_tasks").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setActiveTaskId(task.id)} title="Open">
              <MessageSquare className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTask(task.id)}>
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
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const startDay = start.getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(today.getFullYear(), today.getMonth(), d));
    const tasksOn = (date: Date) => tasks.filter(t => t.due_at && new Date(t.due_at).toDateString() === date.toDateString());
    return (
      <div>
        <h4 className="font-display font-semibold mb-3">{today.toLocaleString("default", { month: "long", year: "numeric" })}</h4>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-muted-foreground font-medium py-1">{d}</div>
          ))}
          {cells.map((d, i) => (
            <div key={i} className={`min-h-[72px] p-1 rounded border ${d ? "border-border bg-card/30" : "border-transparent"}`}>
              {d && (
                <>
                  <div className={`text-[10px] font-mono ${d.toDateString() === today.toDateString() ? "text-amber font-bold" : "text-muted-foreground"}`}>{d.getDate()}</div>
                  {tasksOn(d).slice(0, 3).map(t => (
                    <div key={t.id} className="text-[10px] truncate px-1 rounded bg-amber/15 text-amber mt-0.5" title={t.title}>{t.title}</div>
                  ))}
                  {tasksOn(d).length > 3 && <div className="text-[9px] text-muted-foreground">+{tasksOn(d).length - 3}</div>}
                </>
              )}
            </div>
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
              {taskNotes.map(n => (
                <div key={n.id} className="p-2 rounded bg-secondary/30 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px]">{personLabel(n.author).split(" ")[0]}</Badge>
                    <span className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                </div>
              ))}
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
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {taskFiles.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No files yet.</p>}
              {taskFiles.map(f => (
                <div key={f.id} className="flex items-center gap-2 p-2 rounded bg-secondary/30 text-xs">
                  <FileText className="w-3 h-3 text-amber shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{f.filename}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {personLabel(f.uploader).split(" ")[0]} · {new Date(f.created_at).toLocaleDateString()}
                      {f.size_bytes && ` · ${(f.size_bytes / 1024).toFixed(0)} KB`}
                    </div>
                  </div>
                  <a href={fileUrl(f.storage_path)} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="w-3 h-3" /></Button>
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SharedWorkspace;
