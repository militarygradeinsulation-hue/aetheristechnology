import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Mail, Phone, MapPin } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { BOOK_MEETING_URL } from "@/lib/links";
import { LanderNavbar } from "@/components/lander/LanderNavbar";
import { AnomalousMatterHero } from "@/components/lander/AnomalousMatterHero";
import { CaseFilePreview } from "@/components/lander/CaseFilePreview";
import { RealCaseStudiesSection } from "@/components/RealCaseStudiesSection";
import { TierLadder } from "@/components/TierLadder";
import { ObsidianVibeWaitlist } from "@/components/ObsidianVibeWaitlist";
import { Footer } from "@/components/Footer";

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
    cta: "Book the operator",
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
            className="w-full max-w-2xl mx-auto h-auto select-none"
            loading="eager"
          />
        }
        description=""
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            to="/golden-report"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber px-8 font-case text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Start free scan <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={BOOK_MEETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-8 font-case text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-amber/40 hover:text-foreground"
          >
            <Calendar className="h-4 w-4" /> Book 30 minutes
          </a>
        </div>
        <p className="font-case text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 pt-2">
          Indianapolis · Operating nationwide
        </p>
      </AnomalousMatterHero>

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
          <RealCaseStudiesSection />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// Engagement ladder</SectionLabel>
          <TierLadder />
        </div>
      </section>

      {/* Intake */}
      <section className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>// Case intake</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            Book the operator directly.
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
            <Calendar className="h-4 w-4" /> aetheris.technology/book
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
