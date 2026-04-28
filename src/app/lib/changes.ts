// Loader for the unified change log: assistant_actions (Co-Pilot writes)
// UNIONed with hygiene_log (Hygiene engine writes). Returns ChangeRow[]
// shaped for ChangeDiffCard.

import { supabase } from "@/integrations/supabase/client";
import type { ChangeRow } from "../components/ChangeDiffCard";

const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

const objectFromTool = (tool: string): string => {
  if (tool.includes("contact")) return "contact";
  if (tool.includes("company")) return "company";
  if (tool.includes("deal")) return "deal";
  return "deal";
};

export async function loadChanges(accountId: string, portalId: string | null, sinceMs: number): Promise<ChangeRow[]> {
  const sinceIso = new Date(Date.now() - sinceMs).toISOString();

  const [actionsRes, hygieneRes] = await Promise.all([
    supabase
      .from("assistant_actions")
      .select("id,tool_name,args,before_state,after_state,status,affected_count,executed_at,undone_at,error_message,created_at")
      .eq("account_id", accountId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("hygiene_log")
      .select("id,hubspot_object_type,hubspot_object_id,field_changes,success,error_message,executed_at")
      .eq("account_id", accountId)
      .gte("executed_at", sinceIso)
      .order("executed_at", { ascending: false })
      .limit(200),
  ]);

  const fromActions: ChangeRow[] = (actionsRes.data || [])
    .filter((a: any) => a.tool_name?.startsWith("update_") || a.tool_name === "bulk_update_deals" || a.tool_name === "reassign_deals")
    .map((a: any) => {
      const tool = a.tool_name as string;
      const objectType = objectFromTool(tool);
      const before = a.before_state || {};
      const after = a.after_state || {};
      const written = (a.args?.properties || {}) as Record<string, unknown>;
      const verified = (after.hubspot_verified || {}) as { fields?: Record<string, { written: unknown; actual: unknown; match: boolean }> };
      const fieldChanges: ChangeRow["field_changes"] = [];

      if (tool === "update_contact" || tool === "update_deal" || tool === "update_company") {
        for (const k of Object.keys(written)) {
          const beforeVal = (before as any)[k] ?? (before as any)?.properties?.[k] ?? null;
          const v = verified.fields?.[k];
          fieldChanges.push({
            field: k,
            before: beforeVal,
            after: v?.actual ?? written[k],
            verified: v ? v.match : null,
          });
        }
      } else if (tool === "bulk_update_deals") {
        for (const k of Object.keys(written)) {
          fieldChanges.push({ field: k, before: "(varies)", after: written[k], verified: null });
        }
      } else if (tool === "reassign_deals") {
        fieldChanges.push({
          field: "hubspot_owner_id",
          before: a.args?.from_owner_id,
          after: a.args?.to_owner_id,
          verified: null,
        });
      }

      const executedAt = a.executed_at;
      const ageMs = executedAt ? Date.now() - new Date(executedAt).getTime() : Infinity;
      const canUndo =
        (a.status === "success" || a.status === "partial") &&
        !a.undone_at &&
        ageMs < UNDO_WINDOW_MS &&
        (tool === "update_contact" || tool === "update_deal" || tool === "update_company" ||
          tool === "bulk_update_deals" || tool === "reassign_deals");

      const hubspotId =
        tool === "bulk_update_deals" || tool === "reassign_deals"
          ? null
          : (a.args?.hubspot_id ? String(a.args.hubspot_id) : null);

      return {
        id: a.id,
        source: "copilot" as const,
        tool_name: tool,
        object_type: objectType,
        hubspot_id: hubspotId,
        status: (a.undone_at ? "undone" : a.status) as ChangeRow["status"],
        affected_count: a.affected_count,
        field_changes: fieldChanges,
        executed_at: executedAt,
        undone_at: a.undone_at,
        portal_id: portalId,
        error_message: a.error_message,
        can_undo: canUndo,
      };
    });

  const fromHygiene: ChangeRow[] = (hygieneRes.data || []).map((h: any) => {
    const fcs: any[] = Array.isArray(h.field_changes) ? h.field_changes : [];
    return {
      id: h.id,
      source: "hygiene" as const,
      tool_name: h.success ? "hygiene_write" : "hygiene_failed",
      object_type: h.hubspot_object_type,
      hubspot_id: h.hubspot_object_id,
      status: h.success ? "success" : "error",
      affected_count: 1,
      field_changes: fcs.map((c) => ({ field: c.field, before: c.before, after: c.after, verified: null })),
      executed_at: h.executed_at,
      portal_id: portalId,
      error_message: h.error_message,
      can_undo: false, // Hygiene has its own rollback flow
    };
  });

  return [...fromActions, ...fromHygiene].sort((a, b) =>
    (b.executed_at || "").localeCompare(a.executed_at || ""),
  );
}

export async function getChangesCount24h(accountId: string): Promise<{ total: number; verified: number; partial: number; undone: number }> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [actions, hygiene] = await Promise.all([
    supabase
      .from("assistant_actions")
      .select("status,undone_at,tool_name", { count: "exact" })
      .eq("account_id", accountId)
      .gte("created_at", sinceIso),
    supabase
      .from("hygiene_log")
      .select("success", { count: "exact", head: false })
      .eq("account_id", accountId)
      .gte("executed_at", sinceIso),
  ]);
  const writes = (actions.data || []).filter((a: any) =>
    a.tool_name?.startsWith("update_") || a.tool_name === "bulk_update_deals" || a.tool_name === "reassign_deals",
  );
  const verified = writes.filter((a: any) => a.status === "success" && !a.undone_at).length
    + (hygiene.data || []).filter((h: any) => h.success).length;
  const partial = writes.filter((a: any) => a.status === "partial" && !a.undone_at).length;
  const undone = writes.filter((a: any) => !!a.undone_at).length;
  const total = writes.length + (hygiene.data || []).length;
  return { total, verified, partial, undone };
}
