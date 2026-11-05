// HMAC token for the Rep / Partner Portal (separate from the admin PIN system).
// Token format: "<expEpochMs>.<role>.<code>.<hmacHex>"  (role = "rep" | "partner")
// Signed payload: `${code}.${role}.${exp}` with the service-role key.

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h

const enc = new TextEncoder();

async function importKey(secret: string) {
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function hmacHex(key: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface PortalClaims {
  code: string;
  role: "rep" | "partner";
  exp: number;
}

export async function signPortalToken(
  code: string,
  role: "rep" | "partner",
  secret: string,
): Promise<{ token: string; exp: number }> {
  const exp = Date.now() + TOKEN_TTL_MS;
  const key = await importKey(secret);
  const sig = await hmacHex(key, `${code}.${role}.${exp}`);
  return { token: `${exp}.${role}.${code}.${sig}`, exp };
}

export async function verifyPortalToken(
  token: string | null,
  secret: string,
): Promise<PortalClaims | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [expStr, role, code, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  if (role !== "rep" && role !== "partner") return null;

  const key = await importKey(secret);
  const expected = await hmacHex(key, `${code}.${role}.${exp}`);
  if (expected.length !== sig.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return mismatch === 0 ? { code, role, exp } : null;
}

export function getPortalTokenFromRequest(req: Request): string | null {
  return req.headers.get("x-portal-token");
}
