// Deterministic, rubric-based lead scoring.
// AI returns OBSERVABLE SIGNALS only. The score is math, not vibes.
// Same inputs → same score, every run. Reps can read the breakdown.

export interface WebsiteSignals {
  has_phone?: boolean;
  has_email?: boolean;
  has_contact_form?: boolean;
  has_calendar_link?: boolean;
  cta_strength?: number;            // 0-5
  lead_magnet_present?: boolean;
  value_prop_clarity?: number;      // 0-5
  content_depth?: number;           // 0-5
  has_case_studies?: boolean;
  has_title_tag?: boolean;
  has_meta_description?: boolean;
  has_schema?: boolean;
  uses_responsive?: boolean;
  fast_first_paint?: boolean;
  brand_consistency?: number;       // 0-5
  industry_fit?: 'high' | 'medium' | 'low' | 'unknown';
  revenue_band?: '<500k' | '500k-2M' | '2M-10M' | '10M+' | 'unknown';
}

export interface WebsiteGap {
  severity?: 'critical' | 'warning' | 'info' | string;
  [k: string]: unknown;
}

export interface WebsiteScoreBreakdown {
  total: number | null;             // 0-100 or null if insufficient evidence
  reason?: string;                  // when null
  parts: Array<{ key: string; label: string; weight: number; earned: number }>;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const bool = (b: unknown) => (b === true ? 1 : 0);
const num5 = (n: unknown) => (typeof n === 'number' ? clamp(n, 0, 5) : 0);

export function computeWebsiteScore(
  signals: Partial<WebsiteSignals> | null | undefined,
  gaps: WebsiteGap[] = [],
  scrapedChars = 9999,
): WebsiteScoreBreakdown {
  const s = signals || {};
  const parts: WebsiteScoreBreakdown['parts'] = [];

  // Insufficient evidence guards — return null instead of a fake middle.
  const noSignals = !signals || Object.keys(signals).length === 0;
  if (scrapedChars < 500 || noSignals) {
    return { total: null, reason: 'insufficient_evidence', parts };
  }

  // 15 — Contactability
  {
    const w = 15;
    const present = bool(s.has_phone) + bool(s.has_email) + bool(s.has_contact_form) + bool(s.has_calendar_link);
    parts.push({ key: 'contact', label: 'Contactability', weight: w, earned: Math.round((present / 4) * w) });
  }
  // 10 — Lead capture
  {
    const w = 10;
    const earned = Math.round(((num5(s.cta_strength) / 5) * 0.7 + bool(s.lead_magnet_present) * 0.3) * w);
    parts.push({ key: 'capture', label: 'Lead capture', weight: w, earned });
  }
  // 10 — Messaging clarity
  parts.push({ key: 'messaging', label: 'Messaging clarity', weight: 10, earned: Math.round((num5(s.value_prop_clarity) / 5) * 10) });
  // 10 — Content depth / authority
  {
    const w = 10;
    const earned = Math.round(((num5(s.content_depth) / 5) * 0.7 + bool(s.has_case_studies) * 0.3) * w);
    parts.push({ key: 'content', label: 'Content + authority', weight: w, earned });
  }
  // 10 — SEO hygiene
  {
    const w = 10;
    const present = bool(s.has_title_tag) + bool(s.has_meta_description) + bool(s.has_schema);
    parts.push({ key: 'seo', label: 'SEO hygiene', weight: w, earned: Math.round((present / 3) * w) });
  }
  // 5 — Mobile + speed
  {
    const w = 5;
    const present = bool(s.uses_responsive) + bool(s.fast_first_paint);
    parts.push({ key: 'mobile', label: 'Mobile + speed', weight: w, earned: Math.round((present / 2) * w) });
  }
  // 5 — Brand consistency
  parts.push({ key: 'brand', label: 'Brand consistency', weight: 5, earned: Math.round((num5(s.brand_consistency) / 5) * 5) });
  // 15 — Industry leverage for Aetheris
  {
    const w = 15;
    const map: Record<string, number> = { high: 1, medium: 0.6, low: 0.25, unknown: 0.4 };
    parts.push({ key: 'industry', label: 'Industry leverage', weight: w, earned: Math.round((map[String(s.industry_fit ?? 'unknown')] ?? 0.4) * w) });
  }
  // 10 — Revenue band (ability to pay)
  {
    const w = 10;
    const map: Record<string, number> = { '<500k': 0.2, '500k-2M': 0.6, '2M-10M': 1, '10M+': 0.85, 'unknown': 0.4 };
    parts.push({ key: 'revenue', label: 'Revenue band', weight: w, earned: Math.round((map[String(s.revenue_band ?? 'unknown')] ?? 0.4) * w) });
  }
  // 10 — Gap severity load (inverse — actual problems = real money to find)
  {
    const w = 10;
    const crit = gaps.filter(g => g?.severity === 'critical').length;
    const warn = gaps.filter(g => g?.severity === 'warning').length;
    // Need at least some gaps to earn this — no findings = no evidence here either.
    const raw = Math.min(1, (crit * 0.25 + warn * 0.1));
    parts.push({ key: 'gaps', label: 'Gap severity load', weight: w, earned: Math.round(raw * w) });
  }

  let total = parts.reduce((a, p) => a + p.earned, 0);

  // Low-evidence cap: if site barely surfaced anything actionable, don't pretend.
  const hasContact = bool(s.has_phone) + bool(s.has_email) + bool(s.has_contact_form) > 0;
  if (gaps.length < 4 && !hasContact) total = Math.min(total, 35);

  return { total: clamp(total, 0, 100), parts };
}

export function gradeFromScore(score: number | null | undefined): string {
  if (score == null) return '?';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ---------------------------------------------------------------------------
// Unified tier scale — single source of truth used by frontend + backend.
// Mirror in src/lib/leadScoring.ts MUST stay in sync.
// ---------------------------------------------------------------------------

export type LeadTierId = 'hot' | 'warm' | 'shot' | 'skip' | 'unknown';

export interface LeadTier {
  id: LeadTierId;
  label: string;       // short rep-facing label
  action: string;      // what the rep should do
  minScore: number;    // inclusive lower bound (0-100)
}

export const LEAD_TIERS: LeadTier[] = [
  { id: 'hot',  label: 'HOT — call today',       action: 'Phone first, email second. These close fastest.', minScore: 80 },
  { id: 'warm', label: 'WARM — reach this week', action: 'Personalized email + LinkedIn touch. Follow up in 48h.', minScore: 60 },
  { id: 'shot', label: 'WORTH A SHOT',           action: 'Templated outreach. Do not over-invest until they reply.', minScore: 40 },
  { id: 'skip', label: 'SKIP / nurture',         action: 'Weak signal. Send to nurture or back to pool.', minScore: 0 },
];

export function tierFromScore(score: number | null | undefined): LeadTier & { unknown?: boolean } {
  if (score == null || Number.isNaN(score as number)) {
    return { id: 'unknown', label: 'INSUFFICIENT EVIDENCE', action: 'Manual look. Not enough signal to score yet.', minScore: 0, unknown: true };
  }
  for (const t of LEAD_TIERS) {
    if (score >= t.minScore) return t;
  }
  return LEAD_TIERS[LEAD_TIERS.length - 1];
}

// One-line plain-English explanation from the parts breakdown.
// Deterministic — no AI call. Picks the strongest + weakest signal.
export interface PartLike { key: string; label: string; weight: number; earned: number }

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

export function explainScore(parts: PartLike[]): string {
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

// Stage metadata — used by UI to show confidence behind the number.
export type ScoreStage = 'triage' | 'audit' | 'verified';
export const STAGE_META: Record<ScoreStage, { label: string; hint: string }> = {
  triage:   { label: 'TRIAGE',   hint: 'Score from contact data only. Run the website scan to upgrade.' },
  audit:    { label: 'AUDIT',    hint: 'Score includes full website signals + gap analysis.' },
  verified: { label: 'VERIFIED', hint: 'Score confirmed by a rep touch.' },
};

// Rubric metadata — single source for the info drawer + tooltips.
export interface RubricEntry { key: string; label: string; weight: number; what: string; stage: 'triage' | 'audit' }
export const RUBRIC: RubricEntry[] = [
  // Triage (scrape-time)
  { key: 'website',  label: 'Has website',         weight: 25, what: 'Public site exists at all.', stage: 'triage' },
  { key: 'email',    label: 'Direct email',        weight: 15, what: 'Named address beats info@/sales@.', stage: 'triage' },
  { key: 'phone',    label: 'Phone present',       weight: 10, what: 'Reachable by phone.', stage: 'triage' },
  { key: 'name',     label: 'Named contact',       weight: 10, what: 'First + last name on file.', stage: 'triage' },
  { key: 'industry', label: 'Priority industry',   weight: 10, what: 'Trades / pro-services / medical / SaaS, etc.', stage: 'triage' },
  { key: 'geo',      label: 'Geo match',           weight: 10, what: 'Inside your assigned territory or Midwest.', stage: 'triage' },
  { key: 'size',     label: 'Size signal',         weight: 10, what: 'Employees / locations / revenue mentioned.', stage: 'triage' },
  { key: 'pain',     label: 'Pain signal',         weight: 10, what: 'Manual / hiring / leak / bottleneck language.', stage: 'triage' },
  // Audit (post-scan)
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

// --------------------------------------------------------------------------
// Scrape-time score (no website fetched yet — uses only the row we got back)
// --------------------------------------------------------------------------

export interface ScrapeLeadInput {
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  industry?: string | null;
  location?: string | null;
  why_fit?: string | null;
}

const PRIORITY_INDUSTRIES = [
  'roofing','hvac','plumbing','electrical','construction','manufacturing','manufacture',
  'logistics','distribution','wholesale','home services','contractor','trades',
  'professional services','accounting','legal','law','dental','medical','clinic','med spa',
  'saas','software','operator','marketing','real estate','auto','dealership',
];

const PAIN_PHRASES = [
  'hiring','growth','growing','behind','manual','spreadsheet','expanding','multi-location',
  'high turnover','no crm','disorganized','bottleneck','lost deals','missing','no follow',
  'losing','leak','scaling','overwhelmed','swamped','behind on',
];

const SIZE_PHRASES = [
  'employees','staff of','team of','locations','offices','revenue','million','founded',
  '$','workforce','headcount',
];

export interface ScrapeScoreBreakdown {
  total: number;
  parts: Array<{ key: string; label: string; weight: number; earned: number }>;
}

export function computeScrapeScore(lead: ScrapeLeadInput, repGeo?: string | null): ScrapeScoreBreakdown {
  const parts: ScrapeScoreBreakdown['parts'] = [];
  const why = (lead.why_fit || '').toLowerCase();
  const ind = (lead.industry || '').toLowerCase();
  const loc = (lead.location || '').toLowerCase();
  const geo = (repGeo || '').toLowerCase();

  parts.push({ key: 'website', label: 'Has website',         weight: 25, earned: lead.website ? 25 : 0 });
  parts.push({ key: 'email',   label: 'Direct email',        weight: 15, earned: lead.email && !/^(info|contact|sales|hello|support|admin|team|office)@/i.test(lead.email) ? 15 : lead.email ? 6 : 0 });
  parts.push({ key: 'phone',   label: 'Phone present',       weight: 10, earned: lead.phone ? 10 : 0 });
  parts.push({ key: 'name',    label: 'Named contact',       weight: 10, earned: lead.contact_name && lead.contact_name.trim().split(/\s+/).length >= 2 ? 10 : 0 });
  parts.push({ key: 'industry',label: 'Priority industry',   weight: 10, earned: ind && PRIORITY_INDUSTRIES.some(p => ind.includes(p)) ? 10 : ind ? 4 : 0 });
  parts.push({ key: 'geo',     label: 'Geo match',           weight: 10, earned: geo && loc.includes(geo) ? 10 : /indianapolis|indiana|\bin\b|midwest|ohio|illinois|michigan/i.test(loc) ? 6 : loc ? 3 : 0 });
  parts.push({ key: 'size',    label: 'Size signal in fit',  weight: 10, earned: SIZE_PHRASES.some(p => why.includes(p)) ? 10 : 0 });
  parts.push({ key: 'pain',    label: 'Pain signal in fit',  weight: 10, earned: PAIN_PHRASES.some(p => why.includes(p)) ? 10 : 0 });

  const total = clamp(parts.reduce((a, p) => a + p.earned, 0), 0, 100);
  return { total, parts };
}
