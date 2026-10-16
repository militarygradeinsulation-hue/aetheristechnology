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
  { k: "Evidence", v: "A named finding tied to something you can inspect." },
  { k: "Cause", v: "Why it matters and what is creating it." },
  { k: "Correction", v: "What should change first and how progress will be checked." },
];

const PAIN_POINTS = [
  "Leads enter the business, but ownership changes as they move between people.",
  "Follow-up depends on memory, inboxes, or individual habits.",
  "CRM, spreadsheets, and conversations disagree about what is actually happening.",
  "Teams repeat manual work while no one can see which friction is costing the most.",
];

const FIT_SIGNALS = [
  "Steady inquiry volume and enough economic exposure for small breakdowns to matter.",
  "Multiple people or departments touch the customer journey.",
  "An owner or executive can authorize access and decisions.",
  "The company has capacity to implement corrections once the evidence is clear.",
];

const BUYING_JOURNEY = [
  { n: "01", title: "Recognize", text: "Free Leak Check and a complimentary first meeting establish whether there is a credible reason to investigate." },
  { n: "02", title: "Investigate", text: "A paid diagnostic appropriate to the company establishes causes, priorities, and the correction plan." },
  { n: "03", title: "Correct", text: "Aetheris executes the agreed corrections, or hands your team a clear implementation path." },
  { n: "04", title: "Focus", text: "For a narrow issue, standalone consulting is $100/hour after the complimentary first meeting instead of forcing a larger scope." },
  { n: "05", title: "Continue", text: "Ongoing monitoring or an Active Case is earned when continued operator involvement is useful." },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-case text-[10px] uppercase tracking-[0.3em] text-amber/80 mb-4">{children}</p>
);

const LeakLanderPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SEOHead
        title="Find What Is Costing Your Company Money | Aetheris"
        description="Aetheris examines how people, processes, and systems work together, identifies where value is being lost, shows the evidence, and builds the correction plan."
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
        <h1 className="max-w-4xl text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground [text-wrap:balance]">
          Find what's costing your company money. <span className="text-amber">Know what to fix first.</span>
        </h1>
        <p className="max-w-3xl text-base sm:text-lg leading-relaxed text-foreground/85">
          Aetheris examines how your people, processes, and systems work together, identifies where value is being lost, and builds a practical plan to correct it.
        </p>
        <p className="max-w-3xl border-l border-amber/50 pl-4 text-sm leading-relaxed text-muted-foreground">
          Founder's lens: I study the entire company as one connected system, tracing how every department, role, handoff, and decision affects the next.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            to="/leak-audit/self-scan"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber px-8 font-case text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            {CTA.primary} <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#sample-reports"
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

      {/* One purchase decision */}
      <section id="what-we-do" className="scroll-mt-28 border-t border-border/60 px-6 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionLabel>// The decision</SectionLabel>
            <h2 className="font-forensic text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              Can we find what is costing the company money, <span className="text-amber">show the evidence, and help correct it?</span>
            </h2>
          </div>
          <div className="space-y-5">
            <p className="text-base leading-relaxed text-foreground/90 sm:text-lg">
              That is the entire buying decision. Aetheris examines the business across people,
              processes, systems, handoffs, and decisions to determine where value is being lost
              and what deserves attention first.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              You are not asked to choose a tool or diagnose the company yourself. The investigation
              determines the cause, the appropriate correction, who should own it, and how the result
              should be measured.
            </p>
            <a
              href="#chaos-theory"
              className="inline-flex items-center gap-2 border-b border-amber/50 pb-1 font-case text-xs font-bold uppercase tracking-widest text-amber transition-colors hover:border-amber"
            >
              See the investigation method <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Recognizable pain */}
      <section id="recognize" className="scroll-mt-28 border-t border-border/60 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// What the problem looks like before it has a name</SectionLabel>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <h2 className="font-forensic text-3xl font-bold leading-tight sm:text-4xl">
                The company can look busy while value disappears <span className="text-amber">between the work.</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                The issue is often not one bad department. It is what happens when ownership, information, timing, and decisions cross from one part of the business to another.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PAIN_POINTS.map((point, i) => (
                <div key={point} className="rounded-xl border border-border/60 bg-card/40 p-5">
                  <p className="font-case text-[9px] uppercase tracking-widest text-amber">{String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Initial fit */}
      <section id="fit" className="scroll-mt-28 border-t border-border/60 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// Where we start</SectionLabel>
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <h2 className="font-forensic text-3xl font-bold leading-tight sm:text-4xl">
                Established service businesses where opportunity crosses <span className="text-amber">more than one set of hands.</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Our clearest starting profile is a company with steady inquiries, multiple people handling customers, and no reliable view of where opportunities are being lost.
              </p>
            </div>
            <div>
              <p className="font-case text-[10px] uppercase tracking-widest text-amber">A strong fit usually has</p>
              <ul className="mt-5 space-y-3">
                {FIT_SIGNALS.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Restored interactive Chaos Theory graph from the existing site code. */}
      <section id="chaos-theory" className="scroll-mt-28 border-t border-border/60 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// The mechanism</SectionLabel>
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
      <section id="sample-reports" className="scroll-mt-28 border-t border-border/60 py-20 px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>// The first useful output</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
              Evidence before recommendations.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-lg">
              The Golden Report turns the investigation into a case file: the finding, the evidence,
              why it matters, the correction to consider, and the order in which the work should happen.
              Modeled exposure is kept distinct from financially verified recovery.
            </p>
            <div className="mt-6 rounded-xl border border-amber/30 bg-amber/[0.05] p-5 max-w-lg">
              <p className="font-case text-[10px] uppercase tracking-widest text-amber">First findings brief</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                The first meaningful win is a highest-priority issue supported by evidence, why it matters,
                and the next action. The delivery window is confirmed at kickoff based on access and scope.
              </p>
            </div>
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

      {/* First win, effort and clocks */}
      <section id="first-win" className="scroll-mt-28 border-t border-border/60 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// What happens after we begin</SectionLabel>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-forensic text-3xl font-bold leading-tight sm:text-4xl">
                We carry the investigation. <span className="text-amber">You provide the context and access.</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                We collect and connect the evidence, rank the issues, document the reasoning, and build the correction path. You provide the systems, people, and business context needed to make the findings accurate.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border border-border/60 bg-card/40 p-5">
                <p className="font-case text-[10px] uppercase tracking-widest text-amber">Time to first finding</p>
                <p className="mt-2 text-sm text-foreground/85">When the first evidence-backed priority is ready. The specific window is confirmed at kickoff.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-5">
                <p className="font-case text-[10px] uppercase tracking-widest text-amber">Time to correction</p>
                <p className="mt-2 text-sm text-foreground/85">Depends on the issue, required access, and whether your team or Aetheris performs the implementation.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-5">
                <p className="font-case text-[10px] uppercase tracking-widest text-amber">Time to financial result</p>
                <p className="mt-2 text-sm text-foreground/85">Measured only after the correction has had enough time to affect the agreed baseline. It is not presented as guaranteed recovery.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simplified buying journey */}
      <section id="engagement-options" className="scroll-mt-28 border-t border-border/60 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>// One buying decision</SectionLabel>
          <h2 className="max-w-4xl font-forensic text-3xl font-bold leading-tight sm:text-4xl">
            You do not need to know which Aetheris tool you need. <span className="text-amber">Start with the business problem.</span>
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            The engagement expands only when the evidence justifies it. A narrower problem gets a narrower scope; the same work is not discounted simply to force a sale.
          </p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-5">
            {BUYING_JOURNEY.map((step) => (
              <div key={step.n} className="bg-background p-6">
                <p className="font-case text-[10px] uppercase tracking-[0.28em] text-amber">{step.n}</p>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive investment line */}
      <section id="prices" className="scroll-mt-28 border-t border-border/60 py-20 px-6">
        <PricingTimeline />
      </section>

      {/* Commercial terms */}
      <section id="pricing-disclosure" className="scroll-mt-28 border-t border-border/60 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl border-l-2 border-amber/70 pl-5 sm:pl-8">
          <SectionLabel>// How fees work</SectionLabel>
          <h2 className="max-w-4xl font-forensic text-3xl font-bold leading-tight sm:text-4xl">
            Clear terms before <span className="text-amber">paid work begins.</span>
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-foreground/90 sm:text-lg">
            Your first meeting is complimentary. After that, standalone consulting is $100 per hour unless that time is already included in a written project or ongoing engagement.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-foreground/90">
            Fixed-fee investigations and implementation work are scoped in writing. If a qualifying engagement uses recovery-based compensation, the baseline, attribution method, payment timing, and definition of recovered value are agreed before the work starts.
          </p>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Modeled exposure is not the same as measured recovery. No recovered-revenue outcome is guaranteed.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground/85">
            Our assurance is procedural: if a finding cannot be supported by evidence, it does not belong in the deliverable. If the scope changes, the commercial terms are agreed before the additional work is billed.
          </p>
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
