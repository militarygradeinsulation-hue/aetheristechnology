// Rep ID linking used by Nexus (and any other in-page entry point).
// Canonical rep session lives in the existing portal session (portalAuth);
// a guest-entered code is parked until authentication and attached exactly once.

import { setPortalSession, getPortalProfile, type PortalProfile } from "@/lib/portalAuth";

const PENDING_KEY = "aetheris_pending_rep_code";
const ATTACHED_KEY = "aetheris_rep_attached";

export interface RepLinkResult {
  ok: boolean;
  profile?: PortalProfile;
  error?: string;
}

export function normalizeRepCode(raw: string): string {
  return String(raw || "").replace(/[^0-9]/g, "").slice(0, 12);
}

export function isValidRepCodeFormat(code: string): boolean {
  return /^\d{4,12}$/.test(code);
}

/** Validate a rep code against the portal login function and store the session. */
export async function linkRepCode(
  rawCode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RepLinkResult> {
  const code = normalizeRepCode(rawCode);
  if (!isValidRepCodeFormat(code)) {
    return { ok: false, error: "Enter your 6 digit Rep ID." };
  }
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rep-portal-login`;
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.token || !data?.profile) {
      return { ok: false, error: data?.error || "That Rep ID is not active." };
    }
    setPortalSession(data.token, data.profile as PortalProfile);
    clearPendingRepCode();
    return { ok: true, profile: data.profile as PortalProfile };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not verify that Rep ID." };
  }
}

/** Rep identity currently linked in this browser, if any. */
export function linkedRep(): PortalProfile | null {
  return getPortalProfile();
}

export function setPendingRepCode(code: string): void {
  const c = normalizeRepCode(code);
  if (!isValidRepCodeFormat(c)) return;
  try { localStorage.setItem(PENDING_KEY, c); } catch { /* ignore */ }
}

export function getPendingRepCode(): string | null {
  try {
    const v = localStorage.getItem(PENDING_KEY);
    return v && isValidRepCodeFormat(v) ? v : null;
  } catch { return null; }
}

export function clearPendingRepCode(): void {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

/** True when this user id already had a pending code attached (idempotency guard). */
export function alreadyAttached(userId: string): boolean {
  try {
    const raw = localStorage.getItem(ATTACHED_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, string>;
    return typeof map?.[userId] === "string";
  } catch { return false; }
}

function markAttached(userId: string, code: string): void {
  try {
    const raw = localStorage.getItem(ATTACHED_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[userId] = code;
    localStorage.setItem(ATTACHED_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

/**
 * Attach a guest-entered rep code once the visitor authenticates.
 * No-ops (returns null) when there is nothing pending or it was already done,
 * so it can never create duplicate attribution.
 */
export async function attachPendingRepCode(
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RepLinkResult | null> {
  if (!userId) return null;
  const pending = getPendingRepCode();
  if (!pending) return null;
  if (alreadyAttached(userId)) { clearPendingRepCode(); return null; }
  const result = await linkRepCode(pending, fetchImpl);
  if (result.ok) markAttached(userId, pending);
  return result;
}
