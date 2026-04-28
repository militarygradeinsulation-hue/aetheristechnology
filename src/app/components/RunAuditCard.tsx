import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  accountId: string;
  hasData: boolean;
}

const STAGES = [
  { key: "patterns", label: "Pattern detection" },
  { key: "diagnostics", label: "Diagnostics" },
  { key: "prioritization", label: "Prioritization" },
  { key: "recommendations", label: "Recommendations" },
  { key: "report", label: "Final report" },
];

export const RunAuditCard = ({ accountId, hasData }: Props) => {
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>("patterns");
  const [stageMessage, setStageMessage] = useState<string>("");
  const [autoNavigate, setAutoNavigate] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Detect any in-flight audit for this account on mount / account change.
  // This makes the running state visible across devices, not just on the
  // browser tab that kicked it off.
  useEffect(() => {
    let cancelled = false;
    const detect = async () => {
      const { data } = await supabase
        .from("audit_runs")
        .select("id,status,current_stage,progress")
        .eq("account_id", accountId)
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setRunId(data.id);
      setRunning(true);
      setCurrentStage(data.current_stage || "patterns");
      setStageMessage((data.progress as any)?.message || "");
    };
    detect();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Poll for status while running (works whether this device started the run or another did)
  useEffect(() => {
    if (!runId || !running) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("audit_runs")
        .select("status,current_stage,progress,error_message")
        .eq("id", runId)
        .maybeSingle();
      if (!data) return;
      setCurrentStage(data.current_stage || "patterns");
      setStageMessage((data.progress as any)?.message || "");
      if (data.status === "complete") {
        clearInterval(interval);
        setRunning(false);
        toast({ title: "Audit complete", description: "Opening your revenue leak report..." });
        if (autoNavigate) navigate(`/app/reports/${runId}`);
      } else if (data.status === "failed") {
        clearInterval(interval);
        setRunning(false);
        toast({ title: "Audit failed", description: data.error_message || "Try again.", variant: "destructive" });
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [runId, running, navigate, toast, autoNavigate]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-audit", { body: { account_id: accountId } });
      if (error) throw error;
      setRunId(data.audit_run_id);
    } catch (err: any) {
      setRunning(false);
      toast({ title: "Couldn't start audit", description: err.message, variant: "destructive" });
    }
  };

  if (!hasData) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Revenue Leak Audit</h3>
        </div>
        <p className="text-sm text-muted-foreground">Connect HubSpot or load demo data in Settings to enable the audit engine.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Revenue Leak Audit</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Run pattern detection across your CRM and get an executive-level report with 30-day recovery plans.
      </p>

      {!running ? (
        <Button onClick={handleRun} size="lg" className="gap-2">
          Run Revenue Leak Audit
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <div className="space-y-3">
          {STAGES.map((s, i) => {
            const currentIdx = STAGES.findIndex(x => x.key === currentStage);
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-3 text-sm">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={isCurrent ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/60"}>
                  {s.label}
                  {isCurrent && stageMessage && <span className="text-muted-foreground ml-2">— {stageMessage}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
