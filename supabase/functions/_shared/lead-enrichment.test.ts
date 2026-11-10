import { afterEach, describe, expect, it, vi } from "vitest";
import { enrichLeadFromWebsite } from "./lead-enrichment.ts";

const page = (markdown: string) => new Response(JSON.stringify({
  success: true, data: { markdown },
}), { status: 200, headers: { "Content-Type": "application/json" } });

afterEach(() => { vi.unstubAllGlobals(); });

describe("manual lead enrichment Firecrawl budget", () => {
  it("stops after the homepage when a same-domain person email is found", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_endpoint: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)).url);
      return page("Meet Jane Doe, Founder. Email: jane.doe@example.com");
    }));
    const lead = await enrichLeadFromWebsite("https://example.com", "test-key");
    expect(lead.email).toBe("jane.doe@example.com");
    expect(requests).toEqual(["https://example.com"]);
  });

  it("limits manual research to two pages, even if neither has contact data", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_endpoint: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)).url);
      return page("Company description with no contact details.");
    }));
    const lead = await enrichLeadFromWebsite("https://example.com", "test-key");
    expect(lead.email).toBeUndefined();
    expect(requests).toEqual(["https://example.com", "https://example.com/contact"]);
  });

  it("keeps a generic business mailbox when no person email is published", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_endpoint: string, init?: RequestInit) => {
      const url = JSON.parse(String(init?.body)).url;
      requests.push(url);
      return page(url.endsWith("/contact") ? "Email our team: info@example.com" : "Welcome to Example");
    }));
    const lead = await enrichLeadFromWebsite("example.com", "test-key");
    expect(lead.email).toBe("info@example.com");
    expect(lead.all_emails).toContain("info@example.com");
    expect(requests).toHaveLength(2);
  });
});
