/**
 * Aetheris Business X-Ray: fixed-scope manual-service checkout catalog.
 * The customer may choose a lookup key; only the SERVER determines the price.
 * Never accept an amount, product name, discounts or the purpose from the browser.
 */
export const BUSINESS_XRAY_OFFERS = {
  business_xray_verified_once: {
    key: "business_xray_verified_once",
    tier: "verified",
    label: "Verified Business X-Ray Review",
    amountCents: 19_900,
    currency: "usd",
    description:
      "One human-led review of selected business records and X-Ray hypotheses, with written findings. No guarantee of savings or financial recovery.",
  },
  business_xray_roadmap_once: {
    key: "business_xray_roadmap_once",
    tier: "roadmap",
    label: "Business X-Ray Correction Roadmap",
    amountCents: 59_900,
    currency: "usd",
    description:
      "Verified review plus a sequenced implementation roadmap, owners, and measures for confirmed problems. Human-delivered service.",
  },
} as const;

export type BusinessXrayKey = keyof typeof BUSINESS_XRAY_OFFERS;
export type BusinessXrayOffer = (typeof BUSINESS_XRAY_OFFERS)[BusinessXrayKey];

/** Avoid accidental checkout of arbitrary catalog prices or client-side price changes. */
export function businessXrayOfferForKey(key: unknown): BusinessXrayOffer | null {
  if (typeof key !== "string" || !Object.prototype.hasOwnProperty.call(BUSINESS_XRAY_OFFERS, key)) return null;
  return BUSINESS_XRAY_OFFERS[key as BusinessXrayKey];
}

export function isBusinessXrayServiceSession(session: { metadata?: Record<string, string> | null } | null | undefined): boolean {
  return session?.metadata?.purpose === "business_xray_manual_service";
}

export function verifiedBusinessXrayPayment(session: {
  metadata?: Record<string, string> | null;
  mode?: string | null;
  payment_status?: string | null;
  currency?: string | null;
  amount_total?: number | null;
}): BusinessXrayOffer | null {
  if (!isBusinessXrayServiceSession(session)) return null;
  const offer = businessXrayOfferForKey(session.metadata?.priceId);
  if (!offer || session.metadata?.xray_tier !== offer.tier) return null;
  if (session.mode !== "payment" || session.payment_status !== "paid") return null;
  if (session.amount_total !== offer.amountCents || session.currency?.toLowerCase() !== offer.currency) return null;
  return offer;
}

/** Return URL is deliberately fixed for public sessions (no user-supplied redirects). */
export const BUSINESS_XRAY_RETURN_URL =
  "https://aetheris.technology/checkout/return?type=business_xray&session_id={CHECKOUT_SESSION_ID}";
