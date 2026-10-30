import type { Answers, QuestionId, StepNumber } from "./types";
import { parseNumber } from "./parse";

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
}

interface BaseQuestion {
  id: QuestionId;
  step: StepNumber;
  prompt: string;
  help?: string;
  required: boolean;
  /** Conditional branch. Hidden questions are ignored by validation and the engine. */
  showIf?: (answers: Answers) => boolean;
}

export interface ChoiceQuestion extends BaseQuestion {
  type: "choice";
  options: ChoiceOption[];
  layout?: "list" | "grid" | "scale";
}

export interface NumberQuestion extends BaseQuestion {
  type: "number";
  min: number;
  max: number;
  integer?: boolean;
  unit?: string;
  prefix?: string;
  placeholder?: string;
  /** Offer a "Not sure" option that stores "unknown". */
  allowUnknown?: boolean;
  unknownLabel?: string;
}

export type Question = ChoiceQuestion | NumberQuestion;

export const STEPS: { step: StepNumber; title: string; intro: string }[] = [
  { step: 1, title: "Business profile", intro: "A few basics so the estimates scale to your size." },
  { step: 2, title: "People & process", intro: "Where work waits, gets passed along, or falls through." },
  { step: 3, title: "Systems & volume", intro: "How your tools and data behave day to day." },
];

const n = (a: Answers, id: QuestionId) => parseNumber(a[id]);

export const QUESTIONS: Question[] = [
  // ── Step 1 ──────────────────────────────────────────────
  {
    id: "industry",
    step: 1,
    type: "choice",
    layout: "grid",
    required: true,
    prompt: "Which best describes your business?",
    options: [
      { value: "professional", label: "Professional services" },
      { value: "trades", label: "Trades & construction" },
      { value: "health", label: "Health & clinics" },
      { value: "retail", label: "Retail & e-commerce" },
      { value: "hospitality", label: "Hospitality" },
      { value: "agency", label: "Agency & creative" },
      { value: "operations", label: "Manufacturing & logistics" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "teamSize",
    step: 1,
    type: "number",
    required: true,
    integer: true,
    min: 1,
    max: 500,
    unit: "people",
    placeholder: "e.g. 8",
    prompt: "How many people work in the business, including you?",
    help: "Count part-timers as roughly half. Range 1–500.",
  },
  {
    id: "hourlyCost",
    step: 1,
    type: "number",
    required: true,
    min: 10,
    max: 500,
    prefix: "$",
    unit: "per hour",
    placeholder: "e.g. 40",
    allowUnknown: true,
    unknownLabel: "Not sure — use a conservative default ($35/hr)",
    prompt: "Roughly what does an hour of staff time cost you, all-in?",
    help: "Wages plus super/benefits and on-costs. A rough average is fine. No individual salaries.",
  },
  {
    id: "primaryConcern",
    step: 1,
    type: "choice",
    layout: "list",
    required: true,
    prompt: "What worries you most right now?",
    options: [
      { value: "leads", label: "Enquiries or leads slipping through" },
      { value: "approvals", label: "Work stuck waiting for sign-off" },
      { value: "handoffs", label: "Things lost between people" },
      { value: "admin", label: "Too much admin and re-typing" },
      { value: "errors", label: "Mistakes and rework" },
      { value: "unsure", label: "Not sure — something feels slow" },
    ],
  },

  // ── Step 2 ──────────────────────────────────────────────
  {
    id: "handoffsPerJob",
    step: 2,
    type: "choice",
    layout: "grid",
    required: true,
    prompt: "On a typical job or order, how many times does it change hands?",
    help: "From first contact to done — e.g. sales → scheduling → delivery → invoicing = 3.",
    options: [
      { value: "0_1", label: "0–1" },
      { value: "2_3", label: "2–3" },
      { value: "4_6", label: "4–6" },
      { value: "7_plus", label: "7 or more" },
    ],
  },
  {
    id: "handoffChasing",
    step: 2,
    type: "choice",
    layout: "scale",
    required: true,
    prompt: "When work moves between people, how often does someone have to chase it?",
    options: [
      { value: "1", label: "Never" },
      { value: "2", label: "Rarely" },
      { value: "3", label: "Sometimes" },
      { value: "4", label: "Often" },
      { value: "5", label: "Constantly" },
    ],
  },
  {
    id: "approvalsPerWeek",
    step: 2,
    type: "number",
    required: true,
    integer: true,
    min: 0,
    max: 2000,
    unit: "items / week",
    placeholder: "e.g. 15",
    prompt: "About how many items a week wait for someone's approval?",
    help: "Quotes, purchases, timesheets, content, refunds… Enter 0 if nothing routinely needs sign-off.",
  },
  {
    id: "approvalWait",
    step: 2,
    type: "choice",
    layout: "grid",
    required: true,
    showIf: (a) => (n(a, "approvalsPerWeek") ?? 0) > 0,
    prompt: "How long does a typical approval take?",
    options: [
      { value: "same_day", label: "Same day" },
      { value: "1_2_days", label: "1–2 days" },
      { value: "3_5_days", label: "3–5 days" },
      { value: "over_week", label: "Over a week" },
    ],
  },
  {
    id: "leadsPerMonth",
    step: 2,
    type: "number",
    required: true,
    integer: true,
    min: 0,
    max: 100000,
    unit: "enquiries / month",
    placeholder: "e.g. 40",
    prompt: "How many new enquiries or leads do you get in a month?",
    help: "Calls, forms, emails, DMs. Enter 0 if you don't take new enquiries.",
  },
  {
    id: "followUpSpeed",
    step: 2,
    type: "choice",
    layout: "grid",
    required: true,
    showIf: (a) => (n(a, "leadsPerMonth") ?? 0) > 0,
    prompt: "How quickly does a new enquiry usually get a real reply?",
    options: [
      { value: "under_1h", label: "Within an hour" },
      { value: "same_day", label: "Same day" },
      { value: "1_3_days", label: "1–3 days" },
      { value: "longer", label: "Longer / it varies" },
    ],
  },
  {
    id: "leadTracking",
    step: 2,
    type: "choice",
    layout: "grid",
    required: true,
    showIf: (a) => (n(a, "leadsPerMonth") ?? 0) > 0,
    prompt: "Where are enquiries tracked until they're won or lost?",
    options: [
      { value: "crm", label: "A CRM" },
      { value: "spreadsheet", label: "A spreadsheet" },
      { value: "inbox", label: "Inbox or memory" },
      { value: "nothing", label: "They're not tracked" },
    ],
  },
  {
    id: "avgDealValue",
    step: 2,
    type: "number",
    required: false,
    min: 1,
    max: 10000000,
    prefix: "$",
    unit: "per sale",
    placeholder: "e.g. 1200",
    allowUnknown: true,
    unknownLabel: "Not sure — skip the enquiry estimate",
    showIf: (a) => (n(a, "leadsPerMonth") ?? 0) > 0,
    prompt: "What is a typical sale or job worth?",
    help: "Optional. Without it we won't guess an enquiry figure.",
  },

  // ── Step 3 ──────────────────────────────────────────────
  {
    id: "repetitiveHours",
    step: 3,
    type: "number",
    required: true,
    min: 0,
    max: 2000,
    unit: "hours / week (whole team)",
    placeholder: "e.g. 6",
    prompt: "Across the team, how many hours a week go on re-typing or copying the same information?",
    help: "Moving data between email, spreadsheets, invoices and apps, or building reports by hand. Enter 0 if none.",
  },
  {
    id: "toolCount",
    step: 3,
    type: "choice",
    layout: "grid",
    required: true,
    prompt: "How many separate software tools does the team use to get work done?",
    options: [
      { value: "1_3", label: "1–3" },
      { value: "4_6", label: "4–6" },
      { value: "7_10", label: "7–10" },
      { value: "11_plus", label: "11 or more" },
    ],
  },
  {
    id: "toolsConnected",
    step: 3,
    type: "choice",
    layout: "grid",
    required: true,
    prompt: "Do those tools share information automatically?",
    options: [
      { value: "mostly", label: "Mostly yes" },
      { value: "some", label: "Some do" },
      { value: "rarely", label: "Rarely / never" },
      { value: "unknown", label: "Don't know" },
    ],
  },
  {
    id: "reworkFrequency",
    step: 3,
    type: "choice",
    layout: "grid",
    required: true,
    prompt: "How often does a mistake mean redoing work, re-sending, or refunding?",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "monthly", label: "A few times a month" },
      { value: "weekly", label: "Weekly" },
      { value: "daily", label: "Daily" },
    ],
  },
  {
    id: "reworkHours",
    step: 3,
    type: "number",
    required: true,
    min: 0,
    max: 2000,
    unit: "hours / week (whole team)",
    placeholder: "e.g. 3",
    showIf: (a) => a.reworkFrequency === "weekly" || a.reworkFrequency === "daily",
    prompt: "Roughly how many team hours a week go on fixing those mistakes?",
    help: "Don't include re-typing time you already counted above.",
  },
  {
    id: "dataConfidence",
    step: 3,
    type: "choice",
    layout: "list",
    required: true,
    prompt: "How confident are you in the numbers you've given?",
    options: [
      { value: "rough", label: "Rough guesses" },
      { value: "reasonable", label: "Reasonable estimates" },
      { value: "records", label: "Based on records I could show someone" },
    ],
  },
];

export const QUESTION_BY_ID: Record<QuestionId, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
) as Record<QuestionId, Question>;

export function isVisible(q: Question, answers: Answers): boolean {
  return q.showIf ? q.showIf(answers) : true;
}

export function visibleQuestions(answers: Answers, step?: StepNumber): Question[] {
  return QUESTIONS.filter((q) => (step ? q.step === step : true) && isVisible(q, answers));
}

/** Drop answers to questions hidden by conditional branches so stale values are never used. */
export function pruneHidden(answers: Answers): Answers {
  const out: Answers = {};
  for (const q of QUESTIONS) {
    const v = answers[q.id];
    if (v !== undefined && v !== "" && isVisible(q, answers)) out[q.id] = v;
  }
  return out;
}

/** Human label for a stored answer. */
export function answerLabel(id: QuestionId, value: string | undefined): string {
  if (value === undefined || value === "") return "Not answered";
  if (value === "unknown") return "Not sure";
  const q = QUESTION_BY_ID[id];
  if (q.type === "choice") return q.options.find((o) => o.value === value)?.label ?? value;
  const num = parseNumber(value);
  if (num === null) return value;
  const formatted = num.toLocaleString("en-US");
  return `${q.prefix ?? ""}${formatted}${q.unit ? ` ${q.unit}` : ""}`;
}