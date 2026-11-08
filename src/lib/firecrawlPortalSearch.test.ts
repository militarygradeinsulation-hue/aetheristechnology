import { describe, expect, it } from "vitest";
import { normalizeFirecrawlSearchResponse } from "../../supabase/functions/_shared/firecrawl-search-response";

describe("Portal assistant live web search adapter", () => {
  it("parses Firecrawl v2 data.web records and retains evidence URLs", () => {
    expect(normalizeFirecrawlSearchResponse({
      data: { web: [{ title: "Official source", url: "https://example.com/news", description: "Updated today" }] },
    })).toEqual([{
      title: "Official source",
      url: "https://example.com/news",
      description: "Updated today",
      snippet: "",
    }]);
  });
  it("handles legacy data arrays and excludes non-web destinations", () => {
    expect(normalizeFirecrawlSearchResponse({
      data: [{ title: "Bad", url: "javascript:alert(1)" }, { title: "Real", url: "https://example.org" }],
    })).toHaveLength(1);
  });
  it("handles missing results without inventing a source", () => {
    expect(normalizeFirecrawlSearchResponse({ success: true })).toEqual([]);
  });
});
