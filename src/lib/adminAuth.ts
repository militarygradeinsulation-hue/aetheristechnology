// Lightweight client-side helpers for the PIN-based admin session.
// No Supabase Auth involved. Token is a server-signed HMAC string with an
// embedded expiry (issued by the admin-pin-login edge function).

const TOKEN_KEY = "aetheris_admin_token";

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
}

export function hasValidAdminToken(): boolean {
  return getAdminToken() !== null;
}
