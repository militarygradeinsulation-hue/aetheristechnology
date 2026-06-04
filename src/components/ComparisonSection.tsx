import React from 'react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';

// "What each tool replaces at a name-brand agency"
const toolRows: Array<{
  tool: string;
  youPay: string;
  replaces: string;
  agencies: string;
  theirPrice: string;
}> = [
  { tool: 'Full Website Report', youPay: '$59', replaces: 'Technical website / SEO audit', agencies: 'WebFX, Thrive', theirPrice: '$2,000–$6,000' },
  { tool: 'Digital Snapshot', youPay: '$149', replaces: 'Competitive digital teardown', agencies: 'SmartSites, Ignite', theirPrice: '$1,500–$5,000' },
  { tool: 'Strategy Blueprint', youPay: '$349', replaces: 'Strategy + CRM + content-plan engagement', agencies: '', theirPrice: '$5,000–$15,000' },
  { tool: 'Social Content Pack', youPay: '$39', replaces: '20 posts + hooks at agency per-post rates', agencies: '', theirPrice: '$800–$3,000' },
  { tool: 'Sales Script Pack', youPay: '$59', replaces: 'Sales playbook / consultant build', agencies: '', theirPrice: '$1,000–$5,000' },
  { tool: 'Content Calendar', youPay: '$39', replaces: 'Standalone content calendar / strategy', agencies: '', theirPrice: '$500–$2,000' },
  { tool: 'Follow-Up Plan', youPay: '$59', replaces: 'Done-for-you cadence / automation setup', agencies: '', theirPrice: '$1,500+' },
  { tool: 'Visual Rendering (per image)', youPay: '$50–$400/img', replaces: 'Product photography per image', agencies: '', theirPrice: '$50–$200/img' },
];

// Verdict math (mirrors the spreadsheet "WebFX entry / $3,000/mo / 12 months" scenario)
const TOOLSET_ONE_TIME = 903;
const AGENCY_MONTHLY = 3000;
const MONTHS = 12;
const AGENCY_TOTAL = AGENCY_MONTHLY * MONTHS; // 36,000
const SAVINGS = AGENCY_TOTAL - TOOLSET_ONE_TIME; // 35,097
const MULTIPLE = Math.round(AGENCY_TOTAL / TOOLSET_ONE_TIME); // 40x
const MONTHS_TO_EXCEED = (TOOLSET_ONE_TIME / AGENCY_MONTHLY).toFixed(1); // 0.3

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
            Case File 09 <span className="text-muted-foreground/70 tracking-[0.28em]">/ Tools vs. Big-Name Agencies</span>
          </div>
          <h2 className="font-forensic font-black text-3xl md:text-5xl leading-[1.04] tracking-tight mt-5 max-w-[20ch] text-foreground">
            What each tool replaces — and what an agency would <span className="text-amber italic">actually charge you.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mt-5 max-w-[64ch]">
            Below is the same deliverable — priced by us once, and priced by the agencies you've heard of every month. Sources: WebFX & SmartSites published rates, G2 pricing, Clutch industry survey (2026).
          </p>
        </RevealOnScroll>

        {/* Section 1 — What each tool replaces */}
        <RevealOnScroll>
          <div className="mt-12 font-case text-[11px] uppercase tracking-[0.34em] text-amber/90 flex items-center gap-3">
            <span className="font-bold text-amber">01</span>
            <span className="w-6 h-px bg-amber/50" />
            What each tool replaces at a name-brand agency
          </div>

          <div className="mt-5 border border-border rounded-lg overflow-hidden bg-card/40">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 bg-background/60 border-b border-border font-case text-[11px] tracking-[0.16em] uppercase font-bold text-muted-foreground">
              <div className="col-span-3">Your tool</div>
              <div className="col-span-2">You pay</div>
              <div className="col-span-4">Same deliverable at a name-brand agency</div>
              <div className="col-span-3 text-right">Their price</div>
            </div>

            {toolRows.map((r, i) => (
              <div key={r.tool} className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 ${i > 0 ? 'border-t border-border' : ''} hover:bg-amber/[0.025] transition-colors`}>
                <div className="md:col-span-3 font-case text-[12.5px] tracking-[0.12em] uppercase font-bold text-foreground">
                  {r.tool}
                </div>
                <div className="md:col-span-2 font-forensic font-black text-2xl text-amber leading-none">
                  {r.youPay}
                </div>
                <div className="md:col-span-4 text-sm text-muted-foreground leading-snug">
                  {r.replaces}
                  {r.agencies && <span className="text-muted-foreground/60"> ({r.agencies})</span>}
                </div>
                <div className="md:col-span-3 md:text-right font-forensic font-black text-xl text-destructive leading-none">
                  <s className="decoration-destructive/40 decoration-1">{r.theirPrice}</s>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm md:text-[15px] text-foreground leading-relaxed max-w-[78ch]">
            <b className="text-amber">Seven of eight tools cost 10–80× less</b> than the same deliverable from a recognized agency. Visual Rendering is the one priced at market.
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground/70 leading-relaxed max-w-[78ch] italic">
            Agency figures are published 2026 pricing / industry benchmarks for the equivalent standalone deliverable. Frame as "to get this from a name-brand agency you'd pay roughly this."
          </p>
        </RevealOnScroll>

        {/* Section 2 — The Verdict */}
        <RevealOnScroll>
          <div className="mt-16 font-case text-[11px] uppercase tracking-[0.34em] text-amber/90 flex items-center gap-3">
            <span className="font-bold text-amber">02</span>
            <span className="w-6 h-px bg-amber/50" />
            The verdict <span className="text-muted-foreground/60 tracking-[0.2em]">/ full toolset vs. a $3,000/mo retainer × 12 months</span>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-border rounded-xl bg-card p-5">
              <div className="font-case text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Your full toolset</div>
              <div className="font-forensic font-black text-3xl md:text-4xl text-amber mt-2 leading-none">{fmtUsd(TOOLSET_ONE_TIME)}</div>
              <div className="text-[11px] text-muted-foreground/70 mt-2 font-case tracking-wide">one-time</div>
            </div>
            <div className="border border-border rounded-xl bg-card p-5">
              <div className="font-case text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Agency over 12 mo</div>
              <div className="font-forensic font-black text-3xl md:text-4xl text-destructive mt-2 leading-none">{fmtUsd(AGENCY_TOTAL)}</div>
              <div className="text-[11px] text-muted-foreground/70 mt-2 font-case tracking-wide">$3,000 × 12</div>
            </div>
            <div className="border border-amber/50 rounded-xl bg-amber/[0.06] p-5">
              <div className="font-case text-[10px] tracking-[0.16em] uppercase text-amber">You save</div>
              <div className="font-forensic font-black text-3xl md:text-4xl text-amber mt-2 leading-none">{fmtUsd(SAVINGS)}</div>
              <div className="text-[11px] text-amber/80 mt-2 font-case tracking-wide">vs. the agency</div>
            </div>
            <div className="border border-border rounded-xl bg-card p-5">
              <div className="font-case text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Cost multiple</div>
              <div className="font-forensic font-black text-3xl md:text-4xl text-foreground mt-2 leading-none">{MULTIPLE}×</div>
              <div className="text-[11px] text-muted-foreground/70 mt-2 font-case tracking-wide">agency ÷ your toolset</div>
            </div>
          </div>

          <div className="mt-4 border border-border rounded-xl bg-background/60 px-5 py-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-case text-[11px] tracking-[0.16em] uppercase text-muted-foreground">Months for agency to exceed your ENTIRE toolset:</span>
            <span className="font-forensic font-black text-2xl text-amber leading-none">{MONTHS_TO_EXCEED} months</span>
          </div>

          <p className="mt-4 font-case text-[13px] md:text-[14px] tracking-[0.05em] uppercase text-foreground leading-relaxed">
            <span className="text-amber">→</span> A name-brand agency usually costs more in its <b className="text-amber">first month</b> than your entire toolset costs <b className="text-amber">once.</b>
          </p>
        </RevealOnScroll>

        {/* Section 3 — Real published agency pricing */}
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
          <p className="mt-3 text-[11.5px] text-muted-foreground/70 leading-relaxed font-case tracking-wide italic">
            Sources: WebFX & SmartSites published / G2 pricing, Clutch industry survey (2026). All agency pricing is monthly and ongoing; your tools are one-time.
          </p>
        </RevealOnScroll>

        {/* CTA */}
        <RevealOnScroll>
          <div className="mt-10 flex flex-wrap gap-y-4 gap-x-8 items-center justify-between p-5 border border-border rounded-xl bg-background/60">
            <div className="font-case text-[12px] tracking-[0.1em] uppercase text-foreground flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-amber rounded-full ring-4 ring-amber/15" />
              Buy once. Own it. No one bills you next month.
            </div>
            <Link to="/catalog" className="font-case text-[12.5px] tracking-[0.14em] uppercase font-bold text-primary-foreground bg-amber hover:bg-amber/90 px-6 py-3.5 rounded-md transition-all hover:-translate-y-0.5 whitespace-nowrap">
              Open the Case File →
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

export default ComparisonSection;
