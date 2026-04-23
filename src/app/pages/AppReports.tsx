import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileSearch, ArrowRight, Loader2 } from "lucide-react";
import { AppLayout } from "../AppLayout";
import { useAccount } from "../lib/useAccount";
import { supabase } from "@/integrations/supabase/client";

interface AuditRun {
  id: string;
  status: string;
  current_stage: string | null;
  total_exposure_cents: number | null;
  findings_count: number | null;
  started_at: string;
  completed_at: string | null;
}

const AppReports = () => {
  const { account, loading } = useAccount();
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  useEffect(() => {
    if (!account?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("audit_runs")
        .select("id,status,current_stage,total_exposure_cents,findings_count,started_at,completed_at")
        .eq("account_id", account.id)
        .order("started_at", { ascending: false });
      setRuns((data as AuditRun[]) || []);
      setLoadingRuns(false);
    };
    load();
  }, [account?.id]);

  if (loading) {
    return <AppLayout><div className="h-8 w-48 bg-muted rounded animate-pulse" /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Audits</h1>
        <p className="text-sm text-muted-foreground mt-1">Past revenue leak audit reports</p>
      </div>

      {loadingRuns ? (
        <div className="h-32 bg-muted rounded animate-pulse" />
      ) : runs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileSearch className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No audits yet. Run your first audit from the dashboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(run => (
            <Link
              key={run.id}
              to={`/app/reports/${run.id}`}
              className="flex items-center justify-between p-5 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium">
                    {new Date(run.started_at).toLocaleString()}
                  </span>
                  <StatusBadge status={run.status} />
                </div>
                {run.status === "complete" ? (
                  <p className="text-sm text-muted-foreground">
                    {run.findings_count} findings · ${((run.total_exposure_cents || 0) / 100).toLocaleString()} exposure
                  </p>
                ) : run.status === "running" ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {run.current_stage || "Running..."}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{run.current_stage || "Pending"}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    complete: "bg-primary/10 text-primary border-primary/20",
    running: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    pending: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${map[status] || map.pending}`}>
      {status}
    </span>
  );
};

export default AppReports;
