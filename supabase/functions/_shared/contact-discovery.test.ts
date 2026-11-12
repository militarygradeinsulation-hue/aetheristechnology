import { afterEach, describe, expect, it, vi } from "vitest";
import { contactPageCandidates, decodeCloudflareEmail, discoverPublicBusinessContacts, safeBusinessUrl } from "./contact-discovery.ts";

const respond = (data: unknown, status = 200) => new Response(JSON.stringify({
  success: true, data,
}), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => { vi.unstubAllGlobals(); });

describe("public contact discovery cost and attribution", () => {
  it("uses one page read and no map when both published channels exist", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (endpoint: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      calls.push(endpoint + " " + body.url);
      return respond({
        markdown: "Contact Acme at info@acmeindustries.com or (317) 555-1234.",
      });
    }));
    const result = await discoverPublicBusinessContacts("acmeindustries.com", "test-key");
    expect(result).toMatchObject({
      email: "info@acmeindustries.com",
      phone: "(317) 555-1234",
      status: "found", requests: { scrape: 1, map: 0 },
    });
    expect(calls).toHaveLength(1);
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ source_url: "https://acmeindustries.com/", confidence: "published" }),
    ]));
  });

  it("uses contact and leadership links rather than scanning unrelated pages", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (endpoint: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      calls.push(body.url);
      if (body.url === "https://acmeindustries.com") return respond({
        markdown: "Company overview", links: [
          "https://other-company.com/contact", "/blog/other", "/team", "/contact",
        ],
      });
      if (body.url.endsWith("/contact")) return respond({
        markdown: "Contact info@acmeindustries.com. Phone 317-555-2222.",
      });
      return respond({ markdown: "Someone Else" });
    }));
    const result = await discoverPublicBusinessContacts("https://acmeindustries.com", "test-key");
    expect(result).toMatchObject({ status: "found", requests: { scrape: 2, map: 0 } });
    expect(calls).toEqual(["https://acmeindustries.com", "https://acmeindustries.com/contact"]);
    expect(result.candidate_pages).not.toContain("https://other-company.com/contact");
  });

  it("reads mailto and tel links with a bounded map fallback", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (endpoint: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      calls.push(endpoint.split("/").at(-1)!);
      if (endpoint.endsWith("/map")) return respond({
        links: ["https://acmeindustries.com/contact-us", "https://other-company.com/contacts"],
      });
      if (body.url.endsWith("/contact-us")) return respond({
        markdown: "Contact the team", html:
          '<a href="mailto:hello@acmeindustries.com">Email</a><a href="tel:+13175554444">Call</a>',
      });
      return respond({ markdown: "A business homepage without published contacts" });
    }));
    const result = await discoverPublicBusinessContacts("acmeindustries.com", "test-key", { maxPages: 3 });
    expect(result.email).toBe("hello@acmeindustries.com");
    expect(result.phone).toBe("+13175554444");
    expect(result.requests).toEqual({ scrape: 2, map: 1 });
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: "mailto" }),
      expect.objectContaining({ method: "tel" }),
    ]));
    expect(calls).toEqual(["scrape", "map", "scrape"]);
  });

  it("keeps unrelated and private URLs out of the scan", () => {
    expect(safeBusinessUrl("http://127.0.0.1/contacts")).toBeNull();
    expect(safeBusinessUrl("http://localhost/contacts")).toBeNull();
    expect(safeBusinessUrl("https://user:secret@example.com/")).toBeNull();
    expect(contactPageCandidates("https://acmeindustries.com", [
      "http://localhost/contact",
      "https://other-company.com/contact",
      "https://acmeindustries.com/blog/post",
      "https://acmeindustries.com/team",
    ])).toEqual(["https://acmeindustries.com/team"]);
  });

  it("decodes only a published Cloudflare-protected email and does not invent one", async () => {
    const clear = "hello@acmeindustries.com";
    const hex = "32" + [...clear].map(c => (c.charCodeAt(0) ^ 0x32).toString(16).padStart(2, "0")).join("");
    expect(decodeCloudflareEmail(hex)).toBe(clear);
    expect(decodeCloudflareEmail("nothex")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => respond({
      markdown: "Contact us",
      html: '<span class="__cf_email__" data-cfemail="' + hex + '">[email protected]</span>' +
        '<a href="tel:+13175551234">Call</a>',
    })));
    const result = await discoverPublicBusinessContacts("acmeindustries.com", "key");
    expect(result.email).toBe(clear);
    expect(result.phone).toBe("+13175551234");
    expect(result.requests.scrape).toBe(1);
  });

  it("never generates assumed email addresses when the site has only a name", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_endpoint: string, init?: RequestInit) => {
      const input = JSON.parse(String(init?.body));
      return respond({ markdown: input.url.endsWith("/contact")
        ? "Jane Doe - CEO. Please contact us using the website form."
        : "Jane Doe - Founder." });
    }));
    const result = await discoverPublicBusinessContacts("acmeindustries.com", "test-key", {
      maxPages: 2, mapIfNeeded: false,
    });
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.contact_name).toBe("Jane Doe");
    expect(result.status).toBe("not_found");
    expect(result.requests).toEqual({ scrape: 2, map: 0 });
  });
});
