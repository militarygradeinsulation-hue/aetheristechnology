import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Undo2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { AppLayout } from "../AppLayout";
import { HygieneSubNav } from "../components/HygieneSubNav";
import { useAccount } from "../lib/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { HygieneActionRow, HygieneLogRow, categoryDisplay } from "../lib/hygiene";

const AppHygieneHistory = () => {
  const { account, loading } = useAccount();
  const { toast } = useToast();
  const [actions, setActions] = useState<HygieneActionRow[]>([]);
  const [logs, setLogs] = useState<HygieneLogRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const load = async () => {
    if (!account?.id) return;
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase.from("hygiene_actions").select("*").eq("account_id", account.id)
        .in("status", ["executed", "failed", "skipped"]).order("executed_at", { ascending: false }).limit(100),
      supabase.from("hygiene_log").select("*").eq("account_id", account.id)
        .order("executed_at", { ascending: false }).limit(500),
    ]);
    setActions(((a as unknown) as HygieneActionRow[]) || []);
    setLogs(((l as unknown) as HygieneLogRow[]) || []);
  };

  useEffect(() => { load(); }, [account?.id]);

  const logsByAction = useMemo(() => {
    const m: Record<string, HygieneLogRow[]> = {};
    for (const log of logs) (m[log.action_id] ||= []).push(log);
    return m;
  }, [logs]);

  const rollbackOne = async (log: HygieneLogRow) => {
    setRollingBack(log.id);
    try {
      const { error } = await supabase.functions.invoke("hygiene-rollback", { body: { log_id: log.id } });
      if (error) throw error;
      toast({ title: "Rollback queued", description: "Restoring original value in HubSpot..." });
      setTimeout(load, 1500);
    } catch (err: any) {
      toast({ title: "Rollback failed", description: err.message, variant: "destructive" });
    } finally {
      setRollingBack(null);
    }
  };

  const rollbackBatch = async (actionId: string) => {
    if (!confirm("Roll back every change from this batch? Each record will be restored to its previous value in HubSpot.")) return;
    setRollingBack(actionId);
    try {
      const { error } = await supabase.functions.invoke("hygiene-rollback", { body: { action_id: actionId } });
      if (error) throw error;
      toast({ title: "Batch rollback queued" });
      setTimeout(load, 2000);
    } catch (err: any) {
      toast({ title: "Rollback failed", description: err.message, variant: "destructive" });
    } finally {
      setRollingBack(null);
    }
  };

  if (loading) return <AppLayout><div className="h-8 w-48 bg-muted rounded animate-pulse" /></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Hygiene History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Past executions, change logs, and one-click rollback for any record or batch.
        </p>
      </div>

      <HygieneSubNav />

      {actions.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No history yet. Approved actions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((a) => {
            const meta = categoryDisplay[a.category];
            const aLogs = logsByAction[a.id] || [];
            const successCount = aLogs.filter((l) => l.success && !l.rolled_back_at).length;
            const failedCount = aLogs.filter((l) => !l.success).length;
            const rolledBack = aLogs.filter((l) => l.rolled_back_at).length;
            const isOpen = expanded[a.id];

            return (
              <div key={a.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded({ ...expanded, [a.id]: !isOpen })}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{meta?.label || a.category_label}</span>
                      <span className="text-xs text-muted-foreground">{a.executed_at && new Date(a.executed_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" />{successCount} updated</span>
                      {failedCount > 0 && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-rose-400" />{failedCount} failed</span>}
                      {rolledBack > 0 && <span className="flex items-center gap-1"><Undo2 className="h-3 w-3 text-amber-400" />{rolledBack} rolled back</span>}
                    </div>
                  </div>
                  {successCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); rollbackBatch(a.id); }}
                      disabled={rollingBack === a.id}
                      className="gap-2"
                    >
                      {rollingBack === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                      Roll back batch
                    </Button>
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-border max-h-96 overflow-auto">
                    {aLogs.length === 0 ? (
                      <p className="p-4 text-xs text-muted-foreground">No log entries.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-secondary/30 text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2">Object</th>
                            <th className="text-left px-3 py-2">Field changes</th>
                            <th className="text-left px-3 py-2">Status</th>
                            <th className="text-right px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {aLogs.slice(0, 100).map((log) => (
                            <tr key={log.id} className="border-t border-border">
                              <td className="px-3 py-2 font-mono">{log.hubspot_object_type}/{log.hubspot_object_id}</td>
                              <td className="px-3 py-2">
                                {log.field_changes?.length ? (
                                  log.field_changes.slice(0, 3).map((c, i) => (
                                    <div key={i} className="text-muted-foreground">
                                      <span className="text-foreground">{c.field}:</span>{" "}
                                      <span className="line-through text-rose-400">{String(c.before ?? ", ").slice(0, 40)}</span>
                                      {" → "}
                                      <span className="text-emerald-400">{String(c.after ?? ", ").slice(0, 40)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">, </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {log.rolled_back_at ? (
                                  <span className="text-amber-400">Rolled back</span>
                                ) : log.success ? (
                                  <span className="text-emerald-400">Success</span>
                                ) : (
                                  <span className="text-rose-400" title={log.error_message || ""}>Failed</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {log.success && !log.rolled_back_at && (
                                  <Button
                                    size="sm" variant="ghost"
                                    disabled={rollingBack === log.id}
                                    onClick={() => rollbackOne(log)}
                                    className="h-7 gap-1.5"
                                  >
                                    {rollingBack === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                                    Undo
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default AppHygieneHistory;
