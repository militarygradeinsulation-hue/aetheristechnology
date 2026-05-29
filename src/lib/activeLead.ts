// Active Lead context — when a rep opens a lead in LeadsBoard we stash a
// snapshot here so any tool the rep opens next (Workbench, Detective Mode,
// Website Scanner, etc.) can auto-fill url/business/contact instead of
// forcing manual re-entry. Cleared explicitly via clearActiveLead().
import { useEffect, useState } from "react";
import { leadClues } from "@/lib/leadClues";

const STORAGE_KEY = "aetheris.activeLead";
const EVENT = "activelead:change";

export interface ActiveLead {
  leadId: string;
  business_name?: string;
  website?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  industry?: string;
  location?: string;
  setAt: number;
}

export function getActiveLead(): ActiveLead | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v?.leadId) return v as ActiveLead;
  } catch { /* ignore */ }
  return null;
}

export function setActiveLead(lead: Omit<ActiveLead, "setAt"> | null) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!lead) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const payload: ActiveLead = { ...lead, setAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* ignore */ }
}

export function clearActiveLead() { setActiveLead(null); }

export function useActiveLead(): ActiveLead | null {
  const [lead, setLead] = useState<ActiveLead | null>(() => getActiveLead());
  useEffect(() => {
    const onChange = () => setLead(getActiveLead());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return lead;
}

/**
 * Hook for any tool that wants to auto-fill from the active lead.
 * Fires `apply(lead)` once per (leadId, toolKey) pair, then logs a clue
 * to the lead's trail so the trip from "lead → tool" is recorded.
 */
export function useActiveLeadAutofill(
  toolKey: string,
  apply: (lead: ActiveLead) => void,
) {
  const lead = useActiveLead();
  useEffect(() => {
    if (!lead?.leadId) return;
    const sigKey = `aetheris.autofill.${toolKey}.${lead.leadId}`;
    try {
      if (localStorage.getItem(sigKey)) return;
      apply(lead);
      localStorage.setItem(sigKey, String(lead.setAt));
      leadClues.log(lead.leadId, {
        kind: "tool_autofill",
        label: `Auto-filled ${toolKey} from ${lead.business_name || lead.website || "lead"}`,
        tool_key: toolKey,
        meta: { source: "active_lead" },
      });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.leadId, lead?.setAt, toolKey]);
  return lead;
}
