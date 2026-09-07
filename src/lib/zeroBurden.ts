/**
 * Zero Burden Technology — single approved source of truth.
 *
 * Every public section, campaign asset, and Content Engine template must read
 * from this module. Never copy/paste this wording into components.
 *
 * Scope rules (enforced by zeroBurden.test.ts):
 *  - "zero" claims are always scoped to the client's team/staff.
 *  - Never claim zero cost, zero risk, zero downtime, or universal compatibility.
 *  - The qualification statement must accompany the zero outcomes everywhere.
 *  - House style: no dashes in published copy.
 */

export const ZERO_BURDEN_HEADLINE = 'Your business changes. Your team does not have to.';

export const ZERO_BURDEN_PRIMARY =
  'Aetheris is built around the company you already have. Your people keep working. We handle the connections, intelligence, maintenance, and adaptation behind the scenes.';

export const ZERO_BURDEN_SUPPORTING =
  'No new platform to master. No workflow overhaul. No system babysitting.';

export const ZERO_BURDEN_QUALIFIER =
  'What does zero mean? The technical work still exists. Aetheris carries it. Your team is not expected to build integrations, maintain models, troubleshoot automations, or learn an entirely new operating system. Exact managed services depend on the purchased package.';

export type ZeroOutcome = {
  id: string;
  /** Short scoped claim, e.g. "Zero integration work for your team". */
  label: string;
  /** Plain language explanation of who carries the work. */
  text: string;
};

export const ZERO_OUTCOMES: ZeroOutcome[] = [
  {
    id: 'software',
    label: 'Zero new software to learn',
    text: 'Your team works through the tools and processes they already know.',
  },
  {
    id: 'process',
    label: 'Zero process rebuilds',
    text: 'Aetheris adapts around current operations before recommending any necessary change.',
  },
  {
    id: 'integration',
    label: 'Zero integration work for your team',
    text: 'Aetheris handles mapping, connections, testing, and monitoring.',
  },
  {
    id: 'maintenance',
    label: 'Zero maintenance burden on your staff',
    text: 'Updates, model changes, broken connections, and system health are handled behind the scenes within the purchased service scope.',
  },
  {
    id: 'prompting',
    label: 'Zero prompt engineering',
    text: 'Users communicate normally. Digital You supplies company context, standards, voice, and decision logic.',
  },
  {
    id: 'headcount',
    label: 'Zero additional headcount required',
    text: 'Begin using the system without hiring a dedicated AI team.',
  },
  {
    id: 'dataentry',
    label: 'Zero duplicate data entry',
    text: 'Connected information should move between approved systems automatically.',
  },
  {
    id: 'hopping',
    label: 'Zero platform hopping',
    text: 'The Aetheris command layer brings relevant intelligence and actions into one operating view.',
  },
  {
    id: 'blankpage',
    label: 'Zero blank page setup',
    text: 'The Golden Report and company evidence establish priorities, goals, content, and recommended actions.',
  },
  {
    id: 'disruption',
    label: 'Zero forced disruption',
    text: 'Changes are phased, measurable, reversible where practical, and built around daily operations.',
  },
];

export type ZeroVariation = { id: string; text: string };

/** Approved short copy for campaigns and Content Engine prompts. */
export const ZERO_BURDEN_VARIATIONS: ZeroVariation[] = [
  {
    id: 'A',
    text: 'Keep your CRM. Keep your team. Keep your process. Aetheris works behind them, connecting what is fragmented and handling the technical burden.',
  },
  {
    id: 'B',
    text: 'Your people should not need an AI degree to use AI. They should be able to do their jobs while the intelligence works around them.',
  },
  {
    id: 'C',
    text: 'Most technology gives you another login, another dashboard, and another system to maintain. Aetheris removes that burden.',
  },
  { id: 'D', text: 'You do not become the system administrator. Aetheris becomes the operating layer.' },
  {
    id: 'E',
    text: 'Digital You removes the prompt learning curve by giving every approved tool your voice, knowledge, standards, and way of thinking.',
  },
  { id: 'F', text: 'The upgrade happens behind the business, not on top of the employees.' },
  { id: 'G', text: 'Installed around how your company works. Managed without adding work to your company.' },
  {
    id: 'H',
    text: 'Technology should reduce the number of things your team manages, not add another one.',
  },
];

export type ComparisonRow = { typical: string; aetheris: string };

export const ZERO_BURDEN_COMPARISON: ComparisonRow[] = [
  { typical: 'New login', aetheris: 'Current tools' },
  { typical: 'Training program', aetheris: 'Natural communication' },
  { typical: 'Migration project', aetheris: 'Managed connection' },
  { typical: 'Maintenance queue', aetheris: 'Monitored operation' },
  { typical: 'More admin', aetheris: 'Less admin' },
];

/** Claims that must never appear in Zero Burden copy. */
export const ZERO_BURDEN_FORBIDDEN: string[] = [
  'zero cost',
  'zero risk',
  'zero downtime',
  'zero integration',
  'zero maintenance',
  'no integration',
  'no maintenance',
  'works with everything',
  'universal compatibility',
  'compatible with any system',
  'guaranteed',
];

/**
 * Retired wording that must not reappear. These made technically false claims
 * (that the work does not exist) rather than scoping it to the client team.
 */
export const ZERO_BURDEN_RETIRED_VARIATIONS: string[] = [
  'There is no integration work.',
  'There is no maintenance.',
  'Zero engineering required.',
  'No technical work at all.',
];

const SCOPE_TOKENS = ['your team', 'your staff', 'your people', 'your company'];

/** A "zero" claim about integration or maintenance must be scoped to the client side. */
export function isScopedClaim(label: string): boolean {
  const l = label.toLowerCase();
  if (!/\bzero\b/.test(l)) return true;
  if (!/(integration|maintenance)/.test(l)) return true;
  return SCOPE_TOKENS.some((t) => l.includes(t));
}

export function containsForbiddenClaim(text: string): string | null {
  const l = text.toLowerCase();
  for (const bad of ZERO_BURDEN_FORBIDDEN) {
    // Scoped forms such as "zero integration work for your team" are allowed.
    if (l.includes(bad)) {
      const idx = l.indexOf(bad);
      const tail = l.slice(idx, idx + bad.length + 40);
      if (SCOPE_TOKENS.some((t) => tail.includes(t))) continue;
      return bad;
    }
  }
  return null;
}

export type DigitalYouContext = {
  industry?: string | null;
  tools?: string[] | null;
  company?: string | null;
};

/** Adapt an outcome example to the signed in company context without changing meaning. */
export function adaptOutcome(outcome: ZeroOutcome, ctx?: DigitalYouContext): ZeroOutcome {
  if (!ctx) return outcome;
  const tools = (ctx.tools || []).filter(Boolean);
  const industry = (ctx.industry || '').trim();
  let text = outcome.text;
  if (outcome.id === 'software' && tools.length) {
    text = `Your team works through ${tools.slice(0, 3).join(', ')} and the processes they already know.`;
  }
  if (outcome.id === 'dataentry' && tools.length >= 2) {
    text = `Connected information should move between ${tools[0]} and ${tools[1]} automatically, inside approved systems.`;
  }
  if (outcome.id === 'process' && industry) {
    text = `Aetheris adapts around how your ${industry} operation runs today before recommending any necessary change.`;
  }
  return { ...outcome, text };
}

/** Build the approved brief handed to the Content Engine generator. */
export function buildZeroBurdenBrief(opts: {
  variationIds?: string[];
  outcomeIds?: string[];
  context?: DigitalYouContext;
  assetType?: string;
}): string {
  const { variationIds, outcomeIds, context, assetType } = opts;
  const vars = ZERO_BURDEN_VARIATIONS.filter((v) => !variationIds?.length || variationIds.includes(v.id));
  const outs = ZERO_OUTCOMES.filter((o) => !outcomeIds?.length || outcomeIds.includes(o.id)).map((o) =>
    adaptOutcome(o, context),
  );
  const lines: string[] = [
    'APPROVED MESSAGE PACK: Zero Burden Technology',
    `Asset type: ${assetType || 'social post'}`,
    `Headline: ${ZERO_BURDEN_HEADLINE}`,
    `Primary statement: ${ZERO_BURDEN_PRIMARY}`,
    `Supporting line: ${ZERO_BURDEN_SUPPORTING}`,
    '',
    'Approved outcomes:',
    ...outs.map((o) => `${o.label}. ${o.text}`),
    '',
    'Approved short copy:',
    ...vars.map((v) => `${v.id}. ${v.text}`),
    '',
    'Comparison:',
    `Typical technology: ${ZERO_BURDEN_COMPARISON.map((r) => r.typical.toLowerCase()).join(', ')}.`,
    `Aetheris: ${ZERO_BURDEN_COMPARISON.map((r) => r.aetheris.toLowerCase()).join(', ')}.`,
    '',
    'Required qualification, include it or a faithful paraphrase in any asset that uses a zero claim:',
    ZERO_BURDEN_QUALIFIER,
    '',
    'RULES: Keep every zero claim scoped to the client team or staff. Never claim zero cost, zero risk, zero downtime, or universal compatibility. Never say the technical work does not exist. Do not use dashes.',
  ];
  if (context?.industry) lines.push(`Industry context: ${context.industry}.`);
  if (context?.tools?.length) lines.push(`Current tools in use: ${context.tools.join(', ')}.`);
  if (context?.company) lines.push(`Company: ${context.company}.`);
  return lines.join('\n');
}
