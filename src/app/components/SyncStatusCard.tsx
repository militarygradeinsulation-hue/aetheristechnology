import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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

export const SyncStatusCard = ({ account, onRefresh }: SyncStatusCardProps) => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const status = account.last_sync_status;
  const progress = (account.sync_progress as { percent?: number; phase?: string }) || {};
  const isRunning = status === "running";

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("hubspot-sync", {
        body: { account_id: account.id, mode: "incremental" },
      });
      if (error) throw error;
      toast({ title: "Sync started", description: "Refreshing data from HubSpot." });
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
            {isRunning ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : status === "error" ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
            <span className="font-medium capitalize">{status || "Idle"}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Last sync: {formatDate(account.last_sync_at)}</div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || isRunning} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sync now
        </Button>
      </div>

      {isRunning && progress.percent !== undefined && (
        <div className="space-y-2">
          <Progress value={progress.percent} className="h-1.5" />
          <div className="text-xs text-muted-foreground">
            {progress.phase || "Syncing"} · {progress.percent}%
          </div>
        </div>
      )}

      {account.last_sync_error && (
        <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
          {account.last_sync_error}
        </div>
      )}
    </div>
  );
};
