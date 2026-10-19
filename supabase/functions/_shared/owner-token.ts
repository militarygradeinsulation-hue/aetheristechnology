// Owner-only credentials are issued only after the master admin PIN succeeds.
// Partner PINs receive a regular admin session, never an owner session.
const encoder = new TextEncoder();

export async function signOwnerToken(pin: string, secret: string, exp: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${pin}.owner-icp.${exp}`));
  const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${exp}.${hex}`;
}

export async function verifyOwnerToken(req: Request): Promise<boolean> {
  const token = req.headers.get("x-owner-token");
  const pin = Deno.env.get("ADMIN_PIN");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!pin || !secret || !token || token.length > 140) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^\\d+$/.test(parts[0]) || !/^[0-9a-f]{64}$/.test(parts[1])) return false;
  const expiry = Number(parts[0]);
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now() || expiry > Date.now() + 12 * 60 * 60 * 1000) return false;
  const expected = await signOwnerToken(pin, secret, expiry);
  const a = encoder.encode(expected);
  const b = encoder.encode(token);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
