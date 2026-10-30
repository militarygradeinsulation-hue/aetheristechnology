import { describe, expect, it } from "vitest";
import { buildEnquiryBody, buildMailto } from "./enquiry";

const base = { to: "team@example.com", tier: "verified" as const, name: "", business: "", message: "", summary: null, demo: false };

describe("enquiry mailto", () => {
  it("targets the configured address and encodes subject/body", () => {
    const url = buildMailto({ ...base, business: "A & B" });
    expect(url.startsWith("mailto:team@example.com?subject=")).toBe(true);
    expect(url).toContain(encodeURIComponent("A & B"));
  });

  it("states that it is not an automated purchase", () => {
    expect(buildEnquiryBody(base)).toContain("not an automated purchase");
  });
});