import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

async function setup() {
  const secret = "test-only-signing-secret";
  const pin = "test-only-pin";
  let handler: ((req: Request) => Promise<Response>) | undefined;
  vi.stubGlobal("Deno", {
    env: { get: (key: string) => ({ ADMIN_PIN: pin, SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_ROLE_KEY: secret })[key] },
    serve: (fn: typeof handler) => { handler = fn; },
  });
  const auth = await import("../../../supabase/functions/_shared/admin-token");
  const query = { select: () => query, order: () => query, limit: async () => ({ data: [], error: null }), eq: () => query, maybeSingle: async () => ({ data: { id: "collective" }, error: null }) };
  const createClient = vi.fn(() => ({ from: () => query }));
  const source = readFileSync("supabase/functions/golden-report-brain/index.ts", "utf8").replace(/^import .*;\s*$/gm, "");
  new Function("createClient", "verifyAdminToken", "getAdminTokenFromRequest", source)(createClient, auth.verifyAdminToken, auth.getAdminTokenFromRequest);
  if (!handler) throw new Error("Handler was not registered");
  const call = handler;
  const sign = async (expiry: number) => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${pin}.${expiry}`));
    return `${expiry}.${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("")}`;
  };
  const request = (token?: string) => call(new Request("https://example.invalid", { headers: token ? { "x-admin-token": token } : {} }));
  return { request, sign, createClient };
}

describe("Collective Brain signed admin access", () => {
  it("accepts a valid signed admin session and returns aggregates", async () => {
    const { request, sign, createClient } = await setup();
    const response = await request(await sign(Date.now() + 60_000));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ patterns: [], pairs: [], state: { id: "collective" } });
    expect(createClient).toHaveBeenCalledOnce();
  });
  it("rejects missing sessions before accessing the database", async () => {
    const { request, createClient } = await setup();
    expect((await request()).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("rejects forged sessions before accessing the database", async () => {
    const { request, createClient } = await setup();
    expect((await request(`${Date.now() + 60_000}.${"0".repeat(64)}`)).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("rejects expired signed sessions before accessing the database", async () => {
    const { request, sign, createClient } = await setup();
    expect((await request(await sign(Date.now() - 60_000))).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });
});