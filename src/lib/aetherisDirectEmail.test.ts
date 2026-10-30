import { describe, expect, it } from "vitest";
import {
  buildDirectEmailPayload, confirmedByMailService, normalizeOptionalUrl,
  parseContactInterest, validateDirectEmail, type DirectEmailInput,
} from "./aetherisDirectEmail";

const valid: DirectEmailInput = {
  name: "Jane Smith",
  email: "Jane@Example.com",
  phone: "(317) 555-0100",
  linkedin: "linkedin.com/in/jane-smith",
  website: "example.com",
  company: "Example Fabrication",
  message: "Please discuss our follow-up workflow.",
  interest: "business_xray_verified",
  contactConsent: true,
};

describe("Aetheris direct-send contact intake", () => {
  it("accepts only known service interests", () => {
    expect(parseContactInterest("business_xray_verified")).toBe("business_xray_verified");
    expect(parseContactInterest("business_xray_roadmap")).toBe("business_xray_roadmap");
    expect(parseContactInterest("anything") as string).toBe("general");
    expect(parseContactInterest(null)).toBe("general");
  });

  it("validates required name, email, and consent", () => {
    expect(validateDirectEmail(valid)).toBeNull();
    expect(validateDirectEmail({ ...valid, name: "" })).toMatch(/name/);
    expect(validateDirectEmail({ ...valid, email: "bad-address" })).toMatch(/email/);
    expect(validateDirectEmail({ ...valid, contactConsent: false })).toMatch(/confirm/);
  });

  it("rejects unsafe or unrelated profile URLs", () => {
    expect(normalizeOptionalUrl("linkedin.com/in/jane-smith", "linkedin")).toBe("https://linkedin.com/in/jane-smith");
    expect(normalizeOptionalUrl("https://www.linkedin.com/company/acme", "linkedin")).toBe("https://www.linkedin.com/company/acme");
    expect(normalizeOptionalUrl("https://fake-linkedin.com/in/jane", "linkedin")).toBeNull();
    expect(normalizeOptionalUrl("javascript:alert(1)", "website")).toBeNull();
    expect(normalizeOptionalUrl("https://user:password@example.com", "website")).toBeNull();
    expect(normalizeOptionalUrl("example.com", "website")).toBe("https://example.com/");
  });

  it("includes all personal fields in the owner's email without allowing browser-selected recipients", () => {
    const message = buildDirectEmailPayload(valid, "xray-contact-sample");
    expect(message.name).toBe("Jane Smith");
    expect(message.email).toBe("jane@example.com");
    expect(message.phone).toBe("(317) 555-0100");
    expect(message.company).toBe("Example Fabrication");
    expect(message.message).toContain("LinkedIn: https://linkedin.com/in/jane-smith");
    expect(message.message).toContain("Website URL: https://example.com/");
    expect(message.message).toContain("This is an enquiry only.");
    expect(message.message.length).toBeLessThan(4000);
    expect("to" in message).toBe(false);
  });

  it("never claims a message sent without provider confirmation", () => {
    expect(confirmedByMailService({ success: true }, null)).toBe(true);
    expect(confirmedByMailService({ success: false }, null)).toBe(false);
    expect(confirmedByMailService({ success: true }, new Error("failed"))).toBe(false);
    expect(confirmedByMailService({}, null)).toBe(false);
    expect(confirmedByMailService(null, null)).toBe(false);
  });
});
