import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Sparkles, RefreshCw, Play, CheckCircle2, AlertCircle,
  GraduationCap, Package, Pencil, Trash2, Download, Save, Plus, X,
} from "lucide-react";
import { ONBOARDING_CURRICULUM, GLOBAL_ROUTE_HINTS, type OnboardingModuleDef } from "@/lib/onboardingCurriculum";
import {
  listModules, generateModule, updateModule, deleteModule,
  type OnboardingModule, type OnboardingSlide,
} from "@/lib/onboardingApi";
import { buildOnboardingPackage, downloadBlob } from "@/lib/onboardingPackage";
import { OnboardingPlayer } from "@/components/onboarding/OnboardingPlayer";
import { AdminOnboardingScreenshots } from "@/components/admin/AdminOnboardingScreenshots";

interface EditorState {
  id: string;
  title: string;
  summary: string;
  slides: OnboardingSlide[];
}

export const AdminOnboardingStudio: React.FC = () => {
  const { toast } = useToast();
  const [modules, setModules] = useState<OnboardingModule[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [packaging, setPackaging] = useState<string | null>(null); // module id or "all"
  const [preview, setPreview] = useState<OnboardingModule | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try { setModules(await listModules()); } catch (e) {
      toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" });
    }
  };
  useEffect(() => { refresh(); }, []);

  const bySlug = new Map(modules.map(m => [m.slug, m]));

  const generateOne = async (def: OnboardingModuleDef, order_index: number) => {
    setBusy(def.slug);
    try {
      await generateModule({
        slug: def.slug, title: def.title, summary: def.summary,
        scriptOutline: def.scriptOutline, order_index,
        routeHints: { ...GLOBAL_ROUTE_HINTS, ...(def.routeHints || {}) },
      });
      await refresh();
      toast({ title: "Generated", description: def.title });
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const generateAll = async () => {
    if (!confirm(`Generate all ${ONBOARDING_CURRICULUM.length} modules? This takes 5-10 minutes and uses ElevenLabs credits.`)) return;
    setBulkProgress({ done: 0, total: ONBOARDING_CURRICULUM.length });
    for (let i = 0; i < ONBOARDING_CURRICULUM.length; i++) {
      const def = ONBOARDING_CURRICULUM[i];
      try {
        await generateModule({
          slug: def.slug, title: def.title, summary: def.summary,
          scriptOutline: def.scriptOutline, order_index: i,
          routeHints: { ...GLOBAL_ROUTE_HINTS, ...(def.routeHints || {}) },
        });
      } catch (e) {
        console.error(`[onboarding] ${def.slug} failed`, e);
        toast({ title: `${def.title} failed`, description: (e as Error).message, variant: "destructive" });
      }
      setBulkProgress({ done: i + 1, total: ONBOARDING_CURRICULUM.length });
      await refresh();
    }
    setBulkProgress(null);
    toast({ title: "Curriculum generated", description: "All modules processed." });
  };

  const downloadPackage = async (mods: OnboardingModule[], filename: string, key: string) => {
    if (mods.length === 0) {
      toast({ title: "Nothing to package", description: "Generate this module first", variant: "destructive" });
      return;
    }
    setPackaging(key);
    try {
      const blob = await buildOnboardingPackage(mods);
      downloadBlob(blob, filename);
      toast({ title: "Package downloaded" });
    } catch (e) {
      toast({ title: "Package failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPackaging(null);
    }
  };

  const handleDelete = async (mod: OnboardingModule) => {
    if (!confirm(`Delete "${mod.title}"? Its audio files will also be removed. You can regenerate later.`)) return;
    setBusy(mod.slug);
    try {
      await deleteModule(mod.id);
      await refresh();
      toast({ title: "Deleted", description: mod.title });
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const openEditor = (mod: OnboardingModule) => {
    setEditor({
      id: mod.id,
      title: mod.title,
      summary: mod.summary || "",
      slides: JSON.parse(JSON.stringify(mod.slides_json || [])),
    });
  };

  const saveEditor = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      await updateModule(editor.id, {
        title: editor.title.trim(),
        summary: editor.summary.trim(),
        slides_json: editor.slides,
      });
      await refresh();
      toast({ title: "Saved", description: editor.title });
      setEditor(null);
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const updateSlide = (i: number, patch: Partial<OnboardingSlide>) => {
    if (!editor) return;
    const next = [...editor.slides];
    next[i] = { ...next[i], ...patch };
    setEditor({ ...editor, slides: next });
  };

  const updateBullet = (slideIdx: number, bulletIdx: number, val: string) => {
    if (!editor) return;
    const next = [...editor.slides];
    const bullets = [...(next[slideIdx].bullets || [])];
    bullets[bulletIdx] = val;
    next[slideIdx] = { ...next[slideIdx], bullets };
    setEditor({ ...editor, slides: next });
  };

  const addBullet = (slideIdx: number) => {
    if (!editor) return;
    const next = [...editor.slides];
    next[slideIdx] = { ...next[slideIdx], bullets: [...(next[slideIdx].bullets || []), ""] };
    setEditor({ ...editor, slides: next });
  };

  const removeBullet = (slideIdx: number, bulletIdx: number) => {
    if (!editor) return;
    const next = [...editor.slides];
    const bullets = [...(next[slideIdx].bullets || [])];
    bullets.splice(bulletIdx, 1);
    next[slideIdx] = { ...next[slideIdx], bullets };
    setEditor({ ...editor, slides: next });
  };

  const removeSlide = (slideIdx: number) => {
    if (!editor) return;
    if (!confirm("Remove this slide?")) return;
    const next = [...editor.slides];
    next.splice(slideIdx, 1);
    setEditor({ ...editor, slides: next });
  };

  const addSlide = () => {
    if (!editor) return;
    setEditor({
      ...editor,
      slides: [...editor.slides, { title: "New slide", bullets: [""], narration: "" }],
    });
  };

  const readyModules = modules.filter(m => m.status === "ready").sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6">
      <AdminOnboardingScreenshots />
      <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" /> New Rep Onboarding Studio
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-generate {ONBOARDING_CURRICULUM.length} narrated training videos. Edit transcripts, save, delete, or download per-module.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={generateAll} disabled={!!bulkProgress || !!busy}>
              {bulkProgress ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{bulkProgress.done}/{bulkProgress.total}</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Full Curriculum</>}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadPackage(readyModules, `aetheris-rep-onboarding-${new Date().toISOString().slice(0, 10)}.zip`, "all")}
              disabled={packaging !== null || readyModules.length === 0}
            >
              {packaging === "all" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
              Download Package ({readyModules.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {preview && (
          <div className="mb-6">
            <OnboardingPlayer module={preview} onClose={() => setPreview(null)} />
          </div>
        )}
        <div className="space-y-2">
          {ONBOARDING_CURRICULUM.map((def, i) => {
            const mod = bySlug.get(def.slug);
            const status = mod?.status || "pending";
            const isReady = mod?.status === "ready";
            return (
              <div key={def.slug} className="flex items-start gap-3 p-3 border border-border rounded-md">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-mono">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{mod?.title || def.title}</span>
                    {status === "ready" && <Badge variant="secondary" className="text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Ready · {Math.round(mod!.total_duration_sec || 0)}s</Badge>}
                    {status === "generating" && <Badge><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating</Badge>}
                    {status === "failed" && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>}
                    {status === "pending" && <Badge variant="outline">Not generated</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod?.summary || def.summary}</p>
                  {mod?.error_message && <p className="text-xs text-destructive mt-1">{mod.error_message}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isReady && (
                    <>
                      <Button size="sm" variant="ghost" title="Preview" onClick={() => setPreview(mod!)}><Play className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Edit transcript" onClick={() => openEditor(mod!)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button
                        size="sm" variant="ghost" title="Download module"
                        disabled={packaging !== null}
                        onClick={() => downloadPackage([mod!], `${String(i + 1).padStart(2, "0")}-${mod!.slug}.zip`, mod!.id)}
                      >
                        {packaging === mod!.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm" variant="outline"
                    onClick={() => generateOne(def, i)}
                    disabled={busy === def.slug || !!bulkProgress}
                  >
                    {busy === def.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span className="ml-1.5 hidden sm:inline">{isReady ? "Re-gen" : "Generate"}</span>
                  </Button>
                  {mod && (
                    <Button size="sm" variant="ghost" title="Delete" onClick={() => handleDelete(mod)} disabled={busy === def.slug}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Editor Dialog */}
      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Onboarding Module</DialogTitle>
          </DialogHeader>
          {editor && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Title</label>
                <Input value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Summary</label>
                <Textarea value={editor.summary} onChange={(e) => setEditor({ ...editor, summary: e.target.value })} rows={2} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Slides ({editor.slides.length})</h4>
                  <Button size="sm" variant="outline" onClick={addSlide}><Plus className="w-3.5 h-3.5 mr-1" />Add slide</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Editing the narration text does not regenerate audio. To refresh the voiceover, click Re-gen on the module.
                </p>
                {editor.slides.map((s, si) => (
                  <div key={si} className="border border-border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-muted-foreground">Slide {si + 1}</span>
                      <Button size="sm" variant="ghost" onClick={() => removeSlide(si)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      value={s.title}
                      onChange={(e) => updateSlide(si, { title: e.target.value })}
                      placeholder="Slide title"
                    />
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Bullets</label>
                      {(s.bullets || []).map((b, bi) => (
                        <div key={bi} className="flex gap-2">
                          <Input value={b} onChange={(e) => updateBullet(si, bi, e.target.value)} />
                          <Button size="sm" variant="ghost" onClick={() => removeBullet(si, bi)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => addBullet(si)}>
                        <Plus className="w-3.5 h-3.5 mr-1" />Bullet
                      </Button>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Narration</label>
                      <Textarea
                        value={s.narration}
                        onChange={(e) => updateSlide(si, { narration: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Live route to show (e.g. /portal?tab=leads)</label>
                        <Input
                          value={s.route || ""}
                          onChange={(e) => updateSlide(si, { route: e.target.value })}
                          placeholder="/portal?tab=leads"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Or static image URL</label>
                        <Input
                          value={s.image_url || ""}
                          onChange={(e) => updateSlide(si, { image_url: e.target.value })}
                          placeholder="https://…/screenshot.png"
                        />
                      </div>
                    </div>
                    {s.audio_url && (
                      <audio controls src={s.audio_url} className="w-full h-8" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveEditor} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminOnboardingStudio;
