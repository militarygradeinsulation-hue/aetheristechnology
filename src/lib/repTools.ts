// Shared registry of free tools that reps can share with prospects.
// Each entry maps a stable slug to the actual tool route + a human title.

export interface RepTool {
  slug: string;
  title: string;
  path: string;     // actual in-app path the user lands on after capture
  blurb: string;
}

export const REP_TOOLS: RepTool[] = [
  { slug: 'scan',                title: 'Website Leak Scan',         path: '/scan',                 blurb: 'Pulls a live site and flags conversion, trust, and follow-up leaks.' },
  { slug: 'business-diagnostic', title: 'Business Diagnostic',       path: '/business-diagnostic',  blurb: '20-question forensic snapshot of revenue, ops, and follow-up systems.' },
  { slug: 'friction-audit',      title: 'Friction Vocabulary Audit', path: '/friction-audit',       blurb: 'Finds the exact words on a site silently killing trust.' },
  { slug: 'brand-contradictions',title: 'Brand Contradictions',      path: '/brand-contradictions', blurb: "Spots where what they say and what they show don't match." },
  { slug: 'strategic-questions', title: 'Strategic Questions',       path: '/strategic-questions',  blurb: 'Questions their team should already be able to answer — but cannot.' },
  { slug: 'ai-checklist',        title: 'AI Implementation Checklist', path: '/ai-checklist',       blurb: 'Where AI actually belongs in their business — and where it does not.' },
  { slug: 'content-generator',   title: 'Forensic Content Pack',     path: '/content-generator',    blurb: 'Operator-voice posts and hooks from a single prompt.' },
  { slug: 'sales-scripts',       title: 'Sales Scripts',             path: '/sales-scripts',        blurb: 'Short, blunt scripts for cold, warm, and dead-lead revival.' },
  { slug: 'content-calendar',    title: 'Content Calendar',          path: '/content-calendar',     blurb: '30-day publishing plan mapped to offer + audience.' },
  { slug: 'follow-up-plan',      title: 'Follow-Up Plan',            path: '/follow-up-plan',       blurb: 'Multi-touch sequence to stop letting warm leads die.' },
  { slug: 'nexus-iq',            title: 'Nexus IQ — 5M Strategist',  path: '/nexus-iq',             blurb: 'Upload architecture; the 5M IQ engine finds the fractures.' },
];

export const REP_TOOL_BY_SLUG: Record<string, RepTool> =
  Object.fromEntries(REP_TOOLS.map(t => [t.slug, t]));

export const TOOL_LEAD_STORAGE_KEY = 'aetheris.toolLead.v1';

export interface StoredToolLead {
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  rep_code?: string;
  ts: number;
}

export function loadStoredToolLead(): StoredToolLead | null {
  try {
    const raw = localStorage.getItem(TOOL_LEAD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToolLead;
    if (!parsed?.email) return null;
    return parsed;
  } catch { return null; }
}

export function saveStoredToolLead(lead: StoredToolLead) {
  try { localStorage.setItem(TOOL_LEAD_STORAGE_KEY, JSON.stringify(lead)); } catch {}
}

export function buildRepToolUrl(origin: string, repCode: string, slug: string): string {
  return `${origin.replace(/\/+$/, '')}/t/${encodeURIComponent(repCode)}/${encodeURIComponent(slug)}`;
}
