import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, Play, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { listModules, generateModule, type OnboardingModule } from "@/lib/onboardingApi";
import { ONBOARDING_CURRICULUM } from "@/lib/onboardingCurriculum";
import { OnboardingPlayer } from "@/components/onboarding/OnboardingPlayer";

export const OnboardingStudio: React.FC = () => {
  const { toast } = useToast();
  const [modules, setModules] = useState<OnboardingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [preview, setPreview] = useState<OnboardingModule | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const m = await listModules();
      setModules(m);
    } catch (e) {
      toast({ title: "Failed to load modules", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const bySlug = useMemo(() => new Map(modules.map((m) => [m.slug, m])), [modules]);
  const readyCount = modules.filter((m) => m.status === "ready").length;

  const runOne = async (def: typeof ONBOARDING_CURRICULUM[number], idx: number) => {
    setBusySlug(def.slug);
    try {
      await generateModule({
        slug: def.slug,
        title: def.title,
        summary: def.summary,
        scriptOutline: def.scriptOutline,
        order_index: idx,
      });
      toast({ title: `Generated: ${def.title}` });
      await refresh();
    } catch (e) {
      toast({ title: `Failed: ${def.title}`, description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusySlug(null);
    }
  };

  const runAllMissing = async () => {
    setBulkRunning(true);
    try {
      for (let i = 0; i < ONBOARDING_CURRICULUM.length; i++) {
        const def = ONBOARDING_CURRICULUM[i];
        const existing = bySlug.get(def.slug);
        if (existing?.status === "ready") continue;
        setBusySlug(def.slug);
        try {
          await generateModule({
            slug: def.slug,
            title: def.title,
            summary: def.summary,
            scriptOutline: def.scriptOutline,
            order_index: i,
          });
        } catch (e) {
          toast({ title: `Failed: ${def.title}`, description: (e as Error).message, variant: "destructive" });
        }
      }
      toast({ title: "Generation complete" });
      await refresh();
    } finally {
      setBusySlug(null);
      setBulkRunning(false);
    }
  };

  const statusBadge = (m?: OnboardingModule) => {
    if (!m) return <Badge variant="outline" className="text-muted-foreground">Not generated</Badge>;
    switch (m.status) {
      case "ready":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Ready</Badge>;
      case "generating":
        return <Badge className="bg-amber/20 text-amber border-amber/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber" /> New-Rep Onboarding Studio
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generate the narrated onboarding video curriculum reps watch when they join. Each module = 4–6 narrated slides with voiceover.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {readyCount} / {ONBOARDING_CURRICULUM.length} ready
              </Badge>
              <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button
                onClick={runAllMissing}
                disabled={bulkRunning || readyCount === ONBOARDING_CURRICULUM.length}
                className="bg-amber text-background hover:bg-amber/90"
                size="sm"
              >
                {bulkRunning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                Generate ALL missing
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : (
            <div className="space-y-2">
              {ONBOARDING_CURRICULUM.map((def, i) => {
                const m = bySlug.get(def.slug);
                const busy = busySlug === def.slug;
                return (
                  <div key={def.slug} className="flex items-start gap-3 p-3 border border-border rounded-md hover:bg-muted/30 transition">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{def.title}</span>
                        {statusBadge(m)}
                        {m?.total_duration_sec ? (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {Math.round(m.total_duration_sec)}s · {m.slides_json?.length || 0} slides
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{def.summary}</p>
                      {m?.error_message && (
                        <p className="text-xs text-crimson mt-1 font-mono">{m.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {m?.status === "ready" && (
                        <Button size="sm" variant="outline" onClick={() => setPreview(m)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => runOne(def, i)}
                        disabled={busy || bulkRunning}
                        variant={m?.status === "ready" ? "outline" : "default"}
                        className={m?.status === "ready" ? "" : "bg-amber text-background hover:bg-amber/90"}
                      >
                        {busy ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating</>
                        ) : m?.status === "ready" ? (
                          <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate</>
                        ) : (
                          <><Play className="w-3.5 h-3.5 mr-1" /> Generate</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Preview · {preview.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingPlayer module={preview} onClose={() => setPreview(null)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OnboardingStudio;
