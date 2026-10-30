/**
 * Aetheris Business X-Ray — deterministic assessment engine.
 *
 * Pure functions only: same answers + same assumptions ⇒ identical output.
 * No Date, no randomness, no network, no browser APIs.
 *
 * METHOD (see README "Calculation method"):
 *  1. Hidden conditional answers are pruned.
 *  2. Each labour component converts self-reported weekly friction hours into annual hours:
 *       approvals  = items/wk × minutes-per-item(wait) ÷ 60
 *       handoffs   = people × minutes-per-person(chasing) × factor(handoffs/job) ÷ 60
 *       repetitive = reported hours/wk
 *       rework     = reported hours/wk (only asked when mistakes are weekly or daily)
 *     annual hours = weekly hours × weeksPerYear
 *  3. Overlap guard: total labour hours are capped at capacityCapPct of total team hours.
 *     If exceeded, every labour component is scaled down by the same factor. Nothing is counted twice.
 *  4. Possible opportunity (low/base/high) = annual hours × hourly cost × recovery %.
 *  5. Enquiry component (only if a sale value was given):
 *       enquiries/yr × uplift% × speed factor × sale value × gross margin %
 *  6. Totals are the sum of distinct components. Tool sprawl is scored but NOT priced,
 *     because its cost already appears as repetitive entry time.
 *
 * Every figure is ESTIMATED from SELF_REPORTED inputs. Nothing here is VERIFIED.
 */
import type {
  Answers,
  Assessment,
  ComponentId,
  Confidence,
  Dimension,
  DimensionScore,
  EvidenceItem,
  Finding,
  OpportunityComponent,
  PlanWeek,
  QuestionId,
  Range,
  ScoreBand,
  ScoreSignal,
} from "./types";
import { sanitizeAssumptions, type Assumptions } from "./assumptions";
import { answerLabel, pruneHidden, QUESTION_BY_ID } from "./questions";
import { parseNumber } from "./parse";

export const ENGINE_VERSION = "1.0.0";

// ── helpers ────────────────────────────────────────────────

const round = (v: number) => Math.round(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function selfReported(answers: Answers, id: QuestionId): EvidenceItem {
  return {
    kind: "SELF_REPORTED",
    label: QUESTION_BY_ID[id].prompt,
    value: answerLabel(id, answers[id]),
    questionId: id,
  };
}

function estimated(label: string, value: string): EvidenceItem {
  return { kind: "ESTIMATED", label, value };
}

function laborRange(hoursPerYear: number, a: Assumptions): Range {
  const v = (pct: number) => round((hoursPerYear * a.hourlyCost * pct) / 100);
  return { low: v(a.recoveryLow), base: v(a.recoveryBase), high: v(a.recoveryHigh) };
}

function sumRanges(ranges: Range[]): Range {
  return ranges.reduce(
    (acc, r) => ({ low: acc.low + r.low, base: acc.base + r.base, high: acc.high + r.high }),
    { low: 0, base: 0, high: 0 },
  );
}

function approvalMinutes(wait: string | undefined, a: Assumptions): number | null {
  switch (wait) {
    case "same_day": return a.approvalMinSameDay;
    case "1_2_days": return a.approvalMin1to2Days;
    case "3_5_days": return a.approvalMin3to5Days;
    case "over_week": return a.approvalMinOverWeek;
    default: return null;
  }
}

function handoffMinutes(chasing: string | undefined, a: Assumptions): number | null {
  switch (chasing) {
    case "1": return a.handoffMin1;
    case "2": return a.handoffMin2;
    case "3": return a.handoffMin3;
    case "4": return a.handoffMin4;
    case "5": return a.handoffMin5;
    default: return null;
  }
}

function handoffFactor(handoffs: string | undefined, a: Assumptions): number | null {
  switch (handoffs) {
    case "0_1": return a.handoffFactor0to1;
    case "2_3": return a.handoffFactor2to3;
    case "4_6": return a.handoffFactor4to6;
    case "7_plus": return a.handoffFactor7plus;
    default: return null;
  }
}

function followFactor(speed: string | undefined, a: Assumptions): number | null {
  switch (speed) {
    case "under_1h": return a.followFactorUnder1h;
    case "same_day": return a.followFactorSameDay;
    case "1_3_days": return a.followFactor1to3Days;
    case "longer": return a.followFactorLonger;
    default: return null;
  }
}

// ── 1. opportunity components ──────────────────────────────

interface RawLabor {
  id: ComponentId;
  label: string;
  dimension: Dimension;
  weeklyHours: number | null; // null = insufficient
  notApplicable: boolean;
  formula: string;
  inputs: EvidenceItem[];
  note: string;
}

function rawLaborComponents(ans: Answers, a: Assumptions): RawLabor[] {
  const team = parseNumber(ans.teamSize);
  const approvals = parseNumber(ans.approvalsPerWeek);
  const repetitive = parseNumber(ans.repetitiveHours);
  const rework = parseNumber(ans.reworkHours);

  // Approvals
  const apMin = approvalMinutes(ans.approvalWait, a);
  const approvalsComp: RawLabor = {
    id: "approvals",
    label: "Approval chasing",
    dimension: "people",
    weeklyHours: approvals === null ? null : approvals === 0 ? 0 : apMin === null ? null : (approvals * apMin) / 60,
    notApplicable: approvals === 0,
    formula: "items per week × chasing minutes per item ÷ 60 × working weeks",
    inputs: [selfReported(ans, "approvalsPerWeek"), ...(approvals ? [selfReported(ans, "approvalWait")] : [])],
    note:
      approvals === 0
        ? "You reported no routine approvals."
        : "Counts only staff time spent chasing approvals — not the cost of the delay itself, which needs real data.",
  };

  // Handoffs
  const hMin = handoffMinutes(ans.handoffChasing, a);
  const hFac = handoffFactor(ans.handoffsPerJob, a);
  const handoffWeekly = team === null || hMin === null || hFac === null ? null : (team * hMin * hFac) / 60;
  const handoffsComp: RawLabor = {
    id: "handoffs",
    label: "Handoff chasing",
    dimension: "people",
    weeklyHours: handoffWeekly,
    notApplicable: handoffWeekly === 0,
    formula: "people × chasing minutes per person per week × handoff factor ÷ 60 × working weeks",
    inputs: [selfReported(ans, "teamSize"), selfReported(ans, "handoffChasing"), selfReported(ans, "handoffsPerJob")],
    note: handoffWeekly === 0 ? "You reported work rarely needs chasing." : "Minutes per person are an assumption — log real chase time to verify.",
  };

  // Repetitive entry
  const repetitiveComp: RawLabor = {
    id: "repetitive",
    label: "Repetitive data entry",
    dimension: "systems",
    weeklyHours: repetitive,
    notApplicable: repetitive === 0,
    formula: "reported hours per week × working weeks",
    inputs: [selfReported(ans, "repetitiveHours")],
    note: repetitive === 0 ? "You reported no re-typing time." : "Uses your own hours figure directly.",
  };

  // Rework
  const reworkAsked = ans.reworkFrequency === "weekly" || ans.reworkFrequency === "daily";
  const reworkComp: RawLabor = {
    id: "rework",
    label: "Error rework",
    dimension: "process",
    weeklyHours: ans.reworkFrequency === undefined ? null : reworkAsked ? rework : 0,
    notApplicable: ans.reworkFrequency !== undefined && (!reworkAsked || rework === 0),
    formula: "reported rework hours per week × working weeks",
    inputs: [selfReported(ans, "reworkFrequency"), ...(reworkAsked ? [selfReported(ans, "reworkHours")] : [])],
    note: reworkAsked
      ? "Excludes refunds and lost customers, which need records to estimate."
      : "Mistakes reported as occasional — not priced to stay conservative.",
  };

  return [approvalsComp, handoffsComp, repetitiveComp, reworkComp];
}

function leadComponent(ans: Answers, a: Assumptions): OpportunityComponent {
  const leads = parseNumber(ans.leadsPerMonth);
  const value = parseNumber(ans.avgDealValue);
  const factor = followFactor(ans.followUpSpeed, a);
  const base: Omit<OpportunityComponent, "status" | "range" | "note"> = {
    id: "leads",
    label: "Enquiry follow-up",
    dimension: "process",
    hoursPerYear: null,
    formula: "enquiries per year × extra conversion % × speed factor × sale value × gross margin %",
    inputs:
      leads && leads > 0
        ? [selfReported(ans, "leadsPerMonth"), selfReported(ans, "followUpSpeed"), selfReported(ans, "avgDealValue")]
        : [selfReported(ans, "leadsPerMonth")],
  };

  if (leads === null) return { ...base, status: "insufficient", range: null, note: "Enquiry volume not provided." };
  if (leads === 0) return { ...base, status: "not_applicable", range: null, note: "You reported no new enquiries." };
  if (factor === null) return { ...base, status: "insufficient", range: null, note: "Follow-up speed not provided." };
  if (factor === 0)
    return { ...base, status: "not_applicable", range: null, note: "You already reply within an hour — no uplift assumed." };
  if (value === null)
    return {
      ...base,
      status: "insufficient",
      range: null,
      note: "Insufficient information: no typical sale value, so no enquiry figure is shown.",
    };

  const perYear = leads * 12;
  const v = (pct: number) => round(((perYear * pct) / 100) * factor * value * (a.grossMarginPct / 100));
  return {
    ...base,
    status: "estimated",
    range: { low: v(a.leadUpliftLow), base: v(a.leadUpliftBase), high: v(a.leadUpliftHigh) },
    note: "Gross profit, not revenue. Assumes faster replies win a small share of enquiries currently lost — verify with your own win/loss data.",
  };
}

export function computeComponents(
  ans: Answers,
  a: Assumptions,
): { components: OpportunityComponent[]; laborHoursPerYear: number; capApplied: boolean; capHoursPerYear: number | null } {
  const raw = rawLaborComponents(ans, a);
  const team = parseNumber(ans.teamSize);
  const capHoursPerYear =
    team !== null && team > 0 ? team * a.hoursPerPersonWeek * a.weeksPerYear * (a.capacityCapPct / 100) : null;

  const totalUncapped = raw.reduce((s, c) => s + (c.weeklyHours ?? 0) * a.weeksPerYear, 0);
  const scale = capHoursPerYear !== null && totalUncapped > capHoursPerYear ? capHoursPerYear / totalUncapped : 1;
  const capApplied = scale < 1;

  const labor: OpportunityComponent[] = raw.map((c) => {
    if (c.weeklyHours === null) {
      return { id: c.id, label: c.label, dimension: c.dimension, status: "insufficient", hoursPerYear: null, range: null, formula: c.formula, inputs: c.inputs, note: "Insufficient information to estimate." };
    }
    if (c.notApplicable || c.weeklyHours === 0) {
      return { id: c.id, label: c.label, dimension: c.dimension, status: "not_applicable", hoursPerYear: 0, range: null, formula: c.formula, inputs: c.inputs, note: c.note };
    }
    const hours = round(c.weeklyHours * a.weeksPerYear * scale);
    return {
      id: c.id,
      label: c.label,
      dimension: c.dimension,
      status: "estimated",
      hoursPerYear: hours,
      range: laborRange(hours, a),
      formula: c.formula,
      inputs: [...c.inputs, estimated("Annual friction hours counted", `${hours.toLocaleString("en-US")} hrs${capApplied ? " (after overlap cap)" : ""}`)],
      note: c.note,
    };
  });

  const laborHoursPerYear = labor.reduce((s, c) => s + (c.hoursPerYear ?? 0), 0);
  return { components: [...labor, leadComponent(ans, a)], laborHoursPerYear, capApplied, capHoursPerYear: capHoursPerYear === null ? null : round(capHoursPerYear) };
}

// ── 2. friction scores ─────────────────────────────────────

const MAPS: Partial<Record<QuestionId, Record<string, number>>> = {
  handoffChasing: { "1": 0, "2": 25, "3": 50, "4": 75, "5": 100 },
  handoffsPerJob: { "0_1": 0, "2_3": 35, "4_6": 70, "7_plus": 100 },
  approvalWait: { same_day: 10, "1_2_days": 40, "3_5_days": 75, over_week: 100 },
  followUpSpeed: { under_1h: 0, same_day: 30, "1_3_days": 65, longer: 100 },
  leadTracking: { crm: 10, spreadsheet: 40, inbox: 75, nothing: 100 },
  reworkFrequency: { rarely: 0, monthly: 30, weekly: 70, daily: 100 },
  toolCount: { "1_3": 10, "4_6": 35, "7_10": 65, "11_plus": 90 },
  toolsConnected: { mostly: 10, some: 45, rarely: 85 },
};

function mapSignal(ans: Answers, id: QuestionId, label: string): ScoreSignal | null {
  const v = ans[id];
  const score = v !== undefined ? MAPS[id]?.[v] : undefined;
  if (score === undefined) return null;
  return { label, answer: answerLabel(id, v), score, questionId: id };
}

export function bandFor(score: number | null): ScoreBand {
  if (score === null) return "insufficient";
  if (score < 34) return "low";
  if (score < 67) return "moderate";
  return "high";
}

export function computeScores(ans: Answers): DimensionScore[] {
  const team = parseNumber(ans.teamSize);
  const approvals = parseNumber(ans.approvalsPerWeek);
  const repetitive = parseNumber(ans.repetitiveHours);

  const people: (ScoreSignal | null)[] = [
    mapSignal(ans, "handoffChasing", "Chasing work between people"),
    mapSignal(ans, "handoffsPerJob", "Handoffs per job"),
    approvals === 0
      ? { label: "Approval wait", answer: "No routine approvals", score: 0, questionId: "approvalsPerWeek" }
      : mapSignal(ans, "approvalWait", "Approval wait"),
  ];
  const process: (ScoreSignal | null)[] = [
    mapSignal(ans, "followUpSpeed", "Enquiry reply speed"),
    mapSignal(ans, "leadTracking", "Enquiry tracking"),
    mapSignal(ans, "reworkFrequency", "Mistakes causing rework"),
  ];
  const perPerson = team && team > 0 && repetitive !== null ? repetitive / team : null;
  const systems: (ScoreSignal | null)[] = [
    mapSignal(ans, "toolCount", "Number of tools"),
    mapSignal(ans, "toolsConnected", "Tools sharing data"),
    perPerson === null
      ? null
      : {
          label: "Re-typing per person",
          answer: `${perPerson.toFixed(1)} hrs / person / week`,
          score: round(clamp((perPerson / 4) * 100, 0, 100)),
          questionId: "repetitiveHours",
        },
  ];

  const build = (dimension: Dimension, list: (ScoreSignal | null)[]): DimensionScore => {
    const signals = list.filter((s): s is ScoreSignal => s !== null);
    const score = signals.length ? round(signals.reduce((s, x) => s + x.score, 0) / signals.length) : null;
    return { dimension, score, band: bandFor(score), signals, limited: signals.length < 2 };
  };

  return [build("people", people), build("process", process), build("systems", systems)];
}

// ── 3. findings ────────────────────────────────────────────

interface Candidate extends Omit<Finding, "rank"> {
  order: number;
  concern: string[];
}

function componentById(components: OpportunityComponent[], id: ComponentId) {
  return components.find((c) => c.id === id)!;
}

function candidateFromComponent(
  c: OpportunityComponent,
  severity: number,
  extra: Omit<Candidate, "estimate" | "estimateStatus" | "estimateNote" | "severity" | "dimension" | "evidence"> & { evidence?: EvidenceItem[] },
): Candidate {
  return {
    ...extra,
    dimension: c.dimension,
    severity,
    evidence: extra.evidence ?? c.inputs,
    estimate: c.status === "estimated" ? c.range : null,
    estimateStatus: c.status === "estimated" ? "estimated" : "insufficient",
    estimateNote: c.note,
  };
}

export function computeFindings(ans: Answers, components: OpportunityComponent[], scores: DimensionScore[]): Finding[] {
  const sig = (dim: Dimension, q: QuestionId) => scores.find((s) => s.dimension === dim)?.signals.find((x) => x.questionId === q)?.score ?? 0;
  const out: Candidate[] = [];
  const approvals = parseNumber(ans.approvalsPerWeek) ?? 0;
  const leads = parseNumber(ans.leadsPerMonth) ?? 0;
  const repetitive = parseNumber(ans.repetitiveHours) ?? 0;

  if (approvals > 0 && ans.approvalWait && ans.approvalWait !== "same_day") {
    out.push(
      candidateFromComponent(componentById(components, "approvals"), sig("people", "approvalWait"), {
        id: "approvals",
        order: 1,
        concern: ["approvals"],
        title: "Work is queuing for sign-off",
        summary: `About ${approvals.toLocaleString("en-US")} items a week wait ${answerLabel("approvalWait", ans.approvalWait).toLowerCase()} for approval. Each wait creates chasing, re-reading and idle work.`,
        verifyData: [
          "For 2 weeks, log each item awaiting approval: date submitted, date approved, approver.",
          "Count follow-up messages needed per approval.",
          "List which approval types are routinely approved without change.",
        ],
        firstAction: "Pick the most common approval type and write a value threshold below which no sign-off is needed. Trial it for two weeks.",
      }),
    );
  }

  const chasing = Number(ans.handoffChasing ?? 0);
  if (chasing >= 3) {
    out.push(
      candidateFromComponent(componentById(components, "handoffs"), round((sig("people", "handoffChasing") + sig("people", "handoffsPerJob")) / 2), {
        id: "handoffs",
        order: 2,
        concern: ["handoffs"],
        title: "Work is getting lost between people",
        summary: `Jobs change hands ${answerLabel("handoffsPerJob", ans.handoffsPerJob)} times and you say chasing happens ${answerLabel("handoffChasing", ans.handoffChasing).toLowerCase()}.`,
        verifyData: [
          "Trace 5 recent jobs end-to-end: who touched each one, and where it waited.",
          "Ask each person to tally 'chase' messages they send or receive for one week.",
        ],
        firstAction: "Agree a single written 'definition of done' for each handoff point, so the next person knows exactly what they're receiving.",
      }),
    );
  }

  if (leads > 0 && ans.followUpSpeed && ans.followUpSpeed !== "under_1h") {
    const sev = round((sig("process", "followUpSpeed") * 2 + sig("process", "leadTracking")) / 3);
    out.push(
      candidateFromComponent(componentById(components, "leads"), sev, {
        id: "leads",
        order: 3,
        concern: ["leads"],
        title: "Enquiries wait too long for a reply",
        summary: `${leads.toLocaleString("en-US")} enquiries a month typically get a reply ${answerLabel("followUpSpeed", ans.followUpSpeed).toLowerCase()}, tracked in: ${answerLabel("leadTracking", ans.leadTracking).toLowerCase()}.`,
        verifyData: [
          "Export the last 3 months of enquiries with received time, first-reply time and outcome (won / lost / no reply).",
          "Compare win rate for enquiries answered same day vs. later.",
        ],
        firstAction: "Name one owner for new enquiries and set a same-day reply rule with a simple holding message template.",
      }),
    );
  }

  if (repetitive > 0) {
    const rep = componentById(components, "repetitive");
    out.push(
      candidateFromComponent(rep, Math.max(25, sig("systems", "repetitiveHours")), {
        id: "repetitive",
        order: 4,
        concern: ["admin"],
        title: "The same information is typed more than once",
        summary: `Your team spends about ${repetitive.toLocaleString("en-US")} hours a week re-typing or copying information between places.`,
        verifyData: [
          "For one week, note each time data is re-keyed: from where, to where, and minutes taken.",
          "List the top 3 documents or fields that get re-typed most.",
        ],
        firstAction: "Choose the single most-repeated copy job and check whether a tool you already pay for can do it (import, template, or built-in link) before buying anything new.",
      }),
    );
  }

  const rework = componentById(components, "rework");
  if (ans.reworkFrequency === "weekly" || ans.reworkFrequency === "daily" || ans.reworkFrequency === "monthly") {
    out.push(
      candidateFromComponent(rework, sig("process", "reworkFrequency"), {
        id: "rework",
        order: 5,
        concern: ["errors"],
        title: "Mistakes are creating rework",
        summary: `Mistakes cause redoing, re-sending or refunds ${answerLabel("reworkFrequency", ans.reworkFrequency).toLowerCase()}.`,
        verifyData: [
          "Keep a simple error log for 2 weeks: what went wrong, where it started, time to fix.",
          "Pull refunds and credit notes for the last quarter.",
        ],
        firstAction: "Add a short checklist at the step where most errors start, and review the error log weekly.",
      }),
    );
  }

  const toolSev = round((sig("systems", "toolCount") + sig("systems", "toolsConnected")) / 2);
  if (ans.toolsConnected === "some" || ans.toolsConnected === "rarely" || ans.toolCount === "7_10" || ans.toolCount === "11_plus") {
    out.push({
      id: "tools",
      order: 6,
      concern: ["admin"],
      dimension: "systems",
      severity: toolSev,
      title: "Tools don't share information",
      summary: `You use ${answerLabel("toolCount", ans.toolCount)} tools and they share data: ${answerLabel("toolsConnected", ans.toolsConnected).toLowerCase()}.`,
      evidence: [selfReported(ans, "toolCount"), selfReported(ans, "toolsConnected")],
      estimate: null,
      estimateStatus: "not_estimated",
      estimateNote: "Not priced separately — its cost already shows up as repetitive data entry, so pricing it again would double-count.",
      verifyData: [
        "List every tool, its monthly cost, who uses it, and what data goes in and out.",
        "Mark which tools overlap in purpose.",
      ],
      firstAction: "Build a one-page tool map before adding or replacing any software. Verify the problem first; recommend tools second.",
    });
  }

  // Rank: half severity, half relative value, +10 if it matches the stated concern.
  const maxBase = Math.max(0, ...out.map((c) => c.estimate?.base ?? 0));
  const priority = (c: Candidate) =>
    c.severity * 0.5 + (maxBase > 0 ? ((c.estimate?.base ?? 0) / maxBase) * 100 * 0.5 : 0) + (c.concern.includes(ans.primaryConcern ?? "") ? 10 : 0);

  return out
    .filter((c) => c.severity >= 25 || (c.estimate?.base ?? 0) > 0)
    .sort((x, y) => priority(y) - priority(x) || x.order - y.order)
    .slice(0, 3)
    .map(({ order: _o, concern: _c, ...f }, i) => ({ ...f, rank: i + 1 }));
}

// ── 4. 30-day plan ─────────────────────────────────────────

export function computePlan(findings: Finding[]): PlanWeek[] {
  const [f1, f2, f3] = findings;
  if (!f1) {
    return [
      { week: 1, title: "Establish a baseline", tasks: ["Track enquiries, approvals and re-typing time for one week in a simple sheet."] },
      { week: 2, title: "Look for patterns", tasks: ["Note any step where work regularly waits more than a day."] },
      { week: 3, title: "Re-run the X-Ray", tasks: ["Answer again using the week 1–2 numbers instead of estimates."] },
      { week: 4, title: "Decide", tasks: ["Only invest in changes where the measured data shows a real problem."] },
    ];
  }
  return [
    {
      week: 1,
      title: "Measure the top issue",
      tasks: [`${f1.title}: ${f1.verifyData[0]}`, ...(f2 ? [`${f2.title}: ${f2.verifyData[0]}`] : [])],
    },
    {
      week: 2,
      title: "Map how it really happens",
      tasks: [
        `Walk through one real example of "${f1.title.toLowerCase()}" with the people involved. Note every wait and every re-type.`,
        ...(f1.verifyData[1] ? [f1.verifyData[1]] : []),
      ],
    },
    {
      week: 3,
      title: "Trial one no-cost change",
      tasks: [f1.firstAction, ...(f2 ? [`If capacity allows: ${f2.firstAction}`] : [])],
    },
    {
      week: 4,
      title: "Re-measure and decide",
      tasks: [
        "Compare this week's numbers with the week 1 baseline.",
        ...(f3 ? [`Start collecting data for the next issue — ${f3.title.toLowerCase()}: ${f3.verifyData[0]}`] : []),
        "Only consider new software if the measured problem remains after the process change.",
      ],
    },
  ];
}

// ── 5. top-level ───────────────────────────────────────────

export function computeAssessment(rawAnswers: Answers, rawAssumptions: Partial<Assumptions>): Assessment {
  const answers = pruneHidden(rawAnswers);
  const assumptions = sanitizeAssumptions(rawAssumptions);

  const { components, laborHoursPerYear, capApplied, capHoursPerYear } = computeComponents(answers, assumptions);
  const estimatedRanges = components.filter((c) => c.status === "estimated" && c.range).map((c) => c.range!);
  const anyInsufficient = components.some((c) => c.status === "insufficient");
  const allNotApplicable = components.every((c) => c.status === "not_applicable");

  const totalRange = estimatedRanges.length ? sumRanges(estimatedRanges) : null;
  const status = totalRange && totalRange.base > 0 ? "estimated" : allNotApplicable ? "none_reported" : "insufficient";

  const scores = computeScores(answers);
  const findings = computeFindings(answers, components, scores);
  const plan = computePlan(findings);

  const cost = parseNumber(answers.hourlyCost);
  const hourlyCostSource = cost !== null && cost === assumptions.hourlyCost ? "SELF_REPORTED" : "ESTIMATED";

  const dataGaps: string[] = [];
  if (answers.hourlyCost === undefined || answers.hourlyCost === "unknown")
    dataGaps.push("Labour cost per hour — a default was used. Payroll totals ÷ paid hours would replace it.");
  if ((parseNumber(answers.leadsPerMonth) ?? 0) > 0 && parseNumber(answers.avgDealValue) === null)
    dataGaps.push("Typical sale value — needed before any enquiry figure can be estimated.");
  if (answers.toolsConnected === "unknown") dataGaps.push("Whether your tools share data — a tool inventory would answer this.");
  if (answers.dataConfidence === "rough") dataGaps.push("You described your numbers as rough guesses; treat every range as directional only.");
  if (anyInsufficient) dataGaps.push("Some components lack inputs and are shown as 'insufficient information' rather than guessed.");

  let confidence: Confidence = answers.dataConfidence === "rough" ? "low" : "moderate";
  if (status !== "estimated") confidence = "insufficient";

  const notes = [
    "All figures are possible opportunities estimated from your own answers. They are not verified losses or guaranteed savings.",
    "This is an operational diagnostic, not a financial audit or psychological assessment.",
    "Components measure different things and are added only once; tool sprawl is scored but not priced to avoid double-counting.",
  ];
  if (capApplied)
    notes.push(`Your reported friction time exceeded ${assumptions.capacityCapPct}% of total team hours, so all time-based estimates were scaled down proportionally.`);
  if (answers.dataConfidence === "records")
    notes.push("You said your numbers come from records. They remain self-reported until someone checks those records.");

  return {
    engineVersion: ENGINE_VERSION,
    answers,
    assumptions,
    hourlyCostSource,
    components,
    totals: { status, range: status === "estimated" ? totalRange : null, laborHoursPerYear, capApplied, capHoursPerYear },
    scores,
    findings,
    plan,
    confidence,
    verifiedCount: 0,
    dataGaps,
    notes,
  };
}