import React, { useState } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Image, Globe, Eye, Search, Wrench, ChevronDown, ChevronUp, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import renderXylophone from '@/assets/renders/render-xylophone.png';
import renderMonkeyBars from '@/assets/renders/render-monkey-bars.png';
import renderXylophoneCloseup from '@/assets/renders/render-xylophone-closeup.png';
import renderSwings from '@/assets/renders/render-swings.png';

const RENDER_EXAMPLES = [
  { src: renderSwings, alt: 'AI-rendered playground swing set with children playing on wood fiber surfacing' },
  { src: renderXylophone, alt: 'AI-rendered outdoor xylophone with children interacting on playground' },
  { src: renderMonkeyBars, alt: 'AI-rendered monkey bars with children climbing on playground equipment' },
  { src: renderXylophoneCloseup, alt: 'AI-rendered close-up of outdoor musical playground xylophone equipment' },
];

interface ServiceTier {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  pricing: string;
  pricingDetail: string;
  description: string;
  whyItPays: string;
  roiExample: string;
  payback: string;
  details?: string[];
  showExamples?: boolean;
}

const services: ServiceTier[] = [
  {
    icon: Image,
    title: 'Visual Rendering & Image Creation',
    subtitle: 'Make people feel it before they buy it',
    pricing: '$50 – $400',
    pricingDetail: 'per image, based on complexity',
    description: 'From basic enhancement to full-scene renders with AI-generated interaction. Visuals that show real-world use instead of empty, lifeless shots.',
    whyItPays: 'Visuals with people increase engagement by up to 38%. High-quality imagery can boost conversion by up to 30%.',
    roiExample: 'One improved image helps win one deal on a $25K–$150K+ project. A $400 image pays for itself instantly.',
    payback: 'Immediate',
    details: [
      '$50 — Basic enhancement (clarity, lighting, polish)',
      '$125 — Close-up or product-focused render',
      '$275 — Full scene render without people',
      '$400 — Full scene with AI-generated interaction',
    ],
  },
  {
    icon: Globe,
    title: 'Rapid Digital Evaluation',
    subtitle: 'Find what\'s broken in your online presence',
    pricing: '$750',
    pricingDetail: 'flat · delivered in 3–5 days',
    description: 'A focused tear-down of your messaging clarity, CTA placement, conversion flow, and positioning. Fixes that affect existing traffic instantly.',
    whyItPays: '70% of websites fail to convert effectively. Small improvements can increase revenue 10–50% without more traffic.',
    roiExample: 'If your site converts at 1% and improves to 1.5% — that\'s a 50% revenue increase from the same traffic.',
    payback: 'Immediate to 2 weeks',
  },
  {
    icon: Eye,
    title: 'Ongoing Digital Oversight',
    subtitle: 'Stop the slow drift that kills growth',
    pricing: '$1,500',
    pricingDetail: '/month · ~$75/day',
    description: 'Continuous oversight on messaging, content direction, visual consistency, and opportunity capture. Consistency compounds into stronger brand clarity and higher engagement.',
    whyItPays: 'Companies don\'t fail from bad strategy — they fail from drift. Weak messaging, inconsistent visuals, and missed opportunities compound over time.',
    roiExample: 'A 10–20% improvement across content and engagement compounds into more inbound interest, better response rates, and stronger closes.',
    payback: 'Within 1 month',
  },
  {
    icon: Search,
    title: '14-Day Operational Diagnostic',
    subtitle: 'Find exactly where money is leaking',
    pricing: '$7,500',
    pricingDetail: 'flat · 14 days · ~$535/day',
    description: 'A complete operational breakdown — where workflows break, time gets wasted, systems disconnect, and manual work should be automated. Structured, visible, and actionable.',
    whyItPays: 'Up to 30% of employee time is wasted. Poor systems reduce productivity by 20–30%. Automation improves efficiency by 20–40%.',
    roiExample: '5 employees × 10 wasted hours/week × $25/hr = $60,000/year lost. Fixing one major inefficiency recovers $2K–$10K/month.',
    payback: '2–8 weeks',
  },
  {
    icon: Wrench,
    title: 'Custom Implementation',
    subtitle: 'Build the systems that scale you',
    pricing: '$25,000+',
    pricingDetail: 'scoped to your operation',
    description: 'Once gaps are identified, implementation is the multiplier. System builds, automation deployment, CRM restructuring, and workflow integration.',
    whyItPays: 'This is where companies reduce long-term labor costs, increase execution speed, and scale without adding headcount.',
    roiExample: 'Recovered operational waste and increased conversion compound month over month. ROI grows the longer the system runs.',
    payback: 'Ongoing compounding returns',
  },
];

const ServiceCard: React.FC<{ service: ServiceTier; index: number }> = ({ service, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <RevealOnScroll delay={0.05 + index * 0.08}>
      <div
        className="glass glass-hover rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <service.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground font-display leading-tight">{service.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{service.subtitle}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-bold text-primary font-display">{service.pricing}</div>
              <div className="text-xs text-muted-foreground">{service.pricingDetail}</div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{service.description}</p>

          <button
            className="flex items-center gap-1.5 text-xs text-primary mt-3 font-medium group-hover:underline"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? 'Less' : 'ROI breakdown'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable ROI section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 pt-2 border-t border-border/50 space-y-3">
                {service.details && (
                  <div>
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-primary" /> Pricing Tiers
                    </div>
                    <ul className="space-y-1">
                      {service.details.map((d) => (
                        <li key={d} className="text-sm text-muted-foreground">{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Why It Pays
                  </div>
                  <p className="text-sm text-muted-foreground">{service.whyItPays}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" /> ROI Example
                  </div>
                  <p className="text-sm text-muted-foreground">{service.roiExample}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Payback:</span>
                  <span className="text-sm text-primary font-medium">{service.payback}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RevealOnScroll>
  );
};

export const ServicesPricing: React.FC = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-secondary/20 to-background">
      <div className="max-w-4xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              Services & <span className="text-gradient-amber">Investment</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every service either increases conversion or reduces operational waste. Both lead to more revenue with less friction.
            </p>
          </div>
        </RevealOnScroll>

        <div className="space-y-4">
          {services.map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>

        <RevealOnScroll delay={0.5}>
          <div className="mt-12 glass p-8 rounded-xl border border-primary/20 text-center">
            <p className="text-xl font-bold text-foreground mb-2 font-display">
              The Real Question
            </p>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              It's not "Do I spend $7,500?" — it's "How much is inefficiency already costing me every month?"
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="tel:+13173762110">
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.97]">
                  📞 Call (317) 376-2110
                </button>
              </a>
              <a href="mailto:aetheris.technology@outlook.com?subject=Service%20Inquiry">
                <button className="glass-hover border border-border px-6 py-3 rounded-lg font-semibold text-foreground transition-colors active:scale-[0.97]">
                  ✉️ Email Us
                </button>
              </a>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
