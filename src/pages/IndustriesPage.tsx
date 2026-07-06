import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Heart, Banknote, Truck, HardHat, Factory, Code2, Star, Search, ChevronRight, Scale, Home, GraduationCap, ShoppingBag, Hotel, Wrench, Plane, Megaphone, Stethoscope, Sparkles, Cpu, Leaf, Beaker, Hammer, Briefcase, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { combineSchemas, serviceSchema } from '@/lib/schemas';
import { INFOGRAPHICS } from '@/lib/infographics';

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
}> = ({ v, pos, index, onClick, isSelected, isDimmed }) => {
  const Icon = v.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        animationDelay: `${index * 60}ms`,
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 group animate-fade-in z-10 transition-opacity duration-300 ${
        isDimmed ? 'opacity-25' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        <span
          aria-hidden
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full border transition-colors ${
            isSelected ? 'border-amber' : 'border-amber/30 group-hover:border-amber/70'
          }`}
          style={{ animation: `mindmap-pulse 3.2s ease-out ${(index % 6) * 0.4}s infinite` }}
        />
        <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-background/95 border-2 flex items-center justify-center transition-all ${
          isSelected
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
    <div className="relative w-full h-[560px] sm:h-[700px] md:h-[920px] lg:h-[1000px]">
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
          onClick={() => setSelectedSlug((s) => (s === v.slug ? null : v.slug))}
          isSelected={selectedSlug === v.slug}
          isDimmed={selectedSlug !== null && selectedSlug !== v.slug}
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

  const frictions = selected.whatWeMeasure.map((label, i) => ({
    label,
    why: leakSentences[i] ?? leakSentences[leakSentences.length - 1] ?? selected.primaryLeak,
    fixed: fixSentences[i] ?? fixSentences[fixSentences.length - 1] ?? selected.whatYouGetBack,
  }));

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
            <Link
              to={`/ai-for-${industry.slug}`}
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 bg-amber hover:bg-amber/90 text-background font-semibold px-4 py-2 rounded-sm transition-colors"
            >
              View the full playbook <ArrowRight className="w-4 h-4" />
            </Link>
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
