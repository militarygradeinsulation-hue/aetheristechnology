import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Lock, ShieldCheck, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { AETHERIS_TIERS } from "@/lib/aetherisTiers";

/**
 * Public offer page for the Golden Report Intelligence subscription
 * ($2,500/mo, Stripe lookup key golden_report_intelligence_monthly).
 * Copy and price come from the tier ladder source of truth so this page can
 * never drift from the rest of the site.
 */
export default function GoldenReportIntelligencePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const tier = useMemo(() => AETHERIS_TIERS.find(t => t.id === "intelligence")!, []);

  const startCheckout = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent("/golden-report-intelligence")}`);
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <>
      <SEOHead
        title="Golden Report Intelligence | $2,500/mo Living Forensic Workspace"
        description="A living Golden Report workspace and Report AI for one company. Monthly rescan, leak register, tasks, forecasting and refreshed content. $2,500 per month."
        path="/golden-report-intelligence"
      />
      <Navbar onContactClick={() => {}} />
      <main className="min-h-screen bg-background pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-3">
            Tier 01 · {tier.verb}
          </div>
          <h1 className="font-forensic text-4xl md:text-5xl font-bold leading-tight max-w-3xl">
            {tier.name}
          </h1>
          <p className="text-base md:text-lg text-foreground/80 mt-4 max-w-2xl leading-relaxed">
            {tier.headline}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div className="font-forensic text-4xl font-bold">{tier.priceLabel}</div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground pb-1.5">
              {tier.timeline}
            </div>
          </div>

          {!checkoutOpen && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={startCheckout}
                disabled={loading}
                className="bg-amber text-background hover:bg-amber/90 font-semibold"
              >
                {tier.ctaLabel} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button asChild variant="outline">
                <Link to="/scan">Run the free scan first</Link>
              </Button>
            </div>
          )}
          {!user && !loading && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> You will sign in first so the workspace is attached to your account.
            </p>
          )}

          <div className="grid gap-6 md:grid-cols-2 mt-12">
            <section className="forensic-tile rounded-sm border border-amber/30 p-6">
              <h2 className="font-forensic text-xl font-bold mb-4">What you get every month</h2>
              <ul className="space-y-2.5">
                {tier.adds.map(a => (
                  <li key={a} className="text-sm text-foreground/85 flex gap-2 leading-snug">
                    <Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                    {a}
                  </li>
                ))}
              </ul>
            </section>

            <section className="forensic-tile rounded-sm border border-border p-6">
              <h2 className="font-forensic text-xl font-bold mb-4">Where this stops</h2>
              <ul className="space-y-2.5">
                {(tier.excludes || []).map(x => (
                  <li key={x} className="text-sm text-muted-foreground flex gap-2 leading-snug">
                    <X className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/70" />
                    {x}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-5 flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber" />
                Cancel any time from your billing portal. Access stays live through the period you paid for.
              </p>
            </section>
          </div>

          <section className="mt-10 border-l-2 border-amber/60 pl-4 max-w-2xl">
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber mb-1">You leave with</div>
            <p className="text-sm text-foreground/90 leading-relaxed">{tier.outcome}</p>
            <p className="text-xs text-muted-foreground mt-2 italic">For you if: {tier.useCase}</p>
          </section>

          {checkoutOpen && (
            <section className="mt-12">
              <h2 className="font-forensic text-2xl font-bold mb-4">Start your subscription</h2>
              <StripeEmbeddedCheckout
                priceId={tier.stripeLookupKey!}
                customerEmail={user?.email || undefined}
                returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
                metadata={{ plan_id: tier.id }}
              />
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
