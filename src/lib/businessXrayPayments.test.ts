import { describe, it, expect } from "vitest";
import { BUSINESS_XRAY_OFFERS, businessXrayOfferForKey, verifiedBusinessXrayPayment, BUSINESS_XRAY_RETURN_URL } from "../../supabase/functions/_shared/business-xray-offers";

describe("Business X-Ray Stripe reuse safety", () => {
  it("only accepts fixed server-side offers", () => {
    expect(businessXrayOfferForKey("business_xray_verified_once")?.amountCents).toBe(19900);
    expect(businessXrayOfferForKey("business_xray_roadmap_once")?.amountCents).toBe(59900);
    expect(businessXrayOfferForKey("other_product")).toBeNull();
    expect(businessXrayOfferForKey({ amount: 1 })).toBeNull();
    expect(Object.keys(BUSINESS_XRAY_OFFERS)).toHaveLength(2);
  });

  it("requires paid, full amount, USD and matching purpose/tier", () => {
    const valid = { mode: "payment", payment_status: "paid", amount_total: 19900,
      currency: "usd", metadata: { purpose: "business_xray_manual_service", xray_tier: "verified", priceId: "business_xray_verified_once" } };
    expect(verifiedBusinessXrayPayment(valid)?.tier).toBe("verified");
    expect(verifiedBusinessXrayPayment({ ...valid, payment_status: "unpaid" })).toBeNull();
    expect(verifiedBusinessXrayPayment({ ...valid, amount_total: 0 })).toBeNull();
    expect(verifiedBusinessXrayPayment({ ...valid, currency: "eur" })).toBeNull();
    expect(verifiedBusinessXrayPayment({ ...valid, mode: "subscription" })).toBeNull();
    expect(verifiedBusinessXrayPayment({ ...valid, metadata: { ...valid.metadata, xray_tier: "roadmap" } })).toBeNull();
    expect(verifiedBusinessXrayPayment({ ...valid, metadata: { ...valid.metadata, purpose: "anything" } })).toBeNull();
  });

  it("never allows client return URL choice", () => {
    expect(BUSINESS_XRAY_RETURN_URL).toMatch(/^https:\/\/aetheris\.technology\/checkout\/return/);
  });
});
