import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Save, RefreshCw, Plus, Trash2, Layers, Globe, BookOpen, FileText, History,
  Sliders, Sparkles, Eye,
} from "lucide-react";
import { adminForecast, type ForecastSettings, type IndustryPreset, type EducationItem, type ForecastRunSummary } from "@/lib/adminForecast";
import { ForecastCenter } from "@/components/portal/ForecastCenter";

const SECTION_LABELS: Array<{ key: keyof ForecastSettings["sections"]; label: string }> = [
  { key: "tip", label: "Tip of the Day" },
  { key: "live_pulse", label: "Live Pulse" },
  { key: "education", label: "Operator Education" },
  { key: "tech", label: "Tech Trends" },
  { key: "industry", label: "Industry Shifts" },
  { key: "companies", label: "Target Companies" },
];

const newId = () => `q${Math.random().toString(36).slice(2, 9)}`;

export const ForecastSettingsPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<ForecastSettings | null>(null);
  const [eduCandidates, setEduCandidates] = useState<EducationItem[]>([]);
  const [runs, setRuns] = useState<ForecastRunSummary[]>([]);
  const [newQueryLabel, setNewQueryLabel] = useState("");
  const [newQueryText, setNewQueryText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([adminForecast.getSettings(), adminForecast.listRuns()]);
      setSettings(s.settings);
      setEduCandidates(s.education_candidates || []);
      setRuns(r.runs || []);
    } catch (e) {
      toast({ title: "Load failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const patch = (p: Partial<ForecastSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...p });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const r = await adminForecast.updateSettings({
        is_active: settings.is_active,
        refresh_cadence_minutes: settings.refresh_cadence_minutes,
        live_pulse_minutes: settings.live_pulse_minutes,
        web_window: settings.web_window,
        topic_queries: settings.topic_queries,
        sources: settings.sources,
        sections: settings.sections,
        education_pool: settings.education_pool,
      });
      setSettings(r.settings);
      toast({ title: "Forecast settings saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const forceRun = async () => {
    setRunning(true);
    try {
      const r = await adminForecast.forceRun();
      if (r.ok) toast({ title: "Briefing regenerated", description: r.date });
      else toast({ title: "Run failed", description: r.error || "Unknown error", variant: "destructive" });
      void load();
    } catch (e) {
      toast({ title: "Run failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const addQuery = () => {
    if (!settings || !newQueryText.trim()) return;
    const q = { id: newId(), label: newQueryLabel.trim() || "Custom", query: newQueryText.trim(), enabled: true };
    patch({ topic_queries: [...settings.topic_queries, q] });
    setNewQueryLabel(""); setNewQueryText("");
  };

  const applyPreset = (p: IndustryPreset) => {
    if (!settings) return;
    const existing = new Set(settings.topic_queries.map((q) => q.query));
    const additions = p.queries.filter((q) => !existing.has(q)).map((q) => ({
      id: newId(), label: p.label, query: q, enabled: true, industry: p.id,
    }));
    if (!additions.length) {
      toast({ title: `${p.label} preset already applied` });
      return;
    }
    patch({ topic_queries: [...settings.topic_queries, ...additions] });
    toast({ title: `Added ${additions.length} ${p.label} queries` });
  };

  const eduSelected = useMemo(() => {
    const map = new Map<string, EducationItem>();
    (settings?.education_pool || []).forEach((e) => map.set(`${e.kind}:${e.id}`, e));
    return map;
  }, [settings?.education_pool]);

  const toggleEdu = (item: EducationItem) => {
    if (!settings) return;
    const key = `${item.kind}:${item.id}`;
    const next = new Map(eduSelected);
    if (next.has(key)) next.delete(key);
    else next.set(key, { ...item, enabled: true });
    patch({ education_pool: Array.from(next.values()) });
  };

  if (loading || !settings) {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber" /> Forecast Center · Settings
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Last saved {new Date(settings.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={forceRun} disabled={running}
            className="border-amber/40 text-amber hover:bg-amber/10">
            <Sparkles className={`w-4 h-4 mr-2 ${running ? "animate-pulse" : ""}`} />
            {running ? "Running…" : "Force Regenerate Now"}
          </Button>
          <Button onClick={save} disabled={saving} className="bg-amber text-background hover:bg-amber/90">
            <Save className={`w-4 h-4 mr-2 ${saving ? "animate-pulse" : ""}`} />
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        {/* MASTER CONTROLS */}
        <Card>
          <CardHeader><CardTitle className="font-display flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber" /> Master Controls
          </CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active" className="text-sm">Forecast Engine</Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${settings.is_active ? "text-amber" : "text-muted-foreground"}`}>
                  {settings.is_active ? "LIVE" : "PAUSED"}
                </span>
                <Switch id="active" checked={settings.is_active}
                  onCheckedChange={(v) => patch({ is_active: v })} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cadence" className="text-xs text-muted-foreground">Refresh cadence (min)</Label>
                <Input id="cadence" type="number" min={30} value={settings.refresh_cadence_minutes}
                  onChange={(e) => patch({ refresh_cadence_minutes: Math.max(30, parseInt(e.target.value) || 30) })} />
                <p className="text-[10px] text-muted-foreground mt-1">Min 30. 1440 = once a day.</p>
              </div>
              <div>
                <Label htmlFor="pulse" className="text-xs text-muted-foreground">Live Pulse interval (min)</Label>
                <Input id="pulse" type="number" min={5} value={settings.live_pulse_minutes}
                  onChange={(e) => patch({ live_pulse_minutes: Math.max(5, parseInt(e.target.value) || 5) })} />
                <p className="text-[10px] text-muted-foreground mt-1">How often the portal polls fresh headlines.</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-2">Default Section Visibility</p>
              <div className="grid grid-cols-2 gap-2">
                {SECTION_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
                    <span className="text-xs">{label}</span>
                    <Switch checked={settings.sections[key]} onCheckedChange={(v) => patch({
                      sections: { ...settings.sections, [key]: v },
                    })} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOURCE MIX */}
        <Card>
          <CardHeader><CardTitle className="font-display flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber" /> Source Mix
          </CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {[
                { key: "aetheris_blog" as const, label: "Aetheris Blog", icon: <FileText className="w-3.5 h-3.5" /> },
                { key: "aetheris_playbooks" as const, label: "Aetheris Playbooks", icon: <BookOpen className="w-3.5 h-3.5" /> },
                { key: "web" as const, label: "Live Web (Firecrawl)", icon: <Globe className="w-3.5 h-3.5" /> },
              ].map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
                  <span className="text-sm flex items-center gap-2 text-amber">{icon} {label}</span>
                  <Switch checked={settings.sources[key]} onCheckedChange={(v) => patch({
                    sources: { ...settings.sources, [key]: v },
                  })} />
                </div>
              ))}
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Web time window</Label>
              <Select value={settings.web_window} onValueChange={(v) => patch({ web_window: v as "h" | "d" | "w" | "m" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="h">Last hour</SelectItem>
                  <SelectItem value="d">Last day</SelectItem>
                  <SelectItem value="w">Last week</SelectItem>
                  <SelectItem value="m">Last month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* TOPIC LIBRARY */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber" /> Topic Library
              <Badge variant="outline" className="text-[10px] border-amber/30 text-amber">
                {settings.topic_queries.filter((q) => q.enabled).length}/{settings.topic_queries.length} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-2">Industry Presets, One-Click Add</p>
              <div className="flex flex-wrap gap-2">
                {settings.industry_presets.map((p) => (
                  <Button key={p.id} variant="outline" size="sm" onClick={() => applyPreset(p)}
                    className="border-amber/30 text-amber hover:bg-amber/10 h-7 text-xs">
                    + {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {settings.topic_queries.map((q) => (
                <div key={q.id} className="flex items-center gap-2 rounded border border-border/50 px-3 py-2">
                  <Switch checked={q.enabled} onCheckedChange={(v) => patch({
                    topic_queries: settings.topic_queries.map((x) => x.id === q.id ? { ...x, enabled: v } : x),
                  })} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-amber/80 uppercase tracking-wider">{q.label}</p>
                    <p className="text-xs text-foreground truncate">{q.query}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => patch({ topic_queries: settings.topic_queries.filter((x) => x.id !== q.id) })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {settings.topic_queries.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No queries yet. Add one below or apply a preset.</p>
              )}
            </div>
            <Separator />
            <div className="grid sm:grid-cols-[140px_1fr_auto] gap-2">
              <Input placeholder="Label" value={newQueryLabel} onChange={(e) => setNewQueryLabel(e.target.value)} />
              <Input placeholder="Search query (e.g. Indianapolis SaaS hiring)"
                value={newQueryText} onChange={(e) => setNewQueryText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addQuery(); }} />
              <Button onClick={addQuery} disabled={!newQueryText.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* EDUCATION PICKER */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber" /> Education Picker
              <Badge variant="outline" className="text-[10px] border-amber/30 text-amber">
                {eduSelected.size} selected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Pick which Aetheris articles & playbooks the AI is allowed to recommend. Empty = all eligible.
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {eduCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No published blog posts or playbooks yet.
                </p>
              )}
              {eduCandidates.map((c) => {
                const key = `${c.kind}:${c.id}`;
                const on = eduSelected.has(key);
                return (
                  <div key={key} className={`flex items-center gap-2 rounded border px-3 py-1.5 cursor-pointer ${on ? "border-amber/40 bg-amber/5" : "border-border/50"}`}
                    onClick={() => toggleEdu(c)}>
                    {c.kind === "playbook"
                      ? <BookOpen className="w-3.5 h-3.5 text-amber flex-shrink-0" />
                      : <FileText className="w-3.5 h-3.5 text-amber flex-shrink-0" />}
                    <span className="text-xs flex-1 truncate">{c.title}</span>
                    <Switch checked={on} className="pointer-events-none" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* RUN HISTORY */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <History className="w-4 h-4 text-amber" /> Run History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No runs yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {runs.map((r) => (
                  <div key={r.briefing_date} className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
                    <div>
                      <p className="text-xs font-mono text-amber">{r.briefing_date}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(r.generated_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1.5 text-[10px] font-mono">
                      <Badge variant="outline" className="border-amber/20">{r.signal_count}s</Badge>
                      <Badge variant="outline" className="border-amber/20">{r.company_count}c</Badge>
                      <Badge variant="outline" className="border-amber/20">{r.education_count}e</Badge>
                      <Badge variant="outline" className="border-amber/20">{r.pulse_count}p</Badge>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground font-mono text-center mt-2">
                  s=signals · c=companies · e=education · p=pulse
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LIVE PREVIEW */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber" /> Live Preview, What Reps See
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ForecastCenter isPartner={true} authMode="admin" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForecastSettingsPanel;
