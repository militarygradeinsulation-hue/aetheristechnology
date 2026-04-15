import React, { useState } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Image, Globe, Eye, Search, Wrench, ChevronDown, ChevronUp, TrendingUp, Clock, DollarSign, ShoppingCart, MessageCircle, BarChart3, X, Share2, Phone, Calendar, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { Link } from 'react-router-dom';

import renderXylophone from '@/assets/renders/render-xylophone.png';
import renderMonkeyBars from '@/assets/renders/render-monkey-bars.png';
import renderXylophoneCloseup from '@/assets/renders/render-xylophone-closeup.png';
import renderSwings from '@/assets/renders/render-swings.png';
import renderSlideGirl from '@/assets/renders/render-slide-girl.png';
import renderSlideRed from '@/assets/renders/render-slide-red.png';
import renderTunnelGirl from '@/assets/renders/render-tunnel-girl.png';
import renderTunnelSmile from '@/assets/renders/render-tunnel-smile.png';
import renderActivityPanel from '@/assets/renders/render-activity-panel.png';
import renderActivityCloseup from '@/assets/renders/render-activity-closeup.png';
import renderSteeringWheel from '@/assets/renders/render-steering-wheel.png';
import renderSteeringCloseup from '@/assets/renders/render-steering-closeup.png';
import renderPuzzleGirl from '@/assets/renders/render-puzzle-girl.png';
import renderPuzzleCloseup from '@/assets/renders/render-puzzle-closeup.png';
import renderGamePiece from '@/assets/renders/render-game-piece.png';
import renderGameGirl from '@/assets/renders/render-game-girl.png';
import renderGameBoy from '@/assets/renders/render-game-boy.png';
import renderGameFocused from '@/assets/renders/render-game-focused.png';
import renderArchiscanModernHouse from '@/assets/renders/render-archiscan-modern-house.png';
import renderArchiscanBlueprint from '@/assets/renders/render-archiscan-blueprint.png';
import renderAerialLandscapePool from '@/assets/renders/render-aerial-landscape-pool.png';
import renderWoodlandPlayground from '@/assets/renders/render-woodland-playground.png';
import renderClassicEstate from '@/assets/renders/render-classic-estate.png';
import renderConcreteCircles from '@/assets/renders/render-concrete-circles.png';
import renderAmphitheaterPavilion from '@/assets/renders/render-amphitheater-pavilion.png';
import renderGreenSwings from '@/assets/renders/render-green-swings.png';
import renderXylophoneKids from '@/assets/renders/render-xylophone-kids.png';
import renderScreenshot1 from '@/assets/renders/render-screenshot-1.png';
import renderScreenshot2 from '@/assets/renders/render-screenshot-2.png';
import renderScreenshot3 from '@/assets/renders/render-screenshot-3.png';
import renderScreenshot4 from '@/assets/renders/render-screenshot-4.png';
import renderScreenshot5 from '@/assets/renders/render-screenshot-5.png';
import renderScreenshot6 from '@/assets/renders/render-screenshot-6.png';

import rdeFinancial from '@/assets/rde/rde-financial.png';
import rdeSocialActivity from '@/assets/rde/rde-social-activity.png';
import rdeSeoAnalysis from '@/assets/rde/rde-seo-analysis.png';
import rdeTacticalSteps from '@/assets/rde/rde-tactical-steps.png';
import rdeChainDo from '@/assets/rde/rde-chain-reactions-do.png';
import rdeChainDont from '@/assets/rde/rde-chain-reactions-dont.png';
import rdeSeoWoodplaync from '@/assets/rde/rde-seo-woodplaync.png';

const RENDER_EXAMPLES = [
  { src: renderSwings, alt: 'AI-rendered playground swing set with children playing on wood fiber surfacing' },
  { src: renderXylophone, alt: 'AI-rendered outdoor xylophone with children interacting on playground' },
  { src: renderMonkeyBars, alt: 'AI-rendered monkey bars with children climbing on playground equipment' },
  { src: renderXylophoneCloseup, alt: 'AI-rendered close-up of outdoor musical playground xylophone equipment' },
  { src: renderSlideGirl, alt: 'AI-rendered child peeking around metal playground slide in golden hour light' },
  { src: renderSlideRed, alt: 'AI-rendered child laughing on red and silver playground slide' },
  { src: renderTunnelGirl, alt: 'AI-rendered child emerging from playground tunnel slide with joyful expression' },
  { src: renderTunnelSmile, alt: 'AI-rendered child smiling through circular playground tunnel equipment' },
  { src: renderActivityPanel, alt: 'AI-rendered toddler playing with colorful playground activity panel' },
  { src: renderActivityCloseup, alt: 'AI-rendered close-up of child interacting with playground steering panel' },
  { src: renderSteeringWheel, alt: 'AI-rendered child turning orange steering wheel on playground equipment' },
  { src: renderSteeringCloseup, alt: 'AI-rendered close-up of boy playing with playground steering wheel toy' },
  { src: renderPuzzleGirl, alt: 'AI-rendered girl playing with purple puzzle panel on playground equipment' },
  { src: renderPuzzleCloseup, alt: 'AI-rendered close-up of child exploring purple tic-tac-toe playground panel' },
  { src: renderGamePiece, alt: 'AI-rendered child moving game piece on purple 3-in-a-row playground board' },
  { src: renderGameGirl, alt: 'AI-rendered girl playing 3-in-a-row game on purple playground panel' },
  { src: renderGameBoy, alt: 'AI-rendered boy laughing while playing tic-tac-toe on playground equipment' },
  { src: renderGameFocused, alt: 'AI-rendered child focused on purple playground game board pieces' },
  { src: renderArchiscanModernHouse, alt: 'AI-rendered modern architectural concept home with reflective water and wood deck' },
  { src: renderArchiscanBlueprint, alt: 'Architectural blueprint concept of modern building generated from design-to-render workflow' },
  { src: renderAerialLandscapePool, alt: 'AI-rendered aerial landscape and pool design concept for luxury property visualization' },
  { src: renderWoodlandPlayground, alt: 'AI-rendered natural woodland playground concept for destination park planning' },
  { src: renderClassicEstate, alt: 'AI-rendered classic luxury estate exterior concept for residential architectural visualization' },
  { src: renderConcreteCircles, alt: 'AI-rendered brutalist concrete building with circular windows, fountain, and red steel staircase' },
  { src: renderAmphitheaterPavilion, alt: 'AI-rendered modern amphitheater pavilion with timber slats and concrete water feature in park setting' },
  { src: renderGreenSwings, alt: 'AI-rendered children playing on green swing set with wood fiber surfacing on playground' },
  { src: renderXylophoneKids, alt: 'AI-rendered children laughing while playing outdoor xylophone on playground equipment' },
  { src: renderScreenshot1, alt: 'AI-rendered playground visualization example showcasing realistic scene composition' },
  { src: renderScreenshot2, alt: 'AI-rendered outdoor recreation area with detailed environmental design' },
  { src: renderScreenshot3, alt: 'AI-rendered playground equipment render demonstrating product visualization' },
  { src: renderScreenshot4, alt: 'AI-rendered interactive play area with realistic lighting and materials' },
  { src: renderScreenshot5, alt: 'AI-rendered recreation space concept with immersive scene detail' },
  { src: renderScreenshot6, alt: 'AI-rendered playground design render with lifelike human interaction' },
];

const RDE_EXAMPLES = [
  { src: rdeFinancial, alt: 'Company intelligence financial analysis showing revenue loss and growth opportunities' },
  { src: rdeSocialActivity, alt: 'Social media activity audit across LinkedIn, Instagram, Facebook, YouTube, and TikTok' },
  { src: rdeSeoAnalysis, alt: 'SEO analysis dashboard showing domain authority, traffic, backlinks, and technical metrics' },
  { src: rdeTacticalSteps, alt: 'Tactical competitive exploitation steps with market capture and timeline projections' },
  { src: rdeChainDo, alt: 'Chain reaction analysis showing positive SEO strategy outcomes over 12 months' },
  { src: rdeChainDont, alt: 'Chain reaction analysis showing revenue losses from digital inaction' },
  { src: rdeSeoWoodplaync, alt: 'Full SEO audit with page speed, mobile responsiveness, and meta tag scores' },
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
  priceId?: string;
  badge?: string;
  details?: string[];
  showExamples?: boolean;
  showRdeExamples?: boolean;
}

const services: ServiceTier[] = [
  {
    icon: Search,
    title: 'Full Website Report',
    subtitle: 'Every gap unlocked with revenue estimates',
    pricing: '$49',
    pricingDetail: 'one-time report',
    priceId: 'scan_full_report_once',
    description: 'Run our AI scanner on your site and unlock the complete diagnostic — all gaps, revenue leak estimates, ROI projections, competitive brief, and a downloadable PDF.',
    whyItPays: 'Most businesses don\'t know what\'s broken until they see the data. This report reveals every blind spot instantly.',
    roiExample: 'Identifying one conversion gap can recover $1,000+/month in lost revenue. $49 pays for itself on day one.',
    payback: 'Immediate',
  },
  {
    icon: Search,
    title: 'Digital Snapshot',
    subtitle: 'See where you\'re losing money online',
    pricing: '$125',
    pricingDetail: 'one-time report',
    priceId: 'digital_snapshot_once',
    description: 'Automated website report showing gaps in your digital presence. The door opener — shows exactly where you\'re bleeding revenue.',
    whyItPays: 'Most businesses don\'t know what\'s broken until they see the data. This report reveals blind spots instantly.',
    roiExample: 'Identifying one conversion gap can recover $1,000+/month in lost revenue. $125 pays for itself on day one.',
    payback: 'Immediate',
  },
  {
    icon: BarChart3,
    title: 'Strategy Blueprint',
    subtitle: 'Full diagnostic + CRM plan + implementation specs',
    pricing: '$299',
    pricingDetail: 'one-time · comprehensive',
    priceId: 'scan_strategy_blueprint_once',
    badge: 'MOST POPULAR',
    description: 'Everything in the Full Report plus a CRM implementation plan, system blueprint, content calendar, and actionable "Fix This" items with implementation specs.',
    whyItPays: 'Companies that act on a structured blueprint see 3–5x faster improvement than those who just read reports.',
    roiExample: 'A clear implementation roadmap turns $299 into $10K+ in recovered revenue within the first 90 days.',
    payback: '1–4 weeks',
  },
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
    showExamples: true,
    details: [
      '$50 — Basic enhancement (clarity, lighting, polish)',
      '$125 — Close-up or product-focused render',
      '$275 — Full scene render without people',
      '$400 — Full scene with AI-generated interaction',
    ],
  },
  {
    icon: Globe,
    title: 'Website Evaluation',
    subtitle: 'Detailed analysis + strategy call',
    pricing: '$500',
    pricingDetail: 'one-time · delivered in 3–5 days',
    priceId: 'website_evaluation_once',
    description: 'A focused tear-down of your messaging clarity, CTA placement, conversion flow, and positioning. Includes a strategy call to walk through findings.',
    whyItPays: '70% of websites fail to convert effectively. Small improvements can increase revenue 10–50% without more traffic.',
    roiExample: 'If your site converts at 1% and improves to 1.5% — that\'s a 50% revenue increase from the same traffic.',
    payback: 'Immediate to 2 weeks',
    showRdeExamples: true,
  },
  {
    icon: BarChart3,
    title: 'Full Analytics Package',
    subtitle: 'Website + social + CRM — the complete picture',
    pricing: '$500',
    pricingDetail: 'one-time · normally $1,200+',
    priceId: 'full_analytics_package_once',
    badge: 'LIMITED TIME',
    description: 'Full website & social media scan + marketing diagnostics + CRM analysis. Everything in the Digital Snapshot and Website Evaluation, plus deep social and CRM audits.',
    whyItPays: 'Disconnected data costs companies 20-30% in wasted marketing spend. This package connects the dots across every channel.',
    roiExample: 'Companies typically find $3,000–$10,000/month in recoverable waste when all channels are audited together.',
    payback: '1–4 weeks',
  },
  {
    icon: Eye,
    title: '14-Day Operational Diagnostic',
    subtitle: 'Find exactly where money is leaking',
    pricing: '$2,500',
    pricingDetail: 'flat · 14 days',
    priceId: 'fourteen_day_diagnostic_once',
    description: 'A complete operational breakdown — where workflows break, time gets wasted, systems disconnect, and manual work should be automated. Structured, visible, and actionable.',
    whyItPays: 'Up to 30% of employee time is wasted. Poor systems reduce productivity by 20–30%. Automation improves efficiency by 20–40%.',
    roiExample: '5 employees × 10 wasted hours/week × $25/hr = $60,000/year lost. Fixing one major inefficiency recovers $2K–$10K/month.',
    payback: '2–8 weeks',
  },
  {
    icon: TrendingUp,
    title: 'Fractional CTO/CMO',
    subtitle: 'Ongoing strategic leadership + execution',
    pricing: '$5,000',
    pricingDetail: '/month',
    priceId: 'fractional_cto_cmo_monthly',
    description: 'Full implementation and continuous optimization. Strategic leadership for companies ready to transform, not just diagnose.',
    whyItPays: 'Companies don\'t fail from bad strategy — they fail from drift. Consistent execution compounds into stronger results every month.',
    roiExample: 'A 10–20% improvement across operations, content, and engagement compounds into more inbound interest, better response rates, and stronger closes.',
    payback: 'Within 1 month',
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

const ServiceCard: React.FC<{ service: ServiceTier; index: number; onCheckout: (priceId: string) => void }> = ({ service, index, onCheckout }) => {
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
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground font-display leading-tight">{service.title}</h3>
                  {service.badge && (
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">{service.badge}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{service.subtitle}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-bold text-primary font-display">{service.pricing}</div>
              <div className="text-xs text-muted-foreground">{service.pricingDetail}</div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{service.description}</p>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            {service.priceId && (
              <button
                onClick={(e) => { e.stopPropagation(); onCheckout(service.priceId!); }}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold transition-colors active:scale-[0.97]"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Now
              </button>
            )}
            <Link
              to="/contact"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 glass-hover border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground transition-colors active:scale-[0.97]"
            >
              <MessageCircle className="w-4 h-4" />
              Talk to Us
            </Link>
            <button
              className="flex items-center gap-1.5 text-xs text-primary ml-auto font-medium group-hover:underline"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
              {expanded ? 'Less' : 'ROI breakdown'}
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
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

                {/* Render Examples Gallery */}
                {service.showExamples && (
                  <div className="pt-3">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5 text-primary" /> Example Renders
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {RENDER_EXAMPLES.map((img) => (
                        <div key={img.alt} className="rounded-lg overflow-hidden border border-border/30">
                          <img
                            src={img.src}
                            alt={img.alt}
                            className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">AI-generated playground renderings with realistic human interaction</p>
                  </div>
                )}

                {/* RDE Examples Gallery */}
                {service.showRdeExamples && (
                  <div className="pt-3">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary" /> Sample Evaluation Output
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {RDE_EXAMPLES.map((img) => (
                        <div key={img.alt} className="rounded-lg overflow-hidden border border-border/30">
                          <img
                            src={img.src}
                            alt={img.alt}
                            className="w-full h-40 object-cover object-top hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">Real evaluation output — SEO audits, financial projections, competitive intelligence, and tactical recommendations</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RevealOnScroll>
  );
};

export const ServicesPricing: React.FC = () => {
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);

  if (checkoutPriceId) {
    return (
      <div className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setCheckoutPriceId(null)}>
        <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              onClick={() => setCheckoutPriceId(null)}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <StripeEmbeddedCheckout
              priceId={checkoutPriceId}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          </div>
        </div>
      </div>
    );
  }

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
            <ServiceCard key={service.title} service={service} index={index} onCheckout={setCheckoutPriceId} />
          ))}
        </div>

        <RevealOnScroll delay={0.5}>
          <div className="mt-12 glass p-8 rounded-xl border border-primary/20 text-center">
            <p className="text-xl font-bold text-foreground mb-2 font-display">
              The Real Question
            </p>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              It's not "Do I spend $2,500?" — it's "How much is inefficiency already costing me every month?"
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
