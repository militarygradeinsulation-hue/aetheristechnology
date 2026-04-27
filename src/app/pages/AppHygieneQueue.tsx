import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, CheckCheck, Eye, X, Loader2, Download, StopCircle, Plug, RefreshCw } from "lucide-react";
import { AppLayout } from "../AppLayout";
import { HygieneSubNav } from "../components/HygieneSubNav";
import { useAccount } from "../lib/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  HygieneActionRow, severityClass, confidenceLabel, categoryDisplay,
  sortActions, type HygieneQueueView,
} from "../lib/hygiene";
import { HygieneRecordReviewDialog } from "../components/HygieneRecordReviewDialog";
import { HygieneMergeDialog } from "../components/HygieneMergeDialog";

const AppHygieneQueue = () => {
  const { account, loading } = useAccount();
  const { toast } = useToast();
  const [actions, setActions] = useState<HygieneActionRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmAction, setConfirmAction] = useState<HygieneActionRow | null>(null);
  const [reviewAction, setReviewAction] = useState<HygieneActionRow | null>(null);
  const [mergeAction, setMergeAction] = useState<HygieneActionRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // View mode (locked once chosen — list won't reshuffle on poll)
  const VIEW_KEY = "hygiene_queue_view";
  const [view, setView] = useState<HygieneQueueView>(() => {
    if (typeof window === "undefined") return "priority";
    const v = localStorage.getItem(VIEW_KEY) as HygieneQueueView | null;
    return v === "newest" || v === "status" || v === "priority" ? v : "priority";
  });
  // Locked order: actionId -> position. New rows append; existing rows never move.
  const orderRef = useRef<Map<string, number>>(new Map());
  const orderViewRef = useRef<HygieneQueueView>(view);
  const [resortNonce, setResortNonce] = useState(0);

  // List view never needs the full affected_record_ids array (can be 5,000
  // hubspot_id strings per row). Polling that every 2s while a job is running
  // froze the UI. Fetch the IDs on-demand inside the dialogs / export handler.
  const LIST_COLUMNS =
    "id, scan_id, account_id, category, category_label, confidence, severity, " +
    "risk_level, approval_mode, recommended_action, affected_count, status, " +
    "progress, error_message, created_at, approved_at, executed_at";

  const load = async () => {
    if (!account?.id) return;
    // Watchdog: reset any actions stuck in `executing` for 15+ min
    // (edge function died/timed out before clearing status).
    await supabase.rpc("reset_stuck_hygiene_actions", { _stale_minutes: 15 });
    const { data } = await supabase
      .from("hygiene_actions")
      .select(LIST_COLUMNS)
      .eq("account_id", account.id)
      .in("status", ["pending", "approved", "executing", "failed"])
      .order("created_at", { ascending: false });
    const rows = ((data as unknown) as HygieneActionRow[]) || [];
    // List rows don't carry affected_record_ids — keep the shape stable so
    // downstream code that touches `.length` doesn't blow up.
    for (const r of rows) if (!r.affected_record_ids) r.affected_record_ids = [];
    setActions(rows);
  };

  // On-demand loader for the (potentially large) affected_record_ids column.
  const fetchActionIds = async (id: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from("hygiene_actions")
      .select("affected_record_ids")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return [];
    return (data.affected_record_ids as string[]) || [];
  };

  useEffect(() => { load(); }, [account?.id]);
  useEffect(() => {
    const anyRunning = actions.some((a) => a.status === "executing");
    if (!anyRunning) return;
    const i = setInterval(load, 2000);
    return () => clearInterval(i);
  }, [actions]);

  const grouped = useMemo(() => actions, [actions]);

  const skipCategory = async (a: HygieneActionRow) => {
    await supabase.from("hygiene_actions").update({ status: "skipped" }).eq("id", a.id);
    toast({ title: "Category skipped" });
    load();
  };

  const cancelAction = async (a: HygieneActionRow) => {
    await supabase
      .from("hygiene_actions")
      .update({
        status: "cancelled",
        error_message: "Cancelled by user",
        executed_at: new Date().toISOString(),
      })
      .eq("id", a.id);
    toast({ title: "Stopping...", description: "The job will halt within a few seconds." });
    load();
  };

  const approveAll = async (a: HygieneActionRow) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("hygiene-execute", {
        body: { action_id: a.id },
      });
      if (error) throw error;
      toast({
        title: "Execution started",
        description: `Updating ${a.affected_count.toLocaleString()} records in HubSpot...`,
      });
      setConfirmAction(null);
      load();
    } catch (err: any) {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = async (a: HygieneActionRow) => {
    const ids = a.affected_record_ids?.length ? a.affected_record_ids : await fetchActionIds(a.id);
    const rows = ["hubspot_id"].concat(ids).join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${a.category}-records.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Hydrate affected_record_ids before opening dialogs that need them.
  const openReview = async (a: HygieneActionRow) => {
    const ids = a.affected_record_ids?.length ? a.affected_record_ids : await fetchActionIds(a.id);
    setReviewAction({ ...a, affected_record_ids: ids });
  };
  const openMerge = async (a: HygieneActionRow) => {
    const ids = a.affected_record_ids?.length ? a.affected_record_ids : await fetchActionIds(a.id);
    setMergeAction({ ...a, affected_record_ids: ids });
  };

  if (loading) return <AppLayout><div className="h-8 w-48 bg-muted rounded animate-pulse" /></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Action Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve detected fixes. High-confidence batches can be approved at once; medium/low confidence requires per-record review.
        </p>
      </div>

      <HygieneSubNav />

      {grouped.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No pending actions. Run a scan from the Scan tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((a) => {
            const meta = categoryDisplay[a.category];
            const isExpanded = expanded[a.id];
            const isExecuting = a.status === "executing";
            const isMissing = a.recommended_action?.fix_kind === "flag_missing";
            const isMerge = a.recommended_action?.fix_kind === "merge_duplicates";
            const progress = isExecuting && a.progress?.total
              ? Math.round(((a.progress.processed || 0) / a.progress.total) * 100)
              : 0;

            return (
              <div key={a.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded({ ...expanded, [a.id]: !isExpanded })}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{meta?.label || a.category_label}</span>
                      <span className="text-xs text-muted-foreground">— {a.affected_count.toLocaleString()} records</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded border ${severityClass(a.severity)}`}>{a.severity}</span>
                      <span className="text-xs px-2 py-0.5 rounded border bg-muted/50 text-muted-foreground border-border">
                        {confidenceLabel(a.confidence, a.recommended_action?.fix_kind)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded border bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                        {a.approval_mode === "batch" ? "Batch approve" : "Review individually"}
                      </span>
                      {isExecuting && (
                        <span className="text-xs flex items-center gap-1 text-blue-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {a.progress?.processed || 0} / {a.progress?.total || 0}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isExecuting && (
                  <div className="px-4 pb-3 space-y-2">
                    <Progress value={progress} className="h-1.5" />
                    <div className="flex justify-end">
                      <Button
                        onClick={(e) => { e.stopPropagation(); cancelAction(a); }}
                        variant="outline"
                        size="sm"
                        className="gap-2 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                      >
                        <StopCircle className="h-3.5 w-3.5" />
                        Stop
                      </Button>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="border-t border-border p-4 bg-background/40">
                    {a.recommended_action?.rationale && (
                      <p className="text-sm text-muted-foreground mb-4">
                        <span className="text-foreground font-medium">{a.recommended_action.label}.</span>{" "}
                        {a.recommended_action.rationale}
                      </p>
                    )}

                    {a.status === "failed" && a.error_message && (
                      <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                        <div className="text-sm text-rose-300 font-medium mb-1">Last run failed</div>
                        <div className="text-xs text-rose-300/80 mb-3 break-words">{a.error_message}</div>
                        {/MISSING_SCOPES|missing.*scopes|missing write scopes/i.test(a.error_message) && (
                          <Button
                            asChild
                            size="sm"
                            className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                          >
                            <Link to="/app/settings?connect=hubspot">
                              <Plug className="h-3.5 w-3.5" />
                              Reconnect HubSpot
                            </Link>
                          </Button>
                        )}
                      </div>
                    )}

                    {isMissing ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Enrichment integrations (Apollo, Clay) arrive in Phase 2. For now, export the affected records and enrich externally.
                        </p>
                        <Button onClick={() => exportCsv(a)} variant="outline" size="sm" className="gap-2">
                          <Download className="h-3.5 w-3.5" />
                          Export {a.affected_count.toLocaleString()} records to CSV
                        </Button>
                      </div>
                    ) : isMerge ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => openMerge(a)}
                          disabled={isExecuting}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
                          size="sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review &amp; merge duplicates
                        </Button>
                        <Button onClick={() => exportCsv(a)} variant="ghost" size="sm" className="gap-2">
                          <Download className="h-3.5 w-3.5" />
                          Export duplicate IDs
                        </Button>
                        <Button onClick={() => skipCategory(a)} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                          <X className="h-3.5 w-3.5" />
                          Skip for now
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {a.approval_mode === "batch" ? (
                          <Button
                            onClick={() => setConfirmAction(a)}
                            disabled={isExecuting}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
                            size="sm"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Approve all ({a.affected_count.toLocaleString()})
                          </Button>
                        ) : (
                          <Button
                            onClick={() => openReview(a)}
                            disabled={isExecuting}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Review &amp; approve
                          </Button>
                        )}
                        <Button onClick={() => exportCsv(a)} variant="ghost" size="sm" className="gap-2">
                          <Download className="h-3.5 w-3.5" />
                          Export CSV
                        </Button>
                        <Button onClick={() => skipCategory(a)} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                          <X className="h-3.5 w-3.5" />
                          Skip category
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm execution</DialogTitle>
            <DialogDescription>
              {confirmAction && (
                <>
                  You are about to update <span className="font-semibold text-foreground">{confirmAction.affected_count.toLocaleString()}</span> records in HubSpot.
                  Each change is logged and can be rolled back from History. Records are processed one at a time at ~9 per second.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground mb-1">{confirmAction?.recommended_action?.label}</div>
            <div>{confirmAction?.recommended_action?.rationale}</div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              onClick={() => confirmAction && approveAll(confirmAction)}
              disabled={submitting}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm — Execute All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewAction && (
        <HygieneRecordReviewDialog
          action={reviewAction}
          open={!!reviewAction}
          onClose={() => setReviewAction(null)}
          onComplete={load}
        />
      )}

      {mergeAction && (
        <HygieneMergeDialog
          action={mergeAction}
          open={!!mergeAction}
          onClose={() => setMergeAction(null)}
          onComplete={load}
        />
      )}
    </AppLayout>
  );
};

export default AppHygieneQueue;
