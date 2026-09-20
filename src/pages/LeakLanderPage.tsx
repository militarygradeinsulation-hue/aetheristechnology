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
  CORE_PROMISE,
  HERO_SUPPORT,
  CTA,
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STAGES_HEADLINE,
  ENGAGEMENT_STAGES_INTRO,
  FOUNDER_TRUST,
  EXPECTATION_NOTE,
} from "@/lib/engagementModel";
import { ObsidianVibeWaitlist } from "@/components/ObsidianVibeWaitlist";
import { Footer } from "@/components/Footer";
import SampleGoldenReports from "@/components/lander/SampleGoldenReports";
import { MethodologyAI } from "@/components/lander/MethodologyAI";


import aetherisWordmark from "@/assets/aetheris-wordmark.jpg.asset.json";
import methodologyPdf from "@/assets/aetheris-methodology.pdf.asset.json";

const STEPS = [
  {
    n: "01",
    t: "Free Scan",
    d: "I run a forensic scan on your company. No cost, no pitch.",
    href: "/golden-report",
    cta: "Start the free scan",
  },
  {
    n: "02",
    t: "Find the Leaks",
    d: "I show you exactly where the money is leaving, in writing.",
    href: "/leak-audit",
    cta: "See what we look for",
  },
  {
    n: "03",
    t: "Recover and Scale",
    d: "We build the system and plan to recover the money and grow.",
    href: BOOK_MEETING_URL,
    cta: "Schedule a Working Session",
    external: true,
  },
];

const FINDINGS = [
  { t: "Conversion drop-off", d: "Where visitors quit before they ever reach you." },
  { t: "Brand contradictions", d: "Claims on your site that argue with each other." },
  { t: "Follow-up failure", d: "Leads that go cold because nobody closed the loop." },
  { t: "Vocabulary friction", d: "Language your buyer does not use, so they bounce." },
  { t: "CRM data decay", d: "Pipelines built on records nobody trusts." },
  { t: "Operational waste", d: "Manual work that quietly eats your margin." },
];

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
        description="Aetheris finds where mid-market businesses lose money: friction, contradictions, drop-offs, follow-up failures and waste. Operator-led forensic audit."
        path="/"
        keywords="revenue leak audit, revenue forensics, business forensics operator, forensic revenue diagnostic, brand contradiction analysis, conversion drop-off audit, mid-market revenue diagnostic, forensic diagnostic Indianapolis"
      />

      <LanderNavbar />

      <AnomalousMatterHero
        eyebrow="Revenue Leak Audit"
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
        description="Experts in making companies visible AND making brand AI be as human as you are."
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">
          {CORE_PROMISE}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground leading-relaxed">
          {HERO_SUPPORT}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            to="/golden-report"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber px-8 font-case text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            {CTA.primary} <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
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
              <a
                href={methodologyPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open The Aetheris Methodology PDF"
                className="group block h-[290px] w-[210px] shrink-0"
                style={{ perspective: 1200 }}
              >
                <div
                  className="relative h-full w-full overflow-hidden rounded-l-[3px] rounded-r-lg border border-amber/30 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--secondary))_55%,hsl(var(--card))_100%)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_0_hsl(var(--amber)/0.15)] transition-transform duration-300 group-hover:-translate-y-1"
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
                      <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber/40 px-3 py-1.5 font-case text-[9px] uppercase tracking-widest text-amber transition-colors group-hover:bg-amber/10">
                        Open PDF
                      </span>
                    </div>
                  </div>
                </div>
              </a>

              <a
                href={methodologyPdf.url}
                download="Aetheris-Methodology.pdf"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border px-6 font-case text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-amber/40 hover:text-foreground"
              >
                Download PDF
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

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// How it works</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-10">Three steps.</h2>
          <div className="grid gap-px bg-border/60 md:grid-cols-3 rounded-xl overflow-hidden border border-border/60">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-background p-8 flex flex-col">
                <span className="font-case text-[10px] uppercase tracking-[0.3em] text-amber/70">
                  Step {s.n}
                </span>
                <h3 className="mt-3 text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{s.d}</p>
                {s.external ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 font-case text-[11px] uppercase tracking-widest text-amber hover:gap-2.5 transition-all"
                  >
                    {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <Link
                    to={s.href}
                    className="mt-6 inline-flex items-center gap-1.5 font-case text-[11px] uppercase tracking-widest text-amber hover:gap-2.5 transition-all"
                  >
                    {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we find */}
      <section id="what-we-find" className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// What we find</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-10">
            The leaks that never show up in your P&amp;L.
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FINDINGS.map((f) => (
              <div key={f.t} className="border-t border-border pt-5">
                <h3 className="text-base font-bold">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
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
