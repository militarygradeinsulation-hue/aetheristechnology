import { useEffect, useMemo, useState } from "react";
import { Loader2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { HygieneActionRow, HygieneFixKind } from "../lib/hygiene";

const PAGE_SIZE = 50;

type MirrorRecord = {
  hubspot_id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  lifecycle_stage?: string | null;
  properties?: Record<string, any> | null;
};

interface Props {
  action: HygieneActionRow;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// Mirrors the server-side `computeUpdates` so users can preview changes.
function proposeUpdates(fixKind: HygieneFixKind | undefined, before: Record<string, any>): Record<string, string> {
  const u: Record<string, string> = {};
  if (!fixKind) return u;
  switch (fixKind) {
    case "lowercase_email":
    case "trim_whitespace":
      if (before.email && before.email !== before.email.trim().toLowerCase())
        u.email = before.email.trim().toLowerCase();
      if (before.firstname && before.firstname !== before.firstname.trim())
        u.firstname = before.firstname.trim();
      if (before.lastname && before.lastname !== before.lastname.trim())
        u.lastname = before.lastname.trim();
      if (before.firstname) {
        const v = before.firstname.trim();
        if (v === v.toLowerCase() || v === v.toUpperCase()) u.firstname = titleCase(v);
      }
      if (before.lastname) {
        const v = before.lastname.trim();
        if (v === v.toLowerCase() || v === v.toUpperCase()) u.lastname = titleCase(v);
      }
      break;
    case "title_case_name":
      if (before.firstname) u.firstname = titleCase(before.firstname.trim());
      if (before.lastname) u.lastname = titleCase(before.lastname.trim());
      break;
    case "format_phone":
      if (before.phone) {
        const digits = String(before.phone).replace(/\D/g, "");
        if (digits.length === 10) u.phone = `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        else if (digits.length === 11 && digits.startsWith("1"))
          u.phone = `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
      }
      break;
    case "fix_lifecycle":
      // Heuristic: bump from lead → marketingqualifiedlead when we have any deal; the AI rationale
      // explains the suggestion but the user picks the right value here.
      if (before.lifecyclestage === "lead") u.lifecyclestage = "marketingqualifiedlead";
      break;
  }
  return u;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  firstname: "First name",
  lastname: "Last name",
  phone: "Phone",
  lifecyclestage: "Lifecycle stage",
  name: "Company name",
};

export const HygieneRecordReviewDialog = ({ action, open, onClose, onComplete }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<MirrorRecord[]>([]);
  const [page, setPage] = useState(0);
  // edits[hubspot_id] = { field: newValue }; absent => use original (skip)
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const fixKind = action.recommended_action?.fix_kind as HygieneFixKind | undefined;
  const objectType =
    (action.recommended_action as any)?.object_type === "company" ? "company" : "contact";

  const ids = action.affected_record_ids || [];
  const totalPages = Math.max(1, Math.ceil(ids.length / PAGE_SIZE));
  const pageIds = useMemo(() => ids.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [ids, page]);

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setEdits({});
    setSelected({});
  }, [open, action.id]);

  useEffect(() => {
    if (!open || pageIds.length === 0) return;
    (async () => {
      setLoading(true);
      try {
        const table = objectType === "company" ? "mirror_companies" : "mirror_contacts";
        const { data } = await supabase
          .from(table)
          .select("*")
          .eq("account_id", action.account_id)
          .in("hubspot_id", pageIds);
        const list = ((data as unknown) as MirrorRecord[]) || [];
        setRecords(list);

        // Pre-populate edits with proposed updates and select rows that have changes
        const newEdits: Record<string, Record<string, string>> = {};
        const newSel: Record<string, boolean> = {};
        for (const rec of list) {
          const before = flattenBefore(rec, objectType);
          const proposed = proposeUpdates(fixKind, before);
          if (Object.keys(proposed).length > 0) {
            newEdits[rec.hubspot_id] = proposed;
            newSel[rec.hubspot_id] = true;
          }
        }
        setEdits((prev) => ({ ...prev, ...newEdits }));
        setSelected((prev) => ({ ...prev, ...newSel }));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, pageIds.join("|"), action.account_id]);

  const toggleAll = (val: boolean) => {
    const next = { ...selected };
    for (const r of records) {
      if (edits[r.hubspot_id] && Object.keys(edits[r.hubspot_id]).length > 0) next[r.hubspot_id] = val;
    }
    setSelected(next);
  };

  const updateField = (id: string, field: string, val: string) => {
    setEdits((p) => ({ ...p, [id]: { ...(p[id] || {}), [field]: val } }));
  };

  const removeField = (id: string, field: string) => {
    setEdits((p) => {
      const copy = { ...(p[id] || {}) };
      delete copy[field];
      const next = { ...p, [id]: copy };
      if (Object.keys(copy).length === 0) {
        setSelected((s) => ({ ...s, [id]: false }));
      }
      return next;
    });
  };

  const approvedIds = Object.keys(selected).filter(
    (id) => selected[id] && edits[id] && Object.keys(edits[id]).length > 0,
  );

  const submit = async () => {
    if (approvedIds.length === 0) {
      toast({ title: "Nothing selected", description: "Pick at least one record to update." });
      return;
    }
    setSubmitting(true);
    try {
      const modifications: Record<string, Record<string, string>> = {};
      for (const id of approvedIds) modifications[id] = edits[id];

      const { error } = await supabase.functions.invoke("hygiene-execute", {
        body: { action_id: action.id, record_ids: approvedIds, modifications },
      });
      if (error) throw error;
      toast({
        title: "Execution started",
        description: `Updating ${approvedIds.length} record${approvedIds.length === 1 ? "" : "s"} in HubSpot...`,
      });
      onComplete();
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review &amp; approve — {action.recommended_action?.label}</DialogTitle>
          <DialogDescription>
            Inspect each proposed change. Uncheck rows you want to skip; edit values inline. Only checked rows will be sent to HubSpot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
          <div>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, ids.length)} of {ids.length.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleAll(true)} className="hover:text-foreground">Select all</button>
            <span>·</span>
            <button onClick={() => toggleAll(false)} className="hover:text-foreground">Clear</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading records...
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No records on this page.</div>
          ) : (
            records.map((rec) => {
              const before = flattenBefore(rec, objectType);
              const recEdits = edits[rec.hubspot_id] || {};
              const hasChanges = Object.keys(recEdits).length > 0;
              const sel = !!selected[rec.hubspot_id] && hasChanges;
              return (
                <div
                  key={rec.hubspot_id}
                  className={`border rounded-lg p-3 ${sel ? "border-cyan-500/30 bg-cyan-500/5" : "border-border bg-background/40"}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={sel}
                      disabled={!hasChanges}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [rec.hubspot_id]: !!v }))}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium truncate">
                          {rec.email || `${rec.first_name || ""} ${rec.last_name || ""}`.trim() || "(no name)"}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">#{rec.hubspot_id}</div>
                      </div>
                      {!hasChanges ? (
                        <div className="text-xs text-muted-foreground italic">No changes proposed for this record.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(recEdits).map(([field, newVal]) => {
                            const oldVal = String(before[field] ?? "");
                            return (
                              <div key={field} className="grid grid-cols-[100px_1fr_auto_1fr_auto] gap-2 items-center text-xs">
                                <Label className="text-muted-foreground">{FIELD_LABELS[field] || field}</Label>
                                <div className="text-muted-foreground line-through truncate">{oldVal || "(empty)"}</div>
                                <span className="text-cyan-400">→</span>
                                <Input
                                  value={newVal}
                                  onChange={(e) => updateField(rec.hubspot_id, field, e.target.value)}
                                  className="h-7 text-xs"
                                />
                                <button
                                  onClick={() => removeField(rec.hubspot_id, field)}
                                  className="text-muted-foreground hover:text-rose-400"
                                  title="Skip this field"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>Page {page + 1} of {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="text-foreground font-medium">
            {approvedIds.length} record{approvedIds.length === 1 ? "" : "s"} selected
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={submitting || approvedIds.length === 0}
            className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Apply {approvedIds.length} update{approvedIds.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Flattens a mirror_contacts / mirror_companies row into the HubSpot property shape
// the server's `computeUpdates` works against.
function flattenBefore(rec: MirrorRecord, objectType: "contact" | "company"): Record<string, any> {
  const props = rec.properties || {};
  if (objectType === "company") {
    return { name: (props as any).name, ...props };
  }
  return {
    email: rec.email,
    firstname: rec.first_name,
    lastname: rec.last_name,
    lifecyclestage: rec.lifecycle_stage,
    phone: (props as any).phone,
    ...props,
  };
}
