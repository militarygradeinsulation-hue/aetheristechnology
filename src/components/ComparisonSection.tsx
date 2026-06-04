import React from 'react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';

const vsRows: Array<{ a: string; b: React.ReactNode }> = [
  { a: 'You rent a service, month after month.', b: <>You <strong>own the deliverable.</strong> Buy it once, keep it forever.</> },
  { a: '$1,500–$5,000+ every month before real results.', b: <>Starts at <strong>$39.</strong> Take only what you need.</> },
  { a: 'Weeks of onboarding and ramp-up.', b: <>Your report, plan, and assets — <strong>delivered fast.</strong></> },
  { a: 'You get activity: posts, reports, billed hours.', b: <>You get <strong>findings</strong> — where you're losing money, in plain numbers.</> },
  { a: 'Locked into a contract.', b: <><strong>No contract. No retainer.</strong> No commitment.</> },
  { a: 'They handle one lane: marketing.', b: <>We x-ray the <strong>whole business</strong> — site, leads, sales, follow-up, systems.</> },
];

const tools = [
  { nm: 'Full Website Report', repl: 'A complete professional website & SEO audit.', elsewhere: '$2,000–$6,000', price: '$59' },
  { nm: 'Strategy Blueprint', repl: 'Full report + CRM plan + implementation + calendar.', elsewhere: '$5,000–$15,000', price: '$349' },
  { nm: 'Social Content Pack', repl: '20 ready-to-post pieces + 5 ad hooks.', elsewhere: '$800–$3,000', price: '$39' },
  { nm: 'Follow-Up Plan', repl: 'A done-for-you 14-day multi-channel sales cadence.', elsewhere: '$1,500+', price: '$59' },
];

export const ComparisonSection: React.FC = () => {
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="font-case text-[11px] uppercase tracking-[0.34em] text-amber flex items-center gap-3">
            <span className="w-8 h-px bg-amber" />
            Case File 09 <span className="text-muted-foreground/70 tracking-[0.28em]">/ The Comparison</span>
          </div>
          <h2 className="font-forensic font-black text-3xl md:text-5xl leading-[1.04] tracking-tight mt-5 max-w-[16ch] text-foreground">
            What you get — and what it'd cost you <span className="text-amber italic">anywhere else.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mt-5 max-w-[60ch]">
            Most agencies sell you <b className="text-foreground font-semibold">more marketing</b> on a monthly bill that never ends. We hand you the actual findings and the fixes — <b className="text-foreground font-semibold">once</b> — then you own them. Here's the honest difference, and what the same work runs on the open market.
          </p>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="mt-12 border border-border rounded-lg overflow-hidden bg-card/40">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="px-5 py-4 font-case text-[12px] tracking-[0.16em] uppercase font-bold text-muted-foreground bg-background/60 border-b md:border-b-0 md:border-r border-border">
                The typical agency
              </div>
              <div className="px-5 py-4 font-case text-[12px] tracking-[0.16em] uppercase font-bold bg-amber text-primary-foreground">
                The Aetheris way
              </div>
            </div>
            {vsRows.map((row, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 border-t border-border">
                <div className="px-5 py-4 text-sm md:text-[15px] leading-relaxed text-muted-foreground border-b md:border-b-0 md:border-r border-border">
                  <span className="font-case text-muted-foreground/60 mr-2">—</span>{row.a}
                </div>
                <div className="px-5 py-4 text-sm md:text-[15px] leading-relaxed text-foreground bg-amber/[0.04] [&_strong]:text-amber [&_strong]:font-bold">
                  <span className="font-case text-amber mr-2">→</span>{row.b}
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="mt-14 font-case text-[11px] uppercase tracking-[0.34em] text-amber flex items-center gap-3">
            <span className="w-8 h-px bg-amber" />
            What each tool replaces <span className="text-muted-foreground/70 tracking-[0.28em]">/ open-market rates</span>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {tools.map((t) => (
              <div key={t.nm} className="border border-border rounded-xl bg-card p-5 hover:border-amber/50 hover:-translate-y-0.5 transition-all">
                <div className="font-case text-[11px] tracking-[0.14em] uppercase text-muted-foreground">{t.nm}</div>
                <div className="text-sm text-muted-foreground mt-3 leading-snug">{t.repl}</div>
                <div className="mt-3.5 pt-3.5 border-t border-dashed border-border flex items-baseline gap-3">
                  <div className="text-sm text-muted-foreground/70">
                    Typically <s className="text-muted-foreground decoration-amber/50">{t.elsewhere}</s>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-case text-[9.5px] tracking-[0.16em] uppercase text-amber">Yours</div>
                    <div className="font-forensic font-black text-3xl text-amber leading-none">{t.price}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

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
          <p className="mt-5 text-[11.5px] text-muted-foreground/70 leading-relaxed max-w-[80ch] font-case tracking-wide">
            Comparison figures reflect typical 2026 U.S. market rates for equivalent standalone services from professional agencies and freelancers. Scope varies by provider; ranges are shown for illustration, not a quote.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
};

export default ComparisonSection;
