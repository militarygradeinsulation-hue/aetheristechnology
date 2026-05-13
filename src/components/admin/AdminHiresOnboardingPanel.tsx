import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { listRepCodes, type RepCodeRow } from "@/lib/repCodes";
import {
  listTeams, createTeam, deleteTeam,
  listCadence, createCadence, updateCadence, deleteCadence,
  listPlaybook, upsertPlaybook, deletePlaybook,
  setRepTeam, revokeRepAccess,
  type HireTeam, type HireTeamCadence, type HirePlaybookEntry,
} from "@/lib/hireTeams";
import { buildLifecycle, type RepLifecycle } from "@/lib/hireLifecycle";
import { AdminOnboardingStudio } from "@/components/admin/AdminOnboardingStudio";
import { Users, UserPlus, ShieldX, CalendarPlus, Trash2, Save, BookOpenCheck, Plus, AlertTriangle, MessageCircle, Repeat, GraduationCap, Activity, Copy, CheckCircle2 } from "lucide-react";

const SECTIONS: { key: HirePlaybookEntry["section"]; label: string; icon: any; tone: string }[] = [
  { key: "day_one", label: "Day 1 outreach", icon: MessageCircle, tone: "border-amber/40" },
  { key: "week_one", label: "Week 1 check-ins", icon: Users, tone: "border-amber/40" },
  { key: "red_flags", label: "Red-flag signals", icon: AlertTriangle, tone: "border-destructive/50" },
  { key: "reactivation", label: "Reactivation scripts", icon: Repeat, tone: "border-amber/40" },
];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminHiresOnboardingPanel: React.FC = () => {
  const { toast } = useToast();
  const [reps, setReps] = useState<RepCodeRow[]>([]);
  const [teams, setTeams] = useState<HireTeam[]>([]);
  const [cadence, setCadence] = useState<HireTeamCadence[]>([]);
  const [playbook, setPlaybook] = useState<HirePlaybookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeam, setNewTeam] = useState({ name: "", description: "", experience_band: "" });
  const [newCadence, setNewCadence] = useState<Record<string, { title: string; cadence: string; day_of_week: string; notes: string }>>({});
  const [newEntry, setNewEntry] = useState<Record<string, { title: string; body: string }>>({});

  const load = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [r, t, c, p] = await Promise.all([listRepCodes(), listTeams(), listCadence(), listPlaybook()]);
      setReps(r); setTeams(t); setCadence(c); setPlaybook(p);
    } catch (e) {
      toast({ title: "Load failed", description: (e as Error).message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const repsByTeam = useMemo(() => {
    const map = new Map<string, RepCodeRow[]>();
    for (const r of reps) {
      const k = (r as any).team_name || "Unassigned";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return map;
  }, [reps]);

  const onAssignTeam = async (rep: RepCodeRow, teamName: string) => {
    // Optimistic update — no full reload, no "Loading…" flash
    setReps(prev => prev.map(r => r.id === rep.id ? ({ ...r, team_name: teamName } as any) : r));
    try {
      await setRepTeam(rep.id, teamName);
      void load({ silent: true });
    } catch (e) {
      // Revert on failure
      setReps(prev => prev.map(r => r.id === rep.id ? rep : r));
      toast({ title: "Failed to assign team", description: (e as Error).message, variant: "destructive" });
    }
  };

  const onRevoke = async (rep: RepCodeRow) => {
    if (!confirm(`Revoke ALL access for ${rep.rep_name}?\n\nThis instantly deletes:\n• Their portal login\n• Mailbox, notes, library, settings\n• Their rep code\n\nCannot be undone.`)) return;
    try {
      const r = await revokeRepAccess(rep.code);
      toast({ title: "Access revoked", description: r.auth_deleted ? "Login deleted. They cannot sign in." : "Rep removed. No auth user was found." });
      await load();
    } catch (e) {
      toast({ title: "Revoke failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const onCreateTeam = async () => {
    if (!newTeam.name.trim()) return;
    try { await createTeam({ name: newTeam.name.trim(), description: newTeam.description.trim() || undefined, experience_band: newTeam.experience_band.trim() || undefined }); setNewTeam({ name: "", description: "", experience_band: "" }); await load(); }
    catch (e) { toast({ title: "Create failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const onAddCadence = async (teamId: string) => {
    const draft = newCadence[teamId];
    if (!draft?.title?.trim()) return;
    try {
      await createCadence({
        team_id: teamId,
        title: draft.title.trim(),
        cadence: draft.cadence || "weekly",
        day_of_week: draft.day_of_week ? Number(draft.day_of_week) : null,
        notes: draft.notes?.trim() || null,
      } as any);
      setNewCadence(s => ({ ...s, [teamId]: { title: "", cadence: "weekly", day_of_week: "", notes: "" } }));
      await load();
    } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const onAddPlaybook = async (section: HirePlaybookEntry["section"]) => {
    const draft = newEntry[section];
    if (!draft?.title?.trim() || !draft?.body?.trim()) return;
    try {
      await upsertPlaybook({ section, title: draft.title.trim(), body: draft.body.trim() });
      setNewEntry(s => ({ ...s, [section]: { title: "", body: "" } }));
      await load();
    } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const lifecycles = useMemo<RepLifecycle[]>(() => reps.map(buildLifecycle).sort((a, b) => a.daysSinceHire - b.daysSinceHire), [reps]);

  return (
    <Tabs defaultValue="lifecycle" className="space-y-4">
      <TabsList className="bg-card/60 border border-border/60 flex-wrap h-auto">
        <TabsTrigger value="lifecycle" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Lifecycle</TabsTrigger>
        <TabsTrigger value="roster" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Roster & Teams</TabsTrigger>
        <TabsTrigger value="cadence" className="gap-1.5"><CalendarPlus className="w-3.5 h-3.5" /> Engagement Cadence</TabsTrigger>
        <TabsTrigger value="playbook" className="gap-1.5"><BookOpenCheck className="w-3.5 h-3.5" /> Playbook</TabsTrigger>
        <TabsTrigger value="training" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> New-Rep Training</TabsTrigger>
      </TabsList>

      <TabsContent value="lifecycle" className="space-y-4 mt-0">
        <LifecycleView lifecycles={lifecycles} playbook={playbook} />
      </TabsContent>

      <TabsContent value="roster" className="space-y-6 mt-0">
      {/* Hired roster */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-amber" /> Hired Roster — by Team
            <Badge variant="outline" className="ml-2 text-[10px] uppercase">{reps.length} active</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Move reps between teams. <strong className="text-destructive">Remove</strong> instantly revokes their portal login and deletes all their data.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {teams.map(team => {
            const list = repsByTeam.get(team.name) || [];
            return (
              <div key={team.id} className="rounded-md border border-border/60 p-4 bg-muted/10">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <div className="font-forensic text-lg text-foreground">{team.name}</div>
                    {team.description && <div className="text-xs text-muted-foreground mt-0.5">{team.description}</div>}
                  </div>
                  {team.experience_band && <Badge variant="outline" className="font-mono text-[10px]">{team.experience_band}</Badge>}
                </div>
                {list.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic py-2">No reps on this team yet.</div>
                ) : (
                  <div className="space-y-2">
                    {list.map(r => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded border border-border/40 bg-background/60 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{r.rep_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">{r.rep_email || "—"} • code ••••{r.code.slice(-2)}</div>
                        </div>
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value={(r as any).team_name || ""}
                          onChange={e => onAssignTeam(r, e.target.value)}
                        >
                          {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                        <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => onRevoke(r)}>
                          <ShieldX className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned */}
          {(() => {
            const teamNames = new Set(teams.map(t => t.name));
            const orphans = reps.filter(r => !teamNames.has((r as any).team_name));
            if (orphans.length === 0) return null;
            return (
              <div className="rounded-md border border-amber/40 p-4 bg-amber/5">
                <div className="font-forensic text-lg mb-2">Unassigned</div>
                <div className="space-y-2">
                  {orphans.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <div className="text-sm">{r.rep_name}</div>
                      <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" defaultValue="" onChange={e => e.target.value && onAssignTeam(r, e.target.value)}>
                        <option value="" disabled>Assign team…</option>
                        {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* New team */}
          <div className="rounded-md border border-dashed border-amber/40 p-3 bg-amber/5">
            <div className="text-xs uppercase tracking-wide text-amber mb-2 font-mono">+ New Team</div>
            <div className="grid md:grid-cols-4 gap-2">
              <Input placeholder="Name (e.g. Team 3 — SDRs)" value={newTeam.name} onChange={e => setNewTeam(s => ({ ...s, name: e.target.value }))} />
              <Input placeholder="Experience band (e.g. 0–3mo)" value={newTeam.experience_band} onChange={e => setNewTeam(s => ({ ...s, experience_band: e.target.value }))} />
              <Input className="md:col-span-2" placeholder="Description" value={newTeam.description} onChange={e => setNewTeam(s => ({ ...s, description: e.target.value }))} />
            </div>
            <Button size="sm" className="mt-2 bg-amber text-primary-foreground hover:bg-amber/90" onClick={onCreateTeam}><Plus className="w-3.5 h-3.5 mr-1" /> Add team</Button>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="cadence" className="space-y-6 mt-0">
      {/* Cadence per team */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarPlus className="w-4 h-4 text-amber" /> Engagement Schedules — per Team
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            How often you and Brandon meet with each team. Items toggled to "calendar" mirror into the Company Calendar.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {teams.map(team => {
            const items = cadence.filter(c => c.team_id === team.id).sort((a, b) => a.sort_order - b.sort_order);
            const draft = newCadence[team.id] || { title: "", cadence: "weekly", day_of_week: "", notes: "" };
            return (
              <div key={team.id} className="rounded-md border border-border/60 p-4">
                <div className="font-forensic text-lg mb-3">{team.name}</div>
                <div className="space-y-2 mb-3">
                  {items.map(item => (
                    <div key={item.id} className="rounded border border-border/40 bg-background/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">{item.cadence}</Badge>
                            {item.day_of_week !== null && item.cadence === "weekly" && (
                              <Badge variant="outline" className="text-[10px] font-mono">{DOW[item.day_of_week]}</Badge>
                            )}
                            <div className="text-sm font-medium">{item.title}</div>
                          </div>
                          {item.notes && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{item.notes}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Switch checked={item.push_to_calendar} onCheckedChange={async (v) => { await updateCadence(item.id, { push_to_calendar: v }); await load(); }} />
                            <span className="text-[10px] uppercase text-muted-foreground">Cal</span>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { await deleteCadence(item.id); await load(); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="text-xs text-muted-foreground italic">No cadence yet.</div>}
                </div>
                <div className="rounded border border-dashed border-border/60 p-2 bg-muted/10 grid grid-cols-1 md:grid-cols-5 gap-2">
                  <Input placeholder="Title" value={draft.title} onChange={e => setNewCadence(s => ({ ...s, [team.id]: { ...draft, title: e.target.value } }))} className="md:col-span-2" />
                  <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={draft.cadence} onChange={e => setNewCadence(s => ({ ...s, [team.id]: { ...draft, cadence: e.target.value } }))}>
                    <option value="daily">daily</option><option value="weekly">weekly</option><option value="monthly">monthly</option><option value="quarterly">quarterly</option>
                  </select>
                  <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={draft.day_of_week} onChange={e => setNewCadence(s => ({ ...s, [team.id]: { ...draft, day_of_week: e.target.value } }))}>
                    <option value="">Day…</option>
                    {DOW.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <Button size="sm" onClick={() => onAddCadence(team.id)}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
                  <Input className="md:col-span-5" placeholder="Notes (optional)" value={draft.notes} onChange={e => setNewCadence(s => ({ ...s, [team.id]: { ...draft, notes: e.target.value } }))} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="playbook" className="space-y-6 mt-0">
      {/* Engagement playbook */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenCheck className="w-4 h-4 text-amber" /> New-Hire Engagement Playbook
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Tips, scripts, and red flags. Edit as you and Brandon learn what works. These show up in the Rep portal too.
          </p>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {SECTIONS.map(sec => {
            const items = playbook.filter(p => p.section === sec.key);
            const draft = newEntry[sec.key] || { title: "", body: "" };
            const Icon = sec.icon;
            return (
              <div key={sec.key} className={`rounded-md border ${sec.tone} p-4 bg-background/40`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-amber" />
                  <div className="font-forensic text-base">{sec.label}</div>
                </div>
                <div className="space-y-3 mb-3">
                  {items.map(entry => (
                    <PlaybookCard key={entry.id} entry={entry} onSaved={load} />
                  ))}
                  {items.length === 0 && <div className="text-xs text-muted-foreground italic">Empty.</div>}
                </div>
                <div className="rounded border border-dashed border-border/60 p-2 bg-muted/10 space-y-2">
                  <Input placeholder="Title" value={draft.title} onChange={e => setNewEntry(s => ({ ...s, [sec.key]: { ...draft, title: e.target.value } }))} />
                  <Textarea placeholder="Body / script" rows={3} value={draft.body} onChange={e => setNewEntry(s => ({ ...s, [sec.key]: { ...draft, body: e.target.value } }))} />
                  <Button size="sm" onClick={() => onAddPlaybook(sec.key)}><Plus className="w-3.5 h-3.5 mr-1" /> Add entry</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

const PlaybookCard: React.FC<{ entry: HirePlaybookEntry; onSaved: () => void }> = ({ entry, onSaved }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const save = async () => {
    try { await upsertPlaybook({ id: entry.id, section: entry.section, title, body }); setEditing(false); onSaved(); }
    catch (e) { toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const remove = async () => {
    if (!confirm("Delete this entry?")) return;
    try { await deletePlaybook(entry.id); onSaved(); } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  if (!editing) {
    return (
      <div className="rounded border border-border/40 bg-background/60 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-sm">{entry.title}</div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>Edit</Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={remove}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
        <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap font-sans">{entry.body}</pre>
      </div>
    );
  }
  return (
    <div className="rounded border border-amber/40 bg-amber/5 p-3 space-y-2">
      <Input value={title} onChange={e => setTitle(e.target.value)} />
      <Textarea rows={5} value={body} onChange={e => setBody(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={save}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setTitle(entry.title); setBody(entry.body); }}>Cancel</Button>
      </div>
    </div>
  );
};

export default AdminHiresOnboardingPanel;
