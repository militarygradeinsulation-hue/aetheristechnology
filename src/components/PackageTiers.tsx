import React from 'react';
import { Search, FileSearch, Microscope, Wrench, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';

/**
 * The Renamed Offer Ladder (per naming + placement guide):
 *   1. The Leak Check              — Free
 *   2. The One-Leak Investigation  — $4,500–$6,500
 *   3. The Full Leak Investigation — $18,500  (dominant card)
 *   4. Leak Removal & System Build — from $15,000/mo  (no button)
 *
 * The bundle-math anchor renders ABOVE the ladder so the reader sees what a
 * contractor would pay buying these capabilities separately before they see
 * the number. Anchors only work placed before the price, never after.
 *
 * House style: no em-dashes in copy.
 */

interface Rung {
  id: 'leak-check' | 'one-leak' | 'full' | 'removal';
  icon: React.ElementType;
  label: string;
  name: string;
  price: string;
  priceNote: string;
  lead: string;
  bullets?: string[];
  guarantee?: string;
  credit?: string;
  cta?: { label: string; to?: string; onRequest?: boolean };
  footnote?: string;
  highlight?: boolean;
}

const RUNGS: Rung[] = [
  {
    id: 'leak-check',
    icon: Search,
    label: 'Step 1 · Free',
    name: 'The Leak Check',
    price: 'Free',
    priceNote: '5 minutes · no card, no gate on the scan',
    lead: 'You answer questions about how your business actually runs. We open a case file, run the analysis, and hand you a written report with real dollar estimates attached to every leak we find.',
    cta: { label: 'Get Your Free Leak Check', to: '/leak-audit' },
  },
  {
    id: 'one-leak',
    icon: FileSearch,
    label: 'Step 2',
    name: 'The One-Leak Investigation',
    price: '$4,500 – $6,500',
    priceNote: '5 business days · one leak, traced to origin',
    lead: 'You already know where it hurts, or your Leak Check named it. We take your single worst leak and trace it to its origin. Not the symptom. The cause.',
    bullets: [
      'The full trace: where the leak starts, what path it travels, what it touches on the way',
      'The true cost: what this leak takes from you annually in dollars, hours, and lost deals',
      'The removal plan: exactly what has to change, in what order, whether or not you hire us to do it',
    ],
    credit: 'Every dollar is credited toward The Full Leak Investigation within 90 days. If you continue, this cost disappears into it.',
    cta: { label: 'Trace One Leak', onRequest: true },
    footnote: 'For operators who want proof before commitment. Most cases start here.',
  },
  {
    id: 'full',
    icon: Microscope,
    label: 'Step 3 · Most Common Starting Point',
    name: 'The Full Leak Investigation',
    price: '$18,500',
    priceNote: '21 days · one investigator on your case',
    lead: 'The complete forensic examination of your business. Lead flow, sales process, follow up, internal operations, customer experience, brand signal, and the infrastructure connecting all of it. Twenty one days. We work your business like a case, because it is one.',
    bullets: [
      'Full-system investigation across every function where leaks hide',
      'The Findings Report: every leak, traced to origin, with the annual cost of each in plain language',
      'The Removal Roadmap: what to fix, in what order, and what each fix is worth',
      'The Findings Call: we walk you and your leadership through the evidence live',
    ],
    guarantee: 'If the investigation does not identify recoverable losses of at least three times the fee, we discount the follow-on engagement by the shortfall. In writing.',
    credit: 'Every dollar is credited 1:1 toward removal and system build. Proceed to Step 4 and the investigation was free.',
    cta: { label: 'Request the Full Investigation', onRequest: true },
    footnote: 'Limited number of cases per quarter. One investigator works your case, not a rotating team.',
    highlight: true,
  },
  {
    id: 'removal',
    icon: Wrench,
    label: 'Step 4',
    name: 'Leak Removal & System Build',
    price: 'from $15,000/mo',
    priceNote: '3-month minimum',
    lead: 'We do not patch symptoms. We remove causes and build what belongs in their place: custom AI systems, automation, and strategic infrastructure engineered so the leaks cannot come back.',
    footnote: 'Proposed inside a completed Full Leak Investigation. You do not buy this directly, you graduate into it. Never sold cold.',
  },
];

interface PackageTiersProps {
  onRequest: () => void;
}

export const PackageTiers: React.FC<PackageTiersProps> = ({ onRequest }) => {
  return (
    <section className="px-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Page frame */}
        <div className="mb-10">
          <div className="font-case text-[10px] uppercase tracking-[0.3em] text-amber mb-3">
            Chaos Theory Forensics · Pricing
          </div>
          <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
            Every engagement starts with <span className="text-amber italic">evidence.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
            We do not sell retainers, hours, or activity. We sell findings and removal. Here is exactly what each step costs, what you get, and what happens to your money if you continue.
          </p>
        </div>

        {/* Bundle-math anchor — ABOVE the price ladder */}
        <RevealOnScroll variant="float">
          <div className="mb-10 rounded-sm border border-amber/30 bg-background/40 p-6 md:p-7">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
              Before you see our number, see what this normally costs
            </div>
            <p className="text-sm md:text-base text-foreground/85 leading-relaxed mb-5">
              To get what a Full Leak Investigation delivers, a growth-stage business typically hires three vendors separately:
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              <div className="rounded-sm border border-border/60 p-4">
                <div className="font-case text-[9px] uppercase tracking-widest text-amber/80 mb-1">Vendor 1</div>
                <div className="font-forensic text-lg font-bold mb-1">Forensic investigation</div>
                <div className="font-forensic text-xl text-foreground/90">$25k – $100k</div>
              </div>
              <div className="rounded-sm border border-border/60 p-4">
                <div className="font-case text-[9px] uppercase tracking-widest text-amber/80 mb-1">Vendor 2</div>
                <div className="font-forensic text-lg font-bold mb-1">Fractional COO</div>
                <div className="font-forensic text-xl text-foreground/90">$20k – $80k</div>
              </div>
              <div className="rounded-sm border border-border/60 p-4">
                <div className="font-case text-[9px] uppercase tracking-widest text-amber/80 mb-1">Vendor 3</div>
                <div className="font-forensic text-lg font-bold mb-1">AI implementation partner</div>
                <div className="font-forensic text-xl text-foreground/90">$15k – $70k+</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-amber/25 pt-4">
              <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">Buying separately, from three vendors</div>
              <div className="font-forensic text-2xl md:text-3xl font-bold text-crimson">$60,000 – $250,000+</div>
            </div>
            <p className="text-xs text-muted-foreground italic mt-3 leading-relaxed">
              That is the anchor. Now read the ladder.
            </p>
          </div>
        </RevealOnScroll>

        {/* Step 1 — slim strip */}
        {(() => {
          const t = RUNGS[0];
          const Icon = t.icon;
          return (
            <RevealOnScroll variant="float">
              <div className="mb-8 rounded-sm border border-amber/25 bg-amber/[0.03] px-5 py-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 md:min-w-[240px]">
                  <div className="w-10 h-10 rounded-sm bg-amber/10 border border-amber/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-amber" />
                  </div>
                  <div>
                    <div className="font-case text-[9px] uppercase tracking-widest text-amber/80">{t.label}</div>
                    <div className="font-forensic text-lg font-bold text-foreground">{t.name}. Free.</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{t.lead}</p>
                <Link
                  to={t.cta!.to!}
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-sm px-5 py-2.5 font-bold bg-amber text-background hover:bg-amber/90 transition-colors"
                >
                  {t.cta!.label} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </RevealOnScroll>
          );
        })()}

        {/* Steps 2, 3, 4 — stacked cards */}
        <div className="space-y-6">
          {RUNGS.slice(1).map((t, i) => {
            const Icon = t.icon;
            return (
              <RevealOnScroll key={t.id} variant="float" delay={i * 0.08}>
                <div
                  className={`relative forensic-tile rounded-sm p-7 md:p-9 border transition-all ${
                    t.highlight
                      ? 'border-amber shadow-[0_0_60px_-15px_hsl(var(--amber)/0.55)] bg-background/60'
                      : 'border-border/60'
                  }`}
                >
                  {t.highlight && (
                    <div className="absolute -top-3 left-6 font-case text-[9px] uppercase tracking-widest text-background bg-amber px-3 py-1 rounded-sm">
                      Most Common Starting Point
                    </div>
                  )}
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`w-11 h-11 rounded-sm flex items-center justify-center shrink-0 ${
                      t.highlight ? 'bg-amber text-background' : 'bg-amber/10 border border-amber/30 text-amber'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-case text-[10px] uppercase tracking-widest text-amber/80 mb-1">
                        {t.label}
                      </div>
                      <h3 className="font-forensic text-2xl md:text-4xl font-bold text-foreground leading-tight">
                        {t.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className={`font-forensic font-bold ${t.highlight ? 'text-5xl md:text-6xl text-amber' : 'text-4xl md:text-5xl text-foreground'}`}>
                      {t.price}
                    </div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
                      {t.priceNote}
                    </div>
                  </div>

                  <p className="text-sm md:text-base text-foreground/85 leading-relaxed mb-5">
                    {t.lead}
                  </p>

                  {t.bullets && (
                    <div className="mb-5">
                      <div className="font-case text-[10px] uppercase tracking-widest text-amber/80 mb-3">
                        What you get
                      </div>
                      <ul className="space-y-2.5">
                        {t.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-3 text-sm text-foreground/85">
                            <span className="text-amber font-case text-xs mt-0.5">▸</span>
                            <span className="leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t.guarantee && (
                    <div className="mb-5 rounded-sm border-l-2 border-amber bg-amber/[0.05] px-4 py-3">
                      <div className="font-case text-[9px] uppercase tracking-widest text-amber mb-1">
                        Our guarantee
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed italic">{t.guarantee}</p>
                      <div className="font-case text-[9px] uppercase tracking-widest text-muted-foreground/60 mt-2">
                        Final wording pending legal review.
                      </div>
                    </div>
                  )}

                  {t.credit && (
                    <p className="text-sm text-amber/95 font-medium mb-5">{t.credit}</p>
                  )}

                  {t.cta && (
                    <button
                      type="button"
                      onClick={onRequest}
                      className={`inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-bold transition-colors ${
                        t.highlight
                          ? 'bg-amber text-background hover:bg-amber/90'
                          : 'bg-foreground text-background hover:bg-foreground/90'
                      }`}
                    >
                      {t.cta.label} <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {t.footnote && (
                    <p className="text-xs text-muted-foreground italic mt-5 leading-relaxed">
                      {t.footnote}
                    </p>
                  )}
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        {/* Closing strip */}
        <div className="mt-16 text-center border-t border-amber/20 pt-10">
          <h3 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-3">
            Not sure where you stand? That is what the Leak Check is for.
          </h3>
          <Link
            to="/leak-audit"
            className="inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-bold bg-amber text-background hover:bg-amber/90 transition-colors"
          >
            Get Your Free Leak Check <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
            Takes five minutes and costs nothing. If your case is not worth investigating, your report will say so, and so will we.
          </p>
          <div className="font-case text-[10px] uppercase tracking-[0.3em] text-amber/70 mt-6">
            Aetheris · Chaos Theory Forensics · Real Findings. No Sugar.
          </div>
        </div>
      </div>
    </section>
  );
};

export default PackageTiers;
