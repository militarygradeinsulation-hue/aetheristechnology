// $1M in 90 days — operator math + weekly playbook.
// All numbers are derived from the locked offer mix so reps/admins see
// exactly what has to happen each week. Edit the assumptions in ONE place.

export const MDP_GOAL_CENTS = 100_000_000; // $1,000,000
export const MDP_DAYS = 90;
export const MDP_WEEKS = 13;

// Offer mix — what we're actually selling
export const OFFERS = {
  diagnostic: { label: "Forensic Diagnostic", price: 18_000, repPayout: 5_000, partnerPayout: 3_000, companyNet: 10_000 },
  retainer:   { label: "Implementation Retainer (mo 1)", price: 15_000, repPayout: 4_000, partnerPayout: 3_000, companyNet: 8_000 },
  recurring:  { label: "Retainer recurring (mo 2+)",     price: 15_000, repPayout: 4_000, partnerPayout: 3_000, companyNet: 8_000 },
} as const;

// Funnel math — industry-honest, not optimistic
export const FUNNEL = {
  outboundToConvo: 0.05,      // 5% of cold outbound becomes a real conversation
  convoToMeeting: 0.30,       // 30% of conversations book a real meeting
  meetingToProposal: 0.50,    // 50% of meetings advance to proposal
  proposalToClose: 0.30,      // 30% of proposals close
};

export interface MdpScenario {
  diagnosticsToClose: number;
  retainersToClose: number;
  recurringMonths: number; // expected MRR months captured inside the 90 days
  grossRevenue: number;
  proposalsNeeded: number;
  meetingsNeeded: number;
  conversationsNeeded: number;
  outboundNeeded: number;
  outboundPerDay: number;     // across the team
  meetingsPerWeek: number;
}

// Default scenario: blend that hits $1M with realistic close volume
export function buildScenario(opts?: {
  diagnostics?: number;
  retainers?: number;
  recurringMonths?: number;
}): MdpScenario {
  const d = opts?.diagnostics ?? 30;          // 30 diagnostics  = $540k
  const r = opts?.retainers   ?? 18;          // 18 retainers mo1 = $270k
  const rm = opts?.recurringMonths ?? 14;     // 14 retainer-months recurring = $210k
  const gross = d * OFFERS.diagnostic.price + r * OFFERS.retainer.price + rm * OFFERS.recurring.price;
  const closesNeeded = d + r;
  const proposals = Math.ceil(closesNeeded / FUNNEL.proposalToClose);
  const meetings  = Math.ceil(proposals / FUNNEL.meetingToProposal);
  const convos    = Math.ceil(meetings / FUNNEL.convoToMeeting);
  const outbound  = Math.ceil(convos / FUNNEL.outboundToConvo);
  return {
    diagnosticsToClose: d,
    retainersToClose: r,
    recurringMonths: rm,
    grossRevenue: gross,
    proposalsNeeded: proposals,
    meetingsNeeded: meetings,
    conversationsNeeded: convos,
    outboundNeeded: outbound,
    outboundPerDay: Math.ceil(outbound / 65), // 5 working days × 13 weeks
    meetingsPerWeek: Math.ceil(meetings / MDP_WEEKS),
  };
}

export interface WeekPlan {
  week: number;
  phase: "Foundation" | "Acceleration" | "Compounding";
  theme: string;
  revenueTarget: number;        // cumulative cents target by end of week
  newMeetings: number;
  newCloses: number;
  hires: number;                // reps hired by end of this week
  focus: string[];              // 3-5 hard tasks, owner included
  exitCriteria: string;         // how you know the week succeeded
}

export function buildWeeks(): WeekPlan[] {
  // S-curve: slow ramp wk1-3, hockey stick wk4-9, compounding wk10-13
  // cumulative cents (approx, sums to ~$1M)
  const cum = [
    20_000_00,   // wk1
    55_000_00,
    100_000_00,
    175_000_00,
    260_000_00,
    360_000_00,
    470_000_00,
    580_000_00,
    690_000_00,
    790_000_00,
    875_000_00,
    945_000_00,
    1_005_000_00,
  ];
  return [
    { week: 1, phase: "Foundation", theme: "Build the machine, not the magic",
      revenueTarget: cum[0], newMeetings: 8, newCloses: 1, hires: 2,
      focus: [
        "Aaron: lock 50-prospect target list per vertical (3 verticals = 150)",
        "Brandon: finalize Stripe + commission split webhook end-to-end test",
        "Both: dial 25/day each, prove the script works before scaling reps",
        "Hire Rep #3 + Rep #4 — onboarding modules must be live Monday",
        "Ship one Leak Audit case study to use as social proof for week 2",
      ],
      exitCriteria: "≥1 paid Diagnostic OR 8 booked discovery calls on the calendar." },
    { week: 2, phase: "Foundation", theme: "Throughput over polish",
      revenueTarget: cum[1], newMeetings: 14, newCloses: 2, hires: 3,
      focus: [
        "Reps: 40 outbound/day floor (call + LinkedIn + email triple-tap)",
        "Aaron: run 2 daily standups (8am/4pm) — keep them under 10 min",
        "Brandon: shadow every rep proposal call, score on rubric",
        "Hire Rep #5 — fill the bench BEFORE you need it",
        "Publish 1 forensic case-file blog post (SEO compounding starts now)",
      ],
      exitCriteria: "$50k cumulative collected. If <$30k → triage script next Monday." },
    { week: 3, phase: "Foundation", theme: "Kill what's not working",
      revenueTarget: cum[2], newMeetings: 18, newCloses: 3, hires: 4,
      focus: [
        "Audit week 1-2 funnel: which verticals/scripts/reps actually closed?",
        "Cut the bottom 30% of leads. Double down on the top vertical.",
        "Brandon: write objection-handler v2 from real call recordings",
        "Aaron: 1:1 with every rep — set personal $90-day quota in writing",
        "Run first paid LinkedIn ad on best-performing case study ($500 test)",
      ],
      exitCriteria: "$100k cumulative. Funnel conversion rates documented per rep." },
    { week: 4, phase: "Acceleration", theme: "Hit the throttle",
      revenueTarget: cum[3], newMeetings: 22, newCloses: 4, hires: 5,
      focus: [
        "Outbound floor → 60/day per rep. No exceptions.",
        "Launch referral bonus inside portal ($500 onboard + $7k first close)",
        "Aaron: 5 partnership outreaches/week to fractional CFOs and agencies",
        "Hire Rep #6. Promote highest-performing rep to mentor new hires.",
        "Stand up the weekly 'closes wall' on portal home — public scoreboard",
      ],
      exitCriteria: "$175k cumulative. Pipeline value ≥ $400k of unworked proposals." },
    { week: 5, phase: "Acceleration", theme: "Convert the backlog",
      revenueTarget: cum[4], newMeetings: 26, newCloses: 5, hires: 6,
      focus: [
        "Every open proposal >7 days old gets a Brandon close-call",
        "Reps: 3 booked meetings/day floor (not week, day)",
        "Aaron: speak at 1 Indianapolis business event (cold or warm)",
        "Ship Diagnostic v2 deliverable template — same offer, sharper artifact",
        "Run paid retargeting on /leak-audit visitors ($1k/wk)",
      ],
      exitCriteria: "$260k cumulative. ≥10 paid Diagnostics in the bank." },
    { week: 6, phase: "Acceleration", theme: "Compounding referrals",
      revenueTarget: cum[5], newMeetings: 30, newCloses: 6, hires: 7,
      focus: [
        "Email every closed-Diagnostic client: 'who else needs this?' — direct ask",
        "Hire Rep #7. Begin recruiting Rep #8-#10 pipeline.",
        "Brandon: build retainer upsell script for every Diagnostic-only client",
        "Aaron: publish weekly KPI screenshot on LinkedIn (radical transparency)",
        "Tighten Stripe receipts + onboarding email automation",
      ],
      exitCriteria: "$360k cumulative. Retainer-to-Diagnostic upsell rate ≥40%." },
    { week: 7, phase: "Acceleration", theme: "Halfway — pressure test",
      revenueTarget: cum[6], newMeetings: 32, newCloses: 6, hires: 8,
      focus: [
        "Halfway audit: are we on pace? If <$420k → emergency offer-mix call.",
        "Reps: pipeline review live with Aaron — every deal aging or advancing",
        "Run a 48-hour 'Diagnostic week' campaign — small bonus for fast yes",
        "Hire Rep #8. 8-rep team is the bare minimum for $1M math.",
        "Brandon: codify the 'won deal' debrief — what made it close?",
      ],
      exitCriteria: "$470k cumulative. 8 reps producing, all clocking in daily." },
    { week: 8, phase: "Acceleration", theme: "Leverage the wins",
      revenueTarget: cum[7], newMeetings: 32, newCloses: 6, hires: 8,
      focus: [
        "Turn 3 best wins into 90-second video case studies (rep-narrated)",
        "Aaron: outreach to 10 podcasts in the operator/CFO space",
        "Reps: each must run 1 referral-only week — 0 cold outbound permitted",
        "Brandon: enforce CRM hygiene — no closed-won without full deal record",
        "Open the Implementation Retainer to existing Diagnostic backlog",
      ],
      exitCriteria: "$580k cumulative. Referrals ≥25% of week's new meetings." },
    { week: 9, phase: "Acceleration", theme: "Stack the calendar",
      revenueTarget: cum[8], newMeetings: 34, newCloses: 7, hires: 9,
      focus: [
        "Hire Rep #9. Goal: enter month 3 with 9-10 producing reps.",
        "Aaron: 2-day live workshop or webinar — cheap top-of-funnel lift",
        "Reps: Friday demo day — every rep presents one closed-won breakdown",
        "Brandon: launch 12-month commitment retainer with 5% discount",
        "Audit churn risk on every active retainer — kill the surprise cancel",
      ],
      exitCriteria: "$690k cumulative. Active MRR ≥$60k." },
    { week: 10, phase: "Compounding", theme: "Bigger deals, same headcount",
      revenueTarget: cum[9], newMeetings: 32, newCloses: 7, hires: 10,
      focus: [
        "Reps: target 1 enterprise-tier prospect each (>250 employees)",
        "Aaron: position multi-month Diagnostic packages ($45k bundle)",
        "Brandon: implementation playbook for partner-led delivery",
        "Hire Rep #10. Cap headcount here through end of 90 days.",
        "Public milestone: announce '$700k in 90 days' on LinkedIn — momentum begets momentum",
      ],
      exitCriteria: "$790k cumulative. ≥3 deals over $25k closed this week." },
    { week: 11, phase: "Compounding", theme: "Lock the recurring",
      revenueTarget: cum[10], newMeetings: 30, newCloses: 7, hires: 10,
      focus: [
        "Every Diagnostic client converted to retainer or scheduled for review",
        "Brandon: month-end billing audit — no leaked invoices, no failed cards",
        "Reps: write down their personal week-12-13 closing list (named accounts)",
        "Aaron: line up 10 Q1-next-year prospects — start 90-day machine again",
        "Publish '$1M in 90 days' progress dashboard publicly",
      ],
      exitCriteria: "$875k cumulative. MRR ≥$90k locked into month 4." },
    { week: 12, phase: "Compounding", theme: "Closing-week discipline",
      revenueTarget: cum[11], newMeetings: 28, newCloses: 8, hires: 10,
      focus: [
        "Brandon runs a daily 4pm close-call: every active proposal reviewed",
        "Aaron: personally call every undecided prospect — operator presence closes",
        "Reps: bonus tier kicks in at 3+ closes this week ($1k/$2.5k/$5k)",
        "Stop all new prospecting Wed-Fri — convert what's already in pipeline",
        "Prep next-quarter offer + price test — momentum into Q+1 matters",
      ],
      exitCriteria: "$945k cumulative. Burndown chart shows finish line by Friday." },
    { week: 13, phase: "Compounding", theme: "Cross the line + lock the next 90",
      revenueTarget: cum[12], newMeetings: 24, newCloses: 8, hires: 10,
      focus: [
        "Final closes — every aging proposal gets a yes/no answer by Wednesday",
        "Run the 90-day debrief: who closed, what worked, what scales next quarter",
        "Pay out commissions same-day on every Friday close — culture signal",
        "Aaron + Brandon: publish the case study of the $1M sprint",
        "Set next 90-day goal — $1.5M with same headcount, better conversion",
      ],
      exitCriteria: "$1,000,000+ collected. Plan the next 90 with 2026 in mind." },
  ];
}
