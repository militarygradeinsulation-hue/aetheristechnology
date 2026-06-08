import React from 'react';
import { Check, ShieldCheck, Crown, Zap, ArrowRight } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface Tier {
  id: string;
  icon: React.ElementType;
  name: string;
  tagline: string;
  forWho: string;
  price: string;
  priceNote: string;
  included: string[];
  cta: string;
  highlight?: boolean;
  ribbon?: string;
}

const TIERS: Tier[] = [
  {
    id: 'first-look',
    icon: Zap,
    name: 'First Look',
    tagline: 'Starter — see the leaks, fast.',
    forWho: 'For owners who want signal before they spend.',
    price: '$499',
    priceNote: 'one-time · or $199/mo',
    included: [
      'Full Website Report',
      'Digital Snapshot',
      'Social Content Pack',
      'Brand Contradiction Finder',
      'Friction Vocabulary Audit',
    ],
    cta: 'Request First Look',
  },
  {
    id: 'revenue-systems',
    icon: ShieldCheck,
    name: 'Revenue Systems',
    tagline: 'Operator — the working stack.',
    forWho: 'For $1M–$10M companies that want the tools, not just the scan.',
    price: '$1,499',
    priceNote: 'per month · 3-month minimum',
    highlight: true,
    ribbon: 'Most Operators Pick This',
    included: [
      'Everything in First Look',
      'Strategy Blueprint',
      '30-Day Content Calendar',
      'Follow-Up System Plan',
      'Sales Script Pack',
      'Lead-Nurture Automation',
      'Strategic Question Engine',
    ],
    cta: 'Request Revenue Systems',
  },
  {
    id: 'forensic-suite',
    icon: Crown,
    name: 'The Forensic Suite',
    tagline: 'Full Suite — operator-led.',
    forWho: 'For owners who want the whole machine, not a tool drawer.',
    price: 'By application',
    priceNote: 'price disclosed on fit call',
    included: [
      'Every tool in the Premium Tech Suite',
      'Forensic Diagnostic ($2,500 credit applied)',
      'Fractional CTO / CMO seat',
      'Direct line to Joseph — no junior staff',
      'Custom playbooks built to your business',
    ],
    cta: 'Apply for the Suite',
  },
];

interface PackageTiersProps {
  onRequest: () => void;
}

export const PackageTiers: React.FC<PackageTiersProps> = ({ onRequest }) => {
  return (
    <section className="px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
            Three doors · Operator-led packages
          </div>
          <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Buy the <span className="text-amber">package</span>, not the tool drawer.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
            Each tier is a sealed bundle. You don't pay per click — you pay once and the operator runs the stack with you.
          </p>
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
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    {tier.forWho}
                  </p>
                  <div className="mb-5">
                    <div className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
                      {tier.price}
                    </div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                      {tier.priceNote}
                    </div>
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
      </div>
    </section>
  );
};

export default PackageTiers;
