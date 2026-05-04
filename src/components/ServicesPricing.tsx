import React, { useState, useMemo } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Image, Globe, Eye, Search, Wrench, TrendingUp, ShoppingCart, MessageCircle, BarChart3, X, Share2, Phone, Calendar, Mail, Check, Percent, Brain, FileText, RefreshCw, Database, GitBranch, Swords, Send, Settings, Users, LayoutTemplate, ListChecks, Rocket, Workflow, Handshake, GraduationCap, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import frictionVocabularyAuditThumb from '@/assets/packages/friction-vocabulary-audit.png';
import customImplementationThumb from '@/assets/packages/custom-implementation.png';
import brandContradictionFinderThumb from '@/assets/packages/brand-contradiction-finder.png';
import strategicQuestionEngineThumb from '@/assets/packages/strategic-question-engine.png';
import fourteenDayDiagnosticThumb from '@/assets/packages/fourteen-day-diagnostic.png';
import fractionalCtoCmoThumb from '@/assets/packages/fractional-cto-cmo.png';
import websiteEvaluationThumb from '@/assets/packages/website-evaluation.png';
import strategicDiscoveryAuditThumb from '@/assets/packages/strategic-discovery-audit.png';
import visualRenderingThumb from '@/assets/packages/visual-rendering.png';
import followUpPlanThumb from '@/assets/packages/follow-up-plan.png';
import salesScriptPackThumb from '@/assets/packages/sales-script-pack.png';
import contentCalendarThumb from '@/assets/packages/content-calendar.png';
import strategyBlueprintThumb from '@/assets/packages/strategy-blueprint.png';
import socialContentPackThumb from '@/assets/packages/social-content-pack.png';
import digitalSnapshotThumb from '@/assets/packages/digital-snapshot.png';
import fullWebsiteReportThumb from '@/assets/packages/full-website-report.png';
import leadNurtureAutomationThumb from '@/assets/packages/lead-nurture-automation.png';
import salesCoachingRetainerThumb from '@/assets/packages/sales-coaching-retainer.png';
import marketingSalesAlignmentThumb from '@/assets/packages/marketing-sales-alignment.png';
import leadGenSprintThumb from '@/assets/packages/lead-gen-sprint.png';
import salesProcessRedesignThumb from '@/assets/packages/sales-process-redesign.png';
import salesTeamOnboardingThumb from '@/assets/packages/sales-team-onboarding.png';
import prospectingListBuilderThumb from '@/assets/packages/prospecting-list-builder.png';
import landingPageBlueprintThumb from '@/assets/packages/landing-page-blueprint.png';
import crmSetupOptimizationThumb from '@/assets/packages/crm-setup-optimization.png';
import emailSeriesBundleThumb from '@/assets/packages/email-series-bundle.png';

interface ServiceTile {
  icon: React.ElementType;
  title: string;
  thumbnail?: string;
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
    icon: Search, title: 'Full Website Report', thumbnail: fullWebsiteReportThumb, pricing: '$59', priceRaw: 5900, pricingDetail: 'one-time', priceId: 'scan_full_report_once', bundleable: true,
    monthlyPriceId: 'scan_full_report_monthly', monthlyPricing: '$39/mo', monthlyPriceRaw: 3900, monthlySavePercent: 34,
    description: 'Complete AI diagnostic — all gaps, revenue leaks, ROI projections.',
    successStat: '91% of businesses found at least 3 fixable revenue leaks',
    longDescription: 'Our AI scans your entire website and produces a comprehensive diagnostic covering every technical, content, and conversion gap. You get revenue leak estimates, competitive positioning data, and a downloadable PDF you can share with your team.',
    deliverables: ['Full gap analysis with severity scores', 'Revenue leak estimates per issue', 'ROI projections if gaps are fixed', 'Competitive brief vs. top 3 competitors', 'Downloadable PDF report'],
    whyValuable: 'Most businesses lose $1,000–$5,000/month from invisible website issues. This report makes them visible in minutes — not weeks of consulting.',
  },
  {
    icon: Search, title: 'Digital Snapshot', thumbnail: digitalSnapshotThumb, pricing: '$149', priceRaw: 14900, pricingDetail: 'one-time', priceId: 'digital_snapshot_once', bundleable: true,
    monthlyPriceId: 'digital_snapshot_monthly', monthlyPricing: '$99/mo', monthlyPriceRaw: 9900, monthlySavePercent: 34,
    description: 'Automated report showing where you\'re bleeding revenue online.',
    successStat: '87% recover the cost within 30 days of acting on findings',
    longDescription: 'A deeper automated analysis of your digital footprint — website performance, SEO health, content gaps, and conversion friction. This is the door opener that shows exactly what\'s broken before you spend a dime fixing it.',
    deliverables: ['Website performance & speed audit', 'SEO health score with fix priorities', 'Content gap analysis', 'Conversion friction points identified', 'Actionable fix-it checklist'],
    whyValuable: 'You can\'t fix what you can\'t see. This snapshot reveals blind spots that are costing you money every single day — for less than the cost of one hour of consulting.',
  },
  {
    icon: BarChart3, title: 'Strategy Blueprint', thumbnail: strategyBlueprintThumb, pricing: '$349', priceRaw: 34900, pricingDetail: 'one-time', priceId: 'scan_strategy_blueprint_once', badge: 'POPULAR', bundleable: true,
    monthlyPriceId: 'scan_strategy_blueprint_monthly', monthlyPricing: '$249/mo', monthlyPriceRaw: 24900, monthlySavePercent: 29,
    description: 'Full report + CRM plan + implementation specs + content calendar.',
    successStat: '3.2x avg revenue improvement within 90 days of implementation',
    longDescription: 'Everything in the Full Report plus a complete CRM implementation plan, system architecture blueprint, 30-day content calendar, and specific "Fix This" items with implementation specs. This is a full strategic roadmap — not just a diagnosis.',
    deliverables: ['Everything in Full Website Report', 'CRM implementation plan', 'System architecture blueprint', '30-day content calendar', '"Fix This" items with implementation specs', 'Priority-ranked action items'],
    whyValuable: 'Companies that follow a structured blueprint improve 3–5x faster than those who just read reports. A clear roadmap turns $299 into $10K+ in recovered revenue within 90 days.',
    includes: [{ name: 'Full Website Report', value: '$49' }, { name: 'Content Calendar', value: '$29' }, { name: 'CRM Plan', value: 'included' }],
  },
  {
    icon: Share2, title: 'Social Content Pack', thumbnail: socialContentPackThumb, pricing: '$39', priceRaw: 3900, pricingDetail: 'one-time', priceId: 'social_content_pack_once', bundleable: true,
    monthlyPriceId: 'social_content_pack_monthly', monthlyPricing: '$25/mo', monthlyPriceRaw: 2500, monthlySavePercent: 36,
    description: '10 LinkedIn + 10 Facebook posts + 5 ad hooks from your site.',
    successStat: '74% see measurable engagement increase within 2 weeks',
    longDescription: 'We scan your website and generate 25 ready-to-post social media pieces tailored to your brand voice, audience, and industry. Each post includes a hook, body copy, CTA, and hashtag suggestions.',
    deliverables: ['10 LinkedIn posts with hooks & CTAs', '10 Facebook posts optimized for engagement', '5 ad hooks for paid campaigns', 'Hashtag suggestions per post', 'Copy-to-clipboard for instant use'],
    whyValuable: 'Hiring a copywriter for 25 posts costs $500+. A social media manager charges $2,000+/month. Get a month of content in minutes for $29.',
  },
  {
    icon: Phone, title: 'Sales Script Pack', thumbnail: salesScriptPackThumb, pricing: '$59', priceRaw: 5900, pricingDetail: 'one-time', priceId: 'sales_script_pack_once', bundleable: true,
    monthlyPriceId: 'sales_script_pack_monthly', monthlyPricing: '$39/mo', monthlyPriceRaw: 3900, monthlySavePercent: 34,
    description: 'Call scripts, objection handlers & follow-up templates.',
    successStat: '68% of sales teams report higher close rates within 1 month',
    longDescription: 'AI-generated sales scripts customized to your industry, product, and target customer. Includes a complete cold call script, warm call script, 5 objection handlers with reframes, and 3 follow-up templates for email, SMS, and voicemail.',
    deliverables: ['Cold call opening script', 'Warm call conversation flow', '5 objection handlers with reframes', 'Email follow-up template', 'SMS follow-up template', 'Voicemail drop script'],
    whyValuable: 'Sales teams with scripts close 30% more deals. One extra closed deal per month at $500+ = 10x ROI on a $49 investment.',
  },
  {
    icon: Calendar, title: 'Content Calendar', thumbnail: contentCalendarThumb, pricing: '$39', priceRaw: 3900, pricingDetail: 'one-time', priceId: 'content_calendar_once', bundleable: true,
    monthlyPriceId: 'content_calendar_monthly', monthlyPricing: '$25/mo', monthlyPriceRaw: 2500, monthlySavePercent: 36,
    description: '30 days of topics, hooks, captions & posting times.',
    successStat: '82% post consistently for 30+ days (vs. 23% without a plan)',
    longDescription: 'A full 30-day content calendar with daily post ideas, proven hooks, captions, content types (carousel, video, text), hashtags, and optimal posting times — all generated for your specific industry and goals.',
    deliverables: ['30 daily post topics', 'Hook + caption for each day', 'Content type recommendations', 'Optimal posting times', 'Hashtag strategy per post', 'Platform-specific formatting tips'],
    whyValuable: 'Content consistency is the #1 growth lever on social media. This eliminates the "what do I post today" problem for an entire month — for less than a coffee per day.',
  },
  {
    icon: Mail, title: 'Follow-Up Plan', thumbnail: followUpPlanThumb, pricing: '$59', priceRaw: 5900, pricingDetail: 'one-time', priceId: 'follow_up_plan_once', bundleable: true,
    monthlyPriceId: 'follow_up_plan_monthly', monthlyPricing: '$39/mo', monthlyPriceRaw: 3900, monthlySavePercent: 34,
    description: '14-day multi-channel sales cadence with templates.',
    successStat: '76% of users recover at least 1 lost deal within 14 days',
    longDescription: 'A complete 14-day follow-up system covering email, SMS, phone calls, and LinkedIn touches. Every touchpoint is scripted, timed, and designed to re-engage leads without being annoying.',
    deliverables: ['Day-by-day 14-day cadence plan', 'Email templates for each touchpoint', 'SMS scripts with timing', 'Call scripts for check-ins', 'LinkedIn message templates', 'Escalation triggers & rules'],
    whyValuable: '80% of sales require 5+ follow-ups, but most reps stop at 2. This system closes the gap and recovers deals you\'re currently losing — $500–$5,000+ per recovered deal.',
  },
  {
    icon: Image, title: 'Visual Rendering', thumbnail: visualRenderingThumb, pricing: '$50–$400', priceRaw: 0, pricingDetail: 'per image',
    description: 'AI renders with realistic human interaction for your products.',
    successStat: '38% higher engagement on listings with professional AI visuals',
    longDescription: 'From basic image enhancement to full-scene AI renders with realistic human interaction. These visuals show your product in real-world use — not empty, lifeless shots. Perfect for proposals, catalogs, and social media.',
    deliverables: ['$50 — Basic enhancement (clarity, lighting, polish)', '$125 — Close-up or product-focused render', '$275 — Full scene render without people', '$400 — Full scene with AI-generated interaction', 'Commercial-use license included'],
    whyValuable: 'Visuals with people increase engagement by 38%. High-quality imagery boosts conversion by up to 30%. One improved image helps win one deal on a $25K–$150K+ project.',
  },
  {
    icon: Globe, title: 'Website Evaluation', thumbnail: websiteEvaluationThumb, pricing: '$599', priceRaw: 59900, pricingDetail: 'one-time', priceId: 'website_evaluation_once', bundleable: true,
    monthlyPriceId: 'website_evaluation_monthly', monthlyPricing: '$419/mo', monthlyPriceRaw: 41900, monthlySavePercent: 30,
    description: 'Detailed tear-down + strategy call. Delivered in 3–5 days.',
    successStat: '93% implement at least 3 changes within 7 days of the call',
    longDescription: 'A focused, human-reviewed tear-down of your messaging clarity, CTA placement, conversion flow, and market positioning. Includes a live strategy call to walk through every finding and prioritize next steps.',
    deliverables: ['Messaging clarity audit', 'CTA placement & conversion flow analysis', 'Competitive positioning review', 'SEO & technical performance report', '45-minute strategy call', 'Prioritized action plan document'],
    whyValuable: '70% of websites fail to convert effectively. Small improvements can increase revenue 10–50% without more traffic. If your site converts at 1% and improves to 1.5% — that\'s a 50% revenue increase.',
    includes: [{ name: 'Digital Snapshot', value: '$125' }, { name: 'Full Website Report', value: '$49' }, { name: 'Strategy Call', value: 'included' }],
  },
  {
    icon: BarChart3, title: 'Strategic Discovery Audit', thumbnail: strategicDiscoveryAuditThumb, pricing: '$599', priceRaw: 59900, pricingDetail: 'foundational engagement', priceId: 'full_analytics_package_once', badge: 'FOUNDATIONAL', bundleable: true,
    monthlyPriceId: 'full_analytics_package_monthly', monthlyPricing: '$419/mo', monthlyPriceRaw: 41900, monthlySavePercent: 30,
    description: 'Website + social + CRM — the complete picture before custom work begins.',
    successStat: '89% uncover $3K–$10K/mo in wasted marketing spend',
    longDescription: 'A foundational diagnostic engagement covering everything in the Digital Snapshot and Website Evaluation, plus deep social media and CRM audits. This connects the dots across every channel so you can see exactly where marketing spend is being wasted — the prerequisite for any custom implementation work.',
    deliverables: ['Full website diagnostic', 'Social media activity audit (all platforms)', 'CRM pipeline analysis', 'Marketing spend efficiency report', 'Cross-channel attribution insights', 'Unified action plan'],
    whyValuable: 'Disconnected data costs companies 20–30% in wasted marketing spend. Companies typically find $3,000–$10,000/month in recoverable waste when all channels are audited together. Foundational step toward custom implementation.',
    includes: [{ name: 'Digital Snapshot', value: '$125' }, { name: 'Website Evaluation', value: '$500' }, { name: 'Social Media Audit', value: '$300+' }, { name: 'CRM Analysis', value: '$275+' }],
  },
  {
    icon: Eye, title: '14-Day Diagnostic', thumbnail: fourteenDayDiagnosticThumb, pricing: '$2,900', priceRaw: 290000, pricingDetail: 'flat · foundational engagement', priceId: 'fourteen_day_diagnostic_once', badge: 'FOUNDATIONAL',
    monthlyPriceId: 'fourteen_day_diagnostic_monthly', monthlyPricing: '$1,990/mo', monthlyPriceRaw: 199000, monthlySavePercent: 31,
    description: 'The deep operational breakdown that precedes any custom build.',
    successStat: '96% identify operational waste exceeding the diagnostic cost',
    longDescription: 'A complete operational breakdown over 14 days — where workflows break, time gets wasted, systems disconnect, and manual work should be automated. We embed into your operation and surface every inefficiency. This is the foundational step before any custom implementation engagement begins.',
    deliverables: ['Full operational workflow mapping', 'Time & cost waste analysis per department', 'System integration gap assessment', 'Automation opportunity identification', 'Employee productivity insights', 'Prioritized fix-it roadmap with ROI estimates'],
    whyValuable: 'Up to 30% of employee time is wasted on broken processes. 5 employees × 10 wasted hours/week × $25/hr = $60,000/year lost. Foundational step toward custom implementation — fixing one major inefficiency recovers $2K–$10K/month.',
    includes: [{ name: 'Strategic Discovery Audit', value: '$500' }, { name: 'Strategy Blueprint', value: '$299' }, { name: 'Operational Workflow Mapping', value: 'included' }, { name: 'Automation Roadmap', value: 'included' }],
  },
  {
    icon: TrendingUp, title: 'Fractional CTO/CMO', thumbnail: fractionalCtoCmoThumb, pricing: '$5,900/mo', priceRaw: 590000, pricingDetail: 'monthly', priceId: 'fractional_cto_cmo_monthly',
    description: 'Ongoing strategic leadership + execution.',
    successStat: '4.1x avg ROI within first 6 months of engagement',
    longDescription: 'Full-time strategic leadership without the full-time salary. We become your embedded technology and marketing executive — setting strategy, managing execution, and continuously optimizing your operation month over month.',
    deliverables: ['Weekly strategy sessions', 'Technology stack management', 'Marketing campaign oversight', 'Vendor & tool evaluation', 'Team training & enablement', 'Monthly performance reporting'],
    whyValuable: 'A full-time CTO costs $150K–$250K/year. A CMO costs $120K–$200K. You get both for $60K/year — and we\'re accountable for results, not hours.',
    includes: [{ name: '14-Day Diagnostic', value: '$2,500' }, { name: 'Strategic Discovery Audit', value: '$500' }, { name: 'Content Calendar', value: '$29/mo' }, { name: 'Ongoing Execution', value: 'included' }],
  },
  {
    icon: Brain, title: 'Strategic Question Engine', thumbnail: strategicQuestionEngineThumb, pricing: '$99', priceRaw: 9900, pricingDetail: 'one-time', priceId: 'strategic_question_engine_once', bundleable: true, badge: 'CLARITY SUITE',
    monthlyPriceId: 'strategic_question_engine_monthly', monthlyPricing: '$59/mo', monthlyPriceRaw: 5900, monthlySavePercent: 40,
    description: 'Custom question map exposing blind spots across 8 departments.',
    successStat: '84% discover critical blind spots they hadn\'t considered',
    longDescription: 'A business clarity engine that generates sharp, specific questions organized by leadership, sales, marketing, operations, hiring, pricing, customer journey, and growth. Not generic — tailored to your exact company profile.',
    deliverables: ['Top 10 critical questions ranked by urgency', 'Questions across 8 business categories', '"Questions you\'re probably not asking" section', 'Leadership team discussion prompts', 'Workshop prompts for team meetings', 'Urgency scoring for each question'],
    whyValuable: 'Business owners are drowning in advice. Very few people help them think clearly. This tool comes in like a surgeon and says "here are the questions your business has earned."',
  },
  {
    icon: Search, title: 'Brand Contradiction Finder', thumbnail: brandContradictionFinderThumb, pricing: '$119', priceRaw: 11900, pricingDetail: 'one-time', priceId: 'brand_contradiction_finder_once', bundleable: true, badge: 'CLARITY SUITE',
    monthlyPriceId: 'brand_contradiction_finder_monthly', monthlyPricing: '$69/mo', monthlyPriceRaw: 6900, monthlySavePercent: 42,
    description: 'See where your brand says one thing but signals another.',
    successStat: '79% see conversion lift after fixing top contradiction',
    longDescription: 'We scrape your website and branding to compare message versus signal across 5 layers: visual identity, tone, pricing, process, and trust. Buyers feel contradictions immediately — this tool makes them visible.',
    deliverables: ['Brand Alignment Score (0-100)', 'Contradictions across 5 perception layers', 'Emotional impact of each contradiction', 'Buyer perception analysis', 'Before/after positioning fixes', 'Priority fix roadmap', 'Hidden strengths to amplify'],
    whyValuable: 'Most businesses think they need more traffic. Sometimes they just need to stop sending mixed signals. One contradiction fix can increase conversion 10-30%.',
  },
  {
    icon: FileText, title: 'Friction Vocabulary Audit', thumbnail: frictionVocabularyAuditThumb, pricing: '$79', priceRaw: 7900, pricingDetail: 'one-time', priceId: 'friction_vocabulary_audit_once', bundleable: true, badge: 'CLARITY SUITE',
    monthlyPriceId: 'friction_vocabulary_audit_monthly', monthlyPricing: '$49/mo', monthlyPriceRaw: 4900, monthlySavePercent: 38,
    description: 'Find the exact words weakening your trust and authority.',
    successStat: '71% report stronger brand perception within 2 weeks of edits',
    longDescription: 'We scan your entire website copy for vague language, corporate filler, weak emotional language, risky wording, and flat CTAs. Every flagged phrase gets a specific replacement that fits your desired brand tone.',
    deliverables: ['Copy Friction Score (0-100)', '15-25 flagged phrases with exact replacements', 'Tone alignment analysis', 'Stronger CTA alternatives', 'Priority fix list', 'Copy strengths to keep'],
    whyValuable: 'This is one of those things people never notice until shown to them. Then they can\'t unsee it. "These 11 phrases are quietly weakening your authority" — that lands.',
  },
  {
    icon: Wrench, title: 'Custom Implementation', thumbnail: customImplementationThumb, pricing: '$25,000+', priceRaw: 0, pricingDetail: 'scoped',
    description: 'Build the systems that scale you.',
    successStat: '94% reduce operational costs by 20%+ within first quarter',
    longDescription: 'Once gaps are identified, implementation is the multiplier. We build custom systems, deploy automation, restructure CRMs, and integrate workflows — everything needed to scale without adding headcount.',
    deliverables: ['Custom system architecture & build', 'CRM restructuring & migration', 'Automation deployment (AI + workflow)', 'Integration between existing tools', 'Staff training on new systems', 'Ongoing optimization support'],
    whyValuable: 'This is where companies reduce long-term labor costs, increase execution speed, and scale without adding headcount. ROI compounds month over month the longer the system runs.',
    includes: [{ name: '14-Day Diagnostic', value: '$2,500' }, { name: 'Fractional CTO/CMO (3 mo)', value: '$15,000' }, { name: 'System Build & Deployment', value: 'included' }, { name: 'Staff Training', value: 'included' }],
  },
  // ============ NEW PRODUCTS — Phase 1: Quick Wins ============
  {
    icon: Database, title: 'CRM Health Check', pricing: '$79', priceRaw: 7900, pricingDetail: 'one-time', priceId: 'crm_health_check_once', bundleable: true,
    monthlyPriceId: 'crm_health_check_monthly', monthlyPricing: '$49/mo', monthlyPriceRaw: 4900, monthlySavePercent: 38,
    description: '30-min audit of your CRM — find deals falling through the cracks.',
    successStat: '80% of CRMs have hidden revenue leaks within 30 minutes of audit',
    longDescription: 'A focused 30-minute audit of your current CRM (HubSpot, Salesforce, Pipedrive, etc.) covering contact quality, pipeline visibility, automation gaps, and data cleanliness. You get a quick-wins list of fixes you can deploy immediately.',
    deliverables: ['Contact quality assessment', 'Pipeline visibility analysis', 'Automation gaps identified', 'Data cleanliness score', 'Quick-wins fix list'],
    whyValuable: 'Every CRM has problems the owner doesn\'t know about. Identifying hidden revenue leaks and bad data alone usually pays back the $79 in the first deal recovered.',
  },
  {
    icon: GitBranch, title: 'Lead Flow Mapper', pricing: '$99', priceRaw: 9900, pricingDetail: 'one-time', priceId: 'lead_flow_mapper_once', bundleable: true,
    monthlyPriceId: 'lead_flow_mapper_monthly', monthlyPricing: '$65/mo', monthlyPriceRaw: 6500, monthlySavePercent: 34,
    description: 'Visual map of how leads move from prospect to close — and where they die.',
    successStat: '92% of businesses don\'t know their actual stage-by-stage conversion rates',
    longDescription: 'A visual diagram of your lead funnel showing every stage from source to close, conversion rates at each step, bottlenecks, lead-loss points, and revenue per lead. Comes with a 1-page roadmap of fixes prioritized by impact.',
    deliverables: ['Lead source identification', 'Conversion rate per stage', 'Bottleneck identification', 'Lead loss points mapped', 'Revenue per lead calculation', '1-page fix roadmap'],
    whyValuable: 'Most companies don\'t know their real conversion math. Seeing exactly where leads die — in brutal detail — usually exposes $1K–$10K/month in recoverable revenue.',
  },
  {
    icon: Swords, title: 'Competitor Landing Page Analysis', pricing: '$149', priceRaw: 14900, pricingDetail: 'one-time', priceId: 'competitor_landing_analysis_once', bundleable: true,
    monthlyPriceId: 'competitor_landing_analysis_monthly', monthlyPricing: '$99/mo', monthlyPriceRaw: 9900, monthlySavePercent: 34,
    description: 'Deep teardown of 3–5 competitors vs. you — what they win on, what you can copy.',
    successStat: '85% find at least 3 high-impact conversion elements competitors are using',
    longDescription: 'A side-by-side teardown of 3–5 competitor websites and landing pages compared to yours. We surface what they do better, where you out-perform, conversion-element gaps, and messaging differences — with quick copy and design wins you can ship this week.',
    deliverables: ['What competitors do better (and why)', 'What you do better', 'Conversion element comparison', 'Messaging gap analysis', 'Quick copy/design wins', 'Traffic source comparison (where discoverable)'],
    whyValuable: 'Owners are obsessed with what competitors are doing. This shows the exact moves they\'re using to win — and gives you a step-by-step plan to take that ground back.',
  },
  {
    icon: Send, title: 'Email Series Bundle', thumbnail: emailSeriesBundleThumb, pricing: '$149', priceRaw: 14900, pricingDetail: 'one-time · 4 sequences', priceId: 'email_series_bundle_once', bundleable: true,
    monthlyPriceId: 'email_series_bundle_monthly', monthlyPricing: '$99/mo', monthlyPriceRaw: 9900, monthlySavePercent: 34,
    description: 'Done-for-you email sequences: cold, welcome, re-engagement, upsell.',
    successStat: '20–30% of recipients convert on properly sequenced email flows',
    longDescription: 'A done-for-you bundle of 4 proven email sequences — cold outreach (5 emails), customer welcome, win-back/re-engagement, and upsell — plus 2 bonus sequences. Drop them into your email tool and send the same day.',
    deliverables: ['Cold outreach sequence (5 emails)', 'Welcome / onboarding series', 'Re-engagement / win-back series', 'Upsell sequence', '2 bonus sequences', 'Subject line + CTA variants'],
    whyValuable: 'Nobody wants to write emails from scratch. "Just drop these in and send" is magic — and the math (20–30% conversion on warm flows) makes the $149 invisible inside one closed deal.',
  },
  // ============ Phase 2: Mid-Level Implementation ============
  {
    icon: Settings, title: 'CRM Setup & Optimization', thumbnail: crmSetupOptimizationThumb, pricing: '$399', priceRaw: 39900, pricingDetail: 'one-time + training', priceId: 'crm_setup_optimization_once', bundleable: true,
    monthlyPriceId: 'crm_setup_optimization_monthly', monthlyPricing: '$279/mo', monthlyPriceRaw: 27900, monthlySavePercent: 30,
    description: 'Full CRM rebuild + automation + 2-hour live team training.',
    successStat: '20–40% improvement in forecast accuracy after structural cleanup',
    longDescription: 'Full CRM audit + setup improvements + team training. We restructure your pipeline, standardize contact fields, build basic automation workflows, train your sales team live (2 hours), and check in 30 days later to optimize what\'s actually working.',
    deliverables: ['Full health check (built in)', 'Pipeline structure optimization', 'Contact field cleanup & standardization', 'Basic automation workflows', 'Live sales team training (2 hrs)', '30-day follow-up optimization'],
    whyValuable: 'Most CRM implementations are broken. This unlocks 20–40% more accurate forecasting and the training piece means the team actually uses it. Natural bridge into ongoing optimization retainers.',
    includes: [{ name: 'CRM Health Check', value: '$79' }, { name: 'Live Team Training', value: 'included' }, { name: '30-Day Optimization', value: 'included' }],
  },
  {
    icon: LayoutTemplate, title: 'Landing Page Blueprint', thumbnail: landingPageBlueprintThumb, pricing: '$349', priceRaw: 34900, pricingDetail: 'one-time', priceId: 'landing_page_blueprint_once', bundleable: true,
    monthlyPriceId: 'landing_page_blueprint_monthly', monthlyPricing: '$239/mo', monthlyPriceRaw: 23900, monthlySavePercent: 32,
    description: 'Custom landing page template + copy framework + CTA optimization.',
    successStat: 'Average 30–50% conversion lift after copy + CTA rebuild',
    longDescription: 'A conversion-focused landing page blueprint built specifically for your business. Includes analysis of your current page, a custom template, 3 headline variations, value prop reframing, CTA optimization, form field recommendations, and an A/B testing roadmap.',
    deliverables: ['Conversion analysis of current page', 'Custom done-for-you template', 'Headline + subheading variants (3 options)', 'Value proposition reframe', 'CTA optimization', 'Form field recommendations', 'Technical setup guide', 'A/B testing roadmap'],
    whyValuable: 'Most landing pages are terrible. A real conversion rebuild typically lifts conversions 30–50% — which usually pays back $349 in the first week.',
  },
  {
    icon: Users, title: 'Prospecting List Builder', thumbnail: prospectingListBuilderThumb, pricing: '$299', priceRaw: 29900, pricingDetail: 'one-time · 200–500 leads', priceId: 'prospecting_list_builder_once', bundleable: true,
    monthlyPriceId: 'prospecting_list_builder_monthly', monthlyPricing: '$199/mo', monthlyPriceRaw: 19900, monthlySavePercent: 33,
    description: '200–500 AI-scraped, qualified leads with research + decision-maker data.',
    successStat: 'Saves reps 40+ hours of manual prospecting research',
    longDescription: 'We build you a custom prospect list using AI + data scraping. Define your target profile, get 200–500 qualified leads (email + phone) with company research, decision-maker info, and personalization data — delivered in a clean, CRM-ready spreadsheet.',
    deliverables: ['Target profile definition', '200–500 qualified leads (email + phone)', 'Company research (industry, size, revenue)', 'Decision-maker data', 'Clean CRM-ready spreadsheet', '30-day refresh option'],
    whyValuable: 'Solves the "where do I find leads" problem. Saves reps 40+ hours and gives them a list they can start working the same day.',
  },
  // ============ Phase 3: Premium Strategic ============
  {
    icon: GraduationCap, title: 'Sales Team Onboarding', thumbnail: salesTeamOnboardingThumb, pricing: '$299', priceRaw: 29900, pricingDetail: 'one-time + 30-day support', priceId: 'sales_team_onboarding_once', bundleable: true,
    monthlyPriceId: 'sales_team_onboarding_monthly', monthlyPricing: '$199/mo', monthlyPriceRaw: 19900, monthlySavePercent: 33,
    description: 'Customized training + playbook + role-play + 30-day accountability.',
    successStat: 'Trained reps close 30%+ more deals in their first 60 days',
    longDescription: 'A customized onboarding program for your sales team — process documentation, custom pitch deck, objection handling guide, CRM training (2 sessions), live role-play, 30-day accountability check-ins, and a delivered playbook (printable + digital).',
    deliverables: ['Sales process documentation', 'Customized pitch deck', 'Objection handling guide', 'CRM training (2 sessions)', 'Role-playing practice sessions', '30-day accountability check-ins', 'Printable + digital playbook'],
    whyValuable: 'Every sales team needs training but few get it. $299 is cheap for training that generates $50K+ in client revenue and builds a recurring relationship.',
  },
  {
    icon: Rocket, title: '30-Day Lead Gen Sprint', thumbnail: leadGenSprintThumb, pricing: '$999', priceRaw: 99900, pricingDetail: '30 days · done-for-you', priceId: 'lead_gen_sprint_once', bundleable: true, badge: 'DONE-FOR-YOU',
    monthlyPriceId: 'lead_gen_sprint_monthly', monthlyPricing: '$699/mo', monthlyPriceRaw: 69900, monthlySavePercent: 30,
    description: 'Done-for-you lead generation sprint — LinkedIn + email + ads + landing page.',
    successStat: '$999 typically pays for itself in the first 1–2 qualified deals closed',
    longDescription: 'A 30-day done-for-you lead generation campaign. We run a strategy workshop, execute LinkedIn outreach (100+ connections), email sequences, paid ads ($500 budget included), build the landing page + lead magnet, integrate with your CRM, and report results daily.',
    deliverables: ['Lead strategy workshop (2 hrs)', 'LinkedIn outreach campaign (100+ connections)', 'Email sequence execution', 'Paid ads campaign ($500 budget included)', 'Landing page creation', 'Lead magnet setup', 'CRM integration', 'Daily optimization', '30-day results report'],
    whyValuable: 'Companies are desperate for leads. "Done-for-you" eliminates the execution barrier and the results are measurable. Natural bridge into ongoing $499/mo retainers.',
  },
  // ============ Phase 4: Premium / Recurring ============
  {
    icon: Workflow, title: 'Sales Process Redesign', thumbnail: salesProcessRedesignThumb, pricing: '$1,499', priceRaw: 149900, pricingDetail: 'one-time + 90-day support', priceId: 'sales_process_redesign_once', bundleable: true, badge: 'PREMIUM',
    monthlyPriceId: 'sales_process_redesign_monthly', monthlyPricing: '$1,049/mo', monthlyPriceRaw: 104900, monthlySavePercent: 30,
    description: 'Complete sales methodology overhaul + 5 training sessions + 90-day support.',
    successStat: 'Average 20–40% revenue increase within 90 days of new process',
    longDescription: 'A complete overhaul of how your team sells. Methodology selection (Consultative, Value-based, MEDDIC, etc.), full process documentation lead-to-close, 5 sales team training sessions, CRM configuration for the new process, playbook creation, new-rep onboarding materials, and 90-day implementation support.',
    deliverables: ['Sales process audit (current state)', 'Methodology selection', 'Full lead-to-close documentation', '5 sales team training sessions', 'CRM configuration for new process', 'Playbook creation', 'New-rep onboarding materials', '90-day implementation support'],
    whyValuable: 'Most businesses sell wrong because they have no clear process. Fixing it generates 20–40% more revenue immediately and shortens the sales cycle. Bridge into $1K–$3K/mo coaching retainers.',
  },
  {
    icon: Handshake, title: 'Marketing-to-Sales Alignment', thumbnail: marketingSalesAlignmentThumb, pricing: '$1,299', priceRaw: 129900, pricingDetail: '2-day workshop + 60-day coaching', priceId: 'marketing_sales_alignment_once', bundleable: true, badge: 'PREMIUM',
    monthlyPriceId: 'marketing_sales_alignment_monthly', monthlyPricing: '$899/mo', monthlyPriceRaw: 89900, monthlySavePercent: 31,
    description: '2-day workshop fixing the disconnect that costs you 6 figures/year.',
    successStat: 'Misalignment costs the average company 6+ figures/year in wasted leads',
    longDescription: 'A 2-day workshop (off-site or virtual) that fixes the disconnect between marketing and sales. We build the SLA, lead-scoring framework, handoff process, messaging alignment, content collaboration framework, reporting dashboard, and provide 60 days of follow-up coaching.',
    deliverables: ['2-day off-site or virtual workshop', 'SLA definition', 'Lead scoring framework', 'Handoff process documentation', 'Messaging alignment across channels', 'Content collaboration framework', 'Reporting/metrics dashboard setup', '60-day coaching/support'],
    whyValuable: 'Marketing and sales hate each other in 90% of companies and that misalignment costs 6+ figures/year. Premium high-touch workshop that usually leads into bigger combined retainers.',
  },
  {
    icon: TrendingUp, title: 'Sales Coaching Retainer', thumbnail: salesCoachingRetainerThumb, pricing: '$499/mo', priceRaw: 49900, pricingDetail: 'monthly · cancel anytime', priceId: 'sales_coaching_retainer_monthly', badge: 'RECURRING',
    description: 'Ongoing sales team coaching, pipeline reviews, and CRM optimization.',
    successStat: 'Average client stays 12–18 months — recurring revenue engine',
    longDescription: 'Ongoing sales team coaching and optimization. Weekly team call, 1:1 coaching for each rep (30–60 min), deal reviews on stuck pipeline, CRM optimization, playbook/script updates, quarterly strategy refresh, and a monthly performance dashboard. Tier B ($699) and Tier C ($999) add daily Slack support and a dedicated account manager.',
    deliverables: ['Weekly team call', '1:1 coaching for each rep (30–60 min)', 'Stuck deal & big-opportunity reviews', 'Ongoing CRM optimization', 'Playbook / script updates', 'Quarterly strategy refresh', 'Monthly performance dashboard'],
    whyValuable: 'Companies eventually realize "we can\'t do this alone." Recurring revenue, 12–18 month average tenure, and it feeds every other product in the lineup.',
  },
  {
    icon: Bot, title: 'Lead Nurture Automation', thumbnail: leadNurtureAutomationThumb, pricing: '$299/mo', priceRaw: 29900, pricingDetail: 'monthly · managed', priceId: 'lead_nurture_automation_monthly', badge: 'RECURRING',
    description: 'Managed email + SMS nurture sequences that convert cold leads automatically.',
    successStat: 'Properly nurtured leads convert at 20–30% over 6–12 months',
    longDescription: 'Ongoing managed nurture automation. We build and run 8–12 email sequences plus SMS campaigns (holiday, seasonal, re-engagement), set up lead scoring, manage drip campaigns, A/B test copy and timing, deliver monthly performance reporting, and integrate everything with your CRM.',
    deliverables: ['8–12 email sequences (automated)', 'SMS campaigns (holiday, seasonal, re-engagement)', 'Lead scoring automation', 'Drip campaign management', 'A/B testing (copy, timing, frequency)', 'Monthly performance reporting', 'Sequence optimization', 'CRM integration'],
    whyValuable: 'Most leads aren\'t ready today. Automation keeps them warm 6–12 months and converts 20–30% that would otherwise go cold. Set & forget recurring revenue.',
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
  const [checkoutBundleItems, setCheckoutBundleItems] = useState<string[] | null>(null);

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

  const AUTOMATABLE_PRICES = new Set([
    'scan_full_report_once', 'digital_snapshot_once', 'scan_strategy_blueprint_once',
    'social_content_pack_once', 'sales_script_pack_once', 'content_calendar_once',
    'follow_up_plan_once', 'strategic_question_engine_once', 'brand_contradiction_finder_once',
    'friction_vocabulary_audit_once',
  ]);

  const getReturnUrl = (pid: string) => {
    if (pid.endsWith('_monthly')) {
      return `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=subscription`;
    }
    if (AUTOMATABLE_PRICES.has(pid)) {
      return `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=deliverable`;
    }
    return `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
  };

  const checkoutReturnUrl = checkoutPriceId ? getReturnUrl(checkoutPriceId) : '';

  const checkoutMetadata: Record<string, string> = {
    ...(user ? { userId: user.id } : {}),
    ...(checkoutPriceId ? { priceId: checkoutPriceId } : {}),
    ...(checkoutBundleItems ? { bundle_items: JSON.stringify(checkoutBundleItems) } : {}),
  };

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
            <StripeEmbeddedCheckout priceId={checkoutPriceId} returnUrl={checkoutReturnUrl} customerEmail={user?.email || undefined} metadata={checkoutMetadata} />
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
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
              The Forensic Diagnostic — $2,500 · Applied toward engagement
            </div>
            <h2 className="font-forensic text-4xl md:text-5xl font-bold mb-4 text-foreground">
              You pay for the <span className="text-crimson italic">diagnosis.</span>{' '}
              <br className="hidden md:block" />
              Everything else is the prescription.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Engagements start with the Forensic Diagnostic — operator-led, 14 days, every leak named and quantified. Then we prescribe (AI, automation, CRM, systems). Mix &amp; match for up to 20% off.
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
            const hasThumb = !!service.thumbnail;
            return (
              <RevealOnScroll key={service.title} delay={0.03 + index * 0.04}>
                <div
                  onClick={() => setExpandedIdx(index)}
                  className={`glass glass-shine shimmer-border hover-lift rounded-xl flex flex-col h-full transition-all duration-300 group relative cursor-pointer hover:shadow-2xl hover:shadow-primary/10 overflow-hidden ${
                    isSelected ? 'border-2 border-primary ring-2 ring-primary/20' : 'border border-border hover:border-primary/40'
                  } ${hasThumb ? 'p-0' : 'p-6'}`}
                >
                  {service.badge && (
                    <span
                      className={`absolute top-3 right-3 z-10 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.14em] font-display border ${
                        service.badge === 'FOUNDATIONAL'
                          ? 'bg-amber/[0.08] text-amber border-amber/40 backdrop-blur-md bg-background/70'
                          : 'bg-primary/20 text-primary border-primary/30 backdrop-blur-md'
                      }`}
                    >
                      {service.badge === 'FOUNDATIONAL' ? 'Foundational Engagement' : service.badge}
                    </span>
                  )}

                  {hasThumb ? (
                    <>
                      {/* Hero infographic — already contains title, price, icon, stats */}
                      <div className="relative w-full bg-white">
                        <img
                          src={service.thumbnail}
                          alt={service.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-contain block"
                        />
                      </div>

                      {/* Footer hint + bundle checkbox */}
                      <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/40 mt-auto">
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
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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

                {expandedService.thumbnail && (
                  <div className="w-full bg-white border-b border-border">
                    <img
                      src={expandedService.thumbnail}
                      alt={expandedService.title}
                      className="w-full h-auto object-contain block"
                    />
                  </div>
                )}

                <div className="p-6 md:p-8">
                  {expandedService.badge && (
                    <span
                      className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.14em] font-display border mb-3 ${
                        expandedService.badge === 'FOUNDATIONAL'
                          ? 'bg-amber/[0.08] text-amber border-amber/40'
                          : 'bg-primary/20 text-primary border-primary/30'
                      }`}
                    >
                      {expandedService.badge === 'FOUNDATIONAL' ? 'Foundational Engagement' : expandedService.badge}
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
                  <button
                    onClick={() => {
                      // Use the first item's priceId for checkout; pass all items in metadata
                      const firstItem = selectedItems[0];
                      const pid = billingMode === 'monthly' && firstItem.monthlyPriceId
                        ? firstItem.monthlyPriceId
                        : firstItem.priceId!;
                      const bundlePriceIds = selectedItems.map(s =>
                        billingMode === 'monthly' && s.monthlyPriceId ? s.monthlyPriceId! : s.priceId!
                      );
                      setCheckoutBundleItems(bundlePriceIds);
                      setCheckoutPriceId(pid);
                    }}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors active:scale-[0.97]"
                  >
                    <ShoppingCart className="w-4 h-4" /> Get Bundle
                  </button>
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
          <div className="premium-tile amber-corner mt-12 p-10 md:p-12 rounded-xl text-center overflow-hidden">
            {/* Top hairline */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/60 to-transparent pointer-events-none" />

            {/* Case-file label */}
            <div className="font-case text-[10px] uppercase tracking-[0.28em] text-amber/80 mb-3">
              Case File · Closing Argument
            </div>

            <h3 className="font-forensic text-2xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              The Real <span className="text-gradient-amber">Question</span>
            </h3>

            <p className="text-base md:text-lg text-muted-foreground/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              It's not <span className="text-foreground/70">"Do I spend $2,500?"</span> — it's{' '}
              <span className="text-foreground font-semibold">
                "How much is inefficiency already costing me every month?"
              </span>
            </p>

            {/* Divider */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className="h-px w-12 bg-amber/30" />
              <span className="font-case text-[9px] uppercase tracking-[0.3em] text-amber/60">
                Take Action
              </span>
              <span className="h-px w-12 bg-amber/30" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="tel:+13173762110" className="w-full sm:w-auto">
                <button className="group relative w-full sm:w-auto overflow-hidden bg-gradient-to-r from-amber to-amber/80 hover:from-amber hover:to-amber text-background px-7 py-3.5 rounded-lg font-semibold tracking-wide transition-all active:scale-[0.97] shadow-[0_8px_30px_-8px_hsl(var(--amber-glow)/0.6)] hover:shadow-[0_12px_40px_-8px_hsl(var(--amber-glow)/0.9)]">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                  <span className="relative inline-flex items-center gap-2.5">
                    <Phone className="w-4 h-4" />
                    Call (317) 376-2110
                  </span>
                </button>
              </a>
              <a href="mailto:aetheris.technology@outlook.com?subject=Service%20Inquiry" className="w-full sm:w-auto">
                <button className="group w-full sm:w-auto border border-amber/30 hover:border-amber/70 bg-background/40 hover:bg-amber/5 backdrop-blur-sm px-7 py-3.5 rounded-lg font-semibold tracking-wide text-foreground transition-all active:scale-[0.97]">
                  <span className="inline-flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-amber" />
                    Email the Operator
                  </span>
                </button>
              </a>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
