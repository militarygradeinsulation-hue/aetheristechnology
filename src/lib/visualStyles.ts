// Client side registry for content generation visual styles.
// The authoritative image prompt text lives in
// supabase/functions/_shared/visual-style-presets.ts — the client only sends
// the stable style id plus an optional aspect ratio, so the two cannot drift.

import detectiveEditorial from '@/assets/styles/aetheris-vintage-detective-editorial.png.asset.json';
import detectiveDepth from '@/assets/styles/aetheris-vintage-detective-depth.png.asset.json';

/** Stable id, shared with every generation pipeline. */
export const AETHERIS_VINTAGE_DETECTIVE = 'aetheris-vintage-detective';

export interface VisualStylePreset {
  id: string;
  label: string;
  desc: string;
  /** Durable in project preview images, never an ephemeral upload URL. */
  previews: string[];
  /** Recommended presentation ratio. A user choice always wins. */
  recommendedAspect: string;
  /** True when the preset also steers written copy, not only imagery. */
  drivesCopy: boolean;
}

export const VISUAL_STYLE_PRESETS: VisualStylePreset[] = [
  {
    id: AETHERIS_VINTAGE_DETECTIVE,
    label: 'Aetheris Vintage Detective',
    desc: 'Editorial print ad · warm paper, condensed headline, noir robot detective',
    previews: [detectiveEditorial.url, detectiveDepth.url],
    recommendedAspect: '4:5',
    drivesCopy: true,
  },
];

export const ASPECT_OPTIONS = [
  { id: '1:1', label: 'Square 1:1' },
  { id: '4:5', label: 'Portrait 4:5' },
  { id: '3:4', label: 'Portrait 3:4' },
  { id: '16:9', label: 'Landscape 16:9' },
] as const;

export function getVisualStyle(id: string | undefined): VisualStylePreset | undefined {
  return VISUAL_STYLE_PRESETS.find((s) => s.id === id);
}

export function isVisualStyleId(id: unknown): id is string {
  return typeof id === 'string' && VISUAL_STYLE_PRESETS.some((s) => s.id === id);
}

export interface DetectiveAdCopy {
  brand: string;
  headline: string;
  body: string;
  kicker: string;
  footer: string;
}

/** Readable-on-a-phone guidance. Never used to cut a sentence in half. */
export const COPY_LENGTH_GUIDANCE = {
  headline: 70,
  body: 220,
  kicker: 60,
} as const;

const QUOTES = /^["'“”‘’\s]+|["'“”‘’\s]+$/g;

/** Split a block of text into whole sentences / whole lines, never mid-word. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const line of (text || '').split('\n')) {
    const clean = line.replace(QUOTES, '');
    if (!clean) continue;
    const parts = clean.match(/[^.!?]+[.!?]*(\s+|$)/g) || [clean];
    for (const p of parts) {
      const s = p.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

const AETHERIS_HINT = /aetheris|the system|shared (company )?knowledge|context/i;

/** Pick the first whole sentence that fits, else the shortest available one. */
function bestFit(candidates: string[], max: number): string {
  const fits = candidates.filter((s) => s.length <= max);
  if (fits.length) return fits[0];
  if (!candidates.length) return '';
  return [...candidates].sort((a, b) => a.length - b.length)[0];
}

/**
 * Turn a finished post into the scene brief plus the ad copy the Vintage
 * Detective layout should typeset. Source wording is preserved verbatim:
 * whole sentences are selected, never sliced at a character boundary. The
 * operator can edit the result before generating; the original post is
 * untouched.
 */
export function detectiveBriefFromPost(title: string, body: string): {
  subject: string;
  copy: DetectiveAdCopy;
} {
  const sentences = splitSentences(body);
  const titleClean = (title || '').replace(QUOTES, '');

  const headlineSource = titleClean || bestFit(sentences, COPY_LENGTH_GUIDANCE.headline) || sentences[0] || '';
  const headline = headlineSource.toUpperCase();

  const used = new Set([headlineSource.toLowerCase()]);
  const remaining = sentences.filter((s) => !used.has(s.toLowerCase()));

  // Prefer a sentence that carries the Aetheris explanation — that is the
  // depth the ad needs — otherwise the first remaining whole sentence.
  const explanation =
    remaining.find((s) => AETHERIS_HINT.test(s) && s.length <= COPY_LENGTH_GUIDANCE.body) ||
    bestFit(remaining, COPY_LENGTH_GUIDANCE.body);

  const kickerPool = remaining.filter((s) => s.toLowerCase() !== (explanation || '').toLowerCase());
  const lastFirst = [...kickerPool].reverse();
  const kickerSource =
    lastFirst.find((s) => s.length <= COPY_LENGTH_GUIDANCE.kicker) || '';
  const kicker = kickerSource.toUpperCase();

  const subject = [
    'A single page editorial advertisement for Aetheris Technology.',
    'Show the vintage humanoid detective inside an old office or corridor scene that visualises this business tension:',
    `"${headlineSource || explanation}".`,
    'Choose a fresh camera angle, pose and crop, with the typography occupying its own clean area of the page.',
  ].join(' ');

  return {
    subject,
    copy: {
      brand: 'AETHERIS TECHNOLOGY',
      headline,
      body: explanation && explanation.toLowerCase() !== headlineSource.toLowerCase() ? explanation : '',
      kicker: kicker && kicker !== headline ? kicker : '',
      footer: 'AETHERIS.TECHNOLOGY',
    },
  };
}
