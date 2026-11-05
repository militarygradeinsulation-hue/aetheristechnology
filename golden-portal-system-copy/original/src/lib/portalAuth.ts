// Lightweight client-side helpers for the Rep / Partner Portal session.
// Token issued by `rep-portal-login` edge function. Stored in localStorage.

const TOKEN_KEY = "aetheris_portal_token";
const PROFILE_KEY = "aetheris_portal_profile";

export interface PortalProfile {
  code: string;
  rep_name: string;
  rep_email: string | null;
  commission_rate: number;
  total_sales_cents: number;
  total_commission_cents: number;
  role: "rep" | "partner";
}

export function getPortalToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const dot = raw.indexOf(".");
    if (dot < 0) return null;
    const exp = Number(raw.slice(0, dot));
    if (!Number.isFinite(exp) || exp < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PROFILE_KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function getPortalProfile(): PortalProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PortalProfile;
  } catch {
    return null;
  }
}

export function setPortalSession(token: string, profile: PortalProfile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearPortalSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function hasValidPortalSession(): boolean {
  return getPortalToken() !== null && getPortalProfile() !== null;
}
