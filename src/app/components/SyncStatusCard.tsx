import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, AlertTriangle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Account } from "../lib/useAccount";

interface SyncStatusCardProps {
  account: Account;
  onRefresh: () => void;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
};

const STALE_MS = 2 * 60 * 1000; // 2 minutes without heartbeat = stalled

export const SyncStatusCard = ({ account, onRefresh }: SyncStatusCardProps) => {
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [counts, setCounts] = useState<{ contacts: number; deals: number; owners: number; companies: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  // Live counts of mirrored data — confirms the sync is actually writing rows
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [c, d, o, co] = await Promise.all([
        supabase.from("mirror_contacts").select("*", { count: "exact", head: true }).eq("account_id", account.id),
        supabase.from("mirror_deals").select("*", { count: "exact", head: true }).eq("account_id", account.id),
        supabase.from("mirror_owners").select("*", { count: "exact", head: true }).eq("account_id", account.id),
        supabase.from("mirror_companies").select("*", { count: "exact", head: true }).eq("account_id", account.id),
      ]);
      if (!cancelled) {
        setCounts({
          contacts: c.count ?? 0,
          deals: d.count ?? 0,
          owners: o.count ?? 0,
          companies: co.count ?? 0,
        });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [account.id, account.last_sync_at, account.sync_progress]);

  const status = account.last_sync_status;
  const progress = (account.sync_progress as { percent?: number; phase?: string; heartbeat?: string; contacts?: number; deals?: number; cursor?: unknown }) || {};
  const heartbeatAge = progress.heartbeat ? now - new Date(progress.heartbeat).getTime() : Infinity;
  const isRunning = status === "running";
  const isStalled = isRunning && heartbeatAge > STALE_MS;
  const neverSynced = !account.last_sync_at;
  const canResume = !!progress.cursor;

  const startSync = async (mode: "initial" | "incremental" | "resume") => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("hubspot-sync", {
        body: { account_id: account.id, mode },
      });
      if (error) throw error;
      toast({
        title:
          mode === "initial"
            ? "Full scan started"
            : mode === "resume"
            ? "Resuming sync"
            : "Sync started",
        description:
          mode === "initial"
            ? "Pulling 18 months of contacts, deals, and owners. This runs in the background and may take several minutes."
            : "Running in the background — safe to close this tab.",
      });
      setTimeout(onRefresh, 1500);
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Sync status</div>
          <div className="flex items-center gap-2">
            {isStalled ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : isRunning ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : status === "error" ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : neverSynced ? (
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
            <span className="font-medium capitalize">
              {isStalled ? "Stalled" : neverSynced && !isRunning ? "Never synced" : status || "Idle"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Last sync: {formatDate(account.last_sync_at)}</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {neverSynced && !isRunning && (
            <Button
              size="sm"
              onClick={() => startSync("initial")}
              disabled={syncing}
              className="gap-2"
            >
              <PlayCircle className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Run full initial sync
            </Button>
          )}
          {(!neverSynced || isRunning || isStalled) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                startSync(isStalled && canResume ? "resume" : neverSynced ? "initial" : "incremental")
              }
              disabled={syncing || (isRunning && !isStalled)}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {isStalled ? "Restart sync" : "Sync now"}
            </Button>
          )}
        </div>
      </div>

      {isRunning && progress.percent !== undefined && (
        <div className="space-y-2">
          <Progress value={progress.percent} className="h-1.5" />
          <div className="text-xs text-muted-foreground">
            {progress.phase || "Syncing"} · {progress.percent}%
            {progress.contacts !== undefined && ` · ${progress.contacts.toLocaleString()} contacts`}
            {progress.deals !== undefined && ` · ${progress.deals.toLocaleString()} deals`}
          </div>
        </div>
      )}

      {isStalled && (
        <div className="mt-3 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
          No progress for {Math.round(heartbeatAge / 60000)} min. The sync may have been interrupted. Click <strong>Restart sync</strong> to resume.
        </div>
      )}

      {account.last_sync_error && !isRunning && (
        <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
          {account.last_sync_error}
        </div>
      )}

      {/* Reconnect hint when companies haven't been pulled — likely missing scope */}
      {counts && counts.companies === 0 && !neverSynced && status === "success" && (
        <div className="mt-3 text-xs text-muted-foreground bg-muted/30 border border-border rounded-md p-2">
          No companies mirrored. If you recently expanded permissions, disconnect and reconnect HubSpot to grant the new scopes (companies, lists).
        </div>
      )}

      {/* Diagnostic counts — confirms data is actually flowing */}
      {counts && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold">{counts.contacts.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Contacts</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{counts.companies.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Companies</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{counts.deals.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Deals</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{counts.owners.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Owners</div>
          </div>
        </div>
      )}
    </div>
  );
};
