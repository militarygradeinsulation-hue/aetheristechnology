class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}
const g = globalThis as Record<string, unknown>;
g.localStorage = new MemStorage();
g.sessionStorage = new MemStorage();
g.window = { localStorage: g.localStorage, sessionStorage: g.sessionStorage, location: { origin: "https://aetheris.technology", pathname: "/aetheris-ai", search: "", hash: "" } };

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  sanitizeReturnTo, resolveReturnTo, storeReturnTo, takeReturnTo, loginUrlFor, currentReturnTo,
} from "@/lib/nexusReturn";
import {
  normalizeRepCode, isValidRepCodeFormat, linkRepCode, setPendingRepCode, getPendingRepCode,
  attachPendingRepCode, linkedRep, clearPendingRepCode,
} from "@/lib/repLink";
import { clearPortalSession } from "@/lib/portalAuth";

const NEXUS = "/aetheris-ai/thread-123?report=abc#leak-4";

const okResponse = (code = "123456") => ({
  ok: true,
  json: async () => ({
    ok: true,
    token: `${Date.now() + 60000}.rep.${code}.deadbeef`,
    profile: {
      code, rep_name: "Dean Young", rep_email: null, commission_rate: 0.4,
      total_sales_cents: 0, total_commission_cents: 0, role: "rep",
    },
  }),
}) as unknown as Response;

const badResponse = () => ({
  ok: true,
  json: async () => ({ ok: false, error: "Invalid or inactive code" }),
}) as unknown as Response;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearPortalSession();
  clearPendingRepCode();
});

describe("returnTo safety", () => {
  it("keeps full nexus location (path, query, hash)", () => {
    expect(sanitizeReturnTo(NEXUS)).toBe(NEXUS);
    expect(currentReturnTo({ pathname: "/aetheris-ai", search: "?rep=1", hash: "#x" })).toBe("/aetheris-ai?rep=1#x");
  });

  it("rejects open redirects", () => {
    for (const bad of ["https://evil.com", "//evil.com", "\\\\evil.com", "javascript:alert(1)", "evil.com", ""]) {
      expect(sanitizeReturnTo(bad)).toBeNull();
    }
  });

  it("resolves from query then storage then fallback", () => {
    expect(resolveReturnTo(`?returnTo=${encodeURIComponent(NEXUS)}`)).toBe(NEXUS);
    storeReturnTo(NEXUS);
    expect(resolveReturnTo("")).toBe(NEXUS);
    expect(takeReturnTo()).toBeNull(); // consumed once, no redirect loop
    expect(resolveReturnTo("")).toBe("/");
  });

  it("never routes home or to a dashboard when a nexus return exists", () => {
    const url = loginUrlFor(NEXUS);
    expect(url).toContain("returnTo=");
    expect(resolveReturnTo(url.slice(url.indexOf("?")))).toBe(NEXUS);
    expect(resolveReturnTo(url.slice(url.indexOf("?")))).not.toBe("/");
  });

  it("ignores an attacker supplied returnTo and falls back", () => {
    expect(resolveReturnTo("?returnTo=https%3A%2F%2Fevil.com")).toBe("/");
  });
});

describe("rep id linking", () => {
  it("normalizes and validates format", () => {
    expect(normalizeRepCode(" 12-34 56 ")).toBe("123456");
    expect(isValidRepCodeFormat("123456")).toBe(true);
    expect(isValidRepCodeFormat("12")).toBe(false);
  });

  it("links a valid rep id and persists it across reloads", async () => {
    const f = vi.fn().mockResolvedValue(okResponse());
    const r = await linkRepCode("123456", f as unknown as typeof fetch);
    expect(r.ok).toBe(true);
    expect(r.profile?.rep_name).toBe("Dean Young");
    expect(linkedRep()?.code).toBe("123456"); // read back from storage = survives reload
  });

  it("returns an inline error for invalid or inactive ids and never silently fails", async () => {
    const r1 = await linkRepCode("12", vi.fn() as unknown as typeof fetch);
    expect(r1.ok).toBe(false);
    expect(r1.error).toBeTruthy();
    const r2 = await linkRepCode("999999", vi.fn().mockResolvedValue(badResponse()) as unknown as typeof fetch);
    expect(r2.ok).toBe(false);
    expect(r2.error).toContain("Invalid");
    expect(linkedRep()).toBeNull();
  });

  it("guest rep id is attached exactly once after sign in (no duplicate attribution)", async () => {
    setPendingRepCode("123456");
    expect(getPendingRepCode()).toBe("123456");
    const f = vi.fn().mockResolvedValue(okResponse());
    const first = await attachPendingRepCode("user-1", f as unknown as typeof fetch);
    expect(first?.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    const second = await attachPendingRepCode("user-1", f as unknown as typeof fetch);
    expect(second).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
    expect(getPendingRepCode()).toBeNull();
  });

  it("no pending code means no attach call at all", async () => {
    const f = vi.fn();
    expect(await attachPendingRepCode("user-2", f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
