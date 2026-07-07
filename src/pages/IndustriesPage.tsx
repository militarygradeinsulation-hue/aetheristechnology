import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Heart, Banknote, Truck, HardHat, Factory, Code2, Star, Search, ChevronRight, Scale, Home, GraduationCap, ShoppingBag, Hotel, Wrench, Plane, Megaphone, Stethoscope, Sparkles, Cpu, Leaf, Beaker, Hammer, Briefcase, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useChaosPhysics, DEFAULT_TUNING } from '@/hooks/useChaosPhysics';
import { Input } from '@/components/ui/input';
import { combineSchemas, serviceSchema } from '@/lib/schemas';
import { INFOGRAPHICS } from '@/lib/infographics';
import { BOOK_MEETING_URL } from '@/lib/links';


interface IndustryLeak {
  industry: string;
  icon: React.ComponentType<{ className?: string }>;
  primaryLeak: string;
  typicalLoss: string;
  whatWeMeasure: string[];
  slug: string;
  image: string;
  humanCost: string;
  whatYouGetBack: string;
  recommended: {
    name: string;
    price: string;
    why: string;
    link: string;
  };
}

const DEFAULT_RECOMMENDED = {
  name: 'The Leak Audit (Forensic Diagnostic)',
  price: '$2,500 flat',
  why: 'Operator-led forensic mini-audit. Fee applies 1:1 toward any engagement.',
  link: '/leak-audit',
};

const INDUSTRIES: IndustryLeak[] = [
  {
    industry: 'Accounting & Bookkeeping',
    icon: Briefcase,
    primaryLeak: 'Scope creep and unbilled hours buried in client work.',
    typicalLoss: '$120K-$600K / yr',
    whatWeMeasure: ['Realization rate per client', 'Unbilled time bleed', 'Onboarding-to-first-invoice lag'],
    slug: 'ai-for-accounting',
    image: INFOGRAPHICS.industryAccounting,
    humanCost: "You bill what you remember, not what you did. Tax season eats 90 hours a week and you still feel behind.",
    whatYouGetBack: "Every hour captured. Every scope-add billed. Clean realization you can defend in a partner meeting.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Architecture & Design',
    icon: Sparkles,
    primaryLeak: 'Unpaid design iterations and proposal-to-contract drag.',
    typicalLoss: '$150K-$800K / yr',
    whatWeMeasure: ['Revisions vs. contracted scope', 'Proposal close rate', 'Phase invoice aging'],
    slug: 'ai-for-architecture',
    image: INFOGRAPHICS.industryArchitecture,
    humanCost: "You're redlining renders at midnight for a client who hasn't paid Phase 1 yet.",
    whatYouGetBack: "Scope locked in writing. Phases billed on completion. You stop subsidizing indecisive clients.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Automotive & Dealerships',
    icon: Wrench,
    primaryLeak: 'Lead response lag and service-bay throughput loss.',
    typicalLoss: '$200K-$1.4M / yr',
    whatWeMeasure: ['Web lead → test drive conversion', 'Service bay utilization', 'F&I attach rate'],
    slug: 'ai-for-automotive',
    image: INFOGRAPHICS.industryAutomotive,
    humanCost: "Hot leads ghost because nobody called inside an hour. Service bays sit empty between jobs.",
    whatYouGetBack: "Every lead worked inside the window. Bays sequenced. Same floor, more cars out the door.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'B2B SaaS',
    icon: Code2,
    primaryLeak: 'Trial-to-paid drop and renewal silent churn.',
    typicalLoss: '$150K-$1M / yr',
    whatWeMeasure: ['Trial activation by cohort', 'Renewal at-risk signals', 'Expansion playbook touch-rate'],
    slug: 'ai-for-saas',
    image: INFOGRAPHICS.industrySaas,
    humanCost: "MRR looks fine until it doesn't. You find out an anchor account is gone two weeks after they decided, and nobody saw it coming.",
    whatYouGetBack: "Churn signals named before the cancel email. Trial activation actually working. You stop apologizing to your board for surprises.",
    recommended: { ...DEFAULT_RECOMMENDED, why: 'Most popular entry for SaaS, fast read on activation and churn signals. Fee applies toward a larger engagement.' },
  },
  {
    industry: 'Construction',
    icon: HardHat,
    primaryLeak: 'Bid follow-up gaps and RFI cycle bleed.',
    typicalLoss: '$200K-$1.2M / yr',
    whatWeMeasure: ['Bid → award follow-up cadence', 'RFI cycle time and stall points', 'Change-order capture rate'],
    slug: 'ai-for-construction',
    image: INFOGRAPHICS.industryConstruction,
    humanCost: "You're sitting in the truck at a jobsite typing change orders on your phone, knowing three bids you sent last week never got a callback.",
    whatYouGetBack: "Bids get followed up automatically. Change orders get captured the day they happen. You stop eating the margin you already earned.",
    recommended: { ...DEFAULT_RECOMMENDED, why: 'Bid follow-up and change-order capture surface fast in the Leak Audit. Operator-led, fee applies 1:1 to engagement.' },
  },
  {
    industry: 'Education & Training',
    icon: GraduationCap,
    primaryLeak: 'Enrollment fall-off and course completion drop.',
    typicalLoss: '$100K-$700K / yr',
    whatWeMeasure: ['Inquiry → enrollment conversion', 'Completion by cohort', 'Renewal/re-enroll rate'],
    slug: 'ai-for-education',
    image: INFOGRAPHICS.industryEducation,
    humanCost: "Students inquire, then disappear. You don't know which marketing dollars actually brought a seat.",
    whatYouGetBack: "Enrollment funnel named end to end. Completion lifts. You stop guessing what works.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'E-commerce & Retail',
    icon: ShoppingBag,
    primaryLeak: 'Cart abandonment and post-purchase retention drop.',
    typicalLoss: '$200K-$1.5M / yr',
    whatWeMeasure: ['Checkout funnel drop-off', 'Second-purchase rate', 'Refund/return root causes'],
    slug: 'ai-for-ecommerce',
    image: INFOGRAPHICS.industryEcommerce,
    humanCost: "You spend more on ads every month and the LTV won't move. You feel like you're feeding a furnace.",
    whatYouGetBack: "Checkout fixed where it actually bleeds. Repeat customers built on purpose. CAC stops climbing.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Finance',
    icon: Banknote,
    primaryLeak: 'Underwriting cycle drag and KYC handoff loss.',
    typicalLoss: '$400K-$2.5M / yr',
    whatWeMeasure: ['Application-to-decision days', 'KYC handoff drop-off', 'Re-work rate per file'],
    slug: 'ai-for-finance',
    image: INFOGRAPHICS.industryFinance,
    humanCost: "Files sit. Clients ghost. You know deals died inside your own pipeline and nobody can tell you exactly where.",
    whatYouGetBack: "Cycle time cut in half. Handoff drops named and closed. You walk into the quarterly review with answers, not excuses.",
    recommended: { ...DEFAULT_RECOMMENDED, why: 'Underwriting cycle and KYC handoff drops show up fast in the Leak Audit. Operator-led, fee applies 1:1 to engagement.' },
  },
  {
    industry: 'Healthcare',
    icon: Heart,
    primaryLeak: 'Intake fall-off and prior-auth aging.',
    typicalLoss: '$180K-$900K / yr',
    whatWeMeasure: ['Inquiry-to-appointment conversion', 'No-show + reschedule loss', 'Prior-auth aging buckets'],
    slug: 'ai-for-healthcare',
    image: INFOGRAPHICS.industryHealthcare,
    humanCost: "Patients are calling and never booking. Front desk is drowning. You feel like you're running a clinic that's leaking patients out the back door.",
    whatYouGetBack: "Inquiries become appointments. Prior auths stop aging out. Your front desk stops crying in the breakroom on Fridays.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Home Services & Trades',
    icon: Hammer,
    primaryLeak: 'Estimate response lag and tech-utilization gaps.',
    typicalLoss: '$120K-$800K / yr',
    whatWeMeasure: ['Lead → booked job conversion', 'Tech billable-hour utilization', 'Upsell capture per ticket'],
    slug: 'ai-for-home-services',
    image: INFOGRAPHICS.industryHomeServices,
    humanCost: "Phone rings while you're under a sink. Estimates pile up in your truck. You're losing jobs to whoever called back first.",
    whatYouGetBack: "Every call captured. Estimates out same day. Trucks routed for max billable hours.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Hospitality & Hotels',
    icon: Hotel,
    primaryLeak: 'Direct booking loss and ancillary revenue gaps.',
    typicalLoss: '$200K-$1.5M / yr',
    whatWeMeasure: ['OTA vs. direct mix', 'RevPAR by segment', 'F&B attach and upsell rate'],
    slug: 'ai-for-hospitality',
    image: INFOGRAPHICS.industryHospitality,
    humanCost: "OTAs eat your margin. Walk-ins ask for upgrades nobody offered them. Repeat guests don't come back.",
    whatYouGetBack: "Direct bookings up. Upsell scripts that actually run. Guest data that follows them next visit.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Legal & Law Firms',
    icon: Scale,
    primaryLeak: 'Intake conversion drop and matter-aging WIP.',
    typicalLoss: '$200K-$1.2M / yr',
    whatWeMeasure: ['Inquiry → engagement conversion', 'WIP aging and write-downs', 'Realization rate by partner'],
    slug: 'ai-for-legal',
    image: INFOGRAPHICS.industryLegal,
    humanCost: "Qualified leads call, never sign. WIP sits 90 days because nobody chases it. Partners argue, nothing changes.",
    whatYouGetBack: "Intake closed inside the window. WIP aged and collected. Realization defended with numbers.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Logistics',
    icon: Truck,
    primaryLeak: 'Quote response lag and lane-margin invisibility.',
    typicalLoss: '$250K-$2M / yr',
    whatWeMeasure: ['Quote response time vs. carrier SLA', 'Lane-level margin attribution', 'Exception triage cycle'],
    slug: 'ai-for-logistics',
    image: INFOGRAPHICS.industryLogistics,
    humanCost: "You feel the lanes losing money but can't prove which ones, so every Monday meeting becomes a guess and a fight.",
    whatYouGetBack: "Lane-by-lane margin in writing. Quotes back inside SLA. You stop being the human ETA system everyone's calling at 6am.",
    recommended: { ...DEFAULT_RECOMMENDED, why: 'Lane margin and quote response leaks come up first in the Leak Audit. Operator-led, fee applies 1:1 to engagement.' },
  },
  {
    industry: 'Creative Studios & Production Shops',
    icon: Megaphone,
    primaryLeak: 'Scope creep, unbilled revisions, engagement drift.',
    typicalLoss: '$150K-$900K / yr',
    whatWeMeasure: ['Hours-vs-budget per account', 'Engagement utilization', 'Pitch-to-close conversion'],
    slug: 'creative-studios',
    image: INFOGRAPHICS.industryCreative,
    humanCost: "Every account is over hours. Pitches eat weeks. You're profitable on paper, broke in cash.",
    whatYouGetBack: "Scope locked. Engagements measured weekly. Pitches built from a library, not from scratch.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Medical Practices & Dental',
    icon: Stethoscope,
    primaryLeak: 'Missed recall and unbilled treatment plans.',
    typicalLoss: '$150K-$800K / yr',
    whatWeMeasure: ['Recall compliance', 'Treatment plan acceptance', 'Insurance follow-up aging'],
    slug: 'ai-for-medical-practices',
    image: INFOGRAPHICS.industryMedicalDental,
    humanCost: "Patients vanish between visits. Treatment plans sit in the chart unaccepted. Insurance ages and gets written off.",
    whatYouGetBack: "Recall worked every week. Plans presented with intent. Insurance chased to the dollar.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Professional Services',
    icon: Briefcase,
    primaryLeak: 'Proposal cycle drag and project-margin erosion.',
    typicalLoss: '$150K-$1M / yr',
    whatWeMeasure: ['Proposal → close cycle', 'Project margin vs. quoted', 'Utilization by consultant'],
    slug: 'ai-for-professional-services',
    image: INFOGRAPHICS.industryProfessional,
    humanCost: "Every proposal is a custom rebuild. Margins erode mid-project. You can't tell who's actually profitable.",
    whatYouGetBack: "Proposals from templates that win. Margin tracked weekly. Underperformers named with data.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Real Estate',
    icon: Home,
    primaryLeak: 'Lead response lag and pipeline ghosting.',
    typicalLoss: '$150K-$1M / yr',
    whatWeMeasure: ['Speed-to-first-touch', 'Showing → offer conversion', 'Past-client referral rate'],
    slug: 'ai-for-real-estate',
    image: INFOGRAPHICS.industryRealEstate,
    humanCost: "Leads convert for whoever calls first. You're driving between showings while opportunities die in voicemail.",
    whatYouGetBack: "Every lead touched in minutes. Past clients worked on cadence. Pipeline you can actually forecast.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Specialty Manufacturing',
    icon: Factory,
    primaryLeak: 'Quote-to-close drag and stalled deals after Day 3.',
    typicalLoss: '$300K-$1.8M / yr',
    whatWeMeasure: ['Quote follow-up SLA vs. actual', 'Time-in-stage by deal value', 'RFQ-to-PO conversion by lane'],
    slug: 'ai-for-manufacturing',
    image: INFOGRAPHICS.industryManufacturing,
    humanCost: "You're answering RFQ emails at 10pm on a Tuesday while your kid is asking why you're still on the laptop.",
    whatYouGetBack: "Quotes go out same-day without you touching them. You leave the shop at 5pm and the system is still selling.",
    recommended: { ...DEFAULT_RECOMMENDED, why: 'Quote-to-cash is where manufacturers leak most. Start with the operator-led Leak Audit, fee applies 1:1 to any engagement.' },
  },
  {
    industry: 'Technology & IT Services',
    icon: Cpu,
    primaryLeak: 'Ticket-resolution drag and contract renewal silence.',
    typicalLoss: '$180K-$1.2M / yr',
    whatWeMeasure: ['MTTR by ticket class', 'Renewal touch cadence', 'Add-on attach rate'],
    slug: 'ai-for-it-services',
    image: INFOGRAPHICS.industryItServices,
    humanCost: "Tickets sit. Renewals go silent. You only learn an account is at risk after they've already shopped you.",
    whatYouGetBack: "MTTR halved. Renewals on a written cadence. Add-ons attached where the data says they fit.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Travel & Tourism',
    icon: Plane,
    primaryLeak: 'Booking abandonment and upsell capture gaps.',
    typicalLoss: '$120K-$900K / yr',
    whatWeMeasure: ['Inquiry → booking conversion', 'Ancillary attach rate', 'Cancellation root causes'],
    slug: 'ai-for-travel',
    image: INFOGRAPHICS.industryTravel,
    humanCost: "Inquiries pile up. Bookings go to whoever quotes first. Upsells happen by accident, not on purpose.",
    whatYouGetBack: "Quotes back inside the window. Upsell scripts that actually run. Cancellation reasons you can fix.",
    recommended: DEFAULT_RECOMMENDED,
  },
  {
    industry: 'Wellness, Spa & Fitness',
    icon: Leaf,
    primaryLeak: 'Membership churn and class/booking under-utilization.',
    typicalLoss: '$80K-$500K / yr',
    whatWeMeasure: ['Member churn signals', 'Class utilization', 'Package upsell rate'],
    slug: 'ai-for-wellness',
    image: INFOGRAPHICS.industryWellness,
    humanCost: "Members ghost without notice. Classes run half-empty. Front desk forgets to offer the package.",
    whatYouGetBack: "Churn signals caught early. Classes filled on purpose. Upsells built into every checkout.",
    recommended: DEFAULT_RECOMMENDED,
  },
].sort((a, b) => a.industry.localeCompare(b.industry));

// Per-metric distinct findings — index matches whatWeMeasure order.
const FRICTION_DETAILS: Record<string, { why: string; fixed: string }[]> = {
  'ai-for-accounting': [
    { why: 'Realization sits below quoted because scope-adds never make it to the invoice.', fixed: 'Every scope-add gets logged and billed the week it happens — realization defended line by line.' },
    { why: 'Time gets remembered, not captured. Hours die in inboxes and Slack threads.', fixed: 'Time is captured at the moment of work, tied to a matter, and billable by default.' },
    { why: 'Weeks pass between engagement letter and first invoice. Cash sits on the sideline.', fixed: 'Onboarding closes into a first invoice inside 7 days — no more free work by accident.' },
  ],
  'ai-for-architecture': [
    { why: 'Revisions balloon past contract without a scope-change document. You eat the hours.', fixed: 'Every revision past scope triggers a written change order before the pencil moves.' },
    { why: 'Proposals sit in inboxes for weeks because nobody owns the follow-up cadence.', fixed: 'Proposals get a written follow-up rhythm — close rate climbs without new leads.' },
    { why: 'Phase invoices age past 60 days and nobody chases them until cash gets tight.', fixed: 'Phase-complete triggers the invoice automatically. Aging buckets stay under 30 days.' },
  ],
  'ai-for-automotive': [
    { why: 'Web leads sit for hours. By the time you call, they already test-drove somewhere else.', fixed: 'Every web lead gets a live human touch inside 5 minutes — test drive conversion doubles.' },
    { why: 'Bays sit empty between jobs because nobody sequenced the next ticket.', fixed: 'Service sequencing keeps bays 85%+ utilized without hiring another tech.' },
    { why: 'F&I attach drops when the desk gets busy — thousands per deal walk out the door.', fixed: 'F&I gets a scripted attach path every deal — no more "we forgot to offer it."' },
  ],
  'ai-for-saas': [
    { why: 'Trials never hit the activation moment because the onboarding drops them at step 3.', fixed: 'Activation is instrumented per step — the drop-off gets fixed where it actually bleeds.' },
    { why: 'Renewals go silent because at-risk signals nobody watches happen 60 days before churn.', fixed: 'Health signals flag at-risk accounts in advance — CSMs get 60 days to save them.' },
    { why: 'Expansion opportunities die because no one follows the playbook past the initial upsell.', fixed: 'Expansion touch-cadence is enforced weekly — attach rate climbs without new logos.' },
  ],
  'ai-for-construction': [
    { why: 'Bids get sent then forgotten. The GC gives it to whoever called last week.', fixed: 'Every bid gets an automatic 3-touch follow-up cadence — award rate lifts on the same volume.' },
    { why: 'RFIs sit in email chains for days while the crew waits on-site burning labor.', fixed: 'RFI cycle time cut by naming the stall points — crews stop standing around at $75/hr.' },
    { why: 'Change orders happen verbally on-site and never get invoiced.', fixed: 'Change orders get captured on the phone the day they happen — no more eating overruns.' },
  ],
  'ai-for-education': [
    { why: 'Inquiries never become enrollments because the follow-up sequence stops after email #2.', fixed: 'Inquiry-to-enroll gets a 30-day multi-channel cadence — enrollment lifts without more ad spend.' },
    { why: 'Cohorts drop off mid-course and nobody names the exact week they lose people.', fixed: 'Completion is tracked by week — the drop-off gets fixed at the exact lesson that bleeds.' },
    { why: 'Alumni never re-enroll because no one asked them at the right moment.', fixed: 'Re-enroll asks trigger on completion — lifetime revenue per student climbs.' },
  ],
  'ai-for-ecommerce': [
    { why: 'Checkout drops at the shipping step and nobody fixes the friction.', fixed: 'Checkout is instrumented step by step — the leak gets closed where it actually happens.' },
    { why: 'First-purchase customers never come back because there is no post-purchase flow.', fixed: 'Second-purchase sequence runs on autopilot — repeat rate climbs, CAC stops mattering.' },
    { why: 'Returns get processed blind — nobody knows which SKU or reason drives the volume.', fixed: 'Refund reasons get categorized — the top-3 return drivers get fixed at the source.' },
  ],
  'ai-for-finance': [
    { why: 'Files sit at the underwriter for days because no SLA is enforced.', fixed: 'Application-to-decision gets a written SLA — average cycle time cut in half.' },
    { why: 'KYC hands off between teams and clients ghost during the handoff gap.', fixed: 'Handoff drop-offs get named and closed — completion rate climbs without new marketing.' },
    { why: 'Files come back for re-work because intake never captured what underwriting needed.', fixed: 'Intake gets tuned to underwriting requirements — re-work rate collapses.' },
  ],
  'ai-for-healthcare': [
    { why: 'Inquiries call the front desk and never get booked because the receptionist is drowning.', fixed: 'Booking becomes systematized — inquiry-to-appointment climbs without hiring.' },
    { why: 'No-shows and last-minute cancels burn slots that could have paid for the day.', fixed: 'Reminders and waitlist automation reclaim the slots that used to just vanish.' },
    { why: 'Prior auths age past 30 days and get written off as bad debt.', fixed: 'Prior-auth aging buckets get worked weekly — write-offs stop being routine.' },
  ],
  'ai-for-home-services': [
    { why: 'Calls come in while techs are on jobs — leads go to whoever answers first.', fixed: 'Every call gets captured and routed — booked-job rate climbs on the same lead volume.' },
    { why: 'Techs spend an hour a day driving, on paperwork, or waiting on parts.', fixed: 'Route sequencing and dispatch get tightened — billable hours per tech climb 15-25%.' },
    { why: 'Upsell opportunities on the truck get missed because it is not part of the script.', fixed: 'Ticket-level upsell prompts run every visit — average ticket size climbs.' },
  ],
  'ai-for-hospitality': [
    { why: 'OTAs take 15-25% of every booking they touch, and direct booking never gets marketed.', fixed: 'Direct booking incentives cut OTA dependency — margin per room lifts.' },
    { why: 'RevPAR sits flat because segment mix is not managed week to week.', fixed: 'Segment yield gets managed per day-of-week — RevPAR climbs without dropping rates.' },
    { why: 'F&B and upsell attach never happens because it is not scripted at check-in.', fixed: 'Check-in and in-stay upsell scripts run every guest — ancillary revenue lifts per stay.' },
  ],
  'ai-for-legal': [
    { why: 'Qualified leads call, get a callback three days later, and hire someone else.', fixed: 'Intake closes inside the same-day window — engagement rate climbs on the same lead flow.' },
    { why: 'WIP ages past 90 days because nobody owns collections until cash gets tight.', fixed: 'WIP is aged and worked weekly — write-downs drop, collections become routine.' },
    { why: 'Realization gaps by partner never surface because timekeeping is optional.', fixed: 'Realization is measured per partner — the outliers get named with numbers, not gossip.' },
  ],
  'ai-for-logistics': [
    { why: 'Quotes go back late and shippers give the load to whoever answered first.', fixed: 'Quote response SLA gets enforced — win rate lifts on the same RFQ volume.' },
    { why: 'Certain lanes lose money and nobody can prove which ones until quarter-end.', fixed: 'Lane-level margin is visible weekly — money-losing lanes get repriced or dropped.' },
    { why: 'Exceptions stack up in email and turn into service failures 48 hours later.', fixed: 'Exception triage gets a defined cycle — service failures stop hitting the customer blind.' },
  ],
  'creative-studios': [
    { why: 'Hours run 30-60% over budget per account because scope is defended verbally.', fixed: 'Hours-vs-budget gets tracked weekly per account — scope creep gets billed or stopped.' },
    { why: 'Retainers get spent early in the month, then the last two weeks are free work.', fixed: 'Engagement utilization is measured weekly — the free work stops without losing the client.' },
    { why: 'Every pitch is built from scratch, eating a week of senior time per shot.', fixed: 'Pitch assets get libraried — new-business turnaround drops from weeks to days.' },
  ],
  'ai-for-medical-practices': [
    { why: 'Recall lists sit untouched — patients disappear between hygiene visits.', fixed: 'Recall is worked every week with a defined cadence — hygiene chair stays full.' },
    { why: 'Treatment plans get presented once and never followed up.', fixed: 'Unaccepted plans get a written follow-up cadence — case acceptance climbs.' },
    { why: 'Insurance claims age past 60 days and get written off without a fight.', fixed: 'Aging buckets get worked to the dollar — write-offs stop being the default.' },
  ],
  'ai-for-professional-services': [
    { why: 'Proposals take a week each because every one is a custom rebuild.', fixed: 'Proposals get templatized by service line — cycle time drops, close rate holds.' },
    { why: 'Projects overrun quoted hours and the write-down never surfaces until close.', fixed: 'Project margin is tracked weekly against quote — write-downs get flagged early.' },
    { why: 'Consultant utilization varies wildly and nobody names the underperformer.', fixed: 'Utilization is measured per person — coaching decisions get made on data, not vibes.' },
  ],
  'ai-for-real-estate': [
    { why: 'Leads convert for whoever calls first — most agents call in 4+ hours.', fixed: 'Speed-to-first-touch drops under 5 minutes — conversion rate doubles on the same lead spend.' },
    { why: 'Showings happen but offers never follow because nobody drove the ask.', fixed: 'Showing-to-offer gets scripted and tracked — closed volume climbs without more listings.' },
    { why: 'Past clients get one holiday card a year and forget you exist.', fixed: 'Past-client cadence runs monthly on autopilot — referral volume becomes predictable.' },
  ],
  'ai-for-manufacturing': [
    { why: 'Quotes get sent then forgotten. The 3rd-day follow-up that wins deals never happens.', fixed: 'Quote follow-up runs on written SLA — RFQ-to-PO conversion climbs on the same volume.' },
    { why: 'Deals sit in stages past their historical close window and nobody works them.', fixed: 'Time-in-stage triggers action — stalled deals get named and closed or killed.' },
    { why: 'Certain lanes and product mixes lose money and nobody prices them out.', fixed: 'Conversion by lane gets visible — the losers get repriced, the winners get more shots.' },
  ],
  'ai-for-it-services': [
    { why: 'Ticket MTTR drifts because nobody classes tickets by SLA type.', fixed: 'MTTR is measured per ticket class — the outliers get fixed at the process level.' },
    { why: 'Renewals go silent 90 days out and clients shop you before you reach out.', fixed: 'Renewal cadence starts at day-90 with a written touch plan — retention climbs.' },
    { why: 'Add-ons never attach because sales was never part of the support motion.', fixed: 'Add-on attach gets scripted into QBRs — expansion revenue lifts per client.' },
  ],
  'ai-for-travel': [
    { why: 'Inquiries pile up and quotes go back after the customer already booked elsewhere.', fixed: 'Quote SLA gets enforced — booking conversion climbs on the same inquiry flow.' },
    { why: 'Ancillary attach happens by accident, never by design.', fixed: 'Upsell scripts run every quote — ancillary revenue per booking climbs measurably.' },
    { why: 'Cancellations get processed blind — nobody knows what drove them.', fixed: 'Cancellation reasons get categorized — the top drivers get fixed at the source.' },
  ],
  'ai-for-wellness': [
    { why: 'Members ghost silently — no engagement signals flag before the cancel.', fixed: 'Churn signals surface early — save-plays run before the member walks.' },
    { why: 'Classes run half-empty because the fill strategy is "hope."', fixed: 'Class utilization gets managed with reminders and waitlists — capacity actually fills.' },
    { why: 'Packages never get offered because it is not scripted into checkout.', fixed: 'Package upsell runs at every checkout — average revenue per member climbs.' },
  ],
};

const IndustryCard: React.FC<{ v: IndustryLeak; onOpen: () => void }> = ({ v, onOpen }) => {
  const Icon = v.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="forensic-tile rounded-sm border border-border/60 hover:border-amber/50 transition-all flex flex-col overflow-hidden text-left group"
    >
      <div className="p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-sm bg-amber/10 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
            <Icon className="w-5 h-5 text-amber" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold font-forensic text-foreground truncate">{v.industry}</h2>
            <div className="font-mono text-crimson text-sm">{v.typicalLoss}</div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-amber shrink-0" />
      </div>
    </button>
  );
};

// -----------------------------
// Mind-map layout + rendering
// -----------------------------
type NodePos = { x: number; y: number; ring: number };

function computeMindMapLayout(n: number): NodePos[] {
  if (n === 0) return [];
  const rings = [
    { r: 18, cap: 6 },
    { r: 32, cap: 10 },
    { r: 44, cap: 14 },
    { r: 48, cap: 20 },
  ];
  const positions: NodePos[] = [];
  let placed = 0;
  for (let ringIdx = 0; ringIdx < rings.length && placed < n; ringIdx++) {
    const { r, cap } = rings[ringIdx];
    const remaining = n - placed;
    const count = Math.min(cap, remaining);
    const angleOffset = -Math.PI / 2 + (ringIdx % 2 === 0 ? 0 : Math.PI / count);
    for (let i = 0; i < count; i++) {
      const a = angleOffset + (i * 2 * Math.PI) / count;
      positions.push({
        x: 50 + r * Math.cos(a),
        y: 50 + r * Math.sin(a),
        ring: ringIdx,
      });
    }
    placed += count;
  }
  return positions;
}

const MindMapNode: React.FC<{
  v: IndustryLeak;
  pos: NodePos;
  index: number;
  onClick: () => void;
  isSelected: boolean;
  isDimmed: boolean;
  offset: { dx: number; dy: number };
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}> = ({ v, pos, index, onClick, isSelected, isDimmed, offset, isDragging, onPointerDown, onPointerMove, onPointerUp }) => {
  const Icon = v.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(calc(-50% + ${offset.dx}px), calc(-50% + ${offset.dy}px))`,
        animationDelay: `${index * 60}ms`,
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      className={`absolute group animate-fade-in transition-opacity duration-300 select-none p-3 sm:p-2 ${
        isDragging ? 'z-40' : 'z-10'
      } ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
    >
      <div
        className="relative flex flex-col items-center pointer-events-none"
        style={{
          animation: isSelected || isDragging
            ? undefined
            : `industry-float-${index % 4} ${9 + (index % 5)}s ease-in-out ${(index % 7) * -0.6}s infinite`,
          willChange: 'transform',
        }}
      >
        <span
          aria-hidden
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full border transition-colors ${
            isSelected ? 'border-amber' : 'border-amber/30 group-hover:border-amber/70'
          }`}
          style={{ animation: `mindmap-pulse 3.2s ease-out ${(index % 6) * 0.4}s infinite` }}
        />
        <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-background/95 border-2 flex items-center justify-center transition-all ${
          isDragging
            ? 'border-amber bg-amber/25 shadow-[0_0_50px_hsl(var(--amber)/0.75)] scale-110'
            : isSelected
            ? 'border-amber bg-amber/15 shadow-[0_0_40px_hsl(var(--amber)/0.55)]'
            : 'border-amber/40 group-hover:border-amber group-hover:bg-amber/10 shadow-[0_0_20px_hsl(var(--amber)/0.15)] group-hover:shadow-[0_0_30px_hsl(var(--amber)/0.4)]'
        }`}>
          <Icon className="w-7 h-7 md:w-8 md:h-8 text-amber" />
        </div>
        <div className="mt-2 text-center max-w-[130px]">
          <div className={`font-forensic text-xs md:text-sm font-bold leading-tight transition-colors ${
            isSelected ? 'text-amber' : 'text-foreground group-hover:text-amber'
          }`}>
            {v.industry}
          </div>
          <div className="font-mono text-[10px] md:text-xs text-crimson leading-tight mt-0.5">
            {v.typicalLoss}
          </div>
        </div>
      </div>
    </button>
  );
};

const MindMap: React.FC<{ industries: IndustryLeak[]; onOpenCaseFile: (v: IndustryLeak) => void }> = ({ industries, onOpenCaseFile }) => {
  const positions = useMemo(() => computeMindMapLayout(industries.length), [industries.length]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // ============ Chaos physics (shared hook) ============
  const stageRef = useRef<HTMLDivElement>(null);
  const [tuning, setTuning] = useState<ChaosTuning>(DEFAULT_TUNING);
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  const {
    offsets,
    draggingIdx,
    onNodePointerDown,
    onNodePointerMove,
    onNodePointerUp,
    wasDragged,
    clearDrag,
    resetAll,
    shake,
  } = useChaosPhysics(positions, tuningRef, stageRef);

  const handleNodeClick = (_i: number, slug: string) => {
    if (wasDragged()) { clearDrag(); return; }
    setSelectedSlug((s) => (s === slug ? null : slug));
  };

  const selectedIndex = selectedSlug ? industries.findIndex((v) => v.slug === selectedSlug) : -1;
  const selected = selectedIndex >= 0 ? industries[selectedIndex] : null;
  const selectedPos = selectedIndex >= 0 ? positions[selectedIndex] : null;

  const ringGroups = useMemo(() => {
    const groups: Record<number, number[]> = {};
    positions.forEach((p, i) => {
      (groups[p.ring] ||= []).push(i);
    });
    return groups;
  }, [positions]);

  const SelectedIcon = selected?.icon;

  return (
    <div ref={stageRef} className="relative w-full h-[560px] sm:h-[700px] md:h-[920px] lg:h-[1000px] overflow-hidden">
      <ChaosTuner
        tuning={tuning}
        onChange={(patch) => setTuning((t) => ({ ...t, ...patch }))}
        onReset={() => setTuning(DEFAULT_TUNING)}
        onResetPositions={resetAll}
        onShake={() => shake(800)}
      />

      <style>{`
        @keyframes industry-float-0 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(6px,-8px) rotate(0.6deg); } }
        @keyframes industry-float-1 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(-7px,-5px) rotate(-0.8deg); } }
        @keyframes industry-float-2 { 0%,100% { transform: translate(0,0) rotate(0deg); } 33% { transform: translate(5px,6px) rotate(0.5deg); } 66% { transform: translate(-4px,-6px) rotate(-0.4deg); } }
        @keyframes industry-float-3 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(-6px,7px) rotate(0.7deg); } }
      `}</style>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--crimson))" stopOpacity="0.35" />
            <stop offset="70%" stopColor="hsl(var(--crimson))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="spokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--crimson))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="18" fill="url(#hubGlow)" />

        {positions.map((p, i) => {
          const isActive = i === selectedIndex;
          const isDim = selectedIndex >= 0 && !isActive;
          return (
            <line
              key={`spoke-${i}`}
              x1="50"
              y1="50"
              x2={p.x}
              y2={p.y}
              stroke={isActive ? 'hsl(var(--amber))' : 'url(#spokeGrad)'}
              strokeOpacity={isDim ? 0.1 : isActive ? 0.95 : 1}
              strokeWidth={isActive ? 1.6 : 1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={isActive ? '0' : '4 6'}
              style={{ animation: isActive ? undefined : `mindmap-flow 6s linear ${(i % 8) * -0.5}s infinite` }}
            />
          );
        })}

        {Object.values(ringGroups).flatMap((idxs, gi) =>
          idxs.map((idx, k) => {
            if (idxs.length < 2) return null;
            const next = idxs[(k + 1) % idxs.length];
            const a = positions[idx];
            const b = positions[next];
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const dx = mx - 50;
            const dy = my - 50;
            const len = Math.max(0.001, Math.hypot(dx, dy));
            const bulge = 1.08;
            const cx = 50 + (dx / len) * len * bulge;
            const cy = 50 + (dy / len) * len * bulge;
            return (
              <path
                key={`arc-${gi}-${k}`}
                d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                fill="none"
                stroke="hsl(var(--amber))"
                strokeOpacity={selectedIndex >= 0 ? 0.06 : 0.18}
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 5"
              />
            );
          })
        )}
      </svg>

      {/* Center hub — hidden while a tile is open */}
      {!selected && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-crimson/40"
              style={{ animation: 'mindmap-pulse 2.6s ease-out infinite' }}
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-crimson/30"
              style={{ animation: 'mindmap-pulse 2.6s ease-out 1.3s infinite' }}
            />
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-background border-2 border-crimson flex flex-col items-center justify-center text-center px-3 shadow-[0_0_40px_hsl(var(--crimson)/0.4)]">
              <div className="font-case text-[10px] md:text-xs uppercase tracking-widest text-crimson">Every Business</div>
              <div className="font-forensic font-bold text-base md:text-xl leading-tight text-foreground mt-1">
                Revenue<br />Leaks
              </div>
              <div className="font-mono text-[10px] md:text-xs text-amber mt-1">The Leak Audit™</div>
            </div>
          </div>
        </div>
      )}

      {industries.map((v, i) => positions[i] && (
        <MindMapNode
          key={v.slug}
          v={v}
          pos={positions[i]}
          index={i}
          onClick={() => handleNodeClick(i, v.slug)}
          isSelected={selectedSlug === v.slug}
          isDimmed={selectedSlug !== null && selectedSlug !== v.slug}
          offset={offsets[i] ?? { dx: 0, dy: 0 }}
          isDragging={draggingIdx === i}
          onPointerDown={(e) => onNodePointerDown(i, e)}
          onPointerMove={(e) => onNodePointerMove(i, e)}
          onPointerUp={(e) => onNodePointerUp(i, e)}
        />
      ))}

      {selected && SelectedIcon && (
        <InfoTile
          selected={selected}
          Icon={SelectedIcon}
          onClose={() => setSelectedSlug(null)}
          onOpenCaseFile={onOpenCaseFile}
        />
      )}
    </div>
  );
};

// -----------------------------
// Interactive friction sub-map
// -----------------------------
const splitSentences = (s: string): string[] =>
  s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

const InfoTile: React.FC<{
  selected: IndustryLeak;
  Icon: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  onOpenCaseFile: (v: IndustryLeak) => void;
}> = ({ selected, Icon, onClose, onOpenCaseFile }) => {
  const [openFriction, setOpenFriction] = useState<number | null>(null);

  // Reset when industry changes
  useEffect(() => {
    setOpenFriction(null);
  }, [selected.slug]);

  const fixSentences = useMemo(() => splitSentences(selected.whatYouGetBack), [selected.whatYouGetBack]);
  const leakSentences = useMemo(() => splitSentences(selected.humanCost), [selected.humanCost]);

  const frictions = selected.whatWeMeasure.map((label, i) => {
    const detail = FRICTION_DETAILS[selected.slug]?.[i];
    return {
      label,
      why: detail?.why ?? leakSentences[i] ?? leakSentences[leakSentences.length - 1] ?? selected.primaryLeak,
      fixed: detail?.fixed ?? fixSentences[i] ?? fixSentences[fixSentences.length - 1] ?? selected.whatYouGetBack,
    };
  });

  const activeIsResolved = openFriction !== null;

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[94%] sm:w-[86%] md:w-[70%] max-w-2xl animate-scale-in">
      <div className="relative forensic-tile rounded-sm border-2 border-amber bg-background/95 backdrop-blur-md shadow-[0_0_60px_hsl(var(--amber)/0.3)] p-5 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded-sm border border-border/50 hover:border-amber/60 text-foreground/70 hover:text-amber flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex items-center gap-3 mb-3 pr-8">
          <div className="w-10 h-10 rounded-sm bg-amber/15 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-amber" />
          </div>
          <div className="min-w-0">
            <div className="font-forensic text-lg sm:text-xl font-bold text-foreground leading-tight truncate">{selected.industry}</div>
            <div className="font-mono text-crimson text-sm">{selected.typicalLoss}</div>
          </div>
        </div>

        <p className="text-sm sm:text-base text-foreground/85 italic mb-4">"{selected.primaryLeak}"</p>

        {/* Sub mind-map: connections from hub label to each friction node */}
        <div className="relative rounded-sm border border-border/40 bg-background/40 p-4 mb-4">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3 text-center">
            Where the chaos actually connects
          </div>

          <div className="relative">
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              {frictions.map((_, i) => {
                const total = frictions.length;
                const x = total === 1 ? 50 : (100 / (total + 1)) * (i + 1);
                const y = 78;
                const isOpen = openFriction === i;
                const dim = openFriction !== null && !isOpen;
                return (
                  <line
                    key={i}
                    x1="50"
                    y1="10"
                    x2={x}
                    y2={y}
                    stroke={isOpen ? 'hsl(var(--amber))' : 'hsl(var(--crimson))'}
                    strokeOpacity={dim ? 0.15 : isOpen ? 0.95 : 0.55}
                    strokeWidth={isOpen ? 1.4 : 0.9}
                    strokeDasharray={isOpen ? '0' : '3 4'}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            <div className="relative flex justify-center mb-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border font-case text-[10px] uppercase tracking-widest transition-colors ${
                activeIsResolved
                  ? 'border-amber/60 bg-amber/10 text-amber'
                  : 'border-crimson/50 bg-crimson/10 text-crimson'
              }`}>
                {activeIsResolved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {activeIsResolved ? 'Source closed' : 'Source of leak'}
              </div>
            </div>

            <div className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${frictions.length}, minmax(0, 1fr))` }}>
              {frictions.map((f, i) => {
                const isOpen = openFriction === i;
                const dim = openFriction !== null && !isOpen;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setOpenFriction((v) => (v === i ? null : i))}
                    aria-pressed={isOpen}
                    className={`relative rounded-sm border-2 px-2.5 py-2 text-left transition-all ${
                      isOpen
                        ? 'border-amber bg-amber/10 shadow-[0_0_18px_hsl(var(--amber)/0.35)]'
                        : 'border-crimson/40 bg-crimson/5 hover:border-crimson hover:bg-crimson/10'
                    } ${dim ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="flex items-start gap-1.5">
                      {isOpen ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-crimson shrink-0 mt-0.5" />
                      )}
                      <div className={`font-forensic text-[11px] sm:text-xs font-bold leading-tight ${
                        isOpen ? 'text-amber' : 'text-foreground'
                      }`}>
                        {f.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel for the selected friction */}
          {openFriction !== null && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 animate-fade-in">
              <div className="rounded-sm border border-crimson/40 bg-crimson/5 p-3">
                <div className="flex items-center gap-1.5 font-case text-[9px] uppercase tracking-widest text-crimson mb-1.5">
                  <AlertTriangle className="w-3 h-3" /> Why it bleeds
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-snug">{frictions[openFriction].why}</p>
              </div>
              <div className="rounded-sm border border-amber/40 bg-amber/5 p-3">
                <div className="flex items-center gap-1.5 font-case text-[9px] uppercase tracking-widest text-amber mb-1.5">
                  <CheckCircle2 className="w-3 h-3" /> If you close it off
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-snug">{frictions[openFriction].fixed}</p>
              </div>
            </div>
          )}

          {openFriction === null && (
            <p className="mt-3 text-center text-[10px] font-mono uppercase tracking-widest text-foreground/50">
              Tap a friction to see why it leaks &mdash; and what changes when it's closed.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/40">
          <button
            type="button"
            onClick={() => onOpenCaseFile(selected)}
            className="inline-flex items-center justify-center gap-2 bg-amber hover:bg-amber/90 text-background font-semibold px-4 py-2 rounded-sm transition-colors text-sm"
          >
            Open the case file <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-2 rounded-sm border border-border/60 hover:border-amber/40 transition-colors text-foreground text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


const IndustryModal: React.FC<{ industry: IndustryLeak | null; onClose: () => void }> = ({ industry, onClose }) => {
  const navigate = useNavigate();
  if (!industry) return null;
  const Icon = industry.icon;
  return (
    <Dialog open={!!industry} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 border border-amber/30 bg-background/95 max-h-[90vh] overflow-y-auto">
        <div className="relative overflow-hidden border-b border-amber/20">
          <img
            src={industry.image}
            alt={`${industry.industry} case-file infographic`}
            width={768}
            height={384}
            className="w-full aspect-[2/1] object-cover"
          />
          <span className="absolute bottom-2 right-2 font-case text-xs uppercase tracking-widest text-amber bg-background/80 px-2 py-1 rounded-sm border border-amber/20">
            Aetheris AI Studio
          </span>
        </div>
        <div className="p-6 sm:p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-bold font-forensic text-foreground">
              <div className="w-10 h-10 rounded-sm bg-amber/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-amber" />
              </div>
              <span className="truncate">{industry.industry}</span>
            </DialogTitle>
            <div className="font-mono text-crimson text-base sm:text-lg mt-1">{industry.typicalLoss}</div>
            <DialogDescription className="sr-only">{industry.industry} case file</DialogDescription>
          </DialogHeader>

          <p className="text-lg text-foreground/85 mb-4 italic">"{industry.primaryLeak}"</p>

          <div className="rounded-sm border border-crimson/30 bg-crimson/5 p-4 mb-4">
            <div className="font-case text-sm uppercase tracking-widest text-crimson mb-2">What this costs you personally</div>
            <p className="text-base text-foreground/90 leading-relaxed">{industry.humanCost}</p>
          </div>

          <div className="rounded-sm border border-amber/30 bg-amber/5 p-4 mb-6">
            <div className="font-case text-sm uppercase tracking-widest text-amber mb-2">How the Leak Audit fixes it</div>
            <p className="text-base text-foreground/90 leading-relaxed">{industry.whatYouGetBack}</p>
          </div>

          <div className="font-case text-sm uppercase tracking-widest text-amber mb-3">What we measure</div>
          <ul className="space-y-2 mb-6">
            {industry.whatWeMeasure.map((m) => (
              <li key={m} className="text-base text-foreground/90 flex gap-2">
                <span className="text-amber">›</span>{m}
              </li>
            ))}
          </ul>

          <div className="rounded-sm border border-amber/40 bg-amber/5 p-4 mb-6">
            <div className="flex items-center gap-1.5 font-case text-sm uppercase tracking-widest text-amber mb-2">
              <Star className="w-4 h-4 fill-amber" /> Most popular for this niche
            </div>
            <div className="font-bold text-lg text-foreground leading-snug mb-1">{industry.recommended.name}</div>
            <div className="font-mono text-amber text-base mb-2">{industry.recommended.price}</div>
            <p className="text-base text-foreground/80 leading-snug mb-3">{industry.recommended.why}</p>
            <button
              type="button"
              onClick={() => { onClose(); navigate(industry.recommended.link); }}
              className="inline-flex items-center gap-1 text-base font-semibold text-amber hover:underline"
            >
              View this package <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
            <a
              href={BOOK_MEETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 bg-amber hover:bg-amber/90 text-background font-semibold px-4 py-2 rounded-sm transition-colors"
            >
              Book an appointment <Calendar className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center px-4 py-2 rounded-sm border border-border/60 hover:border-amber/40 transition-colors text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const IndustriesPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryLeak | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDUSTRIES;
    return INDUSTRIES.filter((v) =>
      v.industry.toLowerCase().includes(q) ||
      v.primaryLeak.toLowerCase().includes(q) ||
      v.whatWeMeasure.some((m) => m.toLowerCase().includes(q)) ||
      v.slug.toLowerCase().includes(q)
    );
  }, [query]);

  const jsonLd = combineSchemas(
    serviceSchema(
      'The Leak Audit, by Industry',
      'Forensic Diagnostic ($2,500 flat) applied across 20+ industries including manufacturing, construction, logistics, healthcare, finance, legal, real estate, SaaS, and more. Fee applies 1:1 toward engagement.',
      { serviceType: 'Revenue Operations Diagnostic', areaServed: 'United States' }
    )
  );

  const faqs = [
    { question: 'What does the Leak Audit deliver per industry?', answer: 'Same deliverable shape across industries: leak map, dollar-quantified leaks, prioritized fixes, ROI projections, and a sealed report. The leak patterns differ by industry, that is what these vertical pages document.' },
    { question: 'How much is the Leak Audit?', answer: '$2,500 flat fee, operator-led. Applied 1:1 toward any engagement that follows.' },
    { question: 'What if my industry is not listed?', answer: 'The methodology travels. Type your niche in the search bar above, or book a 15-minute call and we will scope it.' },
    { question: 'How fast do you find the first leak?', answer: 'Free self-scan at /leak-audit runs in minutes. Operator-led Leak Audit surfaces first leaks inside Week 1.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="The Leak Audit by Industry | 20+ Verticals | Aetheris"
        description="Forensic Diagnostic by industry. $2,500 flat, applied to engagement. Manufacturing, construction, logistics, healthcare, finance, legal, real estate, SaaS, and more."
        path="/industries"
        keywords="revenue leak audit by industry, manufacturing diagnostic, construction bid leak, logistics quote response, healthcare intake leak, legal intake, real estate lead response, SaaS churn audit"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Industries', path: '/industries' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <section className="pt-32 pb-10 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-crimson/10 border border-crimson/30 text-crimson text-sm font-case uppercase tracking-widest mb-6">
              <Building2 className="w-4 h-4" />
              The Leak Audit · By Industry
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Every industry leaks <span className="text-crimson">differently</span>.<br className="hidden md:block" />
              Every owner <span className="text-amber">feels it the same way.</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/85 max-w-3xl mx-auto mb-4">
              Tap any industry to open the case file. Type your niche below if you don't see it &mdash; the methodology travels.
            </p>
            <p className="text-base md:text-lg text-amber max-w-3xl mx-auto mb-8 font-case uppercase tracking-widest">
              One offer fixes every industry on this page: <span className="text-foreground font-bold">The Leak Audit &mdash; $2,500 flat.</span>
            </p>

            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber/70 pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your industry or niche (e.g. dental, freight, studio)…"
                className="pl-9 h-12 bg-background/60 border-amber/30 focus-visible:ring-amber/50"
                aria-label="Search industries"
              />
              <div className="mt-2 font-case text-xs uppercase tracking-widest text-foreground/70">
                {filtered.length} of {INDUSTRIES.length} industries
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {filtered.length === 0 ? (
              <div className="forensic-tile rounded-sm p-10 border border-amber/30 text-center max-w-2xl mx-auto">
                <div className="font-case text-xs uppercase tracking-widest text-amber mb-3">No exact match</div>
                <h3 className="font-forensic text-2xl font-bold mb-3">
                  "{query}" isn't on the board yet. that doesn't mean it doesn't leak.
                </h3>
                <p className="text-foreground/80 text-lg mb-6">
                  Run the free self-scan or book a 15-minute scoping call. The methodology travels across verticals.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/leak-audit"><Button className="bg-crimson hover:bg-crimson/90">Run the free self-scan</Button></Link>
                  <Button variant="outline" onClick={() => setIsContactModalOpen(true)}>Book a scoping call</Button>
                </div>
              </div>
            ) : (
              <>
                {/* Mind-map view — all breakpoints */}
                <MindMap industries={filtered} onOpenCaseFile={(v) => setSelectedIndustry(v)} />
              </>

            )}
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center forensic-tile rounded-sm p-10 border border-amber/30">
            <div className="font-case text-xs uppercase tracking-widest text-amber mb-3">
              Industry not listed?
            </div>
            <h2 className="font-forensic text-3xl md:text-4xl font-bold mb-4">
              The methodology travels.
            </h2>
            <p className="text-foreground/85 text-lg mb-8">
              If revenue moves through systems and people, there are leaks. $2,500 flat. Applied 1:1 toward engagement.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/leak-audit">
                <Button size="lg" className="bg-crimson hover:bg-crimson/90 text-foreground font-semibold">
                  Open The Leak Audit <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/leak-audit">
                <Button size="lg" variant="outline">
                  Run the free self-scan
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
      <IndustryModal industry={selectedIndustry} onClose={() => setSelectedIndustry(null)} />
    </div>
  );
};

export default IndustriesPage;
