import { describe, expect, it } from "vitest";
import {
  linkedinCompanySlug,
  normalizeSocialScanUrl,
  selectSocialSearchSources,
  socialSearchQuery,
} from "./social-content-source.ts";

const gaia = "https://www.linkedin.com/company/gaia-group-ad/";

describe("social content URL handling", () => {
  it("recognizes the supplied LinkedIn company URL", () => {
    expect(linkedinCompanySlug(gaia)).toBe("gaia-group-ad");
    expect(normalizeSocialScanUrl(gaia)).toBe(gaia);
    expect(socialSearchQuery(gaia)).toContain("site:linkedin.com/company/gaia-group-ad");
  });

  it("normalizes plain company websites", () => {
    expect(normalizeSocialScanUrl("example.com")).toBe("https://example.com/");
    expect(socialSearchQuery("https://example.com/")).toContain("site:example.com");
  });

  it("rejects malformed, private, or credentialed URLs", () => {
    for (const url of ["", "not a website", "http://localhost", "http://127.0.0.1",
      "http://10.0.0.1", "http://192.168.1.1", "file:///etc/passwd",
      "https://someone:password@example.com"]) {
      expect(() => normalizeSocialScanUrl(url), url).toThrow();
    }
  });
});

describe("exact-company search source filtering", () => {
  const valid = {
    url: gaia,
    title: "Gaia Group Consulting | LinkedIn",
    description: "Business consulting services that help organizations improve how they operate and communicate.",
    markdown: "Work on leadership, organization and operational improvement.",
  };

  it("accepts public results for the exact company slug", () => {
    const sources = selectSocialSearchSources({ data: { web: [valid] } }, gaia);
    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe(gaia);
  });

  it("rejects same-name companies, users and unrelated hosts", () => {
    const results = [
      { ...valid, url: "https://linkedin.com/company/gaia-group-ltd/" },
      { ...valid, url: "https://linkedin.com/in/gaia-group-ad" },
      { ...valid, url: "https://other-company.example/about" },
      valid,
    ];
    expect(selectSocialSearchSources({ data: { web: results } }, gaia)).toHaveLength(1);
  });

  it("removes duplicate results and excludes thin login walls", () => {
    const sources = selectSocialSearchSources({
      data: { web: [
        valid,
        { ...valid, url: "https://www.linkedin.com/company/gaia-group-ad/?trk=abc" },
        { url: "https://linkedin.com/company/gaia-group-ad/posts", title: "Sign in", markdown: "Join LinkedIn to view" },
      ] },
    }, gaia);
    expect(sources).toHaveLength(1);
  });

  it("does not fall back to a different company's website", () => {
    expect(selectSocialSearchSources({ data: { web: [valid] } }, "https://unrelated.example")).toEqual([]);
  });

  it("handles empty and unexpected API responses", () => {
    expect(selectSocialSearchSources({}, gaia)).toEqual([]);
    expect(selectSocialSearchSources({ data: null }, gaia)).toEqual([]);
  });
});
