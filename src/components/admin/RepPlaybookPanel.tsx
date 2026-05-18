import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Plus, Trash2, Calendar, BookOpen, Target, Lightbulb, Trophy, RefreshCw } from "lucide-react";
import { adminPlaybook, DAYS, PLAY_CATEGORIES, SCHEDULE_CATEGORIES,
  type ScheduleBlock, type Play, type Quota, type IdeaOfDay, type RepRef } from "@/lib/adminPlaybook";

const fmt$ = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;

export const RepPlaybookPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
  const [plays, setPlays] = useState<Play[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [idea, setIdea] = useState<IdeaOfDay | null>(null);
  const [reps, setReps] = useState<RepRef[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminPlaybook.getAll();
      setSchedule(r.schedule); setPlays(r.plays); setQuotas(r.quotas);
      setIdea(r.idea_today); setReps(r.reps);
    } catch (e) {
      toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="glass p-12 rounded-xl flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber" /> Rep Playbook & Schedule
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Editable cadence, reusable plays, AI coaching tips, and team quotas. Reps see this in their portal.
          </p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      <Tabs defaultValue="idea" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="idea"><Lightbulb className="w-4 h-4 mr-1" />Idea of Day</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-1" />Weekly Cadence</TabsTrigger>
          <TabsTrigger value="plays"><BookOpen className="w-4 h-4 mr-1" />Plays Library</TabsTrigger>
          <TabsTrigger value="quotas"><Trophy className="w-4 h-4 mr-1" />Quotas</TabsTrigger>
        </TabsList>

        <TabsContent value="idea" className="mt-6">
          <IdeaPanel idea={idea} onSaved={(r) => setIdea(r)} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-6">
          <SchedulePanel rows={schedule} setRows={setSchedule} />
        </TabsContent>
        <TabsContent value="plays" className="mt-6">
          <PlaysPanel rows={plays} setRows={setPlays} />
        </TabsContent>
        <TabsContent value="quotas" className="mt-6">
          <QuotasPanel rows={quotas} setRows={setQuotas} reps={reps} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================================================
// IDEA OF THE DAY
// ============================================================================
const IdeaPanel: React.FC<{ idea: IdeaOfDay | null; onSaved: (r: IdeaOfDay) => void }> = ({ idea, onSaved }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualBody, setManualBody] = useState("");

  const generate = async () => {
    setBusy(true);
    try {
      const r = await adminPlaybook.ideaGenerate();
      onSaved(r.row);
      toast({ title: "Idea generated", description: r.row.title });
    } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const saveManual = async () => {
    if (!manualTitle.trim() || !manualBody.trim()) return;
    setBusy(true);
    try {
      const r = await adminPlaybook.ideaSetManual(manualTitle, manualBody);
      onSaved(r.row); setManualTitle(""); setManualBody("");
      toast({ title: "Saved" });
    } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber" /> Today's Idea</span>
            <Badge variant="outline">{new Date().toLocaleDateString()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {idea ? (
            <div className="space-y-3">
              <h3 className="font-bold text-foreground text-lg">{idea.title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{idea.body}</p>
              <div className="flex gap-2 pt-2">
                {idea.category && <Badge variant="secondary">{idea.category}</Badge>}
                <Badge variant="outline">{idea.source === "ai" ? "AI" : "Manual"}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No idea broadcast yet today.</p>
          )}
          <Button onClick={generate} disabled={busy} className="mt-4 w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {idea ? "Regenerate with AI" : "Generate with AI"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle>Override Manually</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Idea title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
          <Textarea placeholder="Idea body…" rows={6} value={manualBody} onChange={(e) => setManualBody(e.target.value)} />
          <Button onClick={saveManual} disabled={busy || !manualTitle.trim() || !manualBody.trim()} className="w-full">
            Save manual idea
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// WEEKLY CADENCE
// ============================================================================
const SchedulePanel: React.FC<{ rows: ScheduleBlock[]; setRows: (r: ScheduleBlock[]) => void }> = ({ rows, setRows }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<ScheduleBlock> | null>(null);

  const grouped = useMemo(() => {
    const m: Record<number, ScheduleBlock[]> = {};
    for (let d = 0; d < 7; d++) m[d] = [];
    rows.forEach(r => { m[r.day_of_week] = m[r.day_of_week] || []; m[r.day_of_week].push(r); });
    Object.values(m).forEach(arr => arr.sort((a, b) => a.block_order - b.block_order));
    return m;
  }, [rows]);

  const save = async () => {
    if (!editing?.title || editing.day_of_week === undefined) return;
    try {
      const r = await adminPlaybook.scheduleUpsert(editing);
      setRows(editing.id ? rows.map(x => x.id === r.row.id ? r.row : x) : [...rows, r.row]);
      setEditing(null); toast({ title: "Saved" });
    } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete this block?")) return;
    try { await adminPlaybook.scheduleDelete(id); setRows(rows.filter(r => r.id !== id)); }
    catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ day_of_week: 1, block_order: 0, title: "", category: "general", is_active: true })}>
          <Plus className="w-4 h-4 mr-2" />Add block
        </Button>
      </div>
      <div className="grid md:grid-cols-7 gap-3">
        {DAYS.map((dn, d) => (
          <Card key={d} className="glass">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{dn}</CardTitle></CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              {grouped[d].length === 0 && <p className="text-xs text-muted-foreground italic">, </p>}
              {grouped[d].map(b => (
                <div key={b.id} className="bg-card/50 rounded p-2 border border-border/50 group cursor-pointer hover:border-amber/50"
                  onClick={() => setEditing(b)}>
                  <div className="font-medium text-xs text-foreground line-clamp-2">{b.title}</div>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{b.category}</Badge>
                    {b.duration_minutes && <span className="text-[10px] text-muted-foreground">{b.duration_minutes}m</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <Card className="glass border-amber/40">
          <CardHeader><CardTitle>{editing.id ? "Edit block" : "New block"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Day</label>
                <Select value={String(editing.day_of_week ?? 1)} onValueChange={(v) => setEditing({ ...editing, day_of_week: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={editing.category || "general"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCHEDULE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Duration (min)</label>
                <Input type="number" value={editing.duration_minutes ?? ""} onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value ? Number(e.target.value) : null as any })} />
              </div>
            </div>
            <Input placeholder="Title (e.g. 'Cold call power hour')" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Textarea placeholder="Notes / instructions for the team…" rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <div className="flex items-center gap-3">
              <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <span className="text-sm text-muted-foreground">Visible to reps</span>
            </div>
            <div className="flex gap-2 justify-end">
              {editing.id && <Button variant="destructive" size="sm" onClick={() => del(editing.id!)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>}
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// PLAYS LIBRARY
// ============================================================================
const PlaysPanel: React.FC<{ rows: Play[]; setRows: (r: Play[]) => void }> = ({ rows, setRows }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<Play> | null>(null);
  const [aiOpts, setAiOpts] = useState({ category: "cold_call", stage: "", industry: "", prompt: "" });
  const [aiBusy, setAiBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() =>
    filter === "all" ? rows : rows.filter(r => r.category === filter), [rows, filter]);

  const save = async () => {
    if (!editing?.title || !editing.body) return;
    try {
      const r = await adminPlaybook.playUpsert(editing);
      setRows(editing.id ? rows.map(x => x.id === r.row.id ? r.row : x) : [r.row, ...rows]);
      setEditing(null); toast({ title: "Saved" });
    } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete this play?")) return;
    try { await adminPlaybook.playDelete(id); setRows(rows.filter(r => r.id !== id)); }
    catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const generate = async () => {
    setAiBusy(true);
    try {
      const r = await adminPlaybook.playGenerate(aiOpts);
      setRows([r.row, ...rows]);
      toast({ title: "AI play generated", description: r.row.title });
    } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
    finally { setAiBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories ({rows.length})</SelectItem>
              {PLAY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setEditing({ category: "cold_call", body: "", title: "", is_published: true })}>
            <Plus className="w-4 h-4 mr-2" />New play
          </Button>
        </div>
        {filtered.length === 0 && <p className="text-sm text-muted-foreground italic p-6 text-center glass rounded-xl">No plays yet.</p>}
        {filtered.map(p => (
          <Card key={p.id} className="glass cursor-pointer hover:border-amber/40" onClick={() => setEditing(p)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground">{p.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline">{PLAY_CATEGORIES.find(c => c.value === p.category)?.label || p.category}</Badge>
                  {p.source === "ai" && <Badge variant="secondary" className="text-[10px]">AI</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass border-amber/30 h-fit">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="w-4 h-4 text-amber" />Generate with AI</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={aiOpts.category} onValueChange={(v) => setAiOpts({ ...aiOpts, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PLAY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Stage (optional)" value={aiOpts.stage} onChange={(e) => setAiOpts({ ...aiOpts, stage: e.target.value })} />
          <Input placeholder="Industry (optional)" value={aiOpts.industry} onChange={(e) => setAiOpts({ ...aiOpts, industry: e.target.value })} />
          <Textarea placeholder="Extra context (optional)…" rows={3} value={aiOpts.prompt} onChange={(e) => setAiOpts({ ...aiOpts, prompt: e.target.value })} />
          <Button onClick={generate} disabled={aiBusy} className="w-full">
            {aiBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate play
          </Button>
        </CardContent>
      </Card>

      {editing && (
        <Card className="glass border-amber/40 lg:col-span-3">
          <CardHeader><CardTitle>{editing.id ? "Edit play" : "New play"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <Select value={editing.category || "cold_call"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLAY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Stage (optional)" value={editing.stage || ""} onChange={(e) => setEditing({ ...editing, stage: e.target.value })} />
              <Input placeholder="Industry (optional)" value={editing.industry || ""} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} />
            </div>
            <Input placeholder="Play title" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Textarea placeholder="The script / sequence / talk track…" rows={10} value={editing.body || ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            <div className="flex items-center gap-3">
              <Switch checked={editing.is_published ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
              <span className="text-sm text-muted-foreground">Published to reps</span>
            </div>
            <div className="flex gap-2 justify-end">
              {editing.id && <Button variant="destructive" size="sm" onClick={() => del(editing.id!)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>}
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// QUOTAS / LEADERBOARD
// ============================================================================
const QuotasPanel: React.FC<{ rows: Quota[]; setRows: (r: Quota[]) => void; reps: RepRef[] }> = ({ rows, setRows, reps }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<Quota> | null>(null);
  const [summary, setSummary] = useState<{ rep_code: string; talked_to: number; qualified: number; proposals_sent: number; deals_won: number; revenue_won_cents: number }[]>([]);

  useEffect(() => {
    adminPlaybook.crmRepSummary().then(r => setSummary(r.summary)).catch(() => {});
  }, []);

  const repName = (code: string) => reps.find(r => r.code === code)?.rep_name || code;

  const save = async () => {
    if (!editing?.rep_code) return;
    try {
      const r = await adminPlaybook.quotaUpsert(editing);
      setRows([...rows.filter(x => !(x.rep_code === r.row.rep_code && x.period === r.row.period)), r.row]);
      setEditing(null); toast({ title: "Saved" });
    } catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    try { await adminPlaybook.quotaDelete(id); setRows(rows.filter(r => r.id !== id)); }
    catch (e) { toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }); }
  };

  // Leaderboard by revenue won
  const leaderboard = [...summary].sort((a, b) => b.revenue_won_cents - a.revenue_won_cents);

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber" /> Leaderboard (this period)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No CRM activity yet, once contacts/deals get owner_code tags, leaderboard fills automatically.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2">#</th><th className="pb-2">Rep</th><th className="pb-2">Talked to</th><th className="pb-2">Qualified</th><th className="pb-2">Proposals</th><th className="pb-2">Won</th><th className="pb-2">Revenue</th>
              </tr></thead>
              <tbody>
                {leaderboard.map((s, i) => (
                  <tr key={s.rep_code} className="border-b border-border/50">
                    <td className="py-2 font-mono text-amber">{i + 1}</td>
                    <td className="py-2">{repName(s.rep_code)} <span className="text-xs text-muted-foreground font-mono">{s.rep_code}</span></td>
                    <td className="py-2">{s.talked_to}</td>
                    <td className="py-2">{s.qualified}</td>
                    <td className="py-2">{s.proposals_sent}</td>
                    <td className="py-2">{s.deals_won}</td>
                    <td className="py-2 font-medium text-amber">{fmt$(s.revenue_won_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setEditing({ period: "weekly", calls_target: 100, meetings_target: 5, proposals_target: 3, revenue_target_cents: 500000 })}>
          <Plus className="w-4 h-4 mr-2" />Set quota
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {rows.map(q => (
          <Card key={q.id} className="glass cursor-pointer hover:border-amber/40" onClick={() => setEditing(q)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold">{repName(q.rep_code)}</h4>
                  <p className="text-xs font-mono text-muted-foreground">{q.rep_code} · {q.period}</p>
                </div>
                <Target className="w-4 h-4 text-amber" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><span className="text-muted-foreground">Calls:</span> <span className="text-foreground font-semibold">{q.calls_target}</span></div>
                <div><span className="text-muted-foreground">Meetings:</span> <span className="text-foreground font-semibold">{q.meetings_target}</span></div>
                <div><span className="text-muted-foreground">Proposals:</span> <span className="text-foreground font-semibold">{q.proposals_target}</span></div>
                <div><span className="text-muted-foreground">Revenue:</span> <span className="text-amber font-semibold">{fmt$(q.revenue_target_cents)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground italic col-span-2 text-center p-6">No quotas set yet.</p>}
      </div>

      {editing && (
        <Card className="glass border-amber/40">
          <CardHeader><CardTitle>{editing.id ? "Edit quota" : "New quota"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Rep</label>
                <Select value={editing.rep_code || ""} onValueChange={(v) => setEditing({ ...editing, rep_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick rep…" /></SelectTrigger>
                  <SelectContent>{reps.filter(r => r.is_active).map(r => <SelectItem key={r.code} value={r.code}>{r.rep_name} ({r.code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Period</label>
                <Select value={editing.period || "weekly"} onValueChange={(v) => setEditing({ ...editing, period: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <div><label className="text-xs text-muted-foreground">Calls</label><Input type="number" value={editing.calls_target ?? 0} onChange={(e) => setEditing({ ...editing, calls_target: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">Meetings</label><Input type="number" value={editing.meetings_target ?? 0} onChange={(e) => setEditing({ ...editing, meetings_target: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">Proposals</label><Input type="number" value={editing.proposals_target ?? 0} onChange={(e) => setEditing({ ...editing, proposals_target: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">Revenue $</label><Input type="number" value={(editing.revenue_target_cents ?? 0) / 100} onChange={(e) => setEditing({ ...editing, revenue_target_cents: Math.round(Number(e.target.value) * 100) })} /></div>
            </div>
            <Textarea placeholder="Notes (optional)" rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            <div className="flex justify-end gap-2">
              {editing.id && <Button variant="destructive" size="sm" onClick={() => del(editing.id!)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>}
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
