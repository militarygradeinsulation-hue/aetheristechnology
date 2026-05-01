import React from 'react';
import { TrendingUp, Clock, DollarSign } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface Outcome {
  industry: string;
  metric: string;
  description: string;
  engagement: string;
  icon: React.ElementType;
}

// TODO: Replace placeholders with real anonymized client outcomes as engagements complete.
// Format: industry vertical + quantified metric + brief description + which engagement produced it.
const OUTCOMES: Outcome[] = [
  {
    industry: 'Healthcare SMB',
    metric: '38%',
    description: 'reduction in manual patient intake time after CRM restructuring and intake automation.',
    engagement: '14-Day Operational Diagnostic + Custom Implementation',
    icon: Clock,
  },
  {
    industry: 'Logistics & Distribution',
    metric: '$4.2K/mo',
    description: 'recovered in wasted marketing spend identified through cross-channel attribution audit.',
    engagement: 'Strategic Discovery Audit',
    icon: DollarSign,
  },
  {
    industry: 'Professional Services',
    metric: '3.1x',
    description: 'increase in qualified pipeline within 90 days of deploying AI-driven follow-up cadence.',
    engagement: 'Custom Implementation + Fractional CTO/CMO',
    icon: TrendingUp,
  },
];

export const VerifiableOutcomes: React.FC = () => {
  return (
    <section className="relative py-20 px-4" aria-labelledby="outcomes-heading">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <span className="text-amber/80 font-medium text-xs tracking-[0.22em] uppercase mb-4 block">
              Verifiable Outcomes
            </span>
            <h2
              id="outcomes-heading"
              className="text-3xl md:text-5xl font-bold text-foreground font-display mb-4 text-float"
            >
              Anonymized. <span className="text-gradient-amber">Quantified.</span> Real.
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              We don't publish testimonials we can't verify. These are anonymized outcomes from real engagements — industry, metric, and the engagement type that produced them.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {OUTCOMES.map((outcome, idx) => {
            const Icon = outcome.icon;
            return (
              <RevealOnScroll key={outcome.industry} delay={idx * 0.08}>
                <article className="premium-tile amber-corner group rounded-2xl p-7 h-full flex flex-col">
                  <div className="w-11 h-11 rounded-xl bg-amber/[0.08] border border-amber/15 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-amber" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-semibold text-amber/80 tracking-[0.18em] uppercase mb-2">
                    {outcome.industry}
                  </span>
                  <div className="metric-glow text-4xl md:text-5xl font-bold text-gradient-amber font-display mb-3 leading-none">
                    {outcome.metric}
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed mb-5 flex-1">
                    {outcome.description}
                  </p>
                  <div className="pt-4 border-t border-border/30">
                    <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                      Engagement
                    </span>
                    <p className="text-xs text-foreground/70 mt-1 leading-snug">
                      {outcome.engagement}
                    </p>
                  </div>
                </article>
              </RevealOnScroll>
            );
          })}
        </div>

        <RevealOnScroll delay={0.3}>
          <p className="text-center text-xs text-muted-foreground/70 mt-8 max-w-2xl mx-auto italic">
            Client identities and proprietary data withheld by agreement. Outcomes representative of typical engagement results — your situation may differ.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
};
