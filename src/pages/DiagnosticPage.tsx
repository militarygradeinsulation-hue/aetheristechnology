import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, X, Database, Globe, MessagesSquare, FileSearch,
  CalendarRange, Mic2, ListChecks, ShieldAlert, Search,
} from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';

const INCLUDES = [
  '12-month CRM snapshot pulled from HubSpot, Salesforce, or CSV export',
  'Lead-to-contact, deal-stage progression, and touch-frequency analysis',
  'Written report (15–30 pages): leak map + prioritized fixes + ROI projections',
  'Source-data appendix — every CSV and query used',
  '60-minute readout with you and up to two of your team',
  'Fixed-fee implementation quote if you choose to proceed',
];

interface ToolItem {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  finds: string;
}

const TOOL_BUNDLE: ToolItem[] = [
  { icon: Globe, name: 'Website + Digital Footprint Scan', finds: 'AI-readiness, SEO/GEO gaps, schema, page-speed leaks visible to buyers.' },
  { icon: Database, name: 'CRM Hygiene Audit', finds: 'Duplicate contacts, stalled deals, broken stage definitions, ghost pipeline.' },
  { icon: ShieldAlert, name: 'Brand Contradiction Finder', finds: 'Where your homepage, sales deck, and proposal say three different things.' },
  { icon: MessagesSquare, name: 'Friction Vocabulary Audit', finds: 'Words on your site that quietly cost you the deal.' },
  { icon: FileSearch, name: 'Strategic Question Engine', finds: 'The 12 questions a CFO will ask that your team can\'t answer yet.' },
  { icon: ListChecks, name: '20-Question Business Diagnostic', finds: 'Operator-graded scorecard across ops, sales, marketing, and revenue.' },
  { icon: Mic2, name: 'Sales Script + Follow-Up Generator', finds: 'Custom outbound + post-quote sequences mapped to your stalled deals.' },
  { icon: CalendarRange, name: '90-Day Content Calendar', finds: 'Pillar-mapped LinkedIn + email cadence built from leak themes.' },
  { icon: Search, name: 'AI Visibility Scorecard', finds: 'How ChatGPT, Perplexity, and Google AI describe you vs. competitors.' },
];

const NOT_INCLUDED = [
  'Brand strategy, product pricing, or shop-floor operations',
  'Percentage-of-savings billing or ongoing retainer requirement',
  'Vendor reseller commissions on tools we recommend',
];

const DiagnosticPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="The 21-Day Revenue Diagnostic — $18,500 | Aetheris"
        description="Fixed-fee 21-day diagnostic for specialty manufacturers $5M–$25M. Map where CRM, sales follow-up, and lead flow are losing money."
        path="/diagnostic"
        keywords="revenue diagnostic, manufacturing CRM audit, sales operations diagnostic, fixed fee consulting"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Diagnostic', path: '/diagnostic' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pt-28 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Specialty manufacturers · $5M–$25M
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
                The 21-Day Revenue Diagnostic.
              </h1>
              <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
                We map where your CRM, sales follow-up, and lead flow are losing you money. You get a written report with prioritized fixes, ROI projections, and an implementation roadmap.
              </p>
            </div>

            <div className="glass rounded-sm border border-amber/40 p-8 mb-10 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Fixed fee</div>
              <div className="font-forensic text-6xl md:text-7xl font-bold text-foreground">$18,500</div>
              <p className="text-sm text-muted-foreground mt-2">21 calendar days. No retainer required. No percentage-of-savings.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <a href="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                    Book a 15-min call <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <Link to="/methodology">
                  <Button size="lg" variant="outline" className="glass-hover border-amber/40 text-amber">
                    Read the methodology first
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Methodology document goes to every prospect before pricing.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-10">
              <section className="glass rounded-sm border border-border/60 p-6">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">What you get</div>
                <ul className="space-y-2.5">
                  {INCLUDES.map((i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/85">
                      <Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="glass rounded-sm border border-border/60 p-6">
                <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-3">What it isn't</div>
                <ul className="space-y-2.5">
                  {NOT_INCLUDED.map((i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/70">
                      <X className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="glass rounded-sm border border-amber/40 p-6 mb-10">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber">
                  Bundled — Operator Tool Suite
                </div>
                <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
                  Included · No add-on fee
                </div>
              </div>
              <h2 className="font-forensic text-2xl font-bold text-foreground mb-2">
                Nine live diagnostic tools your operator runs against your business.
              </h2>
              <p className="text-sm text-foreground/75 mb-5">
                Every Diagnostic engagement includes the full Aetheris tool suite — the same instruments our reps use in the field. Findings from each tool feed the final leak map. You see CRM bleed, digital footprint exposure, brand contradictions, and AI visibility — all in one report.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {TOOL_BUNDLE.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.name}
                      className="rounded-sm border border-border/60 bg-background/40 p-3.5 hover:border-amber/40 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 mb-1.5">
                        <div className="w-7 h-7 rounded-sm bg-amber/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-amber" />
                        </div>
                        <div className="font-bold text-foreground text-sm leading-tight">{t.name}</div>
                      </div>
                      <p className="text-xs text-foreground/65 leading-snug pl-9">
                        <span className="font-case text-[9px] uppercase tracking-widest text-amber">Finds → </span>
                        {t.finds}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground italic mt-4">
                Tool outputs land in the source-data appendix. Your team keeps the raw exports after the engagement.
              </p>
            </section>

            <section className="glass rounded-sm border border-border/60 p-6 mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">CRM-agnostic</div>
              <h2 className="font-forensic text-xl font-bold text-foreground mb-2">Runs on a CSV export.</h2>
              <p className="text-sm text-foreground/80">
                You don't need to be on HubSpot or Salesforce. We work from a CSV export of contacts, deals, and activity. If you want us to run it live in your CRM, that's a paid upsell — not a prerequisite.
              </p>
            </section>

            <section className="glass rounded-sm border border-amber/30 p-6 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">After the diagnostic</div>
              <h2 className="font-forensic text-2xl font-bold text-foreground mb-2">Implementation Retainer — $15K/month.</h2>
              <p className="text-sm text-foreground/80 mb-4">
                3-month minimum. Available only to Diagnostic clients. We execute the prioritized fixes ourselves.
              </p>
              <Link to="/implementation" className="text-amber font-semibold hover:underline">
                See implementation details →
              </Link>
            </section>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default DiagnosticPage;
