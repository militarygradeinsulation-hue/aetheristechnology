// Safe internal "return to" mechanism shared by every Nexus entry point.
// Never allows open redirects: only same-origin, path-only destinations pass.

const KEY = "aetheris_return_to";

/** Serialize the current location (pathname + search + hash) into a safe token. */
export function currentReturnTo(loc?: { pathname: string; search?: string; hash?: string }): string {
  const l = loc ?? (typeof window !== "undefined"
    ? { pathname: window.location.pathname, search: window.location.search, hash: window.location.hash }
    : { pathname: "/", search: "", hash: "" });
  return `${l.pathname}${l.search ?? ""}${l.hash ?? ""}`;
}

/**
 * Validate a returnTo candidate. Returns null when it is not a safe internal
 * path (protocol-relative, absolute URL, backslash tricks, empty).
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = String(raw).trim();
  if (!v) return null;
  // Reject anything that could resolve to another origin.
  if (v.startsWith("//") || v.startsWith("\\")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null;
  if (!v.startsWith("/")) return null;
  if (v.includes("\\")) return null;
  // Collapse accidental double slashes at the start of the path.
  v = v.replace(/^\/{2,}/, "/");
  return v;
}

export function storeReturnTo(path: string): void {
  const safe = sanitizeReturnTo(path);
  if (!safe || typeof window === "undefined") return;
  try { window.sessionStorage.setItem(KEY, safe); } catch { /* ignore */ }
}

export function takeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sanitizeReturnTo(window.sessionStorage.getItem(KEY));
    if (v) window.sessionStorage.removeItem(KEY);
    return v;
  } catch { return null; }
}

/** Read returnTo from a query string first, then the stored fallback. */
export function resolveReturnTo(search: string, fallback = "/"): string {
  let fromQuery: string | null = null;
  try { fromQuery = sanitizeReturnTo(new URLSearchParams(search).get("returnTo")); } catch { /* ignore */ }
  return fromQuery ?? takeReturnTo() ?? fallback;
}

/** Build a /login link that comes back to `returnTo`. */
export function loginUrlFor(returnTo: string, base = "/login"): string {
  const safe = sanitizeReturnTo(returnTo) ?? "/";
  return `${base}?returnTo=${encodeURIComponent(safe)}`;
}

/** Absolute same-origin URL for OAuth redirect_uri, guaranteed internal. */
export function absoluteReturnUrl(returnTo: string): string {
  const safe = sanitizeReturnTo(returnTo) ?? "/";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${safe}`;
}
