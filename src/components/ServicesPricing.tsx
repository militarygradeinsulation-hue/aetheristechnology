import React, { useState, useMemo } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Image, Globe, Eye, Search, Wrench, TrendingUp, ShoppingCart, MessageCircle, BarChart3, X, Share2, Phone, Calendar, Mail, Check, Percent, Brain, FileText, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ServiceTile {
  icon: React.ElementType;
  title: string;
  pricing: string;
  priceRaw: number;
  pricingDetail: string;
  priceId?: string;
  monthlyPriceId?: string;
  monthlyPricing?: string;
  monthlyPriceRaw?: number;
  monthlySavePercent?: number;
  badge?: string;
  bundleable?: boolean;
  description: string;
  longDescription: string;
  deliverables: string[];
  whyValuable: string;
  includes?: { name: string; value: string }[];
  successStat: string;
}

const services: ServiceTile[] = [
  {
    icon: Search, title: 'Full Website Report', pricing: '$49', priceRaw: 4900, pricingDetail: 'one-time', priceId: 'scan_full_report_once', bundleable: true,
    monthlyPriceId: 'scan_full_report_monthly', monthlyPricing: '$29/mo', monthlyPriceRaw: 2900, monthlySavePercent: 41,
    description: 'Complete AI diagnostic — all gaps, revenue leaks, ROI projections.',
    successStat: '91% of businesses found at least 3 fixable revenue leaks',
    longDescription: 'Our AI scans your entire website and produces a comprehensive diagnostic covering every technical, content, and conversion gap. You get revenue leak estimates, competitive positioning data, and a downloadable PDF you can share with your team.',
    deliverables: ['Full gap analysis with severity scores', 'Revenue leak estimates per issue', 'ROI projections if gaps are fixed', 'Competitive brief vs. top 3 competitors', 'Downloadable PDF report'],
    whyValuable: 'Most businesses lose $1,000–$5,000/month from invisible website issues. This report makes them visible in minutes — not weeks of consulting.',
  },
  {
    icon: Search, title: 'Digital Snapshot', pricing: '$125', priceRaw: 12500, pricingDetail: 'one-time', priceId: 'digital_snapshot_once', bundleable: true,
    monthlyPriceId: 'digital_snapshot_monthly', monthlyPricing: '$79/mo', monthlyPriceRaw: 7900, monthlySavePercent: 37,
    description: 'Automated report showing where you\'re bleeding revenue online.',
    successStat: '87% recover the cost within 30 days of acting on findings',
    longDescription: 'A deeper automated analysis of your digital footprint — website performance, SEO health, content gaps, and conversion friction. This is the door opener that shows exactly what\'s broken before you spend a dime fixing it.',
    deliverables: ['Website performance & speed audit', 'SEO health score with fix priorities', 'Content gap analysis', 'Conversion friction points identified', 'Actionable fix-it checklist'],
    whyValuable: 'You can\'t fix what you can\'t see. This snapshot reveals blind spots that are costing you money every single day — for less than the cost of one hour of consulting.',
  },
  {
    icon: BarChart3, title: 'Strategy Blueprint', pricing: '$299', priceRaw: 29900, pricingDetail: 'one-time', priceId: 'scan_strategy_blueprint_once', badge: 'POPULAR', bundleable: true,
    monthlyPriceId: 'scan_strategy_blueprint_monthly', monthlyPricing: '$199/mo', monthlyPriceRaw: 19900, monthlySavePercent: 33,
    description: 'Full report + CRM plan + implementation specs + content calendar.',
    successStat: '3.2x avg revenue improvement within 90 days of implementation',
    longDescription: 'Everything in the Full Report plus a complete CRM implementation plan, system architecture blueprint, 30-day content calendar, and specific "Fix This" items with implementation specs. This is a full strategic roadmap — not just a diagnosis.',
    deliverables: ['Everything in Full Website Report', 'CRM implementation plan', 'System architecture blueprint', '30-day content calendar', '"Fix This" items with implementation specs', 'Priority-ranked action items'],
    whyValuable: 'Companies that follow a structured blueprint improve 3–5x faster than those who just read reports. A clear roadmap turns $299 into $10K+ in recovered revenue within 90 days.',
    includes: [{ name: 'Full Website Report', value: '$49' }, { name: 'Content Calendar', value: '$29' }, { name: 'CRM Plan', value: 'included' }],
  },
  {
    icon: Share2, title: 'Social Content Pack', pricing: '$29', priceRaw: 2900, pricingDetail: 'one-time', priceId: 'social_content_pack_once', bundleable: true,
    monthlyPriceId: 'social_content_pack_monthly', monthlyPricing: '$19/mo', monthlyPriceRaw: 1900, monthlySavePercent: 34,
    description: '10 LinkedIn + 10 Facebook posts + 5 ad hooks from your site.',
    successStat: '74% see measurable engagement increase within 2 weeks',
    longDescription: 'We scan your website and generate 25 ready-to-post social media pieces tailored to your brand voice, audience, and industry. Each post includes a hook, body copy, CTA, and hashtag suggestions.',
    deliverables: ['10 LinkedIn posts with hooks & CTAs', '10 Facebook posts optimized for engagement', '5 ad hooks for paid campaigns', 'Hashtag suggestions per post', 'Copy-to-clipboard for instant use'],
    whyValuable: 'Hiring a copywriter for 25 posts costs $500+. A social media manager charges $2,000+/month. Get a month of content in minutes for $29.',
  },
  {
    icon: Phone, title: 'Sales Script Pack', pricing: '$49', priceRaw: 4900, pricingDetail: 'one-time', priceId: 'sales_script_pack_once', bundleable: true,
    monthlyPriceId: 'sales_script_pack_monthly', monthlyPricing: '$29/mo', monthlyPriceRaw: 2900, monthlySavePercent: 41,
    description: 'Call scripts, objection handlers & follow-up templates.',
    successStat: '68% of sales teams report higher close rates within 1 month',
    longDescription: 'AI-generated sales scripts customized to your industry, product, and target customer. Includes a complete cold call script, warm call script, 5 objection handlers with reframes, and 3 follow-up templates for email, SMS, and voicemail.',
    deliverables: ['Cold call opening script', 'Warm call conversation flow', '5 objection handlers with reframes', 'Email follow-up template', 'SMS follow-up template', 'Voicemail drop script'],
    whyValuable: 'Sales teams with scripts close 30% more deals. One extra closed deal per month at $500+ = 10x ROI on a $49 investment.',
  },
  {
    icon: Calendar, title: 'Content Calendar', pricing: '$29', priceRaw: 2900, pricingDetail: 'one-time', priceId: 'content_calendar_once', bundleable: true,
    monthlyPriceId: 'content_calendar_monthly', monthlyPricing: '$19/mo', monthlyPriceRaw: 1900, monthlySavePercent: 34,
    description: '30 days of topics, hooks, captions & posting times.',
    successStat: '82% post consistently for 30+ days (vs. 23% without a plan)',
    longDescription: 'A full 30-day content calendar with daily post ideas, proven hooks, captions, content types (carousel, video, text), hashtags, and optimal posting times — all generated for your specific industry and goals.',
    deliverables: ['30 daily post topics', 'Hook + caption for each day', 'Content type recommendations', 'Optimal posting times', 'Hashtag strategy per post', 'Platform-specific formatting tips'],
    whyValuable: 'Content consistency is the #1 growth lever on social media. This eliminates the "what do I post today" problem for an entire month — for less than a coffee per day.',
  },
  {
    icon: Mail, title: 'Follow-Up Plan', pricing: '$49', priceRaw: 4900, pricingDetail: 'one-time', priceId: 'follow_up_plan_once', bundleable: true,
    monthlyPriceId: 'follow_up_plan_monthly', monthlyPricing: '$29/mo', monthlyPriceRaw: 2900, monthlySavePercent: 41,
    description: '14-day multi-channel sales cadence with templates.',
    successStat: '76% of users recover at least 1 lost deal within 14 days',
    longDescription: 'A complete 14-day follow-up system covering email, SMS, phone calls, and LinkedIn touches. Every touchpoint is scripted, timed, and designed to re-engage leads without being annoying.',
    deliverables: ['Day-by-day 14-day cadence plan', 'Email templates for each touchpoint', 'SMS scripts with timing', 'Call scripts for check-ins', 'LinkedIn message templates', 'Escalation triggers & rules'],
    whyValuable: '80% of sales require 5+ follow-ups, but most reps stop at 2. This system closes the gap and recovers deals you\'re currently losing — $500–$5,000+ per recovered deal.',
  },
  {
    icon: Image, title: 'Visual Rendering', pricing: '$50–$400', priceRaw: 0, pricingDetail: 'per image',
    description: 'AI renders with realistic human interaction for your products.',
    successStat: '38% higher engagement on listings with professional AI visuals',
    longDescription: 'From basic image enhancement to full-scene AI renders with realistic human interaction. These visuals show your product in real-world use — not empty, lifeless shots. Perfect for proposals, catalogs, and social media.',
    deliverables: ['$50 — Basic enhancement (clarity, lighting, polish)', '$125 — Close-up or product-focused render', '$275 — Full scene render without people', '$400 — Full scene with AI-generated interaction', 'Commercial-use license included'],
    whyValuable: 'Visuals with people increase engagement by 38%. High-quality imagery boosts conversion by up to 30%. One improved image helps win one deal on a $25K–$150K+ project.',
  },
  {
    icon: Globe, title: 'Website Evaluation', pricing: '$500', priceRaw: 50000, pricingDetail: 'one-time', priceId: 'website_evaluation_once', bundleable: true,
    monthlyPriceId: 'website_evaluation_monthly', monthlyPricing: '$349/mo', monthlyPriceRaw: 34900, monthlySavePercent: 30,
    description: 'Detailed tear-down + strategy call. Delivered in 3–5 days.',
    successStat: '93% implement at least 3 changes within 7 days of the call',
    longDescription: 'A focused, human-reviewed tear-down of your messaging clarity, CTA placement, conversion flow, and market positioning. Includes a live strategy call to walk through every finding and prioritize next steps.',
    deliverables: ['Messaging clarity audit', 'CTA placement & conversion flow analysis', 'Competitive positioning review', 'SEO & technical performance report', '45-minute strategy call', 'Prioritized action plan document'],
    whyValuable: '70% of websites fail to convert effectively. Small improvements can increase revenue 10–50% without more traffic. If your site converts at 1% and improves to 1.5% — that\'s a 50% revenue increase.',
    includes: [{ name: 'Digital Snapshot', value: '$125' }, { name: 'Full Website Report', value: '$49' }, { name: 'Strategy Call', value: 'included' }],
  },
  {
    icon: BarChart3, title: 'Full Analytics Package', pricing: '$500', priceRaw: 50000, pricingDetail: 'one-time · was $1,200+', priceId: 'full_analytics_package_once', badge: 'LIMITED', bundleable: true,
    monthlyPriceId: 'full_analytics_package_monthly', monthlyPricing: '$349/mo', monthlyPriceRaw: 34900, monthlySavePercent: 30,
    description: 'Website + social + CRM — the complete picture.',
    successStat: '89% uncover $3K–$10K/mo in wasted marketing spend',
    longDescription: 'Everything in the Digital Snapshot and Website Evaluation, plus deep social media and CRM audits. This connects the dots across every channel so you can see exactly where marketing spend is being wasted.',
    deliverables: ['Full website diagnostic', 'Social media activity audit (all platforms)', 'CRM pipeline analysis', 'Marketing spend efficiency report', 'Cross-channel attribution insights', 'Unified action plan'],
    whyValuable: 'Disconnected data costs companies 20–30% in wasted marketing spend. Companies typically find $3,000–$10,000/month in recoverable waste when all channels are audited together.',
    includes: [{ name: 'Digital Snapshot', value: '$125' }, { name: 'Website Evaluation', value: '$500' }, { name: 'Social Media Audit', value: '$300+' }, { name: 'CRM Analysis', value: '$275+' }],
  },
  {
    icon: Eye, title: '14-Day Diagnostic', pricing: '$2,500', priceRaw: 250000, pricingDetail: 'flat', priceId: 'fourteen_day_diagnostic_once',
    monthlyPriceId: 'fourteen_day_diagnostic_monthly', monthlyPricing: '$1,750/mo', monthlyPriceRaw: 175000, monthlySavePercent: 30,
    description: 'Find exactly where money is leaking in your operation.',
    successStat: '96% identify operational waste exceeding the diagnostic cost',
    longDescription: 'A complete operational breakdown over 14 days — where workflows break, time gets wasted, systems disconnect, and manual work should be automated. We embed into your operation and surface every inefficiency.',
    deliverables: ['Full operational workflow mapping', 'Time & cost waste analysis per department', 'System integration gap assessment', 'Automation opportunity identification', 'Employee productivity insights', 'Prioritized fix-it roadmap with ROI estimates'],
    whyValuable: 'Up to 30% of employee time is wasted on broken processes. 5 employees × 10 wasted hours/week × $25/hr = $60,000/year lost. Fixing one major inefficiency recovers $2K–$10K/month.',
    includes: [{ name: 'Full Analytics Package', value: '$500' }, { name: 'Strategy Blueprint', value: '$299' }, { name: 'Operational Workflow Mapping', value: 'included' }, { name: 'Automation Roadmap', value: 'included' }],
  },
  {
    icon: TrendingUp, title: 'Fractional CTO/CMO', pricing: '$5,000/mo', priceRaw: 500000, pricingDetail: 'monthly', priceId: 'fractional_cto_cmo_monthly',
    description: 'Ongoing strategic leadership + execution.',
    successStat: '4.1x avg ROI within first 6 months of engagement',
    longDescription: 'Full-time strategic leadership without the full-time salary. We become your embedded technology and marketing executive — setting strategy, managing execution, and continuously optimizing your operation month over month.',
    deliverables: ['Weekly strategy sessions', 'Technology stack management', 'Marketing campaign oversight', 'Vendor & tool evaluation', 'Team training & enablement', 'Monthly performance reporting'],
    whyValuable: 'A full-time CTO costs $150K–$250K/year. A CMO costs $120K–$200K. You get both for $60K/year — and we\'re accountable for results, not hours.',
    includes: [{ name: '14-Day Diagnostic', value: '$2,500' }, { name: 'Full Analytics Package', value: '$500' }, { name: 'Content Calendar', value: '$29/mo' }, { name: 'Ongoing Execution', value: 'included' }],
  },
  {
    icon: Brain, title: 'Strategic Question Engine', pricing: '$79', priceRaw: 7900, pricingDetail: 'one-time', priceId: 'strategic_question_engine_once', bundleable: true, badge: 'CLARITY SUITE',
    monthlyPriceId: 'strategic_question_engine_monthly', monthlyPricing: '$49/mo', monthlyPriceRaw: 4900, monthlySavePercent: 38,
    description: 'Custom question map exposing blind spots across 8 departments.',
    successStat: '84% discover critical blind spots they hadn\'t considered',
    longDescription: 'A business clarity engine that generates sharp, specific questions organized by leadership, sales, marketing, operations, hiring, pricing, customer journey, and growth. Not generic — tailored to your exact company profile.',
    deliverables: ['Top 10 critical questions ranked by urgency', 'Questions across 8 business categories', '"Questions you\'re probably not asking" section', 'Leadership team discussion prompts', 'Workshop prompts for team meetings', 'Urgency scoring for each question'],
    whyValuable: 'Business owners are drowning in advice. Very few people help them think clearly. This tool comes in like a surgeon and says "here are the questions your business has earned."',
  },
  {
    icon: Search, title: 'Brand Contradiction Finder', pricing: '$99', priceRaw: 9900, pricingDetail: 'one-time', priceId: 'brand_contradiction_finder_once', bundleable: true, badge: 'CLARITY SUITE',
    monthlyPriceId: 'brand_contradiction_finder_monthly', monthlyPricing: '$59/mo', monthlyPriceRaw: 5900, monthlySavePercent: 40,
    description: 'See where your brand says one thing but signals another.',
    successStat: '79% see conversion lift after fixing top contradiction',
    longDescription: 'We scrape your website and branding to compare message versus signal across 5 layers: visual identity, tone, pricing, process, and trust. Buyers feel contradictions immediately — this tool makes them visible.',
    deliverables: ['Brand Alignment Score (0-100)', 'Contradictions across 5 perception layers', 'Emotional impact of each contradiction', 'Buyer perception analysis', 'Before/after positioning fixes', 'Priority fix roadmap', 'Hidden strengths to amplify'],
    whyValuable: 'Most businesses think they need more traffic. Sometimes they just need to stop sending mixed signals. One contradiction fix can increase conversion 10-30%.',
  },
  {
    icon: FileText, title: 'Friction Vocabulary Audit', pricing: '$69', priceRaw: 6900, pricingDetail: 'one-time', priceId: 'friction_vocabulary_audit_once', bundleable: true, badge: 'CLARITY SUITE',
    monthlyPriceId: 'friction_vocabulary_audit_monthly', monthlyPricing: '$39/mo', monthlyPriceRaw: 3900, monthlySavePercent: 43,
    description: 'Find the exact words weakening your trust and authority.',
    successStat: '71% report stronger brand perception within 2 weeks of edits',
    longDescription: 'We scan your entire website copy for vague language, corporate filler, weak emotional language, risky wording, and flat CTAs. Every flagged phrase gets a specific replacement that fits your desired brand tone.',
    deliverables: ['Copy Friction Score (0-100)', '15-25 flagged phrases with exact replacements', 'Tone alignment analysis', 'Stronger CTA alternatives', 'Priority fix list', 'Copy strengths to keep'],
    whyValuable: 'This is one of those things people never notice until shown to them. Then they can\'t unsee it. "These 11 phrases are quietly weakening your authority" — that lands.',
  },
  {
    icon: Wrench, title: 'Custom Implementation', pricing: '$25,000+', priceRaw: 0, pricingDetail: 'scoped',
    description: 'Build the systems that scale you.',
    successStat: '94% reduce operational costs by 20%+ within first quarter',
    longDescription: 'Once gaps are identified, implementation is the multiplier. We build custom systems, deploy automation, restructure CRMs, and integrate workflows — everything needed to scale without adding headcount.',
    deliverables: ['Custom system architecture & build', 'CRM restructuring & migration', 'Automation deployment (AI + workflow)', 'Integration between existing tools', 'Staff training on new systems', 'Ongoing optimization support'],
    whyValuable: 'This is where companies reduce long-term labor costs, increase execution speed, and scale without adding headcount. ROI compounds month over month the longer the system runs.',
    includes: [{ name: '14-Day Diagnostic', value: '$2,500' }, { name: 'Fractional CTO/CMO (3 mo)', value: '$15,000' }, { name: 'System Build & Deployment', value: 'included' }, { name: 'Staff Training', value: 'included' }],
  },
];

function getDiscount(count: number): number {
  if (count >= 5) return 0.20;
  if (count >= 3) return 0.15;
  if (count >= 2) return 0.10;
  return 0;
}

export const ServicesPricing: React.FC = () => {
  const { user } = useAuth();
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [billingMode, setBillingMode] = useState<'once' | 'monthly'>('once');

  const bundleableServices = useMemo(() => services.map((s, i) => ({ ...s, idx: i })).filter(s => s.bundleable), []);

  const toggleSelect = (idx: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const selectedItems = useMemo(() => bundleableServices.filter(s => selectedIds.has(s.idx)), [selectedIds, bundleableServices]);
  const subtotal = useMemo(() => selectedItems.reduce((sum, s) => sum + s.priceRaw, 0), [selectedItems]);
  const discount = getDiscount(selectedItems.length);
  const discountedTotal = Math.round(subtotal * (1 - discount));

  const isMonthlyCheckout = checkoutPriceId?.endsWith('_monthly');
  const checkoutReturnUrl = isMonthlyCheckout
    ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=subscription`
    : `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

  if (checkoutPriceId) {
    return (
      <div className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setCheckoutPriceId(null)}>
        <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={() => setCheckoutPriceId(null)} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" /> Cancel
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <StripeEmbeddedCheckout priceId={checkoutPriceId} returnUrl={checkoutReturnUrl} customerEmail={user?.email || undefined} metadata={user ? { userId: user.id } : undefined} />
          </div>
        </div>
      </div>
    );
  }

  const expandedService = expandedIdx !== null ? services[expandedIdx] : null;

  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-secondary/20 to-background">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              Services & <span className="text-gradient-amber">Investment</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every service increases conversion or reduces waste. Mix & match for up to 20% off.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-1 mt-4 bg-secondary/50 rounded-lg p-1 border border-border">
              <button
                onClick={() => setBillingMode('once')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  billingMode === 'once'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                One-Time
              </button>
              <button
                onClick={() => setBillingMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  billingMode === 'monthly'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Monthly
                <span className="text-[10px] bg-amber/15 text-amber border border-amber/40 px-2 py-0.5 rounded-full font-semibold tracking-[0.12em] uppercase">Save</span>
              </button>
            </div>
          </div>
        </RevealOnScroll>

        {/* Tile Grid — bigger tiles, click to expand */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-300 ${
            expandedIdx !== null ? 'blur-md scale-[0.98] pointer-events-none select-none' : ''
          }`}
        >
          {services.map((service, index) => {
            const isSelected = selectedIds.has(index);
            return (
              <RevealOnScroll key={service.title} delay={0.03 + index * 0.04}>
                <div
                  onClick={() => setExpandedIdx(index)}
                  className={`glass glass-shine shimmer-border hover-lift rounded-xl p-6 flex flex-col h-full transition-all duration-300 group relative cursor-pointer hover:shadow-2xl hover:shadow-primary/10 ${
                    isSelected ? 'border-2 border-primary ring-2 ring-primary/20' : 'border border-border hover:border-primary/40'
                  }`}
                >
                  {service.badge && (
                    <span className="absolute -top-2 right-4 text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {service.badge}
                    </span>
                  )}

                  {/* Icon + Title */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <service.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground font-display leading-tight">{service.title}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3 flex-1 leading-relaxed">{service.description}</p>

                  {/* Success Stat */}
                  <div className="flex items-start gap-2 mb-4 bg-amber/[0.06] border border-amber/25 rounded-md px-3 py-2.5">
                    <Percent className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground/85 font-medium leading-snug tracking-[0.01em]">{service.successStat}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-4">
                    {billingMode === 'monthly' && service.monthlyPriceId ? (
                      <>
                        <span className="text-2xl font-bold text-gradient-amber font-display">{service.monthlyPricing}</span>
                        <span className="text-xs text-muted-foreground/70 line-through">{service.pricing}</span>
                        <span className="text-[10px] font-semibold bg-amber/15 text-amber border border-amber/40 px-2 py-0.5 rounded-full tracking-[0.08em]">−{service.monthlySavePercent}%</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-primary font-display">{service.pricing}</span>
                        <span className="text-xs text-muted-foreground">{service.pricingDetail}</span>
                      </>
                    )}
                  </div>

                  {/* Footer hint + bundle checkbox */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="text-xs text-primary font-semibold">Click for details →</span>
                    {service.bundleable && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(index); }}
                        className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border hover:border-primary/60'
                        }`}
                        title="Add to bundle"
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        {/* Center-screen Expanded Detail Modal */}
        <AnimatePresence>
          {expandedService && expandedIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md"
              onClick={() => setExpandedIdx(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20"
              >
                {/* Close */}
                <button
                  onClick={() => setExpandedIdx(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="p-6 md:p-8">
                  {expandedService.badge && (
                    <span className="inline-block text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">
                      {expandedService.badge}
                    </span>
                  )}

                  {/* Header */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <expandedService.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{expandedService.title}</h3>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {billingMode === 'monthly' && expandedService.monthlyPriceId ? (
                          <>
                            <span className="text-2xl font-bold text-gradient-amber font-display">{expandedService.monthlyPricing}</span>
                            <span className="text-sm text-muted-foreground/70 line-through">{expandedService.pricing}</span>
                            <span className="text-[10px] font-semibold bg-amber/15 text-amber border border-amber/40 px-2 py-0.5 rounded-full tracking-[0.08em]">−{expandedService.monthlySavePercent}%</span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-bold text-primary font-display">{expandedService.pricing}</span>
                            <span className="text-sm text-muted-foreground">{expandedService.pricingDetail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Success stat */}
                  <div className="flex items-start gap-2.5 mb-5 bg-amber/[0.06] border border-amber/25 rounded-lg px-3.5 py-3">
                    <Percent className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/90 font-medium leading-snug tracking-[0.01em]">{expandedService.successStat}</span>
                  </div>

                  {/* Long description */}
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6">{expandedService.longDescription}</p>

                  {/* Deliverables */}
                  <div className="mb-6">
                    <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">What You Get</div>
                    <ul className="space-y-2">
                      {expandedService.deliverables.map((d) => (
                        <li key={d} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Includes */}
                  {expandedService.includes && expandedService.includes.length > 0 && (
                    <div className="bg-secondary/30 rounded-lg p-4 mb-6">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Services Included (if purchased separately)</div>
                      <div className="space-y-1.5">
                        {expandedService.includes.map((inc) => (
                          <div key={inc.name} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{inc.name}</span>
                            <span className="font-semibold text-primary">{inc.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Why it's valuable */}
                  <div className="bg-primary/5 rounded-lg p-4 mb-6 border border-primary/10">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Why It's Valuable</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{expandedService.whyValuable}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {billingMode === 'monthly' && expandedService.monthlyPriceId ? (
                      <button
                        onClick={() => setCheckoutPriceId(expandedService.monthlyPriceId!)}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-lg text-sm font-semibold transition-colors active:scale-[0.97]"
                      >
                        <RefreshCw className="w-4 h-4" /> Subscribe — {expandedService.monthlyPricing}
                      </button>
                    ) : expandedService.priceId ? (
                      <button
                        onClick={() => setCheckoutPriceId(expandedService.priceId!)}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-lg text-sm font-semibold transition-colors active:scale-[0.97]"
                      >
                        <ShoppingCart className="w-4 h-4" /> Buy Now — {expandedService.pricing}
                      </button>
                    ) : null}
                    {expandedService.bundleable && (
                      <button
                        onClick={() => { toggleSelect(expandedIdx); }}
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors active:scale-[0.97] border-2 ${
                          selectedIds.has(expandedIdx)
                            ? 'bg-primary/15 border-primary text-primary'
                            : 'border-border text-foreground hover:border-primary/60'
                        }`}
                      >
                        {selectedIds.has(expandedIdx) ? <><Check className="w-4 h-4" /> In Bundle</> : <><Percent className="w-4 h-4" /> Add to Bundle</>}
                      </button>
                    )}
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 glass-hover border border-border px-5 py-3 rounded-lg text-sm font-medium text-foreground transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" /> Talk to Us
                    </Link>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mix & Match Bundle Bar */}
        {selectedItems.length > 0 && expandedIdx === null && (
          <div className="sticky bottom-4 z-50 mt-6">
            <div className="glass border border-primary/30 rounded-xl p-4 md:p-5 max-w-3xl mx-auto shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Percent className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground font-display">
                      Mix & Match Bundle
                      {discount > 0 && (
                        <span className="ml-2 text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {Math.round(discount * 100)}% OFF
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedItems.length} service{selectedItems.length !== 1 ? 's' : ''} selected
                      {selectedItems.length < 2 && ' · add 1 more for 10% off'}
                      {selectedItems.length === 2 && ' · add 1 more for 15% off'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:ml-auto">
                  <div className="text-right">
                    {discount > 0 && (
                      <div className="text-xs text-muted-foreground line-through">${((billingMode === 'monthly' ? selectedItems.reduce((s, i) => s + (i.monthlyPriceRaw || i.priceRaw), 0) : subtotal) / 100).toFixed(0)}</div>
                    )}
                    <div className="text-xl font-bold text-primary font-display">
                      ${(Math.round((billingMode === 'monthly' ? selectedItems.reduce((s, i) => s + (i.monthlyPriceRaw || i.priceRaw), 0) : subtotal) * (1 - discount)) / 100).toFixed(0)}
                      {billingMode === 'monthly' && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                    </div>
                  </div>
                  <Link
                    to={`/contact?bundle=${selectedItems.map(s => s.title).join(',')}&total=${discountedTotal}`}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors active:scale-[0.97]"
                  >
                    <ShoppingCart className="w-4 h-4" /> Get Bundle
                  </Link>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Selected items pills */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedItems.map(s => (
                  <span
                    key={s.idx}
                    onClick={() => toggleSelect(s.idx)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {s.title} <X className="w-2.5 h-2.5" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <RevealOnScroll delay={0.3}>
          <div className="mt-12 glass p-8 rounded-xl border border-primary/20 text-center">
            <p className="text-xl font-bold text-foreground mb-2 font-display">The Real Question</p>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              It's not "Do I spend $2,500?" — it's "How much is inefficiency already costing me every month?"
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="tel:+13173762110">
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.97]">
                  📞 Call (317) 376-2110
                </button>
              </a>
              <a href="mailto:hello@aetheris.technology?subject=Service%20Inquiry">
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
