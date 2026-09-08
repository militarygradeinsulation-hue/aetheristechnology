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

/**
 * Turn a finished post into the scene brief plus the exact copy the Vintage
 * Detective layout should typeset. The post text is never paraphrased.
 */
export function detectiveBriefFromPost(title: string, body: string): {
  subject: string;
  copy: { brand: string; headline: string; body: string; kicker: string; footer: string };
} {
  const lines = (body || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const raw = (title || lines[0] || '').replace(/^["'“”]+|["'“”]+$/g, '');
  const headline = raw.slice(0, 70).toUpperCase();
  const supporting = (lines.find((l) => l !== raw) || '').slice(0, 180);
  const kicker = (lines[lines.length - 1] || '').slice(0, 60).toUpperCase();

  const subject = [
    'A single page editorial advertisement for Aetheris Technology.',
    'Show the vintage humanoid detective inside an old office or corridor scene that visualises this business tension:',
    `"${(raw || supporting).slice(0, 180)}".`,
    'Choose a fresh camera angle, pose and crop, with the typography occupying its own clean area of the page.',
  ].join(' ');

  return {
    subject,
    copy: {
      brand: 'AETHERIS TECHNOLOGY',
      headline,
      body: supporting,
      kicker: kicker && kicker !== headline ? kicker : '',
      footer: 'AETHERIS.TECHNOLOGY',
    },
  };
}
