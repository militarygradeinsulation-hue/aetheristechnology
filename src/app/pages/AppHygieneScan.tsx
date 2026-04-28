import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, AlertCircle, ArrowRight, StopCircle, ChevronDown, DollarSign } from "lucide-react";
import { AppLayout } from "../AppLayout";
import { HygieneSubNav } from "../components/HygieneSubNav";
import { useAccount } from "../lib/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  HygieneScanRow,
  categoryDisplay,
  severityClass,
  confidenceLabel,
  HygieneActionRow,
  hygieneCostModels,
  estimateCategoryCost,
  formatUsd,
} from "../lib/hygiene";

const AppHygieneScan = () => {
  const { account, loading } = useAccount();
  const { toast } = useToast();
  const [latestScan, setLatestScan] = useState<HygieneScanRow | null>(null);
  const [actions, setActions] = useState<HygieneActionRow[]>([]);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const loadLatest = async () => {
    if (!account?.id) return;
    const { data } = await supabase
      .from("hygiene_scans")
      .select("*")
      .eq("account_id", account.id)
      .order("scan_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatestScan((data as unknown as HygieneScanRow) || null);
    if (data) {
      const { data: acts } = await supabase
        .from("hygiene_actions")
        .select("*")
        .eq("scan_id", data.id);
      setActions(((acts as unknown) as HygieneActionRow[]) || []);
    }
  };

  useEffect(() => { loadLatest(); }, [account?.id]);

  // Poll while running
  useEffect(() => {
    if (!latestScan || latestScan.status !== "running") return;
    const i = setInterval(loadLatest, 3000);
    return () => clearInterval(i);
  }, [latestScan?.id, latestScan?.status]);

  const runScan = async () => {
    if (!account) return;
    setStarting(true);
    try {
      const { error } = await supabase.functions.invoke("hygiene-scan", {
        body: { account_id: account.id },
      });
      if (error) throw error;
      toast({ title: "Hygiene scan started", description: "Detecting issues across your CRM..." });
      await loadLatest();
    } catch (err: any) {
      toast({ title: "Scan failed to start", description: err.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const stopScan = async () => {
    if (!latestScan?.id || !account?.id) return;
    setStopping(true);
    try {
      const { error } = await supabase.functions.invoke("hygiene-scan", {
        body: { action: "cancel", account_id: account.id, scan_id: latestScan.id },
      });
      if (error) throw error;
      toast({ title: "Scan stopped", description: "The hygiene scan was cancelled." });
      setLatestScan({ ...latestScan, status: "cancelled", ai_status: "cancelled", error_message: "Cancelled by user", completed_at: new Date().toISOString() });
      await loadLatest();
    } catch (err: any) {
      toast({ title: "Could not stop scan", description: err.message, variant: "destructive" });
    } finally {
      setStopping(false);
    }
  };

  const sortedCategories = useMemo(() => {
    if (!latestScan?.results) return [];
    return Object.values(latestScan.results)
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [latestScan]);

  const actionByCategory = useMemo(() => {
    const m: Record<string, HygieneActionRow> = {};
    for (const a of actions) m[a.category] = a;
    return m;
  }, [actions]);

  if (loading) return <AppLayout><div className="h-8 w-48 bg-muted rounded animate-pulse" /></AppLayout>;

  const isRunning = latestScan?.status === "running";

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Data Hygiene</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detect, review, and fix CRM data quality issues with one click.
        </p>
      </div>

      <HygieneSubNav />

      {/* Run scan card */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <h2 className="font-semibold">Hygiene Scan</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {isRunning
                ? "Scanning your CRM for data quality issues across 8 categories..."
                : latestScan
                ? `Last scan: ${new Date(latestScan.scan_date).toLocaleString()} — ${latestScan.total_issues.toLocaleString()} issues found.`
                : "Run your first scan to surface duplicates, formatting issues, owner gaps, stale records, and more."}
            </p>
            {isRunning && (
              <div className="mt-4">
                <Progress value={latestScan?.ai_status === "running" ? 80 : 40} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {latestScan?.ai_status === "running" ? "Categorizing findings with AI..." : "Detecting patterns..."}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Button
              onClick={runScan}
              disabled={starting || isRunning || !account}
              className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
            >
              {starting || isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isRunning ? "Scanning..." : latestScan ? "Run again" : "Run Hygiene Scan"}
            </Button>
            {isRunning && (
              <Button
                onClick={stopScan}
                disabled={stopping}
                variant="outline"
                size="sm"
                className="gap-2 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
              >
                {stopping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
                Stop scan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {(latestScan?.status === "failed" || latestScan?.status === "cancelled") && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-rose-300">Scan failed</p>
            <p className="text-xs text-rose-300/70 mt-1">{latestScan.error_message}</p>
          </div>
        </div>
      )}

      {latestScan?.status === "complete" && sortedCategories.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No data quality issues detected. Your CRM is clean. 🎉</p>
        </div>
      )}

      {latestScan?.status === "complete" && sortedCategories.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {sortedCategories.map((r) => {
            const meta = categoryDisplay[r.category];
            const action = actionByCategory[r.category];
            const conf = action?.confidence || "medium";
            return (
              <div key={r.category} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold">{meta?.label || r.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta?.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${severityClass(r.severity)}`}>
                    {r.severity}
                  </span>
                </div>
                <div className="text-3xl font-semibold mb-1">{r.count.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mb-4">
                  {confidenceLabel(conf, action?.recommended_action?.fix_kind)}
                  {action?.recommended_action?.rationale && (
                    <span className="block mt-1 italic">{action.recommended_action.rationale}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                  asChild
                >
                  <a href="/app/hygiene/queue">
                    Review in Action Queue
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default AppHygieneScan;
