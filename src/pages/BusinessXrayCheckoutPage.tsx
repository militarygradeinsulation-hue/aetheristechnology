import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, FileDown, LockKeyhole, ShieldCheck } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { SEOHead } from "@/components/SEOHead";
import { normalizePublicCompanyUrl } from "../../supabase/functions/_shared/company-audit-offers";

/**
 * Strictly separate a website-only AUTOMATED report from the HUMAN verified
 * review and roadmap. Never advertise a human service as an instant AI audit.
 * Both checkout flags default OFF until production webhook, lookup key and
 * real website URL are tested on the correct Aetheris Supabase project.
 */
const OFFERS = {
  website: {
    key: "scan_full_report_once", label: "Automated Website Report", price: "$59",
    description: "A digitally generated report for the public website you enter. Delivered after confirmed payment and successful generation. It is not a verified financial or company-wide audit.",
    automated: true,
  },
  verified: {
    key: "business_xray_verified_once", label: "Verified Business X-Ray Review", price: "$199",
    description: "Human evidence review of your business hypotheses and a written findings brief. Fulfillment is manual; scope and timing are confirmed before work.",
    automated: false,
  },
  roadmap: {
    key: "business_xray_roadmap_once", label: "Correction Roadmap", price: "$599",
    description: "A human-reviewed evidence summary with a sequenced implementation roadmap. Not an instantly generated deliverable.",
    automated: false,
  },
} as const;
type OfferKey = keyof typeof OFFERS;
const instantEnabled = import.meta.env.VITE_XRAY_WEBSITE_REPORT_CHECKOUT_ENABLED === "true";
const manualEnabled = import.meta.env.VITE_XRAY_CHECKOUT_ENABLED === "true";

export default function BusinessXrayCheckoutPage() {
  const [searchParams] = useSearchParams();
  const requestedOffer = searchParams.get("offer");
  const [offerKey, setOfferKey] = useState<OfferKey>(() => requestedOffer === "verified" || requestedOffer === "roadmap" ? requestedOffer : "website");
  const [website, setWebsite] = useState("");
  const [company, setCompany] = useState("");
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [error, setError] = useState("");
  const offer = OFFERS[offerKey];
  const enabled = offer.automated ? instantEnabled : manualEnabled;

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("aetheris-xray-checkout-prefill");
      if (!saved) return;
      sessionStorage.removeItem("aetheris-xray-checkout-prefill");
      const raw = JSON.parse(saved);
      if (raw?.demo === true) return; // Demo must never flow into real checkout.
      if (typeof raw?.company === "string") setCompany(raw.company.slice(0, 120));
      if (typeof raw?.website === "string") setWebsite(raw.website.slice(0, 240));
    } catch {
      // Checkout works without browser storage.
    }
  }, []);

  const safeUrl = useMemo(() => {
    try { return normalizePublicCompanyUrl(website).url; } catch { return null; }
  }, [website]);

  const chooseOffer = (key: OfferKey) => {
    setOfferKey(key);
    setCheckoutOpen(false);
    setError("");
  };

  const begin = () => {
    if (offer.automated && !safeUrl) {
      setError("Enter a public company website address so the report analyzes the right business.");
      return;
    }
    if (!enabled) {
      setError("Checkout for this service has not passed production activation checks.");
      return;
    }
    setError("");
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Business X-Ray Reports: Self-Service and Verified Review"
        description="Start with a free operational X-Ray. Choose a $59 automated website-only report or request a separate human-verified business review."
        path="/business-xray/checkout"
      />
      <PaymentTestModeBanner />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-12">
        <Link to="/" className="text-sm font-semibold text-amber hover:underline">Aetheris.Technology</Link>
        <p className="mt-10 text-xs font-bold uppercase tracking-widest text-amber">Business X-Ray · Continue</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Find the friction. Choose your next step.</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Your free operational X-Ray is always available without payment.
          A website report can be generated automatically after a successful checkout.
          Verifying operational or financial findings requires a separate human review.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-amber" /> Secure Stripe checkout</span>
          <span className="flex items-center gap-2"><FileDown className="size-4 text-amber" /> Download when generated</span>
          <span className="flex items-center gap-2"><LockKeyhole className="size-4 text-amber" /> No company credentials required</span>
        </div>
        <section aria-label="Select a service" className="mt-9 grid gap-4 md:grid-cols-3">
          {(Object.keys(OFFERS) as OfferKey[]).map((key) => {
            const item = OFFERS[key];
            const selected = key === offerKey;
            return (
              <button type="button" key={key} onClick={() => chooseOffer(key)} aria-pressed={selected}
                className={`flex flex-col rounded-xl border p-5 text-left transition ${selected ? "border-amber bg-amber/10" : "border-border bg-card/40 hover:border-amber/50"}`}>
                <span className="text-xs font-bold uppercase tracking-wider text-amber">{item.automated ? "Automated digital delivery" : "Human delivered"}</span>
                <strong className="mt-3 block text-lg">{item.label}</strong>
                <span className="mt-2 block text-3xl font-bold">{item.price}</span>
                <span className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</span>
                <span className="mt-5 flex items-center gap-2 text-sm font-semibold">{selected && <CheckCircle2 className="size-4 text-amber" />}{selected ? "Selected" : "Choose this option"}</span>
              </button>
            );
          })}
        </section>
        <section aria-label="Complete purchase details" className="mt-9 rounded-xl border border-border bg-card/50 p-5 sm:p-7">
          <h2 className="text-xl font-bold">{offer.label}</h2>
          <p className="mt-2 text-sm text-muted-foreground">The exact amount must match the published Stripe price. The button below cannot charge you until the live checkout has been enabled and tested.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="block font-medium">Company name (optional)</span>
              <input value={company} onChange={(event) => { setCompany(event.target.value); setCheckoutOpen(false); }} maxLength={120}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-foreground" placeholder="Your business" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="block font-medium">Public website {offer.automated ? "(required)" : "(optional)"}</span>
              <input value={website} onChange={(event) => { setWebsite(event.target.value); setCheckoutOpen(false); setError(""); }} inputMode="url"
                maxLength={240} className="h-11 w-full rounded-md border border-border bg-background px-3 text-foreground"
                placeholder="https://yourcompany.com" />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Only public web pages are scanned for the automated product. A website report does not validate missed revenue,
            employee performance, private CRM records or the self-reported X-Ray figures.
          </p>
          {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
          <div className="mt-7">
            {enabled ? (
              isCheckoutOpen ? (
                <StripeEmbeddedCheckout key={offer.key + (offer.automated ? safeUrl : "")}
                  priceId={offer.key} quantity={1}
                  metadata={offer.automated && safeUrl
                    ? { website_url: safeUrl, business_name: company.slice(0, 120), source: "business_xray" }
                    : { source: "business_xray" }}
                  returnUrl={offer.automated
                    ? `${window.location.origin}/checkout/return?type=deliverable&session_id={CHECKOUT_SESSION_ID}`
                    : undefined}
                />
              ) : (
                <button type="button" onClick={begin} className="rounded-lg bg-amber px-6 py-3 font-bold text-black hover:brightness-110">
                  Continue securely to payment · {offer.price}
                </button>
              )
            ) : (
              <div className="rounded-lg border border-amber/30 bg-background/60 p-4">
                <strong className="text-sm">Payment activation is being verified.</strong>
                <p className="mt-2 text-sm text-muted-foreground">
                  The existing Stripe connection is in the Aetheris project. This offer has not yet passed its
                  price, webhook and real-delivery checks. You have not been charged.
                </p>
                <Link to={`/business-xray/contact?service=${offerKey === "roadmap" ? "business_xray_roadmap" : offerKey === "verified" ? "business_xray_verified" : "business_xray_unsure"}`}
                  className="mt-3 inline-block text-sm font-semibold text-amber underline">
                  Contact Aetheris about this service
                </Link>
              </div>
            )}
          </div>
        </section>
        <div className="mt-8 text-sm text-muted-foreground">
          Prefer to do it yourself? <a className="font-medium text-amber underline" href="/business-xray/index.html">Return to the free Business X-Ray and download your initial report.</a>
        </div>
      </main>
    </div>
  );
}
