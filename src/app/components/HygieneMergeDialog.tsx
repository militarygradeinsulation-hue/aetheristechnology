import { useEffect, useMemo, useState } from "react";
import { Loader2, Check, ChevronLeft, ChevronRight, AlertTriangle, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { HygieneActionRow } from "../lib/hygiene";

type MirrorContact = {
  hubspot_id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  lifecycle_stage?: string | null;
  created_date?: string | null;
  last_activity_date?: string | null;
  properties?: Record<string, any> | null;
};

interface Props {
  action: HygieneActionRow;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const HygieneMergeDialog = ({ action, open, onClose, onComplete }: Props) => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<string[][]>([]);
  const [recordMap, setRecordMap] = useState<Record<string, MirrorContact>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [groupIdx, setGroupIdx] = useState(0);
  // For each group, hubspot_id of the chosen master, and which others to merge in.
  const [masters, setMasters] = useState<Record<number, string>>({});
  const [merging, setMerging] = useState<Record<number, Record<string, boolean>>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setGroupIdx(0);
    setMasters({});
    setMerging({});
    setSkipped({});
    (async () => {
      setLoading(true);
      try {
        // Find scan -> read duplicate_contacts.details.groups
        const { data: scan } = await supabase
          .from("hygiene_scans")
          .select("results")
          .eq("id", action.scan_id)
          .maybeSingle();
        const cat = (scan?.results as any)?.duplicate_contacts;
        const rawGroups: string[][] = Array.isArray(cat?.details?.groups) ? cat.details.groups : [];
        // Defensive: keep groups of 2+ only, dedupe within each group
        const cleaned = rawGroups
          .map((g) => Array.from(new Set(g)))
          .filter((g) => g.length >= 2);
        setGroups(cleaned);

        // Pre-pick the oldest record (or first) as master per group
        const m: Record<number, string> = {};
        const ids = Array.from(new Set(cleaned.flat()));
        if (ids.length > 0) {
          const { data: recs } = await supabase
            .from("mirror_contacts")
            .select("*")
            .eq("account_id", action.account_id)
            .in("hubspot_id", ids);
          const map: Record<string, MirrorContact> = {};
          for (const r of (recs as unknown as MirrorContact[]) || []) map[r.hubspot_id] = r;
          setRecordMap(map);

          cleaned.forEach((g, i) => {
            const sorted = [...g].sort((a, b) => {
              const da = map[a]?.created_date || "9999";
              const db = map[b]?.created_date || "9999";
              return da.localeCompare(db);
            });
            m[i] = sorted[0];
          });
          setMasters(m);

          // By default, merge all non-master records
          const mer: Record<number, Record<string, boolean>> = {};
          cleaned.forEach((g, i) => {
            mer[i] = {};
            for (const id of g) mer[i][id] = id !== m[i];
          });
          setMerging(mer);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, action.id]);

  const totalGroups = groups.length;
  const currentGroup = groups[groupIdx] || [];
  const currentMaster = masters[groupIdx];

  const setMaster = (id: string) => {
    setMasters((p) => ({ ...p, [groupIdx]: id }));
    setMerging((p) => {
      const next = { ...(p[groupIdx] || {}) };
      for (const oid of currentGroup) next[oid] = oid !== id;
      return { ...p, [groupIdx]: next };
    });
  };

  const toggleMerge = (id: string) => {
    if (id === currentMaster) return;
    setMerging((p) => ({
      ...p,
      [groupIdx]: { ...(p[groupIdx] || {}), [id]: !(p[groupIdx]?.[id] ?? false) },
    }));
  };

  const skipGroup = () => {
    setSkipped((p) => ({ ...p, [groupIdx]: true }));
    if (groupIdx < totalGroups - 1) setGroupIdx(groupIdx + 1);
  };

  const stagedMerges = useMemo(() => {
    const out: Array<{ primary: string; secondary: string }> = [];
    groups.forEach((g, i) => {
      if (skipped[i]) return;
      const primary = masters[i];
      if (!primary) return;
      for (const id of g) {
        if (id !== primary && merging[i]?.[id]) out.push({ primary, secondary: id });
      }
    });
    return out;
  }, [groups, masters, merging, skipped]);

  const submit = async () => {
    if (stagedMerges.length === 0) {
      toast({ title: "Nothing to merge", description: "Pick at least one group with merge candidates." });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("hygiene-execute", {
        body: { action_id: action.id, merges: stagedMerges },
      });
      if (error) throw error;
      toast({
        title: "Merge started",
        description: `Merging ${stagedMerges.length} duplicate${stagedMerges.length === 1 ? "" : "s"} in HubSpot...`,
      });
      onComplete();
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to start merge", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Merge duplicate contacts</DialogTitle>
          <DialogDescription>
            Pick the master record for each duplicate group. Other records will be merged into it. Merges are{" "}
            <span className="text-amber-300">irreversible</span> in HubSpot.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading duplicate groups...
          </div>
        ) : totalGroups === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No duplicate groups available. The scan may not have stored detailed group data.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
              <div>
                Group {groupIdx + 1} of {totalGroups}
                {skipped[groupIdx] && <span className="ml-2 text-rose-400">(skipped)</span>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={groupIdx === 0} onClick={() => setGroupIdx(groupIdx - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" disabled={groupIdx >= totalGroups - 1} onClick={() => setGroupIdx(groupIdx + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(currentGroup.length, 3)}, minmax(0, 1fr))` }}>
                {currentGroup.map((id) => {
                  const r = recordMap[id];
                  const isMaster = currentMaster === id;
                  const willMerge = merging[groupIdx]?.[id] && !isMaster;
                  return (
                    <div
                      key={id}
                      className={`border rounded-lg p-3 text-xs space-y-2 transition-colors ${
                        isMaster
                          ? "border-cyan-500/40 bg-cyan-500/5"
                          : willMerge
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-background/40 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground truncate">#{id}</span>
                        {isMaster && (
                          <span className="flex items-center gap-1 text-cyan-300 text-[10px] font-semibold uppercase">
                            <Crown className="h-3 w-3" /> Master
                          </span>
                        )}
                      </div>
                      <Field label="Email" value={r?.email} />
                      <Field label="Name" value={`${r?.first_name || ""} ${r?.last_name || ""}`.trim()} />
                      <Field label="Phone" value={(r?.properties as any)?.phone} />
                      <Field label="Lifecycle" value={r?.lifecycle_stage} />
                      <Field label="Created" value={r?.created_date ? new Date(r.created_date).toLocaleDateString() : null} />
                      <Field label="Last activity" value={r?.last_activity_date ? new Date(r.last_activity_date).toLocaleDateString() : null} />
                      <div className="flex flex-col gap-1 pt-2 border-t border-border">
                        {!isMaster && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setMaster(id)}
                            className="h-7 text-xs"
                          >
                            Make master
                          </Button>
                        )}
                        {!isMaster && (
                          <Button
                            size="sm"
                            variant={willMerge ? "default" : "ghost"}
                            onClick={() => toggleMerge(id)}
                            className={`h-7 text-xs ${willMerge ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                          >
                            {willMerge ? "Will merge ✓" : "Skip this one"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded p-3 flex items-start gap-2 text-xs text-amber-200/80">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  HubSpot will keep the master record and copy/merge field data + associations from the others. The merged-away IDs will no longer exist in HubSpot.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
              <button onClick={skipGroup} className="hover:text-foreground">Skip this group</button>
              <div className="text-foreground font-medium">
                {stagedMerges.length} merge{stagedMerges.length === 1 ? "" : "s"} staged across all groups
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={submitting || stagedMerges.length === 0 || loading}
            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Merge {stagedMerges.length} duplicate{stagedMerges.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="truncate">{value || <span className="text-muted-foreground italic">—</span>}</div>
  </div>
);
