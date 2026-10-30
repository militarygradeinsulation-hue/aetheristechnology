import React, { useState } from "react";
import { Link } from "react-router-dom";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { SEOHead } from "@/components/SEOHead";

const OFFERS = {
  verified: { key: "business_xray_verified_once", label: "Verified Business X-Ray Review", amount: "$199", description: "Human review of the business records you authorize and a written findings brief." },
  roadmap: { key: "business_xray_roadmap_once", label: "Correction Roadmap", amount: "$599", description: "Human verification plus a sequenced, measurable improvement plan." },
} as const;

// Enabled only when the EXISTING backend has the new server-side code, catalog
// prices, webhook subscription and live/sandbox payment tests verified.
const enabled = import.meta.env.VITE_XRAY_CHECKOUT_ENABLED === "true";

export default function BusinessXrayCheckoutPage() {
  const [tier, setTier] = useState<keyof typeof OFFERS>("verified");
  const [open, setOpen] = useState(false);
  const offer = OFFERS[tier];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title="Business X-Ray Service Checkout | Aetheris Technology" description="Choose an evidence-led manual Business X-Ray service. Hosted secure Stripe checkout after availability is confirmed." path="/business-xray/checkout" />
      <PaymentTestModeBanner />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <Link className="text-amber underline" to="/">Aetheris Technology</Link>
        <h1 className="mt-8 text-3xl font-bold">Business X-Ray: human-verified services</h1>
        <p className="mt-3 text-muted-foreground">The free Business X-Ray remains free. Paid services require a person to review the relevant records with your authorization. No savings or outcomes are guaranteed.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {(Object.keys(OFFERS) as Array<keyof typeof OFFERS>).map((k) => (
            <button type="button" key={k} aria-pressed={tier === k} onClick={() => { setTier(k); setOpen(false); }}
              className={`rounded-xl border p-5 text-left ${tier === k ? "border-amber bg-amber/10" : "border-border"}`}>
              <strong className="block">{OFFERS[k].label}</strong><span className="mt-1 block text-xl font-semibold">{OFFERS[k].amount}</span>
              <span className="mt-2 block text-sm text-muted-foreground">{OFFERS[k].description}</span>
            </button>
          ))}
        </div>
        {enabled ? (
          <div className="mt-7">
            {!open ? <button className="rounded-md bg-amber px-5 py-3 font-semibold text-black" onClick={() => setOpen(true)}>Continue securely with Stripe</button> : <StripeEmbeddedCheckout key={offer.key} priceId={offer.key} quantity={1} />}
          </div>
        ) : (
          <aside className="mt-7 rounded-xl border border-amber/30 p-5">
            <strong>Checkout activation is being verified.</strong>
            <p className="mt-2 text-sm text-muted-foreground">The payment account is connected to the Aetheris website, but this particular service checkout is not yet enabled. No payment has been attempted.</p>
            <Link className="mt-3 inline-block font-semibold text-amber underline" to={`/business-xray/contact?service=${tier === "verified" ? "business_xray_verified" : "business_xray_roadmap"}`}>Send your enquiry from the website</Link>
          </aside>
        )}
      </main>
    </div>
  );
}
