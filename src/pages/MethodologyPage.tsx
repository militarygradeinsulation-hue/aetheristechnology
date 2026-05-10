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
          <div className="max-w-3xl mx-auto">
            <div className="mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Measurement Methodology · v1.0
              </div>
              <h1 className="font-forensic text-4xl md:text-5xl font-bold text-foreground leading-tight">
                How we define, measure, and attribute revenue leaks.
              </h1>
              <p className="text-lg text-muted-foreground mt-4">
                Sent to every prospect before pricing is discussed. If a vendor can't write this, they shouldn't be charging for outcomes.
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
              {SECTIONS.map((s, i) => (
                <section key={s.title} className="glass rounded-sm border border-border/60 p-6 md:p-8">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                    Section {String(i + 1).padStart(2, '0')}
                  </div>
                  <h2 className="font-forensic text-2xl font-bold text-foreground mb-4">{s.title}</h2>
                  <div className="space-y-3 text-foreground/85 leading-relaxed">
                    {s.body.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-12 glass rounded-sm border border-amber/30 p-6 text-center">
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
