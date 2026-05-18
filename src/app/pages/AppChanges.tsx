// Unified change log: shows every HubSpot write the system has performed,
// from both the Co-Pilot and the Hygiene engine, with verified badges,
// before → after diffs, and Undo within 24h.

import { useEffect, useState } from "react";
import { AppLayout } from "../AppLayout";
import { useAccount } from "../lib/useAccount";
import { ChangeDiffCard, type ChangeRow } from "../components/ChangeDiffCard";
import { loadChanges } from "../lib/changes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WINDOWS: Array<{ label: string; ms: number }> = [
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
];

const FILTERS: Array<{ key: "all" | "copilot" | "hygiene"; label: string }> = [
  { key: "all", label: "All sources" },
  { key: "copilot", label: "Co-Pilot" },
  { key: "hygiene", label: "Hygiene" },
];

const AppChanges = () => {
  const { account, loading } = useAccount();
  const { toast } = useToast();
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [windowMs, setWindowMs] = useState(WINDOWS[1].ms);
  const [source, setSource] = useState<"all" | "copilot" | "hygiene">("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!account?.id) return;
    setRefreshing(true);
    try {
      const all = await loadChanges(account.id, account.hubspot_portal_id || null, windowMs);
      setRows(all);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // Poll every 10s so cross-device writes show up
    const i = setInterval(load, 10_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, windowMs]);

  const handleUndo = async (id: string) => {
    if (!confirm("Undo this change in HubSpot? It will revert the affected fields.")) return;
    try {
      const { data, error } = await supabase.functions.invoke("assistant-undo", { body: { action_id: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Change reverted", description: "Reverted in HubSpot." });
      load();
    } catch (e: any) {
      toast({ title: "Undo failed", description: e?.message || "Failed", variant: "destructive" });
    }
  };

  const filtered = source === "all" ? rows : rows.filter((r) => r.source === source);
  const verified = filtered.filter((r) => r.status === "success").length;
  const partial = filtered.filter((r) => r.status === "partial").length;
  const errors = filtered.filter((r) => r.status === "error").length;

  if (loading) {
    return (
      <AppLayout>
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Changes pushed to HubSpot</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every write the system makes, Co-Pilot or Hygiene, verified and undoable.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-card border border-border rounded-md p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.label}
              onClick={() => setWindowMs(w.ms)}
              className={`px-3 py-1 text-xs rounded ${
                windowMs === w.ms ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Last {w.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-md p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setSource(f.key)}
              className={`px-3 py-1 text-xs rounded ${
                source === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs font-mono uppercase text-muted-foreground self-center">
          {filtered.length} change{filtered.length === 1 ? "" : "s"} · {verified} verified
          {partial > 0 && ` · ${partial} partial`}
          {errors > 0 && ` · ${errors} error`}
          {refreshing && " · refreshing"}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No HubSpot changes recorded in this window. Ask the Co-Pilot to update something or run a hygiene fix.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <ChangeDiffCard key={`${row.source}:${row.id}`} row={row} onUndo={handleUndo} />
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default AppChanges;
