// Lightweight helper: lets an Operator-app user attach a rep/partner/claim code
// so anything they run in the app auto-syncs into their Portal Library via the
// `extension-portal-save` edge function (same bridge the Chrome extension uses).
import { supabase } from "@/integrations/supabase/client";

const KEY = "aetheris_operator_portal_code";

export function getPortalSyncCode(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && v.trim() ? v.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function setPortalSyncCode(code: string) {
  const clean = code.trim().toUpperCase();
  if (!clean) {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, clean);
  }
  try { window.dispatchEvent(new Event("operator-portal-code-changed")); } catch {}
}

export function clearPortalSyncCode() {
  localStorage.removeItem(KEY);
  try { window.dispatchEvent(new Event("operator-portal-code-changed")); } catch {}
}

export interface PortalSyncPayload {
  tool_type: string;
  title: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  file_url?: string | null;
  lead_id?: string | null;
}

/** Syncs a work item to the current user's Rep/Partner Portal Library. No-op if no code set. */
export async function syncToPortal(payload: PortalSyncPayload): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const accessCode = getPortalSyncCode();
  if (!accessCode) return { ok: false, skipped: true };
  try {
    const { data, error } = await supabase.functions.invoke("extension-portal-save", {
      body: { accessCode, ...payload },
    });
    if (error) return { ok: false, error: error.message };
    if (!data?.ok) return { ok: false, error: data?.error || "Sync failed" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
