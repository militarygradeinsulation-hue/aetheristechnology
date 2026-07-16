import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileSearch, ArrowRight, Loader2, Trash2, RotateCcw, X } from "lucide-react";
import { AppLayout } from "../AppLayout";
import { useAccount } from "../lib/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface AuditRun {
  id: string;
  status: string;
  current_stage: string | null;
  total_exposure_cents: number | null;
  findings_count: number | null;
  started_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

const AppReports = () => {
  const { account, loading } = useAccount();
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [view, setView] = useState<"active" | "trash">("active");

  const load = async () => {
    if (!account?.id) return;
    setLoadingRuns(true);
    const { data } = await supabase
      .from("audit_runs")
      .select("id,status,current_stage,total_exposure_cents,findings_count,started_at,completed_at,deleted_at")
      .eq("account_id", account.id)
      .order("started_at", { ascending: false });
    setRuns((data as AuditRun[]) || []);
    setLoadingRuns(false);
  };

  useEffect(() => { load(); }, [account?.id]);

  const softDelete = async (id: string) => {
    const { error } = await supabase
      .from("audit_runs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast({ title: "Could not move to trash", description: error.message, variant: "destructive" });
    toast({ title: "Moved to trash" });
    load();
  };

  const restore = async (id: string) => {
    const { error } = await supabase
      .from("audit_runs")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) return toast({ title: "Could not restore", description: error.message, variant: "destructive" });
    toast({ title: "Audit restored" });
    load();
  };

  const hardDelete = async (id: string) => {
    if (!confirm("Permanently delete this audit? This cannot be undone.")) return;
    const { error } = await supabase.from("audit_runs").delete().eq("id", id);
    if (error) return toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    toast({ title: "Audit permanently deleted" });
    load();
  };

  const emptyTrash = async () => {
    const trashed = runs.filter(r => r.deleted_at);
    if (trashed.length === 0) return;
    if (!confirm(`Permanently delete all ${trashed.length} audit(s) in the trash? This cannot be undone.`)) return;
    const { error } = await supabase
      .from("audit_runs")
      .delete()
      .in("id", trashed.map(r => r.id));
    if (error) return toast({ title: "Could not empty trash", description: error.message, variant: "destructive" });
    toast({ title: "Trash emptied" });
    load();
  };

  if (loading) {
    return <AppLayout><div className="h-8 w-48 bg-muted rounded animate-pulse" /></AppLayout>;
  }

  const visible = runs.filter(r => view === "trash" ? !!r.deleted_at : !r.deleted_at);
  const trashCount = runs.filter(r => !!r.deleted_at).length;

  return (
    <AppLayout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Audits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {view === "active" ? "Past revenue leak audit reports" : "Deleted audits, restore or remove permanently"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
            <button
              onClick={() => setView("active")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === "active" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Active
            </button>
            <button
              onClick={() => setView("trash")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${view === "trash" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Trash2 className="h-3 w-3" />
              Trash {trashCount > 0 && <span className="text-[10px] bg-muted-foreground/20 px-1.5 rounded">{trashCount}</span>}
            </button>
          </div>
          {view === "trash" && trashCount > 0 && (
            <Button variant="outline" size="sm" onClick={emptyTrash} className="text-destructive hover:text-destructive">
              Empty trash
            </Button>
          )}
        </div>
      </div>

      {loadingRuns ? (
        <div className="h-32 bg-muted rounded animate-pulse" />
      ) : visible.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          {view === "trash" ? (
            <>
              <Trash2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Trash is empty.</p>
            </>
          ) : (
            <>
              <FileSearch className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No audits yet. Run your first audit from the dashboard.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(run => (
            <div
              key={run.id}
              className="group flex items-center gap-3 p-5 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors"
            >
              {view === "active" ? (
                <Link to={`/app/reports/${run.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <RunMeta run={run} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ) : (
                <div className="flex-1 min-w-0">
                  <RunMeta run={run} />
                  {run.deleted_at && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Deleted {new Date(run.deleted_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                {view === "active" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.preventDefault(); softDelete(run.id); }}
                    title="Move to trash"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => restore(run.id)}
                      title="Restore"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => hardDelete(run.id)}
                      title="Delete permanently"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

const RunMeta = ({ run }: { run: AuditRun }) => (
  <>
    <div className="flex items-center gap-3 mb-1">
      <span className="font-medium">{new Date(run.started_at).toLocaleString()}</span>
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
  </>
);

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
