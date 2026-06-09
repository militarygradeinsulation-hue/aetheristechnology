import React from 'react';
import { Check, ShieldCheck, Crown, Zap, ArrowRight, Clock } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import tierDoors from '@/assets/editorial/tier-doors.jpg';
import flagshipSplit from '@/assets/editorial/flagship-split.jpg';

interface Tier {
  id: string;
  icon: React.ElementType;
  name: string;
  tagline: string;
  forWho: string;
  price: string;
  priceNote: string;
  operatorHours: string;
  pairingRationale: string;
  included: string[];
  cta: string;
  highlight?: boolean;
  ribbon?: string;
}

const TIERS: Tier[] = [
  {
    id: 'signal-pack',
    icon: Zap,
    name: 'Signal Pack',
    tagline: 'Entry — find the leak.',
    forWho: 'Owners who know something is off and need an outside read.',
    price: '$2,500',
    priceNote: 'one-time · operator-led',
    operatorHours: '~6 hours operator time',
    pairingRationale: 'Three tools run apart say "what." Run together by an operator they say "where the dollar bleeds."',
    included: [
      'Website + Brand + Friction audits',
      'Single Leak Findings memo',
      '30-min operator walkthrough',
    ],
    cta: 'Talk to an operator',
  },
  {
    id: 'revenue-pack',
    icon: ShieldCheck,
    name: 'Revenue Pack',
    tagline: 'Core — fix the sales engine.',
    forWho: '$1M–$10M companies leaking on outbound and follow-up.',
    price: '$5,000',
    priceNote: 'one-time · operator-led',
    operatorHours: '~14 hours operator time',
    highlight: true,
    ribbon: 'Most operators pick this',
    pairingRationale: 'Scripts, follow-up, and content built as one system so today\'s lead closes in 90 days.',
    included: [
      'Everything in Signal Pack',
      'Scripts + Follow-up + Questions',
      '30-Day Content Calendar',
      'Two 45-min working sessions',
    ],
    cta: 'Talk to an operator',
  },
  {
    id: 'operator-suite',
    icon: Crown,
    name: 'Operator Suite',
    tagline: 'Embedded — 3 weeks of an operator.',
    forWho: 'Owners who want the whole machine, not a tool drawer.',
    price: '$10,000',
    priceNote: 'one-time · credit toward Retainer',
    operatorHours: '~30 hours over 3 weeks',
    pairingRationale: 'The operator embeds, runs every tool against your real business, hands you a working revenue system.',
    included: [
      'Everything in Revenue Pack',
      'Strategy Blueprint + Social Pack',
      'Lead-Nurture Automation',
      'Weekly calls + async ops channel',
      '$10k credit toward Retainer',
    ],
    cta: 'Talk to an operator',
  },
];

interface PackageTiersProps {
  onRequest: () => void;
}

export const PackageTiers: React.FC<PackageTiersProps> = ({ onRequest }) => {
  return (
    <section className="px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center mb-10">
          <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40">
            <img src={tierDoors} alt="Three vault doors in a dark corridor lit by a single amber overhead lamp" width={1024} height={1024} loading="lazy" className="w-full h-auto" />
            <span className="absolute bottom-2 right-2 font-case text-[9px] uppercase tracking-widest text-amber/80 bg-background/70 px-2 py-0.5 rounded-sm border border-amber/20">Aetheris AI Studio</span>
          </div>
          <div>
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Three doors · Operator-led bundles
            </div>
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
              You don't buy tools. You buy the <span className="text-amber italic">operator</span> who runs them.
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mt-3">
              Sealed pairings. No à la carte. No download-and-pray.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            return (
              <RevealOnScroll key={tier.id} variant="float" delay={i * 0.08}>
                <div
                  className={`relative h-full forensic-tile rounded-sm overflow-hidden flex flex-col p-7 border transition-all ${
                    tier.highlight
                      ? 'border-amber/70 shadow-[0_0_40px_-15px_hsl(var(--amber)/0.6)]'
                      : 'border-border/60'
                  }`}
                >
                  {tier.ribbon && (
                    <div className="absolute top-3 right-3 font-case text-[9px] uppercase tracking-widest text-background bg-amber px-2 py-1 rounded-sm">
                      {tier.ribbon}
                    </div>
                  )}
                  <div className="w-11 h-11 rounded-sm bg-amber/10 border border-amber/30 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-amber" />
                  </div>
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber/80 mb-1">
                    {tier.tagline}
                  </div>
                  <h3 className="font-forensic text-2xl md:text-3xl font-bold text-foreground leading-tight">
                    {tier.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">{tier.forWho}</p>

                  <div className="mb-4">
                    <div className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
                      {tier.price}
                    </div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                      {tier.priceNote}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-amber/90 mb-4 font-case uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" />
                    {tier.operatorHours}
                  </div>

                  <div className="rounded-sm border-l-2 border-amber/50 bg-amber/5 px-3 py-2.5 mb-5">
                    <div className="font-case text-[9px] uppercase tracking-widest text-amber/80 mb-1">
                      Why these tools only work together
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{tier.pairingRationale}</p>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.included.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-foreground/85">
                        <Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={onRequest}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-sm px-5 py-3 font-bold transition-colors ${
                      tier.highlight
                        ? 'bg-amber text-background hover:bg-amber/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {tier.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        {/* Flagships sit ABOVE the bundles in price + scope */}
        <div className="mt-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center mb-8">
            <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40">
              <img src={flagshipSplit} alt="Split editorial: autopsy table on the left, wall of surveillance monitors on the right" width={1024} height={1024} loading="lazy" className="w-full h-auto" />
              <span className="absolute bottom-2 right-2 font-case text-[9px] uppercase tracking-widest text-amber/80 bg-background/70 px-2 py-0.5 rounded-sm border border-amber/20">Aetheris AI Studio</span>
            </div>
            <div>
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Flagships · Sales-led only
              </div>
              <h3 className="font-forensic text-2xl md:text-4xl font-bold text-foreground leading-tight">
                When the bundles aren't enough.
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Diagnostic, then surveillance. 15-min fit call required.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="forensic-tile rounded-sm border border-amber/40 p-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
                Flagship · One-time
              </div>
              <h4 className="font-forensic text-xl md:text-2xl font-bold text-foreground mb-2">
                21-Day Revenue Diagnostic
              </h4>
              <div className="font-forensic text-3xl font-bold text-foreground mb-1">$18,500</div>
              <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                fixed fee · 21-day forensic engagement
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                The operator runs a full revenue-system autopsy on your CRM, sales follow-up, and ops.
                Output: a written 15–30 page report, prioritized fixes, ROI projections, source-data
                appendix, and a 60-minute readout.
              </p>
              <button
                type="button"
                onClick={onRequest}
                className="inline-flex items-center gap-2 text-amber font-bold hover:text-amber/80 transition-colors"
              >
                Talk to an operator <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="forensic-tile rounded-sm border border-amber/40 p-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
                Flagship · Monthly
              </div>
              <h4 className="font-forensic text-xl md:text-2xl font-bold text-foreground mb-2">
                Implementation Retainer
              </h4>
              <div className="font-forensic text-3xl font-bold text-foreground mb-1">$15,000<span className="text-base text-muted-foreground">/mo</span></div>
              <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                3-month minimum · Diagnostic clients only
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                After the Diagnostic, the operator executes the prioritized fixes themselves and
                re-measures recovered revenue every month. You stop guessing whether it worked.
              </p>
              <button
                type="button"
                onClick={onRequest}
                className="inline-flex items-center gap-2 text-amber font-bold hover:text-amber/80 transition-colors"
              >
                Talk to an operator <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PackageTiers;
