import type { RepCodeRow } from "./repCodes";
import type { HirePlaybookEntry } from "./hireTeams";

export type LifecycleStage =
  | "pre_start"      // hired, day 0
  | "day_one"        // day 1-2
  | "first_week"     // day 3-7
  | "first_month"    // day 8-30
  | "ramp"           // day 31-90
  | "growth"         // day 91-180
  | "veteran";       // 180+

export interface LifecycleStep {
  id: string;
  label: string;
  detail: string;
  owner: "Aaron" | "Brandon" | "Either";
  done?: boolean;
  scriptKey?: HirePlaybookEntry["section"];
}

export interface RepLifecycle {
  rep: RepCodeRow;
  daysSinceHire: number;
  stage: LifecycleStage;
  stageLabel: string;
  progressPct: number; // 0-100 within current stage band
  nextSteps: LifecycleStep[];
  health: "green" | "yellow" | "red";
  healthReason: string;
}

const STAGE_BANDS: { stage: LifecycleStage; label: string; min: number; max: number }[] = [
  { stage: "pre_start",   label: "Pre-Start (Day 0)",        min: -999, max: 0 },
  { stage: "day_one",     label: "Day 1–2 · First Touch",    min: 1,    max: 2 },
  { stage: "first_week",  label: "Day 3–7 · First Week",     min: 3,    max: 7 },
  { stage: "first_month", label: "Day 8–30 · First Month",   min: 8,    max: 30 },
  { stage: "ramp",        label: "Day 31–90 · Ramp",         min: 31,   max: 90 },
  { stage: "growth",      label: "Day 91–180 · Growth",      min: 91,   max: 180 },
  { stage: "veteran",     label: "180+ · Veteran",           min: 181,  max: 99999 },
];

export function getStage(days: number): { stage: LifecycleStage; label: string; pct: number } {
  const band = STAGE_BANDS.find(b => days >= b.min && days <= b.max) || STAGE_BANDS[STAGE_BANDS.length - 1];
  const span = Math.max(1, band.max - band.min);
  const pct = Math.min(100, Math.max(0, Math.round(((days - band.min) / span) * 100)));
  return { stage: band.stage, label: band.label, pct };
}

function stepsFor(stage: LifecycleStage, rep: RepCodeRow): LifecycleStep[] {
  const name = rep.rep_name.split(" ")[0] || "rep";
  switch (stage) {
    case "pre_start":
      return [
        { id: "ps1", label: "Send welcome text + portal link", owner: "Aaron",
          detail: `Text ${name}: "Welcome aboard. Your portal is live — log in tonight, watch the 5-min Welcome video, and reply when you're done. Tomorrow we hit the ground running."`,
          scriptKey: "day_one" },
        { id: "ps2", label: "Add to shared calendar + Team thread", owner: "Either",
          detail: "Mirror cadence events to their Cal. Drop them into the team Slack/SMS thread with a one-line intro.", },
        { id: "ps3", label: "Confirm hardware + payment info", owner: "Brandon",
          detail: "Phone, laptop, Stripe payout details, W-9 on file." },
      ];
    case "day_one":
      return [
        { id: "d1", label: "30-min kickoff call (live)", owner: "Aaron",
          detail: "Walk the portal screen-by-screen. Have them open the Leak Audit, run one demo themselves while you watch.", scriptKey: "day_one" },
        { id: "d2", label: "Assign Module 1 + 2 of New-Rep Onboarding", owner: "Either",
          detail: "Open Hires → Training Studio tab. Generate or assign the first two modules. Goal: complete by end of Day 2." },
        { id: "d3", label: "First outbound dial together", owner: "Brandon",
          detail: "Dial 5 leads side-by-side. They listen to 2, run 3 with you on mute." },
      ];
    case "first_week":
      return [
        { id: "w1", label: "Daily 10-min standup (Mon–Fri)", owner: "Aaron",
          detail: "Numbers from yesterday, blockers, one win. Hard cap 10 minutes.", scriptKey: "week_one" },
        { id: "w2", label: "Complete onboarding modules 1–5", owner: "Either",
          detail: "Track completion in Training Studio. Gate Week-2 portal features behind it." },
        { id: "w3", label: "First booked meeting target", owner: "Brandon",
          detail: "Goal: 1 qualified meeting booked by Friday. Pair them for the close." },
        { id: "w4", label: "Friday debrief — keep/change/start", owner: "Either",
          detail: "What's working, what's broken, what they need from us next week.", scriptKey: "week_one" },
      ];
    case "first_month":
      return [
        { id: "m1", label: "Weekly 1:1 (30 min, same day each week)", owner: "Aaron",
          detail: "Pipeline review + one growth area. Lock the recurring slot in Cal." },
        { id: "m2", label: "First closed deal coaching", owner: "Brandon",
          detail: "Ride along on every proposal call until first close. Then ride along on every other." },
        { id: "m3", label: "Complete full onboarding curriculum", owner: "Either",
          detail: "All modules done + 80%+ on training quizzes. Open Training tab to verify." },
        { id: "m4", label: "Watch for red flags", owner: "Either",
          detail: "Missed standups, no outbound activity 2 days in a row, defensive on coaching. See playbook → Red flags.",
          scriptKey: "red_flags" },
      ];
    case "ramp":
      return [
        { id: "r1", label: "Move to bi-weekly 1:1, weekly pipeline", owner: "Aaron",
          detail: "They own the agenda now. You ask the questions, they bring the answers." },
        { id: "r2", label: "Set Q-quota + commission tier check", owner: "Brandon",
          detail: "Confirm they understand the 50/30/20 → 60/25/15 ladder and what triggers a tier bump." },
        { id: "r3", label: "Hand them one full account end-to-end", owner: "Either",
          detail: "No co-pilot. You review the recording after." },
      ];
    case "growth":
      return [
        { id: "g1", label: "Identify one strength to amplify", owner: "Aaron",
          detail: "Cold open? Discovery? Closes? Pick one and have them teach it on a team call." },
        { id: "g2", label: "Stretch goal: mentor a Team-2 rep", owner: "Brandon",
          detail: "Pair them with a new hire for shadowing. Leadership-track signal." },
        { id: "g3", label: "Quarterly business review (rep-led)", owner: "Either",
          detail: "They walk us through their book, their pipeline, and their ask." },
      ];
    case "veteran":
      return [
        { id: "v1", label: "Monthly 1:1 (60 min)", owner: "Aaron",
          detail: "Career trajectory, comp, what's next. Don't let veterans coast unmanaged." },
        { id: "v2", label: "Reactivation script for any dip", owner: "Either",
          detail: "If KPIs drop 2 weeks in a row, run the reactivation conversation. Don't wait a month.",
          scriptKey: "reactivation" },
        { id: "v3", label: "Equity / leadership conversation", owner: "Brandon",
          detail: "Year-1 anniversary: title, comp, ownership path." },
      ];
  }
}

function healthFor(rep: RepCodeRow, days: number): { health: "green" | "yellow" | "red"; reason: string } {
  if (!rep.is_active) return { health: "red", reason: "Account inactive" };
  if (days <= 7) return { health: "green", reason: "New hire — too early to judge" };
  const sales = rep.total_sales_cents || 0;
  if (days >= 30 && sales === 0) return { health: "red", reason: "30+ days, $0 in sales — intervene now" };
  if (days >= 14 && sales === 0) return { health: "yellow", reason: "2 weeks, no closes yet — watch closely" };
  if (sales > 0) return { health: "green", reason: `Producing — $${(sales / 100).toLocaleString()} closed` };
  return { health: "yellow", reason: "No clear signal yet" };
}

export function buildLifecycle(rep: RepCodeRow): RepLifecycle {
  const hired = new Date(rep.created_at);
  const days = Math.floor((Date.now() - hired.getTime()) / 86400000);
  const { stage, label, pct } = getStage(days);
  const { health, reason } = healthFor(rep, days);
  return {
    rep,
    daysSinceHire: days,
    stage,
    stageLabel: label,
    progressPct: pct,
    nextSteps: stepsFor(stage, rep),
    health,
    healthReason: reason,
  };
}
