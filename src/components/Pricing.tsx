import React from 'react';
import { Check, Sparkles, Zap, Rocket, Crown } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { Button } from './ui/button';

interface PricingTier {
  name: string;
  icon: React.ElementType;
  monthlyPrice: number;
  description: string;
  features: string[];
  popular?: boolean;
  enterprise?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    icon: Sparkles,
    monthlyPrice: 497,
    description: 'Perfect for small businesses getting started with AI automation',
    features: [
      'Basic AI Automation Setup',
      'Up to 1,000 automated tasks/month',
      'Email Support',
      'Monthly Performance Reports',
      '1 Custom Integration',
      'Basic Analytics Dashboard',
    ],
  },
  {
    name: 'Growth',
    icon: Zap,
    monthlyPrice: 997,
    description: 'Ideal for growing companies ready to scale their operations',
    features: [
      'Advanced AI Automation',
      'Up to 10,000 automated tasks/month',
      'Priority Support (24hr response)',
      'Weekly Performance Reports',
      '5 Custom Integrations',
      'Advanced Analytics & Insights',
      'Custom ML Model Training',
      'API Access',
    ],
    popular: true,
  },
  {
    name: 'Professional',
    icon: Rocket,
    monthlyPrice: 1997,
    description: 'For established businesses demanding enterprise-grade AI',
    features: [
      'Full AI Suite Access',
      'Unlimited automated tasks',
      '24/7 Priority Support',
      'Real-time Dashboards',
      'Unlimited Integrations',
      'Custom AI Development',
      'Dedicated Account Manager',
      'On-site Training Available',
      'SLA Guarantee',
    ],
  },
  {
    name: 'Enterprise',
    icon: Crown,
    monthlyPrice: 0,
    description: 'Custom solutions for large organizations with complex needs',
    features: [
      'Everything in Professional',
      'Custom AI Model Development',
      'White-label Solutions',
      'Multi-location Support',
      'Custom Security & Compliance',
      'Executive Business Reviews',
      'Dedicated Development Team',
      'Custom SLA Terms',
    ],
    enterprise: true,
  },
];

export const Pricing: React.FC = () => {
  const calculateDaily = (monthly: number) => {
    return (monthly / 30).toFixed(2);
  };

  return (
    <section id="pricing" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Simple, <span className="text-cyan glow-text">Transparent</span> Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
              AI automation that pays for itself. See how affordable intelligent automation really is.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full border border-cyan/30">
              <Sparkles className="w-4 h-4 text-cyan" />
              <span className="text-sm text-muted-foreground">
                Less than a coffee per day for enterprise-grade AI
              </span>
            </div>
          </div>
        </RevealOnScroll>

        {/* Daily Cost Highlight */}
        <RevealOnScroll delay={0.1}>
          <div className="glass p-8 rounded-xl mb-12 text-center border border-cyan/20">
            <h3 className="text-2xl font-bold mb-4 text-foreground">
              Think About It This Way...
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4">
                <p className="text-4xl font-bold text-cyan glow-text mb-2">$16.57</p>
                <p className="text-muted-foreground">per day for Starter</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Less than lunch</p>
              </div>
              <div className="p-4 border-y md:border-y-0 md:border-x border-border/50">
                <p className="text-4xl font-bold text-cyan glow-text mb-2">$33.23</p>
                <p className="text-muted-foreground">per day for Growth</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Less than a tank of gas</p>
              </div>
              <div className="p-4">
                <p className="text-4xl font-bold text-cyan glow-text mb-2">$66.57</p>
                <p className="text-muted-foreground">per day for Professional</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Less than 1 hour of consulting</p>
              </div>
            </div>
            <p className="mt-6 text-lg text-muted-foreground">
              Compare that to hiring a full-time employee at <span className="text-foreground font-semibold">$200-400/day</span>
            </p>
          </div>
        </RevealOnScroll>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map((tier, index) => (
            <RevealOnScroll key={tier.name} delay={index * 0.1}>
              <div 
                className={`glass p-6 rounded-xl h-full flex flex-col relative ${
                  tier.popular ? 'border-2 border-cyan ring-2 ring-cyan/20' : 'border border-border/50'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-cyan text-background text-sm font-bold rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    tier.popular ? 'bg-cyan/30' : 'bg-primary/20'
                  }`}>
                    <tier.icon className={`w-6 h-6 ${tier.popular ? 'text-cyan' : 'text-cyan'}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                </div>

                <div className="mb-6">
                  {tier.enterprise ? (
                    <div>
                      <p className="text-3xl font-bold text-foreground">Custom</p>
                      <p className="text-sm text-muted-foreground">Tailored to your needs</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">${tier.monthlyPrice}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <div className="mt-2 p-2 rounded-lg bg-cyan/10 border border-cyan/20">
                        <p className="text-cyan font-semibold">
                          Only ${calculateDaily(tier.monthlyPrice)}/day
                        </p>
                        <p className="text-xs text-muted-foreground">
                          That's 24/7 AI working for you
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full ${
                    tier.popular 
                      ? 'bg-cyan hover:bg-cyan/90 text-background' 
                      : tier.enterprise 
                        ? 'bg-primary/20 hover:bg-primary/30 text-foreground border border-cyan/30' 
                        : 'bg-primary/20 hover:bg-primary/30 text-foreground'
                  }`}
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {tier.enterprise ? 'Contact Sales' : 'Get Started'}
                </Button>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        {/* ROI Calculator Teaser */}
        <RevealOnScroll delay={0.3}>
          <div className="mt-16 glass p-8 rounded-xl text-center">
            <h3 className="text-2xl font-bold mb-4 text-foreground">
              The Real <span className="text-cyan glow-text">Cost Comparison</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full max-w-3xl mx-auto text-left">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-3 px-4 text-muted-foreground font-semibold">Solution</th>
                    <th className="py-3 px-4 text-muted-foreground font-semibold text-right">Daily Cost</th>
                    <th className="py-3 px-4 text-muted-foreground font-semibold text-right">Hours/Day</th>
                    <th className="py-3 px-4 text-muted-foreground font-semibold text-right">Sick Days?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/30">
                    <td className="py-4 px-4 text-foreground">Full-time Employee</td>
                    <td className="py-4 px-4 text-right text-foreground">$200-400</td>
                    <td className="py-4 px-4 text-right text-foreground">8 hrs</td>
                    <td className="py-4 px-4 text-right text-foreground">Yes</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-4 px-4 text-foreground">Contractor</td>
                    <td className="py-4 px-4 text-right text-foreground">$400-800</td>
                    <td className="py-4 px-4 text-right text-foreground">8 hrs</td>
                    <td className="py-4 px-4 text-right text-foreground">Yes</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-4 px-4 text-foreground">Consulting Firm</td>
                    <td className="py-4 px-4 text-right text-foreground">$1,000+</td>
                    <td className="py-4 px-4 text-right text-foreground">8 hrs</td>
                    <td className="py-4 px-4 text-right text-foreground">Yes</td>
                  </tr>
                  <tr className="bg-cyan/10">
                    <td className="py-4 px-4 text-cyan font-bold">Aetheris AI</td>
                    <td className="py-4 px-4 text-right text-cyan font-bold">$16.57 - $66.57</td>
                    <td className="py-4 px-4 text-right text-cyan font-bold">24 hrs</td>
                    <td className="py-4 px-4 text-right text-cyan font-bold">Never</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-muted-foreground">
              AI doesn't take breaks, doesn't call in sick, and works while you sleep.
            </p>
          </div>
        </RevealOnScroll>

        {/* FAQ-style objections */}
        <RevealOnScroll delay={0.4}>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-xl">
              <h4 className="text-lg font-bold text-foreground mb-2">No long-term contracts</h4>
              <p className="text-sm text-muted-foreground">
                Cancel anytime. We're confident you'll stay because of results, not contracts.
              </p>
            </div>
            <div className="glass p-6 rounded-xl">
              <h4 className="text-lg font-bold text-foreground mb-2">Setup included</h4>
              <p className="text-sm text-muted-foreground">
                Full onboarding and implementation included. No hidden setup fees.
              </p>
            </div>
            <div className="glass p-6 rounded-xl">
              <h4 className="text-lg font-bold text-foreground mb-2">30-day money back</h4>
              <p className="text-sm text-muted-foreground">
                Not satisfied? Get a full refund within your first 30 days. Zero risk.
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
