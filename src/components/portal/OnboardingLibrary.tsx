import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Play, CheckCircle2, Loader2 } from "lucide-react";
import { listModules, listProgress, type OnboardingModule, type ProgressRow } from "@/lib/onboardingApi";
import { OnboardingPlayer } from "@/components/onboarding/OnboardingPlayer";
import { RepBootcamp3Day } from "@/components/portal/RepBootcamp3Day";
import { RepBootcamp6Week } from "@/components/portal/RepBootcamp6Week";

export const OnboardingLibrary: React.FC = () => {
  const [modules, setModules] = useState<OnboardingModule[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<OnboardingModule | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [m, p] = await Promise.all([listModules(), listProgress()]);
        setModules(m.filter(x => x.status === "ready"));
        setProgress(p);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const progBySlug = new Map(progress.map(p => [p.module_slug, p]));

  if (loading) return <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  if (modules.length === 0) {
    return <div className="space-y-6"><RepBootcamp6Week /><RepBootcamp3Day /></div>;
  }

  return (
    <div className="space-y-6">
      <RepBootcamp3Day />
      <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-amber-500" /> New Rep Onboarding Library
        </CardTitle>
        <p className="text-sm text-muted-foreground">Narrated walkthroughs of every part of this system. Watch in order.</p>
      </CardHeader>
      <CardContent>
        {active && (
          <div className="mb-4">
            <OnboardingPlayer module={active} onClose={() => setActive(null)} trackProgress />
          </div>
        )}
        <div className="space-y-2">
          {modules.map((m, i) => {
            const p = progBySlug.get(m.slug);
            const done = !!p?.completed_at;
            return (
              <div key={m.slug} className="flex items-center gap-3 p-3 border border-border rounded-md hover:bg-muted/30 transition">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{m.title}</span>
                    {done && <Badge variant="secondary" className="text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Done</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.summary}</p>
                </div>
                <Button size="sm" onClick={() => setActive(m)}>
                  <Play className="w-3.5 h-3.5 mr-1.5" /> Watch
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingLibrary;
