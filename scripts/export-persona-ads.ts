// Export every persona's ad variants with matching landing-page URLs as CSV,
// ready to paste into an ad-manager bulk upload sheet.
//
//   bun scripts/export-persona-ads.ts > persona-ads.csv
//
// Ad copy lives in src/config/personaListicles.ts next to the page copy, so
// ad -> page message match is edited in one place.

import { PERSONA_LISTICLES } from '../src/config/personaListicles';
import { personaAdUrl } from '../src/lib/personaListicle';

const SITE_URL = 'https://aetheris.technology';

const csv = (value: string) => `"${value.replace(/"/g, '""')}"`;

const rows = [
  ['persona_slug', 'persona', 'angle', 'hook', 'primary_text', 'headline', 'cta', 'landing_url'],
  ...PERSONA_LISTICLES.flatMap((p) =>
    p.ads.map((ad) => [
      p.slug,
      p.persona,
      ad.angle,
      ad.hook,
      `${ad.hook} ${ad.primaryText}`,
      ad.headline,
      ad.cta,
      personaAdUrl(SITE_URL, p.slug, ad.angle),
    ]),
  ),
];

process.stdout.write(rows.map((r) => r.map(csv).join(',')).join('\n') + '\n');
