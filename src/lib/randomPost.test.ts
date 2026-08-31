import { describe, it, expect, beforeEach } from 'vitest';
import {
  LENGTH_PRESETS, PLATFORMS, TOPIC_MODES, CUSTOM_MIN_WORDS, CUSTOM_MAX_WORDS,
  RANDOM_POST_DRAFT_KEY, clampCustomWords, countWords, defaultPresetForPlatform, fingerprint,
  isDuplicate, makeSeed, parseDraft, pickAngle, resolveTargetWords, serializeDraft, toleranceBand,
  validateRequest, withinTolerance, wantsTitle, CONTENT_ANGLES,
} from './randomPost';

describe('length presets', () => {
  it('exposes every required preset with the documented word target', () => {
    const map = Object.fromEntries(LENGTH_PRESETS.map(p => [p.id, p.words]));
    expect(map.micro).toBe(40);
    expect(map.short).toBe(100);
    expect(map.social).toBe(200);
    expect(map.expanded).toBe(400);
    expect(map.article).toBe(750);
    expect(map.substack).toBe(1200);
    expect(map.deep).toBe(2000);
    expect(map.custom).toBe(0);
  });

  it('resolves each non custom preset to its target', () => {
    for (const p of LENGTH_PRESETS.filter(p => p.id !== 'custom')) {
      expect(resolveTargetWords(p.id)).toBe(p.words);
    }
  });

  it('rejects an unknown preset', () => {
    expect(() => resolveTargetWords('huge' as never)).toThrow();
  });
});

describe('custom bounds', () => {
  it('accepts values inside the range', () => {
    expect(resolveTargetWords('custom', 40)).toBe(40);
    expect(resolveTargetWords('custom', 3000)).toBe(3000);
    expect(resolveTargetWords('custom', 917)).toBe(917);
  });
  it('rejects values outside the range or not numeric', () => {
    expect(() => resolveTargetWords('custom', 39)).toThrow();
    expect(() => resolveTargetWords('custom', 3001)).toThrow();
    expect(() => resolveTargetWords('custom', NaN)).toThrow();
  });
  it('clamps into range for the input field', () => {
    expect(clampCustomWords(1)).toBe(CUSTOM_MIN_WORDS);
    expect(clampCustomWords(99999)).toBe(CUSTOM_MAX_WORDS);
    expect(clampCustomWords(250.4)).toBe(250);
  });
});

describe('platforms', () => {
  it('offers every required platform', () => {
    expect(PLATFORMS.map(p => p.id)).toEqual(['general', 'linkedin', 'facebook', 'instagram', 'x', 'blog', 'substack']);
  });
  it('defaults Substack to 1200 words while other platforms do not', () => {
    expect(defaultPresetForPlatform('substack')).toBe('substack');
    expect(resolveTargetWords(defaultPresetForPlatform('substack'))).toBe(1200);
    expect(defaultPresetForPlatform('linkedin')).toBe('social');
  });
  it('still allows another length on Substack', () => {
    const v = validateRequest({ platform: 'substack', mode: 'brand', preset: 'micro' });
    expect(v.targetWords).toBe(40);
  });
});

describe('topic modes', () => {
  it('offers every required mode', () => {
    expect(TOPIC_MODES.map(m => m.id)).toEqual(['brand', 'industry', 'story', 'educational', 'contrarian', 'custom']);
  });
  it('requires topic text for the custom mode', () => {
    expect(() => validateRequest({ platform: 'general', mode: 'custom', preset: 'short' })).toThrow(/custom topic/i);
    expect(validateRequest({ platform: 'general', mode: 'custom', preset: 'short', topic: 'pricing' }).topic).toBe('pricing');
  });
});

describe('request validation', () => {
  it('rejects an invalid platform or mode', () => {
    expect(() => validateRequest({ platform: 'myspace' as never, mode: 'brand', preset: 'short' })).toThrow(/platform/i);
    expect(() => validateRequest({ platform: 'general', mode: 'vibes' as never, preset: 'short' })).toThrow(/mode/i);
  });
  it('caps the avoid list', () => {
    const v = validateRequest({ platform: 'general', mode: 'brand', preset: 'short', avoid: Array(20).fill('x') });
    expect(v.avoid!.length).toBe(6);
  });
});

describe('word count enforcement', () => {
  it('counts words ignoring extra whitespace', () => {
    expect(countWords('  one  two\nthree ')).toBe(3);
    expect(countWords('')).toBe(0);
  });
  it('builds a plus or minus ten percent band', () => {
    expect(toleranceBand(1200)).toEqual({ min: 1080, max: 1320 });
  });
  it('accepts drafts inside tolerance and rejects drafts outside it', () => {
    expect(withinTolerance(1100, 1200)).toBe(true);
    expect(withinTolerance(900, 1200)).toBe(false);
    expect(withinTolerance(1500, 1200)).toBe(false);
  });
  it('does not truncate long output when measuring it', () => {
    const long = Array(2400).fill('word').join(' ');
    expect(countWords(long)).toBe(2400);
    expect(withinTolerance(countWords(long), 2000)).toBe(false);
  });
});

describe('title and structure', () => {
  it('asks for a title only at article length and above', () => {
    expect(wantsTitle(200)).toBe(false);
    expect(wantsTitle(750)).toBe(true);
    expect(wantsTitle(1200)).toBe(true);
    expect(wantsTitle(2000)).toBe(true);
  });
});

describe('randomness and duplicate protection', () => {
  it('never repeats an angle already used in this session', () => {
    const used: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = pickAngle({ recentSeeds: used });
      expect(used).not.toContain(a);
      used.push(a);
    }
    expect(used.length).toBe(10);
    expect(CONTENT_ANGLES.length).toBeGreaterThan(10);
  });
  it('mints a distinct seed per call', () => {
    expect(makeSeed()).not.toBe(makeSeed(() => 0.5));
  });
  it('flags an exact repeat regardless of casing or punctuation', () => {
    const a = 'The follow up dies on day two.';
    expect(isDuplicate('the follow up dies on day two', [a])).toBe(true);
    expect(isDuplicate('Something entirely different.', [a])).toBe(false);
    expect(fingerprint('  A  B! ')).toBe('a b');
  });
});

describe('draft persistence', () => {
  beforeEach(() => localStorage.clear());
  it('round trips selections and output', () => {
    const draft = {
      platform: 'substack' as const, mode: 'story' as const, preset: 'substack' as const,
      customWords: 500, topic: 't', tone: 'Direct', title: 'Title',
      body: 'one two three', words: 1200, savedAt: new Date().toISOString(),
    };
    localStorage.setItem(RANDOM_POST_DRAFT_KEY, serializeDraft(draft));
    const back = parseDraft(localStorage.getItem(RANDOM_POST_DRAFT_KEY));
    expect(back?.platform).toBe('substack');
    expect(back?.preset).toBe('substack');
    expect(back?.body).toBe('one two three');
    expect(back?.words).toBe(3);
  });
  it('returns null for corrupt or unknown drafts', () => {
    expect(parseDraft('not json')).toBeNull();
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft(JSON.stringify({ platform: 'nope', mode: 'brand', preset: 'short' }))).toBeNull();
  });
});

describe('brand voice context', () => {
  it('keeps the request valid for a guest with no stored voice', () => {
    const v = validateRequest({ platform: 'general', mode: 'industry', preset: 'expanded' });
    expect(v.targetWords).toBe(400);
    expect(v.tone).toBe('');
  });
});
