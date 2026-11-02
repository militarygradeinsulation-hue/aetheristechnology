import { REAL_CASES, type RealCase } from '@/data/realCaseStudies';
import type { PersonaListicle } from '@/config/personaListicles';

const CASE_BY_ID = new Map(REAL_CASES.map((c) => [c.id, c]));

/** Resolve a persona's proof ids to sourced case studies, in configured order. */
export const resolvePersonaProof = (persona: PersonaListicle): RealCase[] =>
  persona.proofCaseIds.map((id) => CASE_BY_ID.get(id)).filter((c): c is RealCase => Boolean(c));

const PASSTHROUGH_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

/**
 * Append the persona slug and any incoming ad tracking params to a CTA href,
 * so downstream pages and analytics can attribute conversions to the persona.
 */
export const withPersonaTracking = (href: string, slug: string, search: string): string => {
  const incoming = new URLSearchParams(search);
  const [base, existing = ''] = href.split('?');
  const out = new URLSearchParams(existing);
  out.set('persona', slug);
  for (const key of PASSTHROUGH_PARAMS) {
    const value = incoming.get(key);
    if (value && !out.has(key)) out.set(key, value);
  }
  return `${base}?${out.toString()}`;
};

/** Build the URL an ad for this persona should point at. */
export const personaAdUrl = (siteUrl: string, slug: string, angle: string): string => {
  const params = new URLSearchParams({
    utm_source: 'facebook',
    utm_medium: 'paid_social',
    utm_campaign: `persona_${slug}`,
    utm_content: angle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
  });
  return `${siteUrl}/for/${slug}?${params.toString()}`;
};
