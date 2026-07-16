import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, RotateCcw, Eye, Sparkles, TrendingUp, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SEOOverride {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  tldr: string | null;
  faqs: Array<{ question: string; answer: string }> | null;
  version: number;
  applied_at: string;
}

interface SEOLog {
  id: string;
  route: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  trends_used: unknown;
  ai_reasoning: string | null;
  score_after: number | null;
  run_type: string;
  status: string;
  run_at: string;
}

const ALL_ROUTES = [
  "/", "/services", "/ai-consultant", "/marketing-strategist", "/sales-compass",
  "/assessment", "/scan", "/diagnostic-quiz", "/friction-audit",
  "/about", "/why-us", "/solutions",
  "/industries", "/ai-for-healthcare", "/ai-for-finance", "/ai-for-logistics",
  "/ai-for-construction", "/ai-for-manufacturing", "/ai-for-saas",
];

export const SEOOptimizer: React.FC = () => {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<SEOOverride[]>([]);
  const [logs, setLogs] = useState<SEOLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null); // route or 'all'
  const [viewLog, setViewLog] = useState<SEOLog | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [ovRes, logRes] = await Promise.all([
      supabase.from("seo_overrides").select("*").order("applied_at", { ascending: false }),
      supabase.from("seo_optimization_log").select("*").order("run_at", { ascending: false }).limit(50),
    ]);
    setOverrides((ovRes.data as unknown as SEOOverride[]) || []);
    setLogs((logRes.data as unknown as SEOLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  

  const runOptimization = async (route?: string) => {
    const label = route ?? "all";
    setRunning(label);
    try {
      const { data, error } = await supabase.functions.invoke("seo-manual-optimize", {
        body: route ? { routes: [route] } : {},
      });
      if (error) throw error;
      toast({
        title: data?.queued ? "Optimization started" : "Optimization complete",
        description: data?.queued
          ? "Running in background, refresh in 2-3 minutes to see results."
          : `Processed ${data?.results?.length ?? 0} route(s).`,
      });
      await fetchData();
    } catch (e) {
      toast({
        title: "Optimization failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRunning(null);
    }
  };

  const rollback = async (logId: string) => {
    try {
      const { error } = await supabase.functions.invoke("seo-rollback", { body: { log_id: logId } });
      if (error) throw error;
      toast({ title: "Rolled back", description: "Previous SEO state restored." });
      await fetchData();
    } catch (e) {
      toast({ title: "Rollback failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    }
  };

  const clearOverride = async (path: string) => {
    if (!confirm(`Clear AI override for ${path}? Page will revert to its built-in defaults.`)) return;
    try {
      const { error } = await supabase.functions.invoke("seo-rollback", { body: { clear: path } });
      if (error) throw error;
      toast({ title: "Override cleared", description: path });
      await fetchData();
    } catch (e) {
      toast({ title: "Clear failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    }
  };

  const lastRun = logs[0]?.run_at;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            SEO/AEO Auto-Optimizer
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly AI scan rewrites titles, descriptions, FAQs, and keywords based on trending B2B AI consulting searches. Brand-locked.
          </p>
          {lastRun && (
            <p className="text-xs text-muted-foreground mt-1">
              Last run: {formatDistanceToNow(new Date(lastRun), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            disabled={running !== null}
            onClick={async () => {
              setRunning("aeo-blogs");
              try {
                const { data, error } = await supabase.functions.invoke("generate-aeo-blog-batch", { body: {} });
                if (error) throw error;
                toast({
                  title: data?.queued ? "AEO blog batch started" : "AEO blog batch complete",
                  description: data?.queued
                    ? `Generating ${data?.topic_count ?? 5} posts in background, check the blog in 3-5 minutes.`
                    : `${data?.results?.length ?? 0} posts processed.`,
                });
              } catch (e) {
                toast({ title: "AEO blog batch failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
              } finally {
                setRunning(null);
              }
            }}
          >
            {running === "aeo-blogs" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate AEO Blog Batch
          </Button>
          <Button
            variant="outline"
            disabled={running !== null}
            onClick={async () => {
              setRunning("expand-short");
              try {
                const { data, error } = await supabase.functions.invoke("expand-short-blogs", { body: { threshold: 6000, limit: 10 } });
                if (error) throw error;
                toast({
                  title: "Short blogs expanded",
                  description: `${data?.expanded ?? 0} expanded · ${data?.failed ?? 0} failed (of ${data?.processed ?? 0}). Re-run to keep going.`,
                });
              } catch (e) {
                toast({ title: "Expand failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
              } finally {
                setRunning(null);
              }
            }}
          >
            {running === "expand-short" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Expand Short Blogs
          </Button>
          <Button onClick={() => runOptimization()} disabled={running !== null}>
            {running === "all" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Full Optimization Now
          </Button>
        </div>
      </div>

      {/* Routes table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Optimized Routes ({overrides.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Current Title (live)</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Optimized</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALL_ROUTES.map(path => {
                    const ov = overrides.find(o => o.path === path);
                    return (
                      <TableRow key={path}>
                        <TableCell className="font-mono text-xs">{path}</TableCell>
                        <TableCell className="max-w-md truncate text-sm">
                          {ov?.title ?? <span className="text-muted-foreground italic">page default</span>}
                        </TableCell>
                        <TableCell>
                          {ov ? <Badge variant="secondary">v{ov.version}</Badge> : <Badge variant="outline">, </Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ov ? formatDistanceToNow(new Date(ov.applied_at), { addSuffix: true }) : ", "}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" disabled={running !== null} onClick={() => runOptimization(path)}>
                            {running === path ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          </Button>
                          {ov && (
                            <Button size="sm" variant="outline" onClick={() => clearOverride(path)} title="Clear override">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No optimization runs yet. Click "Run Full Optimization Now" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{formatDistanceToNow(new Date(l.run_at), { addSuffix: true })}</TableCell>
                      <TableCell className="font-mono text-xs">{l.route}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{l.run_type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={l.status === "applied" ? "default" : l.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{l.score_after ?? ", "}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setViewLog(l)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        {l.status === "applied" && Object.keys(l.before || {}).length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => rollback(l.id)} title="Rollback">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff modal */}
      <Dialog open={!!viewLog} onOpenChange={(o) => !o && setViewLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewLog?.route}, Optimization Detail</DialogTitle>
          </DialogHeader>
          {viewLog && (
            <div className="space-y-4 text-sm">
              {viewLog.ai_reasoning && (
                <div>
                  <h4 className="font-semibold mb-1">AI Reasoning</h4>
                  <p className="text-muted-foreground">{viewLog.ai_reasoning}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1 text-xs uppercase text-muted-foreground">Before</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-64">
                    {JSON.stringify(viewLog.before, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-xs uppercase text-muted-foreground">After</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-64">
                    {JSON.stringify(viewLog.after, null, 2)}
                  </pre>
                </div>
              </div>
              {viewLog.trends_used && (
                <details>
                  <summary className="cursor-pointer font-semibold">Trends Used</summary>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-64 mt-2">
                    {JSON.stringify(viewLog.trends_used, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
