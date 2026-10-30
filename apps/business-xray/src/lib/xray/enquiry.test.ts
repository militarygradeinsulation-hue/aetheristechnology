import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBackendEnquiry, buildEnquiryBody, normalizeContactUrl,
  submitBackendEnquiry, validateEnquiry, type EnquiryInput,
} from "./enquiry";

const base: EnquiryInput = {
  tier: "verified",
  name: "Example Owner",
  email: "owner@example.com",
  phone: "(317) 555-0123",
  linkedin: "linkedin.com/in/example-owner",
  website: "example.com",
  business: "Sample Fabrication",
  message: "I'd like to discuss rework.",
  summary: null,
  demo: false,
  consent: true,
};

afterEach(() => vi.unstubAllGlobals());

describe("Business X-Ray direct-send enquiry", () => {
  it("includes the contact information without a mailto URL", () => {
    const msg = buildEnquiryBody(base);
    expect(msg).toContain("Example Owner");
    expect(msg).toContain("owner@example.com");
    expect(msg).toContain("(317) 555-0123");
    expect(msg).toContain("https://linkedin.com/in/example-owner");
    expect(msg).toContain("https://example.com/");
    expect(msg).toContain("not been taken");
  });

  it("validates consent and links before submitting anything", () => {
    expect(validateEnquiry(base)).toBeNull();
    expect(validateEnquiry({ ...base, consent: false })).toMatch(/agree/);
    expect(validateEnquiry({ ...base, email: "invalid" })).toMatch(/valid email/);
    expect(normalizeContactUrl("https://evil-linkedin.com/in/jane", "linkedin")).toBeNull();
    expect(normalizeContactUrl("javascript:alert(1)", "website")).toBeNull();
  });

  it("routes only to the fixed-recipient server function and expects success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", mockFetch);
    const body = buildBackendEnquiry(base, "xray-once");
    await submitBackendEnquiry(body, { url: "https://testing.supabase.co", publishableKey: "public-test-key" });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://testing.supabase.co/functions/v1/notify-contact-submission");
    expect(JSON.parse(options.body).message).toContain("LinkedIn:");
    expect(options.headers.apikey).toBe("public-test-key");
    expect("to" in JSON.parse(options.body)).toBe(false);
  });

  it("never claims email sent when backend returns no success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));
    await expect(submitBackendEnquiry(buildBackendEnquiry(base, "xray-test"), {
      url: "https://testing.supabase.co",
      publishableKey: "public-test-key",
    })).rejects.toThrow(/did not confirm/);
  });

  it("blocks unconfigured direct sender rather than trying a hidden fallback", async () => {
    await expect(submitBackendEnquiry(buildBackendEnquiry(base, "xray-test"), {
      url: "",
      publishableKey: "",
    })).rejects.toThrow(/not configured/);
  });
});
