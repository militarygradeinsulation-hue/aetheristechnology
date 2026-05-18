import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ArrowRight } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { generateMethodologyPdf } from '@/lib/generateMethodologyPdf';
import { ForensicInfographic } from '@/components/ForensicInfographic';
import { INFOGRAPHICS } from '@/lib/infographics';

const SECTION_IMAGES: Record<number, { image: string; alt: string; summary: string; humanWhy: string }> = {
  0: {
    image: INFOGRAPHICS.methodologyDefineLeak,
    alt: 'Sales funnel cross-section showing a measurable gap between Revenue Expected and Revenue Captured',
    summary: 'A revenue leak is a measurable gap between two observable numbers — never a forecast, never a "potential opportunity." Examples: lead-to-contact SLA misses, deals stalled past Day 3, duplicate CRM records.',
    humanWhy: "You already feel this. It's the gut-pinch when you look at your pipeline and know the number on the screen is a lie. I refuse to add to that. A leak only counts if I can show it to you in your own data — no hand-waving, no 'potential.'",
  },
  1: {
    image: INFOGRAPHICS.methodologyBaseline,
    alt: 'Terminal display of a 12-month CRM export with three measurement layers and one stalled row flagged',
    summary: 'We pull a 12-month snapshot from your system of record and measure three layers: lead-to-contact speed, deal-stage progression, and touch frequency. Where data is missing, we say so — we never estimate around gaps.',
    humanWhy: "I've been the owner staring at a CRM at midnight wondering what's real. I don't fill gaps with guesses to make the report look smarter. If your data has holes, you'll see exactly where — because trusting the number is the only way you'll sleep.",
  },
  2: {
    image: INFOGRAPHICS.methodologyAttribution,
    alt: 'Blueprint showing pre-fix and post-fix pipelines with the same metric tagged on both, post stamped Recovered',
    summary: 'Every leak is tagged with the baseline metric, the fix, conservative and aggressive ROI, and the exact metric we will re-measure after implementation. Recovered revenue requires same-metric, same-population proof.',
    humanWhy: "You've been sold 'ROI' by enough consultants to know it usually means nothing. I tie every dollar to a metric we measured before and the same metric we'll measure after. If it didn't move, I didn't earn it.",
  },
  3: {
    image: INFOGRAPHICS.methodologyScope,
    alt: 'Split diagram with amber In-Scope icons on the left and gray Out-of-Scope icons on the right',
    summary: 'In scope: CRM data, sales activity, attribution, cadences, handoffs. Out of scope: pricing strategy, brand strategy, hiring, capital structure, legal compliance, shop-floor manufacturing.',
    humanWhy: "You don't need another vendor promising to fix everything and fixing nothing. I tell you up front what I will and won't touch — so you stop paying for scope creep and start paying for things that actually close.",
  },
  4: {
    image: INFOGRAPHICS.pitchCaseFile,
    alt: 'Forensic case file with redaction bars and a crimson signature drip',
    summary: 'Every claim in the final report traces back to a record export. We deliver the source CSVs, the queries, this methodology document, and a re-runnable script — anything an auditor would need to verify the numbers.',
    humanWhy: "I've been burned by partners and watched people try to claim work that wasn't theirs. I write reports the way I wish vendors had written them for me — so your CFO, your spouse, your board, anyone, can re-run the numbers themselves.",
  },
  5: {
    image: INFOGRAPHICS.methodologyDeliverables,
    alt: 'Stack of forensic deliverables: a 24-page leak map report, a CSV source data appendix, a fixed-fee quote',
    summary: 'Written report (15–30 pages), source-data appendix, 60-minute readout, and a fixed-fee quote for implementation. $18,500 flat, 21 calendar days, CRM-agnostic.',
    humanWhy: "At the end of 21 days you don't get a slide deck and a hug. You get a sealed report you can hand to anyone, a number to act on, and a fixed quote if you want me to fix it. No mystery invoices. No 'let's chat about phase two.'",
  },
};

const SECTIONS = [
  {
    title: 'How we define a revenue leak',
    body: [
      'A revenue leak is a measurable gap between revenue you should have captured and revenue you actually captured, attributable to a specific operational, sales, or system failure. It is not a forecast or a "potential opportunity." It is a delta between two observable numbers.',
      'Examples: leads received but never contacted within SLA; quoted deals not followed up after Day 3; signed contracts that never converted to billable activity; CRM records duplicated across tools causing rep double-work.',
    ],
  },
  {
    title: 'How we measure baseline',
    body: [
      'We pull a 12-month snapshot from your system of record (HubSpot, Salesforce, or a CSV export of contacts, deals, and activities). We sample three measurement layers:',
      '• Lead-to-contact: time from inbound capture to first human response.',
      '• Deal-stage progression: time-in-stage by deal value, conversion rate per stage, stalled-deal aging.',
      '• Touch frequency: outbound touches per opportunity vs. benchmark for the deal size.',
      'Where data is missing, we say so explicitly in the report. We do not estimate around missing data.',
    ],
  },
  {
    title: 'How we attribute recovered revenue',
    body: [
      'Every leak in the report is tagged with the baseline metric we measured, the proposed fix, conservative and aggressive ROI projections, and the metric we will re-measure after implementation to confirm recovery.',
      'Recovered revenue is only claimed against pre/post measurement of the same metric on the same population, with the same definition. No counterfactuals.',
    ],
  },
  {
    title: 'Scope — what is in, what is out',
    body: [
      'In scope: CRM data, sales activity logs, lead-source attribution, sales-stage definitions, follow-up cadences, quote-to-close timelines, and operational handoffs between marketing, sales, and delivery.',
      'Out of scope: product pricing strategy, brand strategy, hiring decisions, capital structure, legal compliance, manufacturing operations on the shop floor.',
    ],
  },
  {
    title: 'What an auditor would need to verify it',
    body: [
      'Every claim in the final report can be traced to a record export. We deliver the source CSVs and API pulls used, the queries that produced each metric, this methodology document, and a re-runnable script for any post-implementation re-measurement.',
      'A CFO, controller, or external auditor with read-only access to your CRM can re-derive every number in the report.',
    ],
  },
  {
    title: 'Diagnostic deliverables',
    body: [
      '• Written report (15–30 pages): leak map, prioritized fixes, ROI projections, implementation roadmap.',
      '• Source-data appendix: every CSV and query used.',
      '• 60-minute readout call with you and up to two of your team.',
      '• A fixed-fee quote for implementation if you choose to proceed.',
      'Fixed fee: $18,500. Timeline: 21 calendar days from kickoff. CRM-agnostic.',
    ],
  },
];

const MethodologyPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Revenue Diagnostic Methodology — Aetheris"
        description="How Aetheris defines, measures, and attributes revenue leaks for specialty manufacturers. Sent to every prospect before pricing."
        path="/methodology"
        keywords="revenue diagnostic methodology, manufacturing revenue audit, CRM data audit, sales attribution"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Methodology', path: '/methodology' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pt-28 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Measurement Methodology · v1.0
              </div>
              <h1 className="font-forensic text-4xl md:text-5xl font-bold text-foreground leading-tight">
                How I find the money you've been losing —<br className="hidden md:block" />
                <span className="text-amber"> and how you'll know I actually found it.</span>
              </h1>
              <p className="text-lg text-muted-foreground mt-4">
                Written for the owner who's been burned before. Every section has the forensic rule and — underneath it — why I built it that way, because I was that owner.
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <Button onClick={() => generateMethodologyPdf()} className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                  <Download className="w-4 h-4 mr-2" />
                  Download as PDF
                </Button>
                <Link to="/diagnostic">
                  <Button variant="outline" className="glass-hover border-amber/40 text-amber">
                    See the 21-Day Diagnostic <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-10">
              {SECTIONS.map((s, i) => {
                const meta = SECTION_IMAGES[i];
                return (
                  <div key={s.title} className="space-y-3">
                    <ForensicInfographic
                      image={meta.image}
                      imageAlt={meta.alt}
                      caseNumber={`Section ${String(i + 1).padStart(2, '0')}`}
                      title={s.title}
                      summary={meta.summary}
                      fullText={s.body}
                      reverse={i % 2 === 1}
                    />
                    <div className="rounded-sm border-l-2 border-amber/60 bg-amber/5 px-5 py-4 ml-1">
                      <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1.5">
                        Why I do it this way — Joseph
                      </div>
                      <p className="text-foreground/85 text-[15px] leading-relaxed italic">
                        {meta.humanWhy}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>


            <div className="mt-12 forensic-tile rounded-sm border border-amber/30 p-6 text-center">
              <p className="text-foreground font-semibold">Ready to see this run on your numbers?</p>
              <p className="text-sm text-muted-foreground mt-1">21 days. $18,500 fixed fee. Specialty manufacturers, $5M–$25M.</p>
              <a
                href="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4"
              >
                <Button className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                  Book a 15-minute call <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default MethodologyPage;
