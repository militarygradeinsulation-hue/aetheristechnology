import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalizePublicCompanyUrl } from "../../supabase/functions/_shared/company-audit-offers";

const read = (path: string) => readFileSync(path, "utf8");

describe("Business X-Ray paid website scan contract", () => {
  const checkout = read("supabase/functions/create-checkout/index.ts");
  const webhook = read("supabase/functions/payments-webhook/index.ts");
  const worker = read("supabase/functions/generate-purchase-delivery/index.ts");
  const service = read("src/components/ServicesPricing.tsx");
  const xray = read("public/business-xray/index.html");
  const landing = read("public/business-xray/website-report/index.html");
  const email = read("supabase/functions/_shared/transactional-email-templates/website-report-ready.tsx");
  const registry = read("supabase/functions/_shared/transactional-email-templates/registry.ts");

  it("requires an actual public website rather than silently scanning example.com", () => {
    expect(normalizePublicCompanyUrl("www.goodcompany.com").url).toBe("https://goodcompany.com/");
    for (const invalid of ["http://127.0.0.1", "localhost", "http://192.168.1.3", "http://user:pass@external.com", "file:///etc/passwd", "example.invalid"]) {
      expect(() => normalizePublicCompanyUrl(invalid)).toThrow();
    }
    expect(checkout).toContain("normalizePublicCompanyUrl(metadata?.website_url)");
    expect(checkout).toContain('error:"Enter a valid public business website before checkout"');
    expect(worker).toContain("normalizePublicCompanyUrl(input.website_url || input.websiteUrl)");
    expect(worker).not.toContain('|| "https://example.com"');
  });

  it("locks one-time catalog prices, quantity, and return URL on the server", () => {
    for (const [price, amount] of [["scan_full_report_once", "5900"], ["digital_snapshot_once", "14900"], ["scan_strategy_blueprint_once", "34900"]]) {
      expect(checkout).toContain(price + ": " + amount);
    }
    expect(checkout).toContain('quantity: (xray || websiteReport) ? 1 : quantity || 1');
    expect(checkout).toContain("AUTOMATED_RETURN_URL");
    expect(checkout).toContain("stripePrice.unit_amount !== AUTOMATED_WEBSITE_PRICES[priceId]");
    expect(checkout).toContain("meta.website_url = safeWebsiteUrl");
    expect(checkout).toContain('meta.source = "selfserve_website_report"');
  });

  it("requires confirmed payment, idempotent worker generation, and internal auth", () => {
    expect(webhook).toContain('session.payment_status !== "paid"');
    expect(webhook).toContain('case "checkout.session.async_payment_succeeded"');
    expect(worker).toContain("authorization !== SUPABASE_SERVICE_ROLE_KEY");
    expect(worker).toContain('.eq("status", "pending")');
    expect(worker).toContain('status: "generating"');
  });

  it("asks for the business website before paying from either website scanner entry", () => {
    expect(service).toContain("checkoutWebsiteInput");
    expect(service).toContain("confirmedWebsiteUrl");
    expect(service).toContain("Website to analyze");
    expect(xray).toContain('id="website"');
    expect(xray).toContain('id="instantOfferBtn"');
    expect(xray).toContain("aetheris-xray-checkout-prefill");
  });

  it("separates the automated public-website report from human verified reviews", () => {
    const pricePage = read("src/pages/BusinessXrayCheckoutPage.tsx");
    expect(pricePage).toContain('scan_full_report_once');
    expect(pricePage).toContain('business_xray_verified_once');
    expect(pricePage).toContain('business_xray_roadmap_once');
    expect(pricePage).toContain('VITE_XRAY_WEBSITE_REPORT_CHECKOUT_ENABLED === "true"');
    expect(pricePage).toContain('VITE_XRAY_CHECKOUT_ENABLED === "true"');
    expect(pricePage).toContain('No company credentials required');
    expect(landing).toContain("A one-click purchase is not a one-click verified audit.");
  });

  it("only emails a paid website report after generation succeeded", () => {
    expect(worker).toContain('status: "ready"');
    expect(worker).toContain('sendTemplateEmail("website-report-ready"');
    expect(worker).toContain('idempotencyKey: `report-ready-${deliverable.id}`');
    expect(worker).toContain("reportUrl:");
    expect(email).toContain("Your website report is ready.");
    expect(registry).toContain("'website-report-ready': websiteReportReady");
  });

  it("provides crawlable answer-first guidance and 6 XML sitemap entries", () => {
    const sitemap = read("public/sitemap.xml");
    expect(sitemap).toContain("<loc>https://aetheris.technology/business-xray/website-report/index.html</loc>");
    expect(xray).toContain("Answers before you run a scan");
    expect(xray).toContain("How the estimates work");
    expect(landing).toContain('rel="canonical" href="https://aetheris.technology/business-xray/website-report/index.html"');
    expect(read("src/components/lander/LanderNavbar.tsx")).toContain('href="/business-xray/index.html"');
  });
});
