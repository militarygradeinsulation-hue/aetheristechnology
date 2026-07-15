import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CalendarDays, Plus, Loader2, Trash2, Pin, PinOff, Save, Sparkles,
  Paperclip, X, Wand2, Crown, ShieldCheck, TrendingUp, Users, ChevronDown, CheckCircle2, Circle, CircleDashed,
} from "lucide-react";
import {
  listCompanyCalendar, upsertCompanyEntry, deleteCompanyEntry, aiPlanCompany,
  aiPlaybook, bulkCreateEntries, markCompanyEntryStatus,
  KIND_META, COMPANY_CAL_BUCKET, CATEGORY_META, categoryOf, entryDisplay, categoryToColorToken,
  OWNER_META, OWNER_ROLES,
  type CompanyCalendarEntry, type CompanyCalendarKind, type CompanyCalendarAttachment,
  type CompanyCalendarCategory, type OwnerRole, type TaskStatus, type PlaybookTask,
} from "@/lib/companyCalendar";
import { listLeadershipRoles, type LeadershipRole } from "@/lib/leadershipRoles";
import { supabase } from "@/integrations/supabase/client";
import { CompanyCalendarRepView } from "@/components/portal/CompanyCalendarRepView";

const KINDS: CompanyCalendarKind[] = ["goal", "vertical", "topic", "event", "push", "note"];
const CATEGORIES = Object.keys(CATEGORY_META) as CompanyCalendarCategory[];
const todayISO = () => new Date().toISOString().slice(0, 10);
const ROLE_ICONS: Record<OwnerRole, React.ComponentType<{ className?: string }>> = {
  founder: Crown, coo: ShieldCheck, chief_sales: TrendingUp, team: Users,
};

interface DraftEntry {
  id?: string;
  date: string;
  kind: CompanyCalendarKind;
  category: CompanyCalendarCategory;
  title: string;
  body: string;
  pinned: boolean;
  attachments: CompanyCalendarAttachment[];
  ai_plan?: CompanyCalendarEntry["ai_plan"];
  owner_role: OwnerRole;
  owner_name: string;
  status: TaskStatus;
  due_time: string;
}

const emptyDraft = (): DraftEntry => ({
  date: todayISO(), kind: "goal", category: "manual", title: "", body: "", pinned: false, attachments: [], ai_plan: {},
  owner_role: "team", owner_name: OWNER_META.team.short, status: "todo", due_time: "",
});

export const AdminCompanyCalendarPanel: React.FC = () => {
  const [entries, setEntries] = useState<CompanyCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDraft, setOpenDraft] = useState<DraftEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // AI panel state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  // Leadership + filter state
  const [roles, setRoles] = useState<LeadershipRole[]>([]);
  const [filter, setFilter] = useState<OwnerRole | "all">("all");
  const [showLeadership, setShowLeadership] = useState(true);

  // Playbook generator
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [playbookGoal, setPlaybookGoal] = useState("");
  const [playbookWeekStart, setPlaybookWeekStart] = useState(todayISO());
  const [playbookDays, setPlaybookDays] = useState(7);
  const [playbookTasks, setPlaybookTasks] = useState<PlaybookTask[] | null>(null);
  const [playbookBusy, setPlaybookBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, r] = await Promise.all([
        listCompanyCalendar({}),
        listLeadershipRoles().catch(() => [] as LeadershipRole[]),
      ]);
      setEntries(list);
      setRoles(r);
    } catch (e: any) {
      toast.error("Failed to load calendar", { description: e.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(
    () => filter === "all" ? entries : entries.filter(e => (e.owner_role || "team") === filter),
    [entries, filter],
  );

  const counts = useMemo(() => {
    const c: Record<OwnerRole, number> = { founder: 0, coo: 0, chief_sales: 0, team: 0 };
    for (const e of entries) c[(e.owner_role || "team") as OwnerRole]++;
    return c;
  }, [entries]);

  const grouped = useMemo(() => {
    const m = new Map<string, CompanyCalendarEntry[]>();
    for (const e of filtered) {
      const k = e.date;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const openNew = () => setOpenDraft(emptyDraft());
  const openEdit = (e: CompanyCalendarEntry) => setOpenDraft({
    id: e.id, date: e.date, kind: e.kind, category: categoryOf(e) || "manual",
    title: e.title, body: e.body,
    pinned: e.pinned, attachments: e.attachments || [], ai_plan: e.ai_plan || {},
    owner_role: e.owner_role || "team",
    owner_name: e.owner_name || OWNER_META[e.owner_role || "team"].short,
    status: e.status || "todo",
    due_time: e.due_time ? e.due_time.slice(0, 5) : "",
  });

  const save = async () => {
    if (!openDraft) return;
    if (!openDraft.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      const { category, due_time, owner_role, owner_name, ...rest } = openDraft;
      const saved = await upsertCompanyEntry({
        ...(rest as Partial<CompanyCalendarEntry>),
        owner_role,
        owner_name: owner_name || OWNER_META[owner_role].short,
        due_time: due_time ? due_time : null,
        color: categoryToColorToken(category),
      });
      setEntries(prev => {
        const others = prev.filter(p => p.id !== saved.id);
        return [...others, saved].sort((a, b) => a.date.localeCompare(b.date));
      });
      toast.success("Saved");
      setOpenDraft(null);
    } catch (e: any) { toast.error("Save failed", { description: e.message }); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry? Reps will no longer see it.")) return;
    try {
      await deleteCompanyEntry(id);
      setEntries(prev => prev.filter(p => p.id !== id));
      toast.success("Deleted");
    } catch (e: any) { toast.error("Delete failed", { description: e.message }); }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !openDraft) return;
    setUploading(true);
    const next = [...openDraft.attachments];
    try {
      for (const f of Array.from(files)) {
        if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} too large (max 20MB)`); continue; }
        const ext = f.name.split(".").pop() || "bin";
        const path = `company-calendar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(COMPANY_CAL_BUCKET).upload(path, f, {
          contentType: f.type || undefined, upsert: false,
        });
        if (error) { toast.error(`Upload failed: ${f.name}`, { description: error.message }); continue; }
        const { data: pub } = supabase.storage.from(COMPANY_CAL_BUCKET).getPublicUrl(path);
        next.push({ name: f.name, url: pub.publicUrl, path, size: f.size, type: f.type || "application/octet-stream" });
      }
      setOpenDraft({ ...openDraft, attachments: next });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAttachment = async (idx: number) => {
    if (!openDraft) return;
    const att = openDraft.attachments[idx];
    if (!att) return;
    setOpenDraft({ ...openDraft, attachments: openDraft.attachments.filter((_, i) => i !== idx) });
    try { if (att.path) await supabase.storage.from(COMPANY_CAL_BUCKET).remove([att.path]); } catch { /* ignore */ }
  };

  const runAI = async () => {
    if (!aiPrompt.trim() || !openDraft) return;
    setAiBusy(true);
    try {
      const plan = await aiPlanCompany(aiPrompt, `${openDraft.kind} for ${openDraft.date}: ${openDraft.title}`);
      const tacticsBlock = plan.tactics?.length ? `\n\nTactics:\n${plan.tactics.map(t => `• ${t}`).join("\n")}` : "";
      const kpiBlock = plan.kpis?.length ? `\n\nKPIs:\n${plan.kpis.map(k => `• ${k}`).join("\n")}` : "";
      setOpenDraft({
        ...openDraft,
        title: openDraft.title || plan.title || aiPrompt.slice(0, 80),
        kind: (plan.kind && KINDS.includes(plan.kind)) ? plan.kind : openDraft.kind,
        date: plan.suggested_date || openDraft.date,
        body: `${plan.summary || ""}${tacticsBlock}${kpiBlock}`.trim(),
        ai_plan: { summary: plan.summary, tactics: plan.tactics, kpis: plan.kpis, generated_at: new Date().toISOString(), raw: plan.raw },
      });
      setAiPrompt("");
      toast.success("AI plan added, review & save");
    } catch (e: any) { toast.error("AI failed", { description: e.message }); }
    finally { setAiBusy(false); }
  };

  const generatePlaybook = async () => {
    if (!playbookGoal.trim() || !playbookWeekStart) { toast.error("Goal and week start required"); return; }
    setPlaybookBusy(true);
    setPlaybookTasks(null);
    try {
      const tasks = await aiPlaybook(playbookGoal, playbookWeekStart, playbookDays);
      if (!tasks.length) { toast.error("AI returned no tasks. Try a more concrete goal."); return; }
      setPlaybookTasks(tasks);
    } catch (e: any) { toast.error("Playbook failed", { description: e.message }); }
    finally { setPlaybookBusy(false); }
  };

  const savePlaybook = async () => {
    if (!playbookTasks) return;
    setPlaybookBusy(true);
    try {
      const rows = playbookTasks.map(t => ({
        date: t.date,
        title: t.title.slice(0, 200),
        body: t.body || "",
        kind: t.kind || "goal",
        owner_role: t.owner_role,
        owner_name: t.owner_name || OWNER_META[t.owner_role].short,
        due_time: t.due_time || null,
        color: categoryToColorToken("manual"),
      }));
      const saved = await bulkCreateEntries(rows);
      setEntries(prev => [...prev, ...saved].sort((a, b) => a.date.localeCompare(b.date)));
      toast.success(`Saved ${saved.length} playbook tasks`);
      setPlaybookOpen(false);
      setPlaybookTasks(null);
      setPlaybookGoal("");
    } catch (e: any) { toast.error("Save failed", { description: e.message }); }
    finally { setPlaybookBusy(false); }
  };

  const toggleStatus = async (entry: CompanyCalendarEntry) => {
    const next: TaskStatus = entry.status === "todo" ? "doing" : entry.status === "doing" ? "done" : "todo";
    try {
      const updated = await markCompanyEntryStatus(entry.id, next);
      setEntries(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (e: any) { toast.error("Status update failed", { description: e.message }); }
  };

  const StatusIcon = ({ s }: { s: TaskStatus }) => {
    if (s === "done") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (s === "doing") return <CircleDashed className="w-4 h-4 text-amber animate-spin-slow" />;
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="font-display flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber" /> Company Calendar
          </CardTitle>
          <Button onClick={openNew} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add entry
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            What you put here is shown to <strong>every rep</strong> in their portal under "Company Calendar".
            Use it for daily goals, vertical focuses, topics to post, sales pushes, and team events.
            Use the <strong>AI planner</strong> inside any entry to draft tactics/KPIs in seconds.
          </p>
        </CardContent>
      </Card>

      {/* Full visual calendar (month/week/list), same view reps see */}
      <CompanyCalendarRepView />

      {/* Admin list with edit/delete controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All entries, click to edit
          </CardTitle>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="glass p-12 rounded-xl text-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber mx-auto" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <p className="text-muted-foreground text-sm">No entries yet. Click "Add entry" to plan the team's week.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, list]) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-amber">
                  {new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map(e => {
                  const meta = entryDisplay(e);
                  return (
                    <button
                      key={e.id}
                      onClick={() => openEdit(e)}
                      className={`w-full text-left rounded-md border p-3 transition-colors hover:border-primary ${meta.color}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span>{meta.icon}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{meta.label}</Badge>
                            {e.pinned && <Pin className="w-3 h-3" />}
                            {e.attachments?.length > 0 && (
                              <span className="text-[10px] flex items-center gap-0.5 opacity-70">
                                <Paperclip className="w-3 h-3" />{e.attachments.length}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold mt-1 text-foreground">{e.title}</p>
                          {e.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{e.body}</p>}
                        </div>
                        <button onClick={(ev) => { ev.stopPropagation(); remove(e.id); }}
                                className="text-muted-foreground hover:text-crimson p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor */}
      <Dialog open={!!openDraft} onOpenChange={(o) => !o && setOpenDraft(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber" />
              {openDraft?.id ? "Edit entry" : "New entry"}
            </DialogTitle>
          </DialogHeader>
          {openDraft && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={openDraft.date}
                         onChange={e => setOpenDraft({ ...openDraft, date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-2">
                    Category (color)
                    <span className={`inline-block w-3 h-3 rounded ${CATEGORY_META[openDraft.category].swatch}`} />
                  </Label>
                  <select value={openDraft.category}
                          onChange={e => setOpenDraft({ ...openDraft, category: e.target.value as CompanyCalendarCategory })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].icon} {CATEGORY_META[c].label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Kind (semantic)</Label>
                  <select value={openDraft.kind}
                          onChange={e => setOpenDraft({ ...openDraft, kind: e.target.value as CompanyCalendarKind })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {KINDS.map(k => <option key={k} value={k}>{KIND_META[k].icon} {KIND_META[k].label}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" size="sm" type="button"
                          onClick={() => setOpenDraft({ ...openDraft, pinned: !openDraft.pinned })}
                          className="w-full">
                    {openDraft.pinned ? <PinOff className="w-4 h-4 mr-1 text-amber" /> : <Pin className="w-4 h-4 mr-1" />}
                    {openDraft.pinned ? "Unpin" : "Pin to top"}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={openDraft.title}
                       onChange={e => setOpenDraft({ ...openDraft, title: e.target.value })}
                       placeholder="e.g. Hit 10 dental scrapes by EOD" />
              </div>
              <div>
                <Label className="text-xs">Body / details</Label>
                <Textarea rows={6} value={openDraft.body}
                          onChange={e => setOpenDraft({ ...openDraft, body: e.target.value })}
                          placeholder="Tactics, talking points, KPIs…" />
              </div>

              {/* AI Planner */}
              <div className="rounded-md border border-amber/30 bg-amber/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber text-xs font-mono uppercase">
                  <Sparkles className="w-3 h-3" /> AI Tactics Planner
                </div>
                <p className="text-xs text-muted-foreground">
                  Tell the AI what you want the team to do, it'll draft tactics + KPIs into the body field.
                </p>
                <div className="flex gap-2">
                  <Input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                         onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void runAI(); } }}
                         placeholder='e.g. "Plan tomorrow: focus dental + med spas, push the $2,500 Diagnostic"'
                         disabled={aiBusy} />
                  <Button type="button" onClick={runAI} disabled={aiBusy || !aiPrompt.trim()}>
                    {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Attachments ({openDraft.attachments.length})
                  </Label>
                  <input ref={fileRef} type="file" multiple className="hidden"
                         onChange={e => handleFiles(e.target.files)} />
                  <Button type="button" variant="outline" size="sm"
                          onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                    Upload
                  </Button>
                </div>
                {openDraft.attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {openDraft.attachments.map((a, i) => (
                      <div key={i} className="border border-border rounded-md p-2 text-xs flex items-center gap-2 bg-background/30">
                        <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <a href={a.url} target="_blank" rel="noopener noreferrer"
                           className="truncate text-amber hover:underline flex-1" title={a.name}>{a.name}</a>
                        <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-crimson">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="ghost" onClick={() => setOpenDraft(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Save entry
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompanyCalendarPanel;
