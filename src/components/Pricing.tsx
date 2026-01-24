import React from 'react';
import { Check, Sparkles, Zap, Rocket, Crown, Gift, Clock, Shield, TrendingUp } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { Button } from './ui/button';

interface PricingTier {
  name: string;
  icon: React.ElementType;
  monthlyPrice: number;
  description: string;
  features: string[];
  bonuses: string[];
  savings: string;
  popular?: boolean;
  enterprise?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    icon: Sparkles,
    monthlyPrice: 497,
    description: 'Perfect for small businesses ready to automate and grow',
    savings: 'Save $2,000+/month vs hiring',
    features: [
      'AI Automation Setup & Configuration',
      'Up to 1,000 automated tasks/month',
      'Custom CRM Dashboard',
      'Lead Capture & Scoring System',
      'Automated Email Sequences (up to 5)',
      'Basic Analytics Dashboard',
      '1 Custom Integration (QuickBooks, etc.)',
      'Email Support (48hr response)',
      'Monthly Performance Reports',
      'Mobile App Access',
    ],
    bonuses: [
      '🎁 FREE: 1-hour Strategy Call ($500 value)',
      '🎁 FREE: AI Readiness Assessment',
      '🎁 FREE: Competitor Analysis Report',
    ],
  },
  {
    name: 'Growth',
    icon: Zap,
    monthlyPrice: 997,
    description: 'Everything you need to scale fast and dominate your market',
    savings: 'Save $5,000+/month vs hiring',
    features: [
      'Everything in Starter, PLUS:',
      'Up to 10,000 automated tasks/month',
      'AI-Powered Lead Generator (auto-prospecting)',
      'Full CRM/ERP System',
      'Unlimited Email Sequences',
      '24/7 Marketing Automation Hub',
      'AI Chatbot for Your Website',
      '5 Custom Integrations',
      'Advanced Analytics & ROI Tracking',
      'Priority Support (24hr response)',
      'Weekly Strategy Calls',
      'Custom ML Model Training',
      'API Access',
      'Team Training (up to 5 users)',
    ],
    bonuses: [
      '🎁 FREE: Custom AI Workflow Design ($2,000 value)',
      '🎁 FREE: LinkedIn Lead Gen Setup',
      '🎁 FREE: Google My Business Optimization',
      '🎁 FREE: Monthly SEO Report',
    ],
    popular: true,
  },
  {
    name: 'Professional',
    icon: Rocket,
    monthlyPrice: 1997,
    description: 'Full AI transformation for serious businesses',
    savings: 'Save $10,000+/month vs hiring',
    features: [
      'Everything in Growth, PLUS:',
      'UNLIMITED automated tasks',
      'Dedicated AI Development Team',
      'Custom AI Model Development',
      'Predictive Analytics & Forecasting',
      'Voice AI Assistant Integration',
      'UNLIMITED Integrations',
      'Real-time Business Dashboards',
      '24/7 Priority Support (1hr response)',
      'Dedicated Account Manager',
      'On-site Training Available',
      'White-glove Onboarding',
      'Custom Reporting Suite',
      'SLA Guarantee (99.9% uptime)',
      'Quarterly Business Reviews',
      'Team Training (unlimited users)',
    ],
    bonuses: [
      '🎁 FREE: Full Marketing Automation Setup ($5,000 value)',
      '🎁 FREE: Custom Mobile App',
      '🎁 FREE: Annual Strategy Planning Session',
      '🎁 FREE: Priority Feature Requests',
      '🎁 FREE: Dedicated Slack Channel',
    ],
  },
  {
    name: 'Enterprise',
    icon: Crown,
    monthlyPrice: 0,
    description: 'Fully custom AI solutions for large organizations',
    savings: 'ROI typically 500-1000%',
    features: [
      'Everything in Professional, PLUS:',
      'Dedicated Development Team',
      'Custom AI Model Development',
      'White-label Solutions',
      'Multi-location Support',
      'Custom Security & Compliance (HIPAA, SOC2)',
      'On-premise Deployment Options',
      'Executive Business Reviews',
      'Custom Contract Terms',
      'Volume Discounts Available',
      '24/7 Phone Support',
      'Custom SLA Terms',
    ],
    bonuses: [
      '🎁 Proof of Concept - FREE',
      '🎁 Custom Integration Development',
      '🎁 C-Suite Strategy Sessions',
      '🎁 Industry Benchmarking Reports',
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

                <div className="mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    tier.popular ? 'bg-cyan/30' : 'bg-primary/20'
                  }`}>
                    <tier.icon className={`w-6 h-6 ${tier.popular ? 'text-cyan' : 'text-cyan'}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                </div>

                {/* Savings Badge */}
                <div className="mb-4 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">{tier.savings}</span>
                  </div>
                </div>

                <div className="mb-4">
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

                {/* Features */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What's Included:</p>
                  <ul className="space-y-2">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bonuses Section */}
                <div className="mb-6 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Bonuses Included</span>
                  </div>
                  <ul className="space-y-1">
                    {tier.bonuses.map((bonus) => (
                      <li key={bonus} className="text-xs text-muted-foreground">{bonus}</li>
                    ))}
                  </ul>
                </div>

                <Button 
                  className={`w-full mt-auto ${
                    tier.popular 
                      ? 'bg-cyan hover:bg-cyan/90 text-background' 
                      : tier.enterprise 
                        ? 'bg-primary/20 hover:bg-primary/30 text-foreground border border-cyan/30' 
                        : 'bg-primary/20 hover:bg-primary/30 text-foreground'
                  }`}
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {tier.enterprise ? 'Contact Sales' : 'Get Started Today'}
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

        {/* Urgency Section */}
        <RevealOnScroll delay={0.35}>
          <div className="mt-12 glass p-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground">Limited Availability</h4>
                  <p className="text-sm text-muted-foreground">We only take on 5 new clients per month to ensure quality</p>
                </div>
              </div>
              <Button 
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-background font-bold"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Claim Your Spot
              </Button>
            </div>
          </div>
        </RevealOnScroll>

        {/* Trust Badges */}
        <RevealOnScroll delay={0.4}>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass p-6 rounded-xl text-center">
              <Shield className="w-8 h-8 text-cyan mx-auto mb-3" />
              <h4 className="text-lg font-bold text-foreground mb-2">No Contracts</h4>
              <p className="text-sm text-muted-foreground">
                Cancel anytime. We earn your business every month.
              </p>
            </div>
            <div className="glass p-6 rounded-xl text-center">
              <Gift className="w-8 h-8 text-cyan mx-auto mb-3" />
              <h4 className="text-lg font-bold text-foreground mb-2">Setup Included</h4>
              <p className="text-sm text-muted-foreground">
                $2,000+ in onboarding value included FREE.
              </p>
            </div>
            <div className="glass p-6 rounded-xl text-center">
              <TrendingUp className="w-8 h-8 text-cyan mx-auto mb-3" />
              <h4 className="text-lg font-bold text-foreground mb-2">30-Day Guarantee</h4>
              <p className="text-sm text-muted-foreground">
                Full refund if you're not completely satisfied.
              </p>
            </div>
            <div className="glass p-6 rounded-xl text-center">
              <Zap className="w-8 h-8 text-cyan mx-auto mb-3" />
              <h4 className="text-lg font-bold text-foreground mb-2">Go Live in 48hrs</h4>
              <p className="text-sm text-muted-foreground">
                Most clients are fully automated within 2 days.
              </p>
            </div>
          </div>
        </RevealOnScroll>

        {/* Final CTA */}
        <RevealOnScroll delay={0.45}>
          <div className="mt-16 glass p-10 rounded-xl text-center border border-cyan/30 bg-gradient-to-br from-cyan/5 to-primary/5">
            <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Still on the Fence?
            </h3>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Every day you wait is another day your competitors are automating. 
              Every task you do manually is money left on the table.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                className="bg-cyan hover:bg-cyan/90 text-background font-bold px-8"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Start Your Free Consultation
              </Button>
              <p className="text-sm text-muted-foreground">No credit card required • 15-min call</p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
