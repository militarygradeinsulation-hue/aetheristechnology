import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Heart, Banknote, Truck, HardHat, Factory, Code2, FileText, Clock, DollarSign, Star } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { combineSchemas, serviceSchema } from '@/lib/schemas';

interface IndustryLeak {
  industry: string;
  icon: React.ComponentType<{ className?: string }>;
  primaryLeak: string;
  typicalLoss: string;
  whatWeMeasure: string[];
  slug: string;
  recommended: {
    name: string;
    price: string;
    why: string;
    link: string;
  };
}

const INDUSTRIES: IndustryLeak[] = [
  {
    industry: 'Specialty Manufacturing',
    icon: Factory,
    primaryLeak: 'Quote-to-close drag and stalled deals after Day 3.',
    typicalLoss: '$300K–$1.8M / yr',
    whatWeMeasure: [
      'Quote follow-up SLA vs. actual',
      'Time-in-stage by deal value',
      'RFQ-to-PO conversion by lane',
    ],
    slug: 'ai-for-manufacturing',
    recommended: {
      name: '21-Day Revenue Diagnostic + Implementation Retainer',
      price: '$18,500 + $15K/mo',
      why: 'Quote-to-cash is where manufacturers leak most. Diagnostic maps it, retainer rebuilds the follow-up engine.',
      link: '/diagnostic',
    },
  },
  {
    industry: 'Construction',
    icon: HardHat,
    primaryLeak: 'Bid follow-up gaps and RFI cycle bleed.',
    typicalLoss: '$200K–$1.2M / yr',
    whatWeMeasure: [
      'Bid → award follow-up cadence',
      'RFI cycle time and stall points',
      'Change-order capture rate',
    ],
    slug: 'ai-for-construction',
    recommended: {
      name: '21-Day Revenue Diagnostic',
      price: '$18,500',
      why: 'Bid follow-up and change-order capture are the two biggest dollar leaks. Sealed report shows both in 21 days.',
      link: '/diagnostic',
    },
  },
  {
    industry: 'Logistics',
    icon: Truck,
    primaryLeak: 'Quote response lag and lane-margin invisibility.',
    typicalLoss: '$250K–$2M / yr',
    whatWeMeasure: [
      'Quote response time vs. carrier SLA',
      'Lane-level margin attribution',
      'Exception triage cycle',
    ],
    slug: 'ai-for-logistics',
    recommended: {
      name: '21-Day Revenue Diagnostic + Implementation Retainer',
      price: '$18,500 + $15K/mo',
      why: 'Lane margin and quote response are operational — they need both forensic audit and hands-on fix execution.',
      link: '/diagnostic',
    },
  },
  {
    industry: 'Healthcare',
    icon: Heart,
    primaryLeak: 'Intake fall-off and prior-auth aging.',
    typicalLoss: '$180K–$900K / yr',
    whatWeMeasure: [
      'Inquiry-to-appointment conversion',
      'No-show + reschedule loss',
      'Prior-auth aging buckets',
    ],
    slug: 'ai-for-healthcare',
    recommended: {
      name: 'Forensic Diagnostic',
      price: '$2,500 flat',
      why: 'Start with the operator-led mini-audit. Intake and prior-auth leaks usually surface inside two weeks. Fee applies to engagement.',
      link: '/leak-audit',
    },
  },
  {
    industry: 'Finance',
    icon: Banknote,
    primaryLeak: 'Underwriting cycle drag and KYC handoff loss.',
    typicalLoss: '$400K–$2.5M / yr',
    whatWeMeasure: [
      'Application-to-decision days',
      'KYC handoff drop-off',
      'Re-work rate per file',
    ],
    slug: 'ai-for-finance',
    recommended: {
      name: '21-Day Revenue Diagnostic + Implementation Retainer',
      price: '$18,500 + $15K/mo',
      why: 'Highest dollar bleed per leak. Underwriting cycle and KYC handoffs need both audit and ongoing system rebuild.',
      link: '/diagnostic',
    },
  },
  {
    industry: 'B2B SaaS',
    icon: Code2,
    primaryLeak: 'Trial-to-paid drop and renewal silent churn.',
    typicalLoss: '$150K–$1M / yr',
    whatWeMeasure: [
      'Trial activation by cohort',
      'Renewal at-risk signals',
      'Expansion playbook touch-rate',
    ],
    slug: 'ai-for-saas',
    recommended: {
      name: 'Forensic Diagnostic',
      price: '$2,500 flat',
      why: 'Most popular entry for SaaS — fast read on activation and churn signals. Fee applies toward a larger engagement.',
      link: '/leak-audit',
    },
  },
];

const IndustriesPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const jsonLd = combineSchemas(
    serviceSchema(
      'The Leak Audit — by Industry',
      '21-Day Revenue Diagnostic ($18,500) applied to specialty manufacturing, construction, logistics, healthcare, finance, and B2B SaaS. Fixed-fee. Source-data appendix included.',
      { serviceType: 'Revenue Operations Diagnostic', areaServed: 'United States' }
    )
  );

  const faqs = [
    { question: 'What does the 21-Day Leak Audit actually deliver per industry?', answer: 'Same deliverable shape across industries: a 15–30 page leak map, dollar-quantified leaks, prioritized fixes, ROI projections, source-data appendix, and a 60-min readout. The leak *patterns* differ by industry — that\'s what these vertical pages document.' },
    { question: 'How much is the Leak Audit?', answer: 'Fixed fee of $18,500. 21 calendar days from kickoff. CRM-agnostic — runs on a CSV export from HubSpot, Salesforce, or any system of record.' },
    { question: 'What if my industry isn\'t listed?', answer: 'The methodology travels. If your business has leads, dollars, or hours moving through systems and people, there are leaks. Book a 15-minute call and we\'ll scope it.' },
    { question: 'How fast do you find the first leak?', answer: 'Free self-scan: 14 minutes. Operator-led 21-Day Leak Audit: first leaks named within Week 1, full sealed report Day 21.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="The Leak Audit by Industry | $18,500 Revenue Diagnostic | Aetheris"
        description="21-Day Revenue Diagnostic by industry. Fixed $18,500 fee. Manufacturing, construction, logistics, healthcare, finance, SaaS. Source-data appendix included."
        path="/industries"
        keywords="revenue leak audit by industry, manufacturing revenue diagnostic, construction bid leak, logistics quote response, healthcare intake leak, B2B SaaS churn audit, fixed-fee revenue diagnostic"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Industries', path: '/industries' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <section className="pt-32 pb-12 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-crimson/10 border border-crimson/30 text-crimson text-sm font-case uppercase tracking-widest mb-6">
              <Building2 className="w-4 h-4" />
              The Leak Audit · By Industry
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Every industry leaks <span className="text-crimson">differently</span>.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Same fixed-fee diagnostic. Same forensic deliverable. Different wound patterns by sector.
            </p>

            <div className="premium-tile rounded-sm p-6 max-w-3xl mx-auto border border-amber/30 text-left">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                What you get — every industry, every engagement
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground text-sm">$18,500 fixed</div>
                    <div className="text-xs text-muted-foreground">No hourly. No scope creep.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground text-sm">21 calendar days</div>
                    <div className="text-xs text-muted-foreground">Kickoff to sealed report.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground text-sm">15–30 page report</div>
                    <div className="text-xs text-muted-foreground">+ source-data appendix.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {INDUSTRIES.map((v) => {
                const Icon = v.icon;
                return (
                  <Link
                    key={v.slug}
                    to={`/${v.slug}`}
                    className="premium-tile rounded-sm p-6 border border-border/60 hover:border-amber/50 transition-all hover:-translate-y-1 group flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-sm bg-amber/10 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
                        <Icon className="w-6 h-6 text-amber" />
                      </div>
                      <div className="text-right">
                        <div className="font-case text-[9px] uppercase tracking-widest text-muted-foreground">Typical bleed</div>
                        <div className="font-mono text-crimson font-bold text-sm">{v.typicalLoss}</div>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold font-forensic mb-2 text-foreground">{v.industry}</h2>
                    <p className="text-sm text-muted-foreground mb-4 italic">"{v.primaryLeak}"</p>

                    <div className="font-case text-[9px] uppercase tracking-widest text-amber mb-2">
                      What we measure
                    </div>
                    <ul className="space-y-1 mb-5 flex-1">
                      {v.whatWeMeasure.map((m) => (
                        <li key={m} className="text-xs text-foreground/75 flex gap-2">
                          <span className="text-amber">›</span>{m}
                        </li>
                      ))}
                    </ul>
                    <div className="text-amber font-semibold text-sm inline-flex items-center gap-1 pt-3 border-t border-border/40">
                      Open the case file <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center premium-tile rounded-sm p-10 border border-amber/30">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
              Industry not listed?
            </div>
            <h2 className="font-forensic text-3xl md:text-4xl font-bold mb-4">
              The methodology travels.
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              If revenue moves through systems and people, there are leaks. $18,500. 21 days. Sealed report.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/diagnostic">
                <Button size="lg" className="bg-crimson hover:bg-crimson/90 text-foreground font-semibold">
                  Open The Leak Audit — $18,500 <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/leak-audit">
                <Button size="lg" variant="outline">
                  Run the free self-scan
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default IndustriesPage;
