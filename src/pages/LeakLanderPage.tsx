import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Mail, Phone, MapPin, ChevronDown } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { BOOK_MEETING_URL } from "@/lib/links";
import { LanderNavbar } from "@/components/lander/LanderNavbar";
import { AnomalousMatterHero } from "@/components/lander/AnomalousMatterHero";
import { RealCaseStudiesSection } from "@/components/RealCaseStudiesSection";
import {
  CTA,
  EXPECTATION_NOTE,
} from "@/lib/engagementModel";
import { Footer } from "@/components/Footer";
import { PricingTimeline } from "@/components/PricingTimeline";
import { MethodologyAI } from "@/components/lander/MethodologyAI";
import { LeakAuditFlow } from "@/components/lander/LeakAuditFlow";
import { SystemBuildsStrip } from "@/components/lander/SystemBuildsStrip";

// Reuse the original interactive chaos-physics graph without bloating the initial hero.
const HomeMindMapSection = React.lazy(() => import("@/components/HomeMindMapSection"));


import aetherisWordmark from "@/assets/aetheris-wordmark.jpg.asset.json";
import problemReasonSolution from "@/assets/problem-reason-solution.png.asset.json";


const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-case text-[10px] uppercase tracking-[0.3em] text-amber/80 mb-4">{children}</p>
);

const LeakLanderPage: React.FC = () => {
  const [leakAuditOpen, setLeakAuditOpen] = useState(false);
  const [entryPopupOpen, setEntryPopupOpen] = useState(true);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [methodologyActivated, setMethodologyActivated] = useState(false);
  const [caseStudiesOpen, setCaseStudiesOpen] = useState(false);
  const [caseStudiesActivated, setCaseStudiesActivated] = useState(false);
  const [ecosystemOpen, setEcosystemOpen] = useState(false);
  const [ecosystemActivated, setEcosystemActivated] = useState(false);

  const openLeakAuditFromPopup = () => {
    setEntryPopupOpen(false);
    setLeakAuditOpen(true);
    window.setTimeout(() => {
      document.getElementById("leak-audit")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SEOHead
        title="Find What Is Costing Your Company Money | Aetheris"
        description="Aetheris examines how people, processes, and systems work together, identifies where value is being lost, shows the evidence, and builds the correction plan."
        path="/"
        keywords="revenue leak audit, revenue forensics, business forensics operator, forensic revenue diagnostic, brand contradiction analysis, conversion drop-off audit, mid-market revenue diagnostic, forensic diagnostic Indianapolis"
      />

      <LanderNavbar />

      {entryPopupOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="entry-popup-title"
          onClick={() => setEntryPopupOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-[2rem] border border-amber/50 bg-amber p-8 text-background shadow-[0_30px_100px_-25px_hsl(var(--amber)/0.8)] sm:p-12"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEntryPopupOpen(false)}
              className="absolute right-5 top-4 text-2xl font-light text-background/65 transition hover:text-background"
              aria-label="Close"
            >
              ×
            </button>
            <button
              type="button"
              onClick={openLeakAuditFromPopup}
              className="group flex w-full items-center justify-between gap-6 text-left"
              aria-label="Curious what we know about you? Go to the Leak Audit."
            >
              <div>
                <h2 id="entry-popup-title" className="font-forensic text-4xl font-black leading-[1.05] sm:text-6xl">
                  Curious what we know about you?
                </h2>
                <p className="mt-8 max-w-xl text-xl font-semibold leading-relaxed text-background/80 sm:text-2xl">
                  We guarantee we can help you save money in less than 30 days.
                </p>
              </div>
              <ArrowRight className="h-10 w-10 shrink-0 transition-transform group-hover:translate-x-2 sm:h-14 sm:w-14" />
            </button>
          </div>
        </div>
      )}

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
        <div className="w-full max-w-4xl rounded-2xl border border-amber/25 bg-card/35 px-6 py-8 text-left shadow-[0_20px_60px_-40px_hsl(var(--amber)/0.45)] backdrop-blur-sm sm:px-8 sm:py-10">
          <p className="font-case text-[10px] uppercase tracking-[0.3em] text-amber/80">
            The human evidence
          </p>
          <h2 className="mt-3 font-forensic text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Your business is evidence.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            It reflects how you think, what you tolerate, and what you repeat.
          </p>

          <div className="mt-7 grid gap-2 text-base font-medium text-foreground/90 sm:text-lg">
            <p>We map the person first.</p>
            <p>Then the patterns.</p>
            <p>Then the company.</p>
          </div>

          <div className="mt-7 space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>Because financial leaks rarely begin with software.</p>
            <p className="text-foreground">They begin with decisions.</p>
            <p className="font-semibold text-amber">And decisions leave fingerprints.</p>
          </div>

          <div className="mt-8 border-t border-border/60 pt-7">
            <p className="text-sm text-muted-foreground sm:text-base">
              So if the same problems keep showing up...
            </p>
            <p className="mt-3 font-forensic text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              Is the company failing you?
            </p>
            <p className="mt-1 font-forensic text-2xl font-bold leading-tight text-amber sm:text-3xl">
              Or is it reflecting you?
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLeakAuditOpen(true);
              window.setTimeout(() => document.getElementById("leak-audit")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
            }}
            className="group mt-10 flex w-full items-center justify-between gap-5 rounded-2xl border-2 border-amber/55 bg-amber px-5 py-6 text-left text-background shadow-[0_18px_50px_-22px_hsl(var(--amber)/0.85)] transition hover:-translate-y-0.5 hover:bg-amber/90 sm:px-7 sm:py-7"
            aria-label="Curious what we know about you? Go to the Leak Audit."
          >
            <div>
              <p className="font-forensic text-2xl font-black leading-tight sm:text-4xl">
                Curious what we know about you?
              </p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-background/80 sm:text-base">
                We guarantee we can help you save money in less than 30 days.
              </p>
            </div>
            <ArrowRight className="h-7 w-7 shrink-0 transition-transform group-hover:translate-x-1 sm:h-9 sm:w-9" />
          </button>
        </div>

        <img
          src={problemReasonSolution.url}
          alt="The problem: the cost of existing creates financial leaks. The reason: we look through the lens of science and psychology across people, processes, systems, and structure. The solution: by fixing the leaks, your ROI automatically increases."
          className="w-full max-w-4xl rounded-xl border border-border/60"
          loading="eager"
        />
        <div id="leak-audit" className="w-full max-w-4xl scroll-mt-28 pt-4 text-left">
          <button
            type="button"
            onClick={() => setLeakAuditOpen((open) => !open)}
            aria-expanded={leakAuditOpen}
            aria-controls="homepage-leak-audit-panel"
            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-amber/40 bg-card/45 px-5 py-5 text-left transition hover:border-amber/70 hover:bg-card/65 sm:px-6 sm:py-6"
          >
            <span className="font-forensic text-xl font-bold leading-tight text-foreground sm:text-2xl">
              See if there’s even a reason to talk to us.
            </span>
            <ChevronDown
              className={`h-6 w-6 shrink-0 text-amber transition-transform duration-200 ${leakAuditOpen ? "rotate-180" : ""}`}
            />
          </button>

          {leakAuditOpen && (
            <div id="homepage-leak-audit-panel" className="pt-4">
              <LeakAuditFlow embedded />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-xs text-muted-foreground/80 leading-relaxed">
                  {EXPECTATION_NOTE}
                </p>
                <Link
                  to="/leak-audit/self-scan"
                  className="font-case text-[10px] font-bold uppercase tracking-wider text-amber hover:text-amber/80"
                >
                  Open the full self-scan <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
        <a
          href="/business-xray/index.html"
          className="group mt-4 inline-flex max-w-4xl items-center justify-between gap-4 rounded-xl border border-amber/30 bg-card/40 px-5 py-4 text-left text-foreground transition hover:border-amber/60 hover:bg-card/70"
        >
          <span>
            <span className="block text-sm font-semibold">Prefer to start privately?</span>
            <span className="mt-1 block text-xs text-muted-foreground">Take the free Business X-Ray. Understand friction across people, processes, and systems before buying another tool.</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-amber transition-transform group-hover:translate-x-1" />
        </a>
        <p className="font-case text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 pt-2">
          Indianapolis · Operating nationwide
        </p>
      </AnomalousMatterHero>

      {/* One purchase decision */}
      <section id="what-we-do" className="scroll-mt-28 border-t border-border/60 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
              <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-amber/40 bg-black shadow-[var(--shadow-glow)]">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src="https://www.youtube.com/embed/SnWiB2rSbz4"
                  title="Aetheris — Find what's costing your company money"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <p className="mt-3 text-center font-case text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 lg:text-left">
                Aetheris in 60 seconds
              </p>
          </div>
        </div>
      </section>

      {/* Restored interactive Chaos Theory graph from the existing site code. */}
      <SystemBuildsStrip />

      {/* The Leak Ecosystem — compact until the visitor chooses to explore the interactive map. */}
      <section id="chaos-theory" className="scroll-mt-28 border-t border-border/60 px-6 py-10 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// The mechanism</SectionLabel>
          <h2 className="font-forensic text-2xl font-bold leading-tight sm:text-3xl">
            <button
              type="button"
              onClick={() => {
                setEcosystemActivated(true);
                setEcosystemOpen((open) => !open);
              }}
              aria-expanded={ecosystemOpen}
              aria-controls="homepage-leak-ecosystem-panel"
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-amber/30 bg-card/40 px-5 py-5 text-left transition hover:border-amber/60 hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 sm:px-7 sm:py-6"
            >
              <span>The Leak Ecosystem</span>
              <span className="flex shrink-0 items-center gap-3 text-amber">
                <span className="hidden font-case text-[10px] font-bold uppercase tracking-widest sm:inline">
                  {ecosystemOpen ? "Minimize" : "Explore"}
                </span>
                <ChevronDown className={`h-6 w-6 transition-transform duration-200 ${ecosystemOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
          </h2>
          {!ecosystemOpen && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              See how decisions, people, processes, and systems connect to financial leaks.
            </p>
          )}
          <div id="homepage-leak-ecosystem-panel" hidden={!ecosystemOpen} className="mt-8">
            {ecosystemActivated && (
              <>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                  <h2 className="font-forensic text-3xl font-bold leading-tight sm:text-4xl">
                    We follow the pattern <span className="text-amber">across the handoffs.</span>
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Aetheris investigates the business as a connected system. We follow evidence across
                    acquisition, sales, operations, systems, communication, and delivery to see where one
                    decision changes the next. The map below illustrates dependencies; a finding is not
                    treated as proven until the evidence supports it.
                  </p>
                </div>
                <Link to="/stop-guessing" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber/40 px-5 py-2 text-xs font-bold uppercase tracking-wider text-amber transition hover:bg-amber/10">
                  Explore the original Leak Check page <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <React.Suspense fallback={<div role="status" className="mt-8 rounded-xl border border-amber/20 bg-card/40 p-8 text-sm text-muted-foreground">Loading interactive chaos map…</div>}>
                <HomeMindMapSection />
              </React.Suspense>
              </>
            )}
          </div>
        </div>
      </section>

      {/* The Aetheris Methodology — collapsed on first load */}
      <section id="methodology" className="scroll-mt-28 border-t border-border/60 px-6 py-10 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>// The system</SectionLabel>
          <h2 className="font-forensic text-2xl font-bold leading-tight sm:text-3xl">
            <button
              type="button"
              onClick={() => {
                setMethodologyActivated(true);
                setMethodologyOpen((open) => !open);
              }}
              aria-expanded={methodologyOpen}
              aria-controls="homepage-methodology-panel"
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-amber/30 bg-card/40 px-5 py-5 text-left transition hover:border-amber/60 hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 sm:px-7 sm:py-6"
            >
              <span>The Aetheris Methodology</span>
              <span className="flex shrink-0 items-center gap-3 text-amber">
                <span className="hidden font-case text-[10px] font-bold uppercase tracking-widest sm:inline">
                  {methodologyOpen ? "Minimize" : "Explore"}
                </span>
                <ChevronDown className={`h-6 w-6 transition-transform duration-200 ${methodologyOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
          </h2>
          {!methodologyOpen && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              How the Golden Report becomes a system for fixing the company.
            </p>
          )}
          <div id="homepage-methodology-panel" hidden={!methodologyOpen} className="mt-8 text-center">
            {methodologyActivated && (
              <>
                <p className="mx-auto max-w-2xl leading-relaxed text-muted-foreground">
                  How the Golden Report becomes a system for fixing the company. Read it, or ask the AI attached to it.
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
              </>
            )}
          </div>
        </div>
      </section>

      {/* Case files — collapsed on first load */}
      <section id="case-studies" className="scroll-mt-28 border-t border-border/60 px-6 py-10 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// Case files</SectionLabel>
          <h2 className="font-forensic text-2xl font-bold leading-tight sm:text-3xl">
            <button
              type="button"
              onClick={() => {
                setCaseStudiesActivated(true);
                setCaseStudiesOpen((open) => !open);
              }}
              aria-expanded={caseStudiesOpen}
              aria-controls="homepage-case-studies-panel"
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-amber/30 bg-card/40 px-5 py-5 text-left transition hover:border-amber/60 hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 sm:px-7 sm:py-6"
            >
              <span>50 Case Studies</span>
              <span className="flex shrink-0 items-center gap-3 text-amber">
                <span className="hidden font-case text-[10px] font-bold uppercase tracking-widest sm:inline">
                  {caseStudiesOpen ? "Minimize" : "Explore"}
                </span>
                <ChevronDown className={`h-6 w-6 transition-transform duration-200 ${caseStudiesOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
          </h2>
          {!caseStudiesOpen && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Explore 50 sourced case files, including the problem, the fix, and the outcome.
            </p>
          )}
          <div id="homepage-case-studies-panel" hidden={!caseStudiesOpen} className="pt-6">
            {caseStudiesActivated && (
              <>
                <p className="mb-8 max-w-3xl text-base text-muted-foreground">
                  We sign NDAs to keep our clients private and their data safe. But you can read their
                  stories and situations. We will give you the same courtesy when we partner with you.
                </p>
                <RealCaseStudiesSection />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Interactive investment line */}
      <section id="prices" className="scroll-mt-28 border-t border-border/60 py-20 px-6">
        <PricingTimeline />
      </section>

      {/* Intake */}
      <section className="border-t border-border/60 py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>// Case intake</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            Talk with Aetheris directly.
          </h2>
          <p className="mt-4 text-muted-foreground">
            The first meeting is complimentary. We use it to understand how the business works,
            decide whether there is a credible issue worth investigating, and explain the next step.
            Additional standalone consulting is $100/hour unless included in an agreed scope.
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
