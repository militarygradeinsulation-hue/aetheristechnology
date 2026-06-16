// Frontend mirror of supabase/functions/_shared/lead-scoring.ts
// Keep tier thresholds and rubric in sync.

export type LeadTierId = 'hot' | 'warm' | 'shot' | 'skip' | 'unknown';

export interface LeadTier {
  id: LeadTierId;
  label: string;
  action: string;
  minScore: number;
  tone: string;       // tailwind text class
  bg: string;         // tailwind bg class
}

export const LEAD_TIERS: LeadTier[] = [
  { id: 'hot',  label: 'HOT — call today',       action: 'Phone first, email second. These close fastest.', minScore: 80, tone: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40' },
  { id: 'warm', label: 'WARM — reach this week', action: 'Personalized email + LinkedIn touch. Follow up in 48h.', minScore: 60, tone: 'text-amber', bg: 'bg-amber/15 border-amber/40' },
  { id: 'shot', label: 'WORTH A SHOT',           action: 'Templated outreach. Do not over-invest until they reply.', minScore: 40, tone: 'text-amber/70', bg: 'bg-amber/10 border-amber/20' },
  { id: 'skip', label: 'SKIP / nurture',         action: 'Weak signal. Send to nurture or back to pool.', minScore: 0, tone: 'text-muted-foreground', bg: 'bg-muted/30 border-border' },
];

export function tierFromScore(score: number | null | undefined): LeadTier & { unknown?: boolean } {
  if (score == null || Number.isNaN(score as number)) {
    return { id: 'unknown', label: 'INSUFFICIENT EVIDENCE', action: 'Manual look. Not enough signal to score yet.', minScore: 0, tone: 'text-muted-foreground', bg: 'bg-muted/30 border-border', unknown: true };
  }
  for (const t of LEAD_TIERS) if (score >= t.minScore) return t;
  return LEAD_TIERS[LEAD_TIERS.length - 1];
}

export interface ScorePart { key: string; label: string; weight: number; earned: number }

const PART_PHRASE: Record<string, { strong: string; weak: string }> = {
  contact:    { strong: 'multiple ways to reach them',         weak: 'few contact methods available' },
  capture:    { strong: 'strong CTAs and lead capture',        weak: 'weak or missing CTAs' },
  messaging:  { strong: 'clear value proposition',             weak: 'unclear value proposition' },
  content:    { strong: 'real content depth and proof',        weak: 'no case studies or authority signals' },
  seo:        { strong: 'clean SEO hygiene',                   weak: 'broken SEO basics' },
  mobile:     { strong: 'fast + mobile-ready site',            weak: 'slow or non-responsive site' },
  brand:      { strong: 'consistent brand presentation',       weak: 'inconsistent branding' },
  industry:   { strong: 'priority industry for us',            weak: 'low-leverage industry' },
  revenue:    { strong: 'revenue band that can pay',           weak: 'unclear or low revenue band' },
  gaps:       { strong: 'real findable problems = real money', weak: 'few real problems surfaced' },
  website:    { strong: 'has a website',                       weak: 'no website found' },
  email:      { strong: 'direct named email',                  weak: 'no direct email' },
  phone:      { strong: 'phone present',                       weak: 'no phone number' },
  name:       { strong: 'named human contact',                 weak: 'no named contact' },
  geo:        { strong: 'geographic match',                    weak: 'outside target geo' },
  size:       { strong: 'size signal in fit notes',            weak: 'no size signal' },
  pain:       { strong: 'pain signal in fit notes',            weak: 'no pain signal' },
};

export function explainScore(parts: ScorePart[] | undefined | null): string {
  if (!parts?.length) return 'Not enough evidence to score yet.';
  const rated = parts.map(p => ({ ...p, ratio: p.weight ? p.earned / p.weight : 0 }));
  const strong = [...rated].sort((a, b) => b.ratio - a.ratio)[0];
  const weak   = [...rated].sort((a, b) => a.ratio - b.ratio)[0];
  const sPhrase = PART_PHRASE[strong.key]?.strong || strong.label.toLowerCase();
  const wPhrase = PART_PHRASE[weak.key]?.weak     || `low ${weak.label.toLowerCase()}`;
  if (strong.ratio >= 0.7 && weak.ratio <= 0.3) return `Strong ${sPhrase}, but ${wPhrase}.`;
  if (strong.ratio >= 0.7) return `Strong ${sPhrase}.`;
  if (weak.ratio <= 0.3) return `Main gap: ${wPhrase}.`;
  return `Mixed signals — best: ${sPhrase}; weakest: ${wPhrase}.`;
}

export type ScoreStage = 'triage' | 'audit' | 'verified';
export const STAGE_META: Record<ScoreStage, { label: string; hint: string; tone: string }> = {
  triage:   { label: 'TRIAGE',   hint: 'Score from contact data only. Run the website scan to upgrade.', tone: 'text-muted-foreground' },
  audit:    { label: 'AUDIT',    hint: 'Score includes full website signals + gap analysis.', tone: 'text-amber' },
  verified: { label: 'VERIFIED', hint: 'Score confirmed by a rep touch.', tone: 'text-emerald-400' },
};

export interface RubricEntry { key: string; label: string; weight: number; what: string; stage: 'triage' | 'audit' }
export const RUBRIC: RubricEntry[] = [
  { key: 'website',  label: 'Has website',         weight: 25, what: 'Public site exists at all.', stage: 'triage' },
  { key: 'email',    label: 'Direct email',        weight: 15, what: 'Named address beats info@/sales@.', stage: 'triage' },
  { key: 'phone',    label: 'Phone present',       weight: 10, what: 'Reachable by phone.', stage: 'triage' },
  { key: 'name',     label: 'Named contact',       weight: 10, what: 'First + last name on file.', stage: 'triage' },
  { key: 'industry', label: 'Priority industry',   weight: 10, what: 'Trades / pro-services / medical / SaaS, etc.', stage: 'triage' },
  { key: 'geo',      label: 'Geo match',           weight: 10, what: 'Inside your assigned territory or Midwest.', stage: 'triage' },
  { key: 'size',     label: 'Size signal',         weight: 10, what: 'Employees / locations / revenue mentioned.', stage: 'triage' },
  { key: 'pain',     label: 'Pain signal',         weight: 10, what: 'Manual / hiring / leak / bottleneck language.', stage: 'triage' },
  { key: 'contact',   label: 'Contactability',      weight: 15, what: 'phone + email + form + calendar (each 1/4).', stage: 'audit' },
  { key: 'capture',   label: 'Lead capture',        weight: 10, what: '70% CTA strength + 30% lead magnet.', stage: 'audit' },
  { key: 'messaging', label: 'Messaging clarity',   weight: 10, what: 'Value-prop clarity 0–5.', stage: 'audit' },
  { key: 'content',   label: 'Content + authority', weight: 10, what: '70% content depth + 30% case studies.', stage: 'audit' },
  { key: 'seo',       label: 'SEO hygiene',         weight: 10, what: 'title + meta + schema (each 1/3).', stage: 'audit' },
  { key: 'mobile',    label: 'Mobile + speed',      weight:  5, what: 'Responsive + fast first paint.', stage: 'audit' },
  { key: 'brand',     label: 'Brand consistency',   weight:  5, what: 'Visual + voice cohesion 0–5.', stage: 'audit' },
  { key: 'industry',  label: 'Industry leverage',   weight: 15, what: 'How well Aetheris ops apply (high/med/low).', stage: 'audit' },
  { key: 'revenue',   label: 'Revenue band',        weight: 10, what: '$2M–$10M scores highest (ability to pay).', stage: 'audit' },
  { key: 'gaps',      label: 'Gap severity load',   weight: 10, what: 'More critical/warning gaps = more $ to find.', stage: 'audit' },
];

export function rubricWhat(key: string): string {
  return RUBRIC.find(r => r.key === key)?.what || '';
}
