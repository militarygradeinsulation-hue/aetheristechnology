import { afterEach, describe, expect, it, vi } from "vitest";
import { enrichLeadFromWebsite } from "./lead-enrichment.ts";

const page = (markdown: string) => new Response(JSON.stringify({
  success: true, data: { markdown },
}), { status: 200, headers: { "Content-Type": "application/json" } });

afterEach(() => { vi.unstubAllGlobals(); });

describe("manual lead enrichment Firecrawl budget", () => {
  it("continues after the homepage email when a phone is still missing", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_endpoint: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)).url);
      return page("Meet Jane Doe, Founder. Email: jane.doe@acmeindustries.com");
    }));
    const lead = await enrichLeadFromWebsite("https://acmeindustries.com", "test-key");
    expect(lead.email).toBe("jane.doe@acmeindustries.com");
    expect(requests).toEqual(["https://acmeindustries.com", "https://acmeindustries.com/contact"]);
  });

  it("limits manual research to two pages, even if neither has contact data", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_endpoint: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)).url);
      return page("Company description with no contact details.");
    }));
    const lead = await enrichLeadFromWebsite("https://acmeindustries.com", "test-key");
    expect(lead.email).toBeUndefined();
    expect(requests).toEqual(["https://acmeindustries.com", "https://acmeindustries.com/contact"]);
  });

  it("keeps a generic business mailbox when no person email is published", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_endpoint: string, init?: RequestInit) => {
      const url = JSON.parse(String(init?.body)).url;
      requests.push(url);
      return page(url.endsWith("/contact") ? "Email our team: info@acmeindustries.com" : "Welcome to Example");
    }));
    const lead = await enrichLeadFromWebsite("acmeindustries.com", "test-key");
    expect(lead.email).toBe("info@acmeindustries.com");
    expect(lead.all_emails).toContain("info@acmeindustries.com");
    expect(requests).toHaveLength(2);
  });

  it("extracts the contact phone and email from exact published links", async () => {
    const requested: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_endpoint: string, init?: RequestInit) => {
      const url = JSON.parse(String(init?.body)).url;
      requested.push(url);
      return new Response(JSON.stringify({ success: true, data: {
        markdown: url.endsWith("/contact") ? "Call the office" : "Company home",
        html: url.endsWith("/contact")
          ? '<a href="mailto:sales@acmeindustries.com">Email</a><a href="tel:+13175551234">Call</a>'
          : "",
        links: url.endsWith("/contact") ? [] : ["/contact"],
      } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const lead = await enrichLeadFromWebsite("acmeindustries.com", "test-key");
    expect(lead.email).toBe("sales@acmeindustries.com");
    expect(lead.phone).toBe("+13175551234");
    expect(lead.contact_evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "email", method: "mailto", source_url: "https://acmeindustries.com/contact" }),
      expect.objectContaining({ kind: "phone", method: "tel", source_url: "https://acmeindustries.com/contact" }),
    ]));
    expect(requested).toHaveLength(2);
  });
});
