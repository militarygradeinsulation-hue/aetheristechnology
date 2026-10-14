import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Mail, Phone, MapPin } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { BOOK_MEETING_URL } from "@/lib/links";
import { LanderNavbar } from "@/components/lander/LanderNavbar";
import { AnomalousMatterHero } from "@/components/lander/AnomalousMatterHero";
import { CaseFilePreview } from "@/components/lander/CaseFilePreview";
import { RealCaseStudiesSection } from "@/components/RealCaseStudiesSection";
import {
  CTA,
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STAGES_HEADLINE,
  ENGAGEMENT_STAGES_INTRO,
  FOUNDER_TRUST,
  EXPECTATION_NOTE,
} from "@/lib/engagementModel";
import { ObsidianVibeWaitlist } from "@/components/ObsidianVibeWaitlist";
import { Footer } from "@/components/Footer";
import { PricingTimeline } from "@/components/PricingTimeline";
import SampleGoldenReports from "@/components/lander/SampleGoldenReports";
import { MethodologyAI } from "@/components/lander/MethodologyAI";

// Reuse the original interactive chaos-physics graph without bloating the initial hero.
const HomeMindMapSection = React.lazy(() => import("@/components/HomeMindMapSection"));


import aetherisWordmark from "@/assets/aetheris-wordmark.jpg.asset.json";

const SIGNALS = [
  { k: "Named leaks", v: "Every finding tied to evidence on your own site." },
  { k: "One number", v: "A single annual leak total, not competing estimates." },
  { k: "Plain language", v: "Written for an owner, not for a consultant." },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-case text-[10px] uppercase tracking-[0.3em] text-amber/80 mb-4">{children}</p>
);

const LeakLanderPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SEOHead
        title="Revenue Leak Audit for $5M-$50M Businesses"
        description="Aetheris is a strategic consulting firm that finds and fixes business failures, from communication and systems to revenue leaks, operational waste, and stalled growth."
        path="/"
        keywords="revenue leak audit, revenue forensics, business forensics operator, forensic revenue diagnostic, brand contradiction analysis, conversion drop-off audit, mid-market revenue diagnostic, forensic diagnostic Indianapolis"
      />

      <LanderNavbar />

      <AnomalousMatterHero
        eyebrow="Revenue Leak Audit"
        titleAs="div"
        title={
          <img
            src={aetherisWordmark.url}
            alt="Aetheris — tools for professionals big tech companies forgot"
            className="wordmark-storm w-[130%] max-w-none -mx-[15%] sm:w-[115%] sm:max-w-none sm:-mx-[7.5%] h-auto select-none mix-blend-screen"
            style={{
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)",
              WebkitMaskComposite: "source-in",
              maskComposite: "intersect",
            }}
            loading="eager"
          />

        }
        description=""
      >
        <h1 className="max-w-3xl text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-foreground [text-wrap:balance]">
          I study the entire company as one connected system, tracing how every department, role, handoff, and decision either creates ROI or quietly destroys it.
        </h1>
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            to="/leak-audit/self-scan"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber px-8 font-case text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            {CTA.primary} <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-we-work"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-8 font-case text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-amber/40 hover:text-foreground"
          >
            {CTA.secondary} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <p className="max-w-2xl pt-1 text-xs text-muted-foreground/80 leading-relaxed">
          {EXPECTATION_NOTE}
        </p>
        <p className="font-case text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 pt-2">
          Indianapolis · Operating nationwide
        </p>
      </AnomalousMatterHero>

      {/* What We Do: immediate positioning after the hero */}
      <section id="what-we-do" className="scroll-mt-28 border-t border-border/60 px-6 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionLabel>// What we do</SectionLabel>
            <h2 className="font-forensic text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              We pinpoint the failure. <span className="text-amber">Then we fix it.</span>
            </h2>
          </div>
          <div className="space-y-5">
            <p className="text-base leading-relaxed text-foreground/90 sm:text-lg">
              Aetheris is a strategic consulting firm. We identify where your company is
              breaking down, from communication gaps and disconnected systems to failed
              handoffs, operational waste, and overlooked revenue leaks.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              We don't stop at telling you what's wrong. We fix the root causes to recover
              lost value, increase ROI, and remove the friction slowing your growth.
              Our goal is to help you scale in half the time, without adding complexity.
            </p>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 border-b border-amber/50 pb-1 font-case text-xs font-bold uppercase tracking-widest text-amber transition-colors hover:border-amber"
            >
              Explore how we work <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Plain-language disclosure about recovery-based compensation */}
      <section id="pricing-disclosure" className="scroll-mt-28 border-t border-border/60 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl border-l-2 border-amber/70 pl-5 sm:pl-8">
          <SectionLabel>// A note about our pricing</SectionLabel>
          <h2 className="max-w-4xl font-forensic text-3xl font-bold leading-tight sm:text-4xl">
            I know our prices may seem high. <span className="text-amber">But what is the leak already costing you?</span>
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-foreground/90 sm:text-lg">
            The real expense isn't finding the failure. It's letting lost revenue, wasted
            hours, and broken processes keep taking their share of your business.
            We focus on fixing those problems first and measuring what actually improves.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-foreground/90">
            In qualifying recovery-based engagements, our fee is tied to a defined share of
            verified recovered value. The qualifying result, measurement method, and
            conditions for any waived recovery fee are agreed in writing before work starts.
          </p>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Recovery isn't guaranteed. The free self-check is directional, not proof of lost
            revenue. Separately scoped fixed-fee services have their own written terms.
          </p>
          <Link
            to="/#prices"
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-amber/50 px-6 font-case text-[11px] font-bold uppercase tracking-widest text-amber transition-colors hover:bg-amber/10"
          >
            View pricing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Interactive investment line */}
      <section id="prices" className="scroll-mt-28 border-t border-border/60 py-20 px-6">
        <PricingTimeline />
      </section>

      {/* Restored interactive Chaos Theory graph from the existing site code. */}
      <section id="chaos-theory" className="scroll-mt-28 border-t border-border/60 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// Chaos theory in business</SectionLabel>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <h2 className="font-forensic text-3xl font-bold leading-tight sm:text-4xl">
                A single failure rarely <span className="text-amber">stays in one department.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                This is the original interactive chaos-physics network map: drag a node, follow the
                ripples, and switch between symptoms, handoffs, systems, and service pathways.
                Connections illustrate potential dependencies, not proven losses for your business.
              </p>
            </div>
            <Link to="/stop-guessing" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber/40 px-5 py-2 text-xs font-bold uppercase tracking-wider text-amber transition hover:bg-amber/10">
              Explore the original Leak Check page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <React.Suspense fallback={<div role="status" className="mt-8 rounded-xl border border-amber/20 bg-card/40 p-8 text-sm text-muted-foreground">Loading interactive chaos map…</div>}>
            <HomeMindMapSection />
          </React.Suspense>
        </div>
      </section>

      {/* The Aetheris Methodology */}
      <section id="methodology" className="border-t border-border/60 py-16 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <SectionLabel>// The system</SectionLabel>
          <h2 className="font-forensic text-3xl sm:text-4xl font-bold leading-tight">
            The Aetheris Methodology
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            How the Golden Report becomes a system for fixing the company. Read it, or ask the AI
            attached to it.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-[240px_1fr] md:items-start text-left">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div
                className="group block h-[290px] w-[210px] shrink-0"
                style={{ perspective: 1200 }}
              >
                <div
                  className="relative h-full w-full overflow-hidden rounded-l-[3px] rounded-r-lg border border-amber/30 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--secondary))_55%,hsl(var(--card))_100%)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_0_hsl(var(--amber)/0.15)]"
                  style={{ transform: "rotateY(-8deg)", transformStyle: "preserve-3d" }}
                >
                  <div className="pointer-events-none absolute inset-y-[3px] right-0 w-2 rounded-r-lg bg-[repeating-linear-gradient(to_left,hsl(var(--foreground)/0.22)_0px,hsl(var(--foreground)/0.22)_1px,transparent_1px,transparent_3px)]" />
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/70 via-amber/25 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 left-6 w-px bg-amber/25" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-foreground/[0.06] to-transparent" />

                  <div className="relative flex h-full flex-col justify-between pl-9 pr-4 py-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="font-case text-[9px] uppercase tracking-[0.2em] text-amber">Methodology</p>
                        <span className="rounded-sm border border-amber/40 px-1.5 py-0.5 font-case text-[8px] tracking-widest text-amber/80">
                          AM
                        </span>
                      </div>
                      <div className="mt-3 h-px w-10 bg-amber/50" />
                      <h3 className="mt-3 font-display text-lg font-bold leading-snug">
                        The Aetheris Methodology
                      </h3>
                    </div>
                    <div>
                      <p className="font-case text-[9px] uppercase tracking-widest text-muted-foreground">
                        Field document
                      </p>
                      <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber/40 px-3 py-1.5 font-case text-[9px] uppercase tracking-widest text-amber/80">
                        Being reissued
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-[210px]">
                The field document is being reissued. Ask the reader anything, or talk it through
                with us directly.
              </p>
              <a
                href={BOOK_MEETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border px-6 font-case text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-amber/40 hover:text-foreground"
              >
                Talk With Aetheris
              </a>
            </div>


            <MethodologyAI />
          </div>
        </div>
      </section>



      {/* Case file preview */}
      <section className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>// The deliverable</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
              A case file, not a slide deck.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-lg">
              Every scan produces the Golden Report: named leaks, evidence pulled from your own
              site, a single annual exposure number, and the order to fix them in.
            </p>
            <ul className="mt-8 space-y-4">
              {SIGNALS.map((s) => (
                <li key={s.k} className="border-l border-amber/40 pl-4">
                  <p className="font-case text-[10px] uppercase tracking-widest text-amber">{s.k}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.v}</p>
                </li>
              ))}
            </ul>
            <SampleGoldenReports />
          </div>

          <CaseFilePreview />
        </div>
      </section>

      {/* Case files */}
      <section id="case-studies" className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// Case files</SectionLabel>
          <p className="mb-8 max-w-3xl text-base text-muted-foreground">
            We sign NDAs to keep our clients private and their data safe. But you can read their
            stories and situations. We will give you the same courtesy when we partner with you.
          </p>
          <RealCaseStudiesSection />
        </div>
      </section>

      {/* How we work */}
      <section id="how-we-work" className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// How we work</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            {ENGAGEMENT_STAGES_HEADLINE}
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
            {ENGAGEMENT_STAGES_INTRO}
          </p>

          <div className="mt-10 grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-5 rounded-xl overflow-hidden border border-border/60">
            {ENGAGEMENT_STAGES.map((s) => (
              <div key={s.n} className="bg-background p-6 flex flex-col">
                <span className="font-case text-[10px] uppercase tracking-[0.3em] text-amber/70">
                  {s.n}
                </span>
                <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.line}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <blockquote className="border-l-2 border-amber/60 pl-5">
              <p className="text-lg leading-relaxed text-foreground/90">
                &ldquo;{FOUNDER_TRUST.quote}&rdquo;
              </p>
              <footer className="mt-4 font-case text-[10px] uppercase tracking-[0.28em] text-amber">
                {FOUNDER_TRUST.attribution}
              </footer>
            </blockquote>

            <div className="rounded-xl border border-border/60 p-6">
              <p className="text-sm text-muted-foreground leading-relaxed">{FOUNDER_TRUST.short}</p>
              <p className="mt-4 font-semibold text-foreground">{FOUNDER_TRUST.punch}</p>
              <p className="mt-4 text-xs text-muted-foreground/80 leading-relaxed">
                {EXPECTATION_NOTE}
              </p>
              <a
                href={BOOK_MEETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-amber/40 px-6 font-case text-[11px] font-bold uppercase tracking-widest text-amber transition-colors hover:bg-amber/10"
              >
                <Calendar className="h-4 w-4" /> {CTA.session}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Intake */}
      <section className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>// Case intake</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            Talk with Aetheris directly.
          </h2>
          <p className="mt-4 text-muted-foreground">
            30 minutes. No pitch deck. We look at your business and I tell you where the money is
            leaking. If I cannot save you money, I do not want to do business with you.
          </p>
          <a
            href={BOOK_MEETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber px-8 font-case text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Calendar className="h-4 w-4" /> {CTA.session}
          </a>
        </div>
      </section>

      <div className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <ObsidianVibeWaitlist />
        </div>
      </div>

      {/* Contact strip */}
      <section className="border-t border-border/60 py-10 px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a href="tel:+13173762110" className="inline-flex items-center gap-2 hover:text-amber transition-colors">
            <Phone className="h-3.5 w-3.5 text-amber" /> (317) 376-2110
          </a>
          <a
            href="mailto:Aetheris.technology@outlook.com"
            className="inline-flex items-center gap-2 hover:text-amber transition-colors"
          >
            <Mail className="h-3.5 w-3.5 text-amber" /> Aetheris.technology@outlook.com
          </a>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-amber" /> Noblesville, Indiana
          </span>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LeakLanderPage;
