import React from 'react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';

// What each bundle replaces at a name-brand agency.
// No individual tool prices — bundles are the only public path.
const bundleRows: Array<{
  bundle: string;
  youPay: string;
  oneLine: string;
  replaces: string;
  agencyPrice: string;
}> = [
  {
    bundle: 'Signal Pack',
    youPay: '$2,500',
    oneLine: 'Website + brand + friction read, operator-written memo.',
    replaces: 'SEO audit + brand audit + CRO/copy audit (WebFX, SmartSites, Thrive)',
    agencyPrice: '$4,500–$13,000',
  },
  {
    bundle: 'Revenue Pack',
    youPay: '$5,000',
    oneLine: 'Sales scripts, follow-up system, question engine, 30-day calendar — built as one engine.',
    replaces: 'Sales playbook build + cadence/automation setup + content strategy retainer',
    agencyPrice: '$8,000–$25,000',
  },
  {
    bundle: 'Operator Suite',
    youPay: '$10,000',
    oneLine: '3 weeks of an embedded operator, full stack, credits 1:1 toward Retainer.',
    replaces: 'Fractional CMO + strategy engagement + content + nurture build (Ignite, mid-market firms)',
    agencyPrice: '$25,000–$60,000',
  },
];

// Verdict math — Revenue Pack vs. the agency retainer it replaces.
// Conservative: $3,000/mo entry-level retainer × 12 months.
const BUNDLE_ONE_TIME = 5000; // Revenue Pack
const AGENCY_MONTHLY = 3000;
const MONTHS = 12;
const AGENCY_TOTAL = AGENCY_MONTHLY * MONTHS; // 36,000
const SAVINGS = AGENCY_TOTAL - BUNDLE_ONE_TIME; // 31,000
const MULTIPLE = (AGENCY_TOTAL / BUNDLE_ONE_TIME).toFixed(1); // 7.2x
const MONTHS_TO_EXCEED = (BUNDLE_ONE_TIME / AGENCY_MONTHLY).toFixed(1); // 1.7

const agencyRows = [
  { name: 'WebFX', pricing: 'SEO from $2,500/mo · retainers from ~$3,000/mo · comprehensive $10,000+/mo' },
  { name: 'SmartSites', pricing: 'Entry digital campaign from ~$1,500/mo' },
  { name: 'Thrive Internet Mktg', pricing: 'Month-to-month, custom; mid-market scope' },
  { name: 'Ignite Visibility', pricing: 'Mid-market ~$5,000–$15,000/mo' },
  { name: 'Industry benchmark', pricing: 'SMB $1,500–$5,000/mo · mid-market $5,000–$15,000/mo · full-service $5,000–$50,000/mo' },
];

const fmtUsd = (n: number) => '$' + n.toLocaleString('en-US');

export const ComparisonSection: React.FC = () => {
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <RevealOnScroll>
          <div className="font-case text-[11px] uppercase tracking-[0.34em] text-amber flex items-center gap-3">
            <span className="w-8 h-px bg-amber" />
            Case File 09 <span className="text-muted-foreground tracking-[0.28em]">/ Bundles vs. Big-Name Agencies</span>
          </div>
          <h2 className="font-forensic font-black text-3xl md:text-5xl leading-[1.04] tracking-tight mt-5 max-w-[22ch] text-foreground">
            Same deliverables. Operator-led once, <span className="text-amber italic">not billed every month.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mt-5 max-w-[64ch]">
            Each bundle below replaces a stack of agency engagements you'd otherwise pay for monthly, forever.
            One operator. One sealed engagement. Sources: WebFX & SmartSites published rates, G2 pricing, Clutch industry survey (2026).
          </p>
        </RevealOnScroll>

        {/* Section 1. What each BUNDLE replaces */}
        <RevealOnScroll>
          <div className="mt-12 font-case text-[11px] uppercase tracking-[0.34em] text-amber/90 flex items-center gap-3">
            <span className="font-bold text-amber">01</span>
            <span className="w-6 h-px bg-amber/50" />
            What each bundle replaces at a name-brand agency
          </div>

          <div className="mt-5 border border-border rounded-lg overflow-hidden bg-card/40">
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 bg-background/60 border-b border-border font-case text-[11px] tracking-[0.16em] uppercase font-bold text-muted-foreground">
              <div className="col-span-3">Bundle</div>
              <div className="col-span-2">You pay (once)</div>
              <div className="col-span-4">Same scope at a name-brand agency</div>
              <div className="col-span-3 text-right">Their monthly retainer</div>
            </div>

            {bundleRows.map((r, i) => (
              <div key={r.bundle} className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 ${i > 0 ? 'border-t border-border' : ''} hover:bg-amber/[0.025] transition-colors`}>
                <div className="md:col-span-3">
                  <div className="font-case text-[12.5px] tracking-[0.12em] uppercase font-bold text-foreground">
                    {r.bundle}
                  </div>
                  <div className="text-[12px] text-muted-foreground/80 leading-snug mt-1">
                    {r.oneLine}
                  </div>
                </div>
                <div className="md:col-span-2 font-forensic font-black text-2xl text-amber leading-none">
                  {r.youPay}
                </div>
                <div className="md:col-span-4 text-sm text-muted-foreground leading-snug">
                  {r.replaces}
                </div>
                <div className="md:col-span-3 md:text-right font-forensic font-black text-xl text-destructive leading-none">
                  <s className="decoration-destructive/40 decoration-1">{r.agencyPrice}/mo</s>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm md:text-[15px] text-foreground leading-relaxed max-w-[78ch]">
            <b className="text-amber">Every bundle costs less than one month of the equivalent agency retainer</b> — and the agency keeps billing month after month.
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed max-w-[78ch] italic">
            Agency figures are published 2026 pricing / industry benchmarks for the equivalent scope of work delivered as a monthly retainer.
          </p>
        </RevealOnScroll>

        {/* Section 2. The Verdict — Revenue Pack vs. 12 months of a $3K retainer */}
        <RevealOnScroll>
          <div className="mt-16 font-case text-[11px] uppercase tracking-[0.34em] text-amber/90 flex items-center gap-3">
            <span className="font-bold text-amber">02</span>
            <span className="w-6 h-px bg-amber/50" />
            The verdict <span className="text-muted-foreground tracking-[0.2em]">/ Revenue Pack vs. a $3,000/mo retainer × 12 months</span>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-border rounded-xl bg-card p-5">
              <div className="font-case text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Revenue Pack</div>
              <div className="font-forensic font-black text-3xl md:text-4xl text-amber mt-2 leading-none">{fmtUsd(BUNDLE_ONE_TIME)}</div>
              <div className="text-[11px] text-muted-foreground mt-2 font-case tracking-wide">one-time, operator-led</div>
            </div>
            <div className="border border-border rounded-xl bg-card p-5">
              <div className="font-case text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Agency over 12 mo</div>
              <div className="font-forensic font-black text-3xl md:text-4xl text-destructive mt-2 leading-none">{fmtUsd(AGENCY_TOTAL)}</div>
              <div className="text-[11px] text-muted-foreground mt-2 font-case tracking-wide">$3,000 × 12</div>
            </div>
            <div className="border border-amber/50 rounded-xl bg-amber/[0.06] p-5">
              <div className="font-case text-[10px] tracking-[0.16em] uppercase text-amber">You save</div>
              <div className="font-forensic font-black text-3xl md:text-4xl text-amber mt-2 leading-none">{fmtUsd(SAVINGS)}</div>
              <div className="text-[11px] text-amber/80 mt-2 font-case tracking-wide">vs. the agency</div>
            </div>
            <div className="border border-border rounded-xl bg-card p-5">
              <div className="font-case text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Cost multiple</div>
              <div className="font-forensic font-black text-3xl md:text-4xl text-foreground mt-2 leading-none">{MULTIPLE}×</div>
              <div className="text-[11px] text-muted-foreground mt-2 font-case tracking-wide">agency ÷ Revenue Pack</div>
            </div>
          </div>

          <div className="mt-4 border border-border rounded-xl bg-background/60 px-5 py-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-case text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Months for the agency to exceed your Revenue Pack:</span>
            <span className="font-forensic font-black text-2xl text-amber leading-none">{MONTHS_TO_EXCEED} months</span>
          </div>

          <p className="mt-4 font-case text-[13px] md:text-[14px] tracking-[0.05em] uppercase text-foreground leading-relaxed">
            <span className="text-amber">→</span> By month two, the agency has already cost more than your <b className="text-amber">entire Revenue Pack</b> — and they keep billing for the next ten.
          </p>
        </RevealOnScroll>

        {/* Section 3. Real published agency pricing */}
        <RevealOnScroll>
          <div className="mt-16 font-case text-[11px] uppercase tracking-[0.34em] text-amber/90 flex items-center gap-3">
            <span className="font-bold text-amber">03</span>
            <span className="w-6 h-px bg-amber/50" />
            Real published agency pricing
          </div>

          <div className="mt-5 border border-border rounded-lg overflow-hidden bg-card/40">
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 bg-background/60 border-b border-border font-case text-[11px] tracking-[0.16em] uppercase font-bold text-muted-foreground">
              <div className="col-span-3">Agency</div>
              <div className="col-span-9">Entry / typical monthly</div>
            </div>
            {agencyRows.map((r, i) => (
              <div key={r.name} className={`grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-4 px-5 py-4 ${i > 0 ? 'border-t border-border' : ''}`}>
                <div className="md:col-span-3 font-case text-[12.5px] tracking-[0.12em] uppercase font-bold text-foreground">
                  {r.name}
                </div>
                <div className="md:col-span-9 text-sm text-muted-foreground leading-snug">
                  {r.pricing}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-muted-foreground leading-relaxed font-case tracking-wide italic">
            Sources: WebFX & SmartSites published / G2 pricing, Clutch industry survey (2026). All agency pricing is monthly and ongoing; every Aetheris bundle is one-time, operator-led.
          </p>
        </RevealOnScroll>

        {/* CTA */}
        <RevealOnScroll>
          <div className="mt-10 flex flex-wrap gap-y-4 gap-x-8 items-center justify-between p-5 border border-border rounded-xl bg-background/60">
            <div className="font-case text-[12px] tracking-[0.1em] uppercase text-foreground flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-amber rounded-full ring-4 ring-amber/15" />
              Pay an operator once. Stop renting an agency forever.
            </div>
            <Link to="/catalog" className="font-case text-[12.5px] tracking-[0.14em] uppercase font-bold text-primary-foreground bg-amber hover:bg-amber/90 px-6 py-3.5 rounded-md transition-all hover:-translate-y-0.5 whitespace-nowrap">
              Talk to an operator →
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

export default ComparisonSection;
