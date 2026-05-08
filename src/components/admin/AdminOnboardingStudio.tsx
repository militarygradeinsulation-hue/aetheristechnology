import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, RefreshCw, Download, Play, CheckCircle2, AlertCircle, GraduationCap, Package } from "lucide-react";
import { ONBOARDING_CURRICULUM, type OnboardingModuleDef } from "@/lib/onboardingCurriculum";
import { listModules, generateModule, type OnboardingModule } from "@/lib/onboardingApi";
import { buildOnboardingPackage, downloadBlob } from "@/lib/onboardingPackage";
import { OnboardingPlayer } from "@/components/onboarding/OnboardingPlayer";

export const AdminOnboardingStudio: React.FC = () => {
  const { toast } = useToast();
  const [modules, setModules] = useState<OnboardingModule[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [packaging, setPackaging] = useState(false);
  const [preview, setPreview] = useState<OnboardingModule | null>(null);

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

  const downloadPackage = async () => {
    const ready = modules.filter(m => m.status === "ready").sort((a, b) => a.order_index - b.order_index);
    if (ready.length === 0) { toast({ title: "Nothing to package", description: "Generate modules first", variant: "destructive" }); return; }
    setPackaging(true);
    try {
      const blob = await buildOnboardingPackage(ready);
      downloadBlob(blob, `aetheris-rep-onboarding-${new Date().toISOString().slice(0, 10)}.zip`);
      toast({ title: "Package downloaded" });
    } catch (e) {
      toast({ title: "Package failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPackaging(false);
    }
  };

  const readyCount = modules.filter(m => m.status === "ready").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" /> New Rep Onboarding Studio
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-generate {ONBOARDING_CURRICULUM.length} narrated training videos (Brian voice, ElevenLabs). Plays in-portal & ships as a downloadable package for new hires.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={generateAll} disabled={!!bulkProgress || !!busy}>
              {bulkProgress ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{bulkProgress.done}/{bulkProgress.total}</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Full Curriculum</>}
            </Button>
            <Button variant="outline" onClick={downloadPackage} disabled={packaging || readyCount === 0}>
              {packaging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
              Download Package ({readyCount})
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
            return (
              <div key={def.slug} className="flex items-start gap-3 p-3 border border-border rounded-md">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-mono">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{def.title}</span>
                    {status === "ready" && <Badge variant="secondary" className="text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Ready · {Math.round(mod!.total_duration_sec || 0)}s</Badge>}
                    {status === "generating" && <Badge><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating</Badge>}
                    {status === "failed" && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>}
                    {status === "pending" && <Badge variant="outline">Not generated</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{def.summary}</p>
                  {mod?.error_message && <p className="text-xs text-destructive mt-1">{mod.error_message}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {mod?.status === "ready" && (
                    <Button size="sm" variant="ghost" onClick={() => setPreview(mod)}><Play className="w-3.5 h-3.5" /></Button>
                  )}
                  <Button
                    size="sm" variant="outline"
                    onClick={() => generateOne(def, i)}
                    disabled={busy === def.slug || !!bulkProgress}
                  >
                    {busy === def.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span className="ml-1.5 hidden sm:inline">{mod?.status === "ready" ? "Re-gen" : "Generate"}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminOnboardingStudio;
