// Random Post Generator — shared, pure logic for the Content Engine tool.
// Kept framework free so it can be unit tested and mirrored by the edge function.

export type LengthPresetId =
  | 'micro' | 'short' | 'social' | 'expanded' | 'article' | 'substack' | 'deep' | 'custom';

export interface LengthPreset {
  id: LengthPresetId;
  label: string;
  words: number;
  blurb: string;
}

export const LENGTH_PRESETS: LengthPreset[] = [
  { id: 'micro',    label: 'Micro',     words: 40,   blurb: 'about 40 words' },
  { id: 'short',    label: 'Short',     words: 100,  blurb: 'about 100 words' },
  { id: 'social',   label: 'Social',    words: 200,  blurb: 'about 200 words' },
  { id: 'expanded', label: 'Expanded',  words: 400,  blurb: 'about 400 words' },
  { id: 'article',  label: 'Article',   words: 750,  blurb: 'about 750 words' },
  { id: 'substack', label: 'Substack',  words: 1200, blurb: 'about 1,200 words' },
  { id: 'deep',     label: 'Deep Dive', words: 2000, blurb: 'about 2,000 words' },
  { id: 'custom',   label: 'Custom',    words: 0,    blurb: '40 to 3,000 words' },
];

export const CUSTOM_MIN_WORDS = 40;
export const CUSTOM_MAX_WORDS = 3000;
export const LENGTH_TOLERANCE = 0.10;

export type PlatformId = 'general' | 'linkedin' | 'facebook' | 'instagram' | 'x' | 'blog' | 'substack';

export const PLATFORMS: { id: PlatformId; label: string }[] = [
  { id: 'general',   label: 'General' },
  { id: 'linkedin',  label: 'LinkedIn' },
  { id: 'facebook',  label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x',         label: 'X / Threads' },
  { id: 'blog',      label: 'Blog' },
  { id: 'substack',  label: 'Substack' },
];

export type TopicModeId =
  | 'brand' | 'industry' | 'story' | 'educational' | 'contrarian' | 'custom';

export const TOPIC_MODES: { id: TopicModeId; label: string; hint: string }[] = [
  { id: 'brand',       label: 'Random Brand Topic',    hint: 'Pulled from your business and offer.' },
  { id: 'industry',    label: 'Random Industry Insight', hint: 'A pattern across the market you serve.' },
  { id: 'story',       label: 'Random Story or Opinion', hint: 'First person, lived, specific.' },
  { id: 'educational', label: 'Random Educational Post', hint: 'Teach one mechanism end to end.' },
  { id: 'contrarian',  label: 'Random Contrarian Take',  hint: 'Reframe accepted advice.' },
  { id: 'custom',      label: 'Custom Topic',            hint: 'You supply the subject.' },
];

export const TONES = [
  'Forensic Operator', 'Direct', 'Analytical', 'Warm', 'Punchy', 'Story Driven', 'Executive',
] as const;

/** Substack always defaults to the long form target, other lengths remain selectable. */
export function defaultPresetForPlatform(platform: PlatformId): LengthPresetId {
  return platform === 'substack' ? 'substack' : 'social';
}

export function isValidPlatform(v: unknown): v is PlatformId {
  return typeof v === 'string' && PLATFORMS.some((p) => p.id === v);
}

export function isValidMode(v: unknown): v is TopicModeId {
  return typeof v === 'string' && TOPIC_MODES.some((m) => m.id === v);
}

export function isValidPreset(v: unknown): v is LengthPresetId {
  return typeof v === 'string' && LENGTH_PRESETS.some((p) => p.id === v);
}

/** Resolve the numeric word target. Throws on an invalid preset or out of range custom value. */
export function resolveTargetWords(preset: LengthPresetId, customWords?: number): number {
  const found = LENGTH_PRESETS.find((p) => p.id === preset);
  if (!found) throw new Error('Unknown length preset');
  if (preset !== 'custom') return found.words;
  const n = Math.round(Number(customWords));
  if (!Number.isFinite(n)) throw new Error('Custom length must be a number');
  if (n < CUSTOM_MIN_WORDS || n > CUSTOM_MAX_WORDS) {
    throw new Error(`Custom length must be between ${CUSTOM_MIN_WORDS} and ${CUSTOM_MAX_WORDS} words`);
  }
  return n;
}

export function clampCustomWords(n: number): number {
  if (!Number.isFinite(n)) return CUSTOM_MIN_WORDS;
  return Math.min(CUSTOM_MAX_WORDS, Math.max(CUSTOM_MIN_WORDS, Math.round(n)));
}

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function toleranceBand(target: number, tolerance = LENGTH_TOLERANCE) {
  return {
    min: Math.floor(target * (1 - tolerance)),
    max: Math.ceil(target * (1 + tolerance)),
  };
}

export function withinTolerance(words: number, target: number, tolerance = LENGTH_TOLERANCE): boolean {
  const { min, max } = toleranceBand(target, tolerance);
  return words >= min && words <= max;
}

/** True when the target is long enough to deserve a title and multi paragraph structure. */
export function wantsTitle(target: number): boolean {
  return target >= 700;
}

/** Randomness: a rotating pool of content angles so two runs never share a seed back to back. */
export const CONTENT_ANGLES = [
  'a number nobody in the room wants to say out loud',
  'the gap between what the process claims and what it does',
  'a small operational habit with an outsized cost',
  'the moment a good lead quietly goes cold',
  'a piece of advice the market repeats without testing',
  'what the data says versus what the team believes',
  'the handoff where accountability disappears',
  'a fix that takes an afternoon and pays for a year',
  'the difference between busy and productive capacity',
  'what a first time buyer actually experiences',
  'the cost of a slow reply measured in real money',
  'a metric that looks healthy and hides a leak',
  'the story behind a decision that went sideways',
  'a tool that was bought and never adopted',
  'the quiet compounding of one broken step',
  'why the obvious answer is usually the wrong one',
  'a pattern that shows up in every business of this size',
  'what changes when one owner stops being the bottleneck',
];

export interface SeedInput {
  angles?: string[];
  recentSeeds?: string[];
  random?: () => number;
}

/** Pick an angle that was not used by recent generations in this session. */
export function pickAngle({ angles = CONTENT_ANGLES, recentSeeds = [], random = Math.random }: SeedInput = {}): string {
  const pool = angles.filter((a) => !recentSeeds.includes(a));
  const source = pool.length ? pool : angles;
  return source[Math.floor(random() * source.length) % source.length];
}

export function makeSeed(random: () => number = Math.random): string {
  return Math.floor(random() * 1e9).toString(36) + Date.now().toString(36);
}

/** Normalized fingerprint used to reject an immediate repeat of a prior generation. */
export function fingerprint(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
}

export function isDuplicate(text: string, recent: string[]): boolean {
  const fp = fingerprint(text);
  if (!fp) return false;
  return recent.some((r) => fingerprint(r) === fp);
}

export interface RandomPostRequest {
  platform: PlatformId;
  mode: TopicModeId;
  preset: LengthPresetId;
  customWords?: number;
  topic?: string;
  tone?: string;
  angle?: string;
  seed?: string;
  avoid?: string[];
}

export interface ValidatedRequest extends RandomPostRequest {
  targetWords: number;
}

/** Server and client share this validator so the two never drift. */
export function validateRequest(body: Partial<RandomPostRequest>): ValidatedRequest {
  if (!isValidPlatform(body.platform)) throw new Error('Invalid platform');
  if (!isValidMode(body.mode)) throw new Error('Invalid topic mode');
  if (!isValidPreset(body.preset)) throw new Error('Invalid length preset');
  const targetWords = resolveTargetWords(body.preset, body.customWords);
  const topic = (body.topic || '').toString().trim().slice(0, 400);
  if (body.mode === 'custom' && !topic) throw new Error('A custom topic requires topic text');
  return {
    platform: body.platform,
    mode: body.mode,
    preset: body.preset,
    customWords: body.customWords,
    targetWords,
    topic,
    tone: (body.tone || '').toString().trim().slice(0, 60),
    angle: (body.angle || '').toString().trim().slice(0, 300),
    seed: (body.seed || '').toString().trim().slice(0, 64),
    avoid: Array.isArray(body.avoid) ? body.avoid.slice(0, 6).map((a) => String(a).slice(0, 600)) : [],
  };
}

/** Draft persistence, mirrors the project pattern of namespaced localStorage keys. */
export const RANDOM_POST_DRAFT_KEY = 'aetheris_random_post_draft_v1';

export interface RandomPostDraft {
  platform: PlatformId;
  mode: TopicModeId;
  preset: LengthPresetId;
  customWords: number;
  topic: string;
  tone: string;
  title: string;
  body: string;
  words: number;
  savedAt: string;
}

export function serializeDraft(d: RandomPostDraft): string {
  return JSON.stringify(d);
}

export function parseDraft(raw: string | null): RandomPostDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as RandomPostDraft;
    if (!isValidPlatform(d.platform) || !isValidMode(d.mode) || !isValidPreset(d.preset)) return null;
    return {
      ...d,
      customWords: clampCustomWords(Number(d.customWords) || CUSTOM_MIN_WORDS),
      topic: String(d.topic || ''),
      tone: String(d.tone || ''),
      title: String(d.title || ''),
      body: String(d.body || ''),
      words: countWords(String(d.body || '')),
    };
  } catch {
    return null;
  }
}
