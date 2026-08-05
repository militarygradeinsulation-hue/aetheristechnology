import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail, Phone, Globe, Plug } from 'lucide-react';
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_PHONE,
  CONTACT_PHONE_HREF,
  RUN_AUDIT_URL,
  SAMPLE_REPORT_URL,
} from '@/lib/links';

/**
 * Public service page for the Revenue Leak Audit.
 *
 * Naming hierarchy used throughout, deliberately consistent:
 *   Revenue Leak Audit = the service
 *   Golden Report      = the primary deliverable
 *   Leak Register      = the evidence-backed findings inside the report
 *
 * Copy rule: evidence-backed findings, conservative modeled ranges and
 * disclosed assumptions only. No guaranteed recovery, no invented losses.
 * The 14-question self-scan lives on /leak-audit/self-scan.
 */

const WHAT_IT_FINDS: { title: string; body: string }[] = [
  {
    title: 'Unclear or competing calls to action',
    body: 'Pages that ask a visitor to do several things at once, or nothing specific at all.',
  },
  {
    title: 'Broken sales paths and follow-up gaps',
    body: 'Routes that dead end, forms that go nowhere useful, and quoted work with no scheduled second touch.',
  },
  {
    title: 'Messaging contradictions',
    body: 'Claims, positioning or pricing language that conflict across pages and undercut credibility.',
  },
  {
    title: 'Trust and proof gaps',
    body: 'Major claims carrying no visible evidence a buyer can check.',
  },
  {
    title: 'CRM and pipeline problems, when connected',
    body: 'Stalled deals, routing failures and hygiene issues, visible only once those systems are authorized.',
  },
  {
    title: 'Operational friction that can suppress conversion',
    body: 'Slow paths, repeated manual steps and bottlenecks that sit between interest and a signed deal.',
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '01',
    title: 'Surface Sweep',
    body: 'Aetheris reads the live customer-facing site and the publicly observable buying experience.',
  },
  {
    n: '02',
    title: 'Sales Path Review',
    body: 'Every route from first click to stated next step is walked and scored for friction.',
  },
  {
    n: '03',
    title: 'Connected System Analysis',
    body: 'Runs only when you authorize analytics, CRM or pipeline access. Skipped otherwise, and the report says so.',
  },
  {
    n: '04',
    title: 'Leak Diagnosis',
    body: 'Each finding is tied to observed evidence, given a confidence level and a conservative annual range.',
  },
  {
    n: '05',
    title: 'Prioritized Recovery Plan',
    body: 'Findings are sequenced so you know what to fix first and what can wait.',
  },
];

const RECEIVE: string[] = [
  'A Golden Report written for decision-makers, not for a technical audience',
  'A Leak Register with evidence, confidence level and a conservative financial range for each finding',
  'A prioritized sequence showing what to fix first',
  'Transparent assumptions and the calculation basis behind every range',
  'Portal access to the report and its supporting assets',
];

const SectionHeading: React.FC<{ eyebrow: string; title: string; sub?: string }> = ({
  eyebrow,
  title,
  sub,
}) => (
  <div className="max-w-3xl">
    <div className="font-case text-[10px] uppercase tracking-[0.25em] text-amber mb-3">{eyebrow}</div>
    <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight">
      {title}
    </h2>
    {sub && <p className="mt-3 text-base text-muted-foreground leading-relaxed">{sub}</p>}
  </div>
);

const RevenueLeakAuditPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const primaryCta = (
    <Button
      asChild
      size="lg"
      className="bg-amber text-primary-foreground hover:bg-amber/90 focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Link to={RUN_AUDIT_URL}>
        Run My Revenue Leak Audit
        <ArrowRight className="ml-2 w-4 h-4" />
      </Link>
    </Button>
  );

  const secondaryCta = (
    <Button
      asChild
      size="lg"
      variant="outline"
      className="focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Link to={SAMPLE_REPORT_URL}>View a Sample Golden Report</Link>
    </Button>
  );

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Revenue Leak Audit | Aetheris Business Forensics"
        description="Aetheris examines your website, sales path, follow-up and connected systems to identify evidence-backed friction, estimate conservative annual exposure and show you what to fix first."
        path="/leak-audit"
        keywords="revenue leak audit, golden report, business forensics, sales path audit, conversion friction audit, Indianapolis"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Revenue Leak Audit', path: '/leak-audit' },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-5xl mx-auto space-y-20 md:space-y-28">
            {/* 1. HERO */}
            <section aria-labelledby="rla-hero" className="max-w-3xl">
              <div className="font-case text-[10px] uppercase tracking-[0.3em] text-amber mb-4">
                Revenue Leak Audit
              </div>
              <h1
                id="rla-hero"
                className="font-forensic text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.05]"
              >
                Find where your revenue is leaking.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Aetheris examines your website, sales path, follow-up and connected systems to identify
                evidence-backed friction, estimate conservative annual exposure and show you what to fix first.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {primaryCta}
                {secondaryCta}
              </div>
            </section>

            {/* 2. WHAT THE AUDIT FINDS */}
            <section aria-labelledby="rla-finds">
              <div id="rla-finds">
                <SectionHeading
                  eyebrow="What the audit finds"
                  title="Friction you can see, priced conservatively."
                  sub="Every item below is reported only where observed evidence supports it. Findings without evidence do not appear in the Leak Register."
                />
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {WHAT_IT_FINDS.map((item) => (
                  <div
                    key={item.title}
                    className="glass rounded-lg border border-border/60 p-5"
                  >
                    <h3 className="font-semibold text-foreground leading-snug">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. TWO LEVELS OF EVIDENCE */}
            <section aria-labelledby="rla-evidence">
              <div id="rla-evidence">
                <SectionHeading
                  eyebrow="Two levels of evidence"
                  title="How much we can prove depends on what we can see."
                />
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="glass rounded-lg border border-border/60 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-amber" aria-hidden />
                    <h3 className="font-case text-[11px] uppercase tracking-[0.2em] text-amber">
                      External Scan
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Reviews the live customer-facing website and publicly observable buying experience. Produces
                    conservative modeled ranges based on detected evidence and disclosed benchmarks.
                  </p>
                </div>
                <div className="glass rounded-lg border border-amber/40 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Plug className="w-4 h-4 text-amber" aria-hidden />
                    <h3 className="font-case text-[11px] uppercase tracking-[0.2em] text-amber">
                      Connected Audit
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Uses analytics, CRM, pipeline, close-rate and follow-up data when the business authorizes
                    connections. Replaces assumptions with measured performance and tightens the ranges.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground italic max-w-3xl">
                CRM and internal sales-process analysis occurs only when those systems or that data are connected.
                An external scan never reads your internal customer records.
              </p>
            </section>

            {/* 4. HOW IT WORKS */}
            <section aria-labelledby="rla-how">
              <div id="rla-how">
                <SectionHeading eyebrow="How it works" title="Five steps, in order." />
              </div>
              <ol className="mt-8 space-y-3">
                {STEPS.map((s) => (
                  <li
                    key={s.n}
                    className="glass rounded-lg border border-border/60 p-5 flex gap-4 items-start"
                  >
                    <span className="font-case text-[11px] tracking-[0.2em] text-amber pt-1 shrink-0">
                      {s.n}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* 5. WHAT YOU RECEIVE */}
            <section aria-labelledby="rla-receive">
              <div id="rla-receive">
                <SectionHeading eyebrow="What you receive" title="One report, built to be acted on." />
              </div>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {RECEIVE.map((item) => (
                  <li
                    key={item}
                    className="glass rounded-lg border border-border/60 p-5 text-sm text-foreground/90 leading-relaxed flex gap-3"
                  >
                    <span className="text-amber shrink-0" aria-hidden>
                      &rsaquo;
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 6. TRANSPARENT EXAMPLE */}
            <section aria-labelledby="rla-example">
              <div id="rla-example">
                <SectionHeading
                  eyebrow="Transparent example"
                  title="What a single Leak Register entry looks like."
                  sub="The values below are neutral placeholders that demonstrate the format. They are not an audited result for any company."
                />
              </div>
              <div className="mt-8 glass rounded-lg border border-amber/30 p-6 md:p-8 max-w-3xl">
                <div className="font-case text-[10px] uppercase tracking-[0.25em] text-crimson mb-5">
                  Illustrative example
                </div>
                <dl className="space-y-4">
                  {[
                    ['Finding', 'Quote requests route to a single shared inbox with no tracked owner.'],
                    [
                      'Observed evidence',
                      'Three separate contact paths submit to the same address, and no confirmation or ownership step is shown to the visitor.',
                    ],
                    [
                      'Why it matters',
                      'Requests with no assigned owner are the ones most likely to sit unanswered past the window in which a buyer is still comparing options.',
                    ],
                    ['Estimated annual exposure range', 'Illustrative only, shown as a conservative modeled range in the live report.'],
                    ['Confidence', 'Moderate, based on observable routing behavior rather than measured response times.'],
                    [
                      'Calculation basis',
                      'Detected request volume signals combined with disclosed benchmark conversion assumptions, stated in full inside the report.',
                    ],
                    [
                      'Recommended next action',
                      'Assign a named owner and an automatic acknowledgement to each intake path, then measure first response time for 30 days.',
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="grid sm:grid-cols-3 gap-1 sm:gap-4">
                      <dt className="font-case text-[10px] uppercase tracking-[0.18em] text-muted-foreground pt-0.5">
                        {label}
                      </dt>
                      <dd className="sm:col-span-2 text-sm text-foreground/90 leading-relaxed">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <p className="mt-4 text-sm text-muted-foreground max-w-3xl">
                Prefer to start with a quick self-assessment? The{' '}
                <Link
                  to="/leak-audit/self-scan"
                  className="text-amber underline underline-offset-4 hover:text-amber/80 focus-visible:ring-2 focus-visible:ring-amber rounded-sm"
                >
                  14-question self-scan
                </Link>{' '}
                takes about six minutes.
              </p>
            </section>

            {/* 7. FINAL CTA */}
            <section aria-labelledby="rla-final" className="glass rounded-lg border border-amber/30 p-6 md:p-10">
              <h2
                id="rla-final"
                className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight max-w-3xl"
              >
                You do not need another dashboard. You need to know what to fix first.
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl">
                Start with the evidence. The Golden Report shows where friction is costing attention, leads and
                revenue, then gives you a practical order of operations.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                {primaryCta}
                {secondaryCta}
              </div>
              <div className="mt-7 pt-6 border-t border-border/50 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm">
                <a
                  href={CONTACT_EMAIL_HREF}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-amber transition-colors focus-visible:ring-2 focus-visible:ring-amber rounded-sm"
                >
                  <Mail className="w-4 h-4" aria-hidden />
                  {CONTACT_EMAIL}
                </a>
                <a
                  href={CONTACT_PHONE_HREF}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-amber transition-colors focus-visible:ring-2 focus-visible:ring-amber rounded-sm"
                >
                  <Phone className="w-4 h-4" aria-hidden />
                  {CONTACT_PHONE}
                </a>
              </div>
            </section>

            {/* 8. PARTNERS */}
            <section
              aria-labelledby="rla-partners"
              className="rounded-lg border border-border/60 bg-background/40 p-6 md:p-8"
            >
              <h2 id="rla-partners" className="font-forensic text-xl sm:text-2xl font-bold text-foreground">
                Bring Revenue Leak Audits to your clients.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Consultants, fractional executives and service providers can introduce Aetheris through a tracked
                partner relationship.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-5 focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Link to="/partners">
                  Explore the Aetheris Partner Program
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </section>
          </div>
        </main>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default RevenueLeakAuditPage;
