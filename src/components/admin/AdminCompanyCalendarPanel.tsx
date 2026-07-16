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
  MessageSquare, Send, Eraser,
} from "lucide-react";
import {
  listCompanyCalendar, upsertCompanyEntry, deleteCompanyEntry, aiPlanCompany,
  aiPlaybook, bulkCreateEntries, markCompanyEntryStatus,
  KIND_META, COMPANY_CAL_BUCKET, CATEGORY_META, categoryOf, entryDisplay, categoryToColorToken,
  OWNER_META, OWNER_ROLES,
  getCalendarChat, clearCalendarChat, aiCalendarChat, deleteAllCompanyEntries,
  type CompanyCalendarEntry, type CompanyCalendarKind, type CompanyCalendarAttachment,
  type CompanyCalendarCategory, type OwnerRole, type TaskStatus, type PlaybookTask,
  type CalendarChatMessage,
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

  // Chat box
  const [chatMessages, setChatMessages] = useState<CalendarChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, r, msgs] = await Promise.all([
        listCompanyCalendar({}),
        listLeadershipRoles().catch(() => [] as LeadershipRole[]),
        getCalendarChat().catch(() => [] as CalendarChatMessage[]),
      ]);
      setEntries(list);
      setRoles(r);
      setChatMessages(msgs);
    } catch (e: any) {
      toast.error("Failed to load calendar", { description: e.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatBusy) return;
    setChatBusy(true);
    setChatMessages(prev => [...prev, { role: "user", content: msg, ts: new Date().toISOString() }]);
    setChatInput("");
    try {
      const res = await aiCalendarChat(msg);
      setChatMessages(res.messages);
      // Refresh calendar entries after mutations
      const list = await listCompanyCalendar({});
      setEntries(list);
      const bits: string[] = [];
      if (res.deletedAll) bits.push("cleared calendar");
      if (res.added.length) bits.push(`+${res.added.length} added`);
      if (res.deletedIds.length && !res.deletedAll) bits.push(`-${res.deletedIds.length} removed`);
      if (bits.length) toast.success(bits.join(" · "));
    } catch (e: any) {
      toast.error("Chat failed", { description: e.message });
      setChatMessages(prev => prev.slice(0, -1));
    } finally { setChatBusy(false); }
  };

  const wipeChat = async () => {
    if (!confirm("Clear chat history? (Calendar entries stay)")) return;
    try { const msgs = await clearCalendarChat(); setChatMessages(msgs); }
    catch (e: any) { toast.error("Failed", { description: e.message }); }
  };

  const wipeCalendar = async () => {
    if (!confirm("Delete ALL calendar entries? This cannot be undone.")) return;
    try {
      await deleteAllCompanyEntries();
      setEntries([]);
      toast.success("Calendar cleared");
    } catch (e: any) { toast.error("Failed", { description: e.message }); }
  };


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
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="font-display flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber" /> Leadership Calendar
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setPlaybookOpen(true)} size="sm" variant="outline" className="border-amber/40 text-amber hover:bg-amber/10">
              <Sparkles className="w-4 h-4 mr-1" /> Generate week playbook
            </Button>
            <Button onClick={openNew} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add task
            </Button>
            <Button onClick={wipeCalendar} size="sm" variant="outline" className="border-crimson/40 text-crimson hover:bg-crimson/10">
              <Trash2 className="w-4 h-4 mr-1" /> Clear all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Shared workspace for <strong>Joseph, Dean, and Braden</strong>. Three principals, clear lanes, one owner per task. Use the chat box below to
            add or remove tasks in bulk — it runs on your Cloud AI credits, not editor credits.
          </p>

          {/* Role filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === "all" ? "bg-foreground/10 border-foreground/40 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              All · {entries.length}
            </button>
            {OWNER_ROLES.map(r => {
              const m = OWNER_META[r];
              const Icon = ROLE_ICONS[r];
              const active = filter === r;
              return (
                <button
                  key={r}
                  onClick={() => setFilter(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    active ? m.badge : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.short} · {counts[r]}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Box — bulk add/remove via natural language, saved to backend */}
      <Card className="border-amber/30">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-amber flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Calendar Chat — tell it what to add or remove
          </CardTitle>
          {chatMessages.length > 0 && (
            <Button onClick={wipeChat} size="sm" variant="ghost" className="text-muted-foreground hover:text-crimson">
              <Eraser className="w-3.5 h-3.5 mr-1" /> Clear history
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-72 overflow-y-auto space-y-2 rounded-md bg-background/40 border border-border p-3 text-sm">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono">
                Try: "Add a founder task tomorrow at 9am: review Q3 roadmap" · "Clear Braden's Friday" · "Wipe the calendar" · "Give Dean 3 ops tasks this week"
              </p>
            ) : chatMessages.map((m, i) => (
              <div key={i} className={`rounded-md px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-amber/10 border border-amber/30 text-foreground" : "bg-muted/40 border border-border text-foreground/90"}`}>
                <div className="text-[10px] font-mono uppercase opacity-60 mb-1">{m.role === "user" ? "You" : "Chief of Staff"}</div>
                {m.content}
              </div>
            ))}
            {chatBusy && (
              <div className="rounded-md px-3 py-2 bg-muted/40 border border-border text-muted-foreground text-xs flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void sendChat(); } }}
              placeholder="Tell it what to change… (Cmd/Ctrl+Enter to send)"
              rows={2}
              className="resize-none"
              disabled={chatBusy}
            />
            <Button onClick={sendChat} disabled={chatBusy || !chatInput.trim()} className="self-end">
              {chatBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leadership Structure card */}
      <Card>
        <CardHeader className="pb-2">
          <button onClick={() => setShowLeadership(v => !v)} className="w-full flex items-center justify-between">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-amber flex items-center gap-2">
              <Crown className="w-4 h-4" /> Leadership Structure — Three lanes, no overlap
            </CardTitle>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showLeadership ? "rotate-180" : ""}`} />
          </button>
        </CardHeader>
        {showLeadership && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {roles.map(role => {
                const m = OWNER_META[role.role_slug];
                const Icon = ROLE_ICONS[role.role_slug];
                return (
                  <div key={role.id} className={`rounded-md border p-3 space-y-2 ${m.badge}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <div className="font-display font-semibold">{role.display_name}</div>
                    </div>
                    <div className="text-[10px] font-mono uppercase opacity-70">{role.title}</div>
                    <div>
                      <div className="text-[10px] font-mono uppercase opacity-70 mt-2 mb-1">Owns</div>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        {role.owns.slice(0, 4).map((o, i) => <li key={i} className="text-foreground/90">{o}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase opacity-70 mt-2 mb-1">Decides</div>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        {role.decision_authority.slice(0, 3).map((o, i) => <li key={i} className="text-foreground/90">{o}</li>)}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 font-mono">
              Standing principle: each person owns their lane fully. Disagreement fine — inside someone's lane, their call stands.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Full visual calendar (month/week/list), same view reps see — admin can edit inline */}
      <CompanyCalendarRepView isAdmin />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {filter === "all" ? "All tasks" : `${OWNER_META[filter].short}'s lane`} — click to edit, status dot to advance
          </CardTitle>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="glass p-12 rounded-xl text-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber mx-auto" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <p className="text-muted-foreground text-sm">No entries. Click "Add task" or "Generate week playbook".</p>
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
                  const owner = OWNER_META[(e.owner_role || "team") as OwnerRole];
                  const OwnerIcon = ROLE_ICONS[(e.owner_role || "team") as OwnerRole];
                  return (
                    <div
                      key={e.id}
                      className={`w-full rounded-md border border-l-4 p-3 transition-colors hover:border-primary ${meta.color} ${owner.border}`}
                    >
                      <div className="flex items-start gap-2">
                        <button onClick={() => toggleStatus(e)} className="mt-0.5 flex-shrink-0" title={`Status: ${e.status || "todo"} — click to advance`}>
                          <StatusIcon s={(e.status || "todo") as TaskStatus} />
                        </button>
                        <button onClick={() => openEdit(e)} className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] uppercase flex items-center gap-1 ${owner.badge}`}>
                              <OwnerIcon className="w-3 h-3" />{owner.short}
                            </Badge>
                            <span>{meta.icon}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{meta.label}</Badge>
                            {e.due_time && <span className="text-[10px] font-mono opacity-70">{e.due_time.slice(0, 5)}</span>}
                            {e.pinned && <Pin className="w-3 h-3" />}
                            {e.attachments?.length > 0 && (
                              <span className="text-[10px] flex items-center gap-0.5 opacity-70">
                                <Paperclip className="w-3 h-3" />{e.attachments.length}
                              </span>
                            )}
                          </div>
                          <p className={`font-semibold mt-1 ${e.status === "done" ? "line-through opacity-60" : "text-foreground"}`}>{e.title}</p>
                          {e.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{e.body}</p>}
                        </button>
                        <button onClick={(ev) => { ev.stopPropagation(); remove(e.id); }}
                                className="text-muted-foreground hover:text-crimson p-1 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
              {/* Assign-to (primary field) */}
              <div>
                <Label className="text-xs flex items-center gap-2">
                  Assigned to
                  <span className={`inline-block w-2 h-2 rounded-full ${OWNER_META[openDraft.owner_role].dot}`} />
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                  {OWNER_ROLES.map(r => {
                    const m = OWNER_META[r];
                    const Icon = ROLE_ICONS[r];
                    const active = openDraft.owner_role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setOpenDraft({ ...openDraft, owner_role: r, owner_name: m.short })}
                        className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                          active ? m.badge : "border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />{m.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={openDraft.date}
                         onChange={e => setOpenDraft({ ...openDraft, date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Time (optional)</Label>
                  <Input type="time" value={openDraft.due_time}
                         onChange={e => setOpenDraft({ ...openDraft, due_time: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={openDraft.status}
                          onChange={e => setOpenDraft({ ...openDraft, status: e.target.value as TaskStatus })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="todo">◯ To do</option>
                    <option value="doing">◐ Doing</option>
                    <option value="done">● Done</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-2">
                    Category
                    <span className={`inline-block w-3 h-3 rounded ${CATEGORY_META[openDraft.category].swatch}`} />
                  </Label>
                  <select value={openDraft.category}
                          onChange={e => setOpenDraft({ ...openDraft, category: e.target.value as CompanyCalendarCategory })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].icon} {CATEGORY_META[c].label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Playbook generator */}
      <Dialog open={playbookOpen} onOpenChange={(o) => { if (!o) { setPlaybookOpen(false); setPlaybookTasks(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber" /> Generate Week Playbook
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-amber/30 bg-amber/5 p-3 text-xs text-muted-foreground">
              Give me the north-star goal for the week. AI drafts 3–6 tasks per principal, staying inside each lane
              (Joseph = brand/product · Dean = delivery/people · Braden = sales/training/tools). Nothing saves until you approve.
            </div>
            <div>
              <Label className="text-xs">Week's north-star goal</Label>
              <Textarea rows={2} value={playbookGoal} onChange={e => setPlaybookGoal(e.target.value)}
                        placeholder='e.g. "Close 3 Diagnostics and finish Dean&apos;s COO onboarding"' />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Week starts</Label>
                <Input type="date" value={playbookWeekStart} onChange={e => setPlaybookWeekStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Days to plan</Label>
                <Input type="number" min={1} max={14} value={playbookDays}
                       onChange={e => setPlaybookDays(Math.max(1, Math.min(14, Number(e.target.value) || 7)))} />
              </div>
            </div>
            <Button onClick={generatePlaybook} disabled={playbookBusy || !playbookGoal.trim()} className="w-full">
              {playbookBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
              {playbookTasks ? "Regenerate" : "Generate playbook"}
            </Button>

            {playbookTasks && (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="text-xs font-mono uppercase text-amber">
                  Preview — {playbookTasks.length} tasks
                </div>
                {OWNER_ROLES.filter(r => r !== "team").map(role => {
                  const m = OWNER_META[role];
                  const Icon = ROLE_ICONS[role];
                  const roleTasks = playbookTasks.filter(t => t.owner_role === role);
                  if (!roleTasks.length) return null;
                  return (
                    <div key={role} className={`rounded-md border p-3 ${m.badge}`}>
                      <div className="flex items-center gap-2 mb-2 font-semibold">
                        <Icon className="w-4 h-4" /> {m.short} · {roleTasks.length} tasks
                      </div>
                      <ul className="space-y-2">
                        {roleTasks.map((t, i) => (
                          <li key={i} className="text-xs bg-background/40 rounded p-2 border border-border">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-muted-foreground">{t.date}</span>
                              {t.due_time && <span className="font-mono text-muted-foreground">{t.due_time}</span>}
                              <Badge variant="outline" className="text-[9px]">{t.kind}</Badge>
                            </div>
                            <div className="font-semibold mt-1 text-foreground">{t.title}</div>
                            {t.body && <div className="text-muted-foreground mt-1 whitespace-pre-wrap">{t.body}</div>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPlaybookOpen(false); setPlaybookTasks(null); }}>Cancel</Button>
            {playbookTasks && (
              <Button onClick={savePlaybook} disabled={playbookBusy}>
                {playbookBusy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save all {playbookTasks.length} tasks
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompanyCalendarPanel;
