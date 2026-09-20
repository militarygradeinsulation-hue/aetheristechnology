import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { AETHERIS_TIERS } from "@/lib/aetherisTiers";
import { CTA, EXPECTATION_NOTE } from "@/lib/engagementModel";
import { BOOK_MEETING_URL } from "@/lib/links";

/**
 * Public page for the Golden Report Intelligence workspace.
 * This page is consultative only: there is no public checkout, no price and no
 * cart. The internal tier config (including its Stripe lookup key) stays
 * untouched for internal/admin use, but is never rendered as a purchase here.
 * Copy comes from the tier ladder source of truth so this page can never
 * drift from the rest of the site.
 */
export default function GoldenReportIntelligencePage() {
  const tier = useMemo(() => AETHERIS_TIERS.find(t => t.id === "intelligence")!, []);

  return (
    <>
      <SEOHead
        title="Golden Report Intelligence | Living Forensic Workspace"
        description="A living Golden Report workspace and Report AI for one company: rescans, leak register, tasks, forecasting and refreshed content, scoped in conversation."
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
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground pb-1.5">
              {tier.timeline}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
              <Button className="bg-amber text-background hover:bg-amber/90 font-semibold">
                {CTA.session} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </a>
            <Button asChild variant="outline">
              <Link to="/scan">Run the free scan first</Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-12">
            <section className="forensic-tile rounded-sm border border-amber/30 p-6">
              <h2 className="font-forensic text-xl font-bold mb-4">What we can establish together</h2>
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
                {EXPECTATION_NOTE}
              </p>
            </section>
          </div>

          <section className="mt-10 border-l-2 border-amber/60 pl-4 max-w-2xl">
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber mb-1">You leave with</div>
            <p className="text-sm text-foreground/90 leading-relaxed">{tier.outcome}</p>
            <p className="text-xs text-muted-foreground mt-2 italic">For you if: {tier.useCase}</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
