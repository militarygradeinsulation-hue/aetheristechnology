// Shared HMAC token verifier for PIN-based admin endpoints.
// Token format: "<expEpochMs>.<hmacHex>" signed over "<PIN>.<exp>".

const ADMIN_PIN = Deno.env.get("ADMIN_PIN");
if (!ADMIN_PIN) {
  console.error("ADMIN_PIN env var not configured");
}

export async function verifyAdminToken(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = await crypto.subtle.sign("HMAC", key, enc.encode(`${ADMIN_PIN}.${exp}`));
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare
  if (expectedHex.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getAdminTokenFromRequest(req: Request): string | null {
  return req.headers.get("x-admin-token");
}
