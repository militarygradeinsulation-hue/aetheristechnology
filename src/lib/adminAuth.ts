// Lightweight client-side helpers for the PIN-based admin session.
// No Supabase Auth involved. Token is a server-signed HMAC string with an
// embedded expiry (issued by the admin-pin-login edge function).

const TOKEN_KEY = "aetheris_admin_token";
const OWNER_TOKEN_KEY = "aetheris_owner_token";

export function getAdminToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    // Token format: "<expEpochMs>.<hmacHex>"
    const dot = raw.indexOf(".");
    if (dot < 0) return null;
    const exp = Number(raw.slice(0, dot));
    if (!Number.isFinite(exp) || exp < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
  try { sessionStorage.removeItem(OWNER_TOKEN_KEY); } catch { /* noop */ }
}

export function setOwnerToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(OWNER_TOKEN_KEY, token);
    else sessionStorage.removeItem(OWNER_TOKEN_KEY);
  } catch { /* noop */ }
}

export function getOwnerToken(): string | null {
  if (!getAdminToken()) return null;
  try {
    const token = sessionStorage.getItem(OWNER_TOKEN_KEY);
    if (!token) return null;
    const expiry = Number(token.slice(0, token.indexOf('.')));
    if (!Number.isFinite(expiry) || expiry < Date.now()) {
      sessionStorage.removeItem(OWNER_TOKEN_KEY);
      return null;
    }
    return token;
  } catch { return null; }
}

export const hasValidOwnerToken = () => Boolean(getOwnerToken());

export function hasValidAdminToken(): boolean {
  return getAdminToken() !== null;
}
