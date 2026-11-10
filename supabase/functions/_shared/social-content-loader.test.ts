import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSocialContent, SocialContentScanError } from "./social-content-loader.ts";

const linkedin = "https://www.linkedin.com/company/gaia-group-ad/";
const profile = {
  url: linkedin,
  title: "Gaia Group Consulting | LinkedIn",
  description: "Business consulting focused on operations, leadership and business communication.",
  markdown: "The public profile describes organizational consulting, leadership and operational systems.",
};

afterEach(() => { vi.unstubAllGlobals(); });

describe("public evidence acquisition", () => {
  it("searches an exact LinkedIn company slug instead of scraping a sign-in wall", async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ data: { web: [profile] } }), { status: 200 }));
    vi.stubGlobal("fetch", fakeFetch);
    const result = await loadSocialContent(linkedin, "test-key");
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(String(fakeFetch.mock.calls[0][0])).toContain("/v2/search");
    expect(result.method).toBe("indexed-search");
    expect(result.urls).toEqual([linkedin]);
    expect(result.text).toContain("organizational consulting");
  });

  it("prefers direct website content without spending a search call", async () => {
    const text = "This business provides operations consulting, business diagnostics, workflow improvement and strategic management for growing companies. ".repeat(3);
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ data: { markdown: text } }), { status: 200 }));
    vi.stubGlobal("fetch", fakeFetch);
    const result = await loadSocialContent("https://example.com/", "test-key");
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(result.method).toBe("direct-scrape");
  });

  it("does not substitute an unrelated LinkedIn company on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      data: { web: [{ ...profile, url: "https://linkedin.com/company/unrelated/" }] },
    }), { status: 200 })));
    await expect(loadSocialContent(linkedin, "test-key")).rejects.toMatchObject({
      code: "INSUFFICIENT_PUBLIC_EVIDENCE", status: 422,
    });
  });

  it("reports provider quota failures instead of an unexplained non-2xx message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    await expect(loadSocialContent(linkedin, "test-key")).rejects.toMatchObject({
      code: "FIRECRAWL_UNAVAILABLE", status: 502,
    });
  });

  it("rejects invalid URL inputs before calling the web provider", async () => {
    const fakeFetch = vi.fn();
    vi.stubGlobal("fetch", fakeFetch);
    await expect(loadSocialContent("http://127.0.0.1/", "test-key"))
      .rejects.toBeInstanceOf(SocialContentScanError);
    expect(fakeFetch).not.toHaveBeenCalled();
  });
});
