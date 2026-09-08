import { describe, expect, it } from 'vitest';
import {
  AETHERIS_VINTAGE_DETECTIVE,
  ASPECT_OPTIONS,
  VISUAL_STYLE_PRESETS,
  detectiveBriefFromPost,
  splitSentences,
  getVisualStyle,
  isVisualStyleId,
} from './visualStyles';
import { STYLE_OPTIONS } from '@/components/admin/PostImageGenerator';

describe('visual style registry', () => {
  it('exposes the Vintage Detective preset with durable previews', () => {
    const preset = getVisualStyle(AETHERIS_VINTAGE_DETECTIVE);
    expect(preset).toBeDefined();
    expect(preset!.recommendedAspect).toBe('4:5');
    expect(preset!.drivesCopy).toBe(true);
    expect(preset!.previews.length).toBeGreaterThanOrEqual(2);
    for (const url of preset!.previews) {
      expect(url).toMatch(/^\/__l5e\/assets-v1\//);
    }
  });

  it('keeps the id stable and recognisable', () => {
    expect(AETHERIS_VINTAGE_DETECTIVE).toBe('aetheris-vintage-detective');
    expect(isVisualStyleId(AETHERIS_VINTAGE_DETECTIVE)).toBe(true);
    expect(isVisualStyleId('editorial_cartoon')).toBe(false);
    expect(VISUAL_STYLE_PRESETS).toHaveLength(1);
  });

  it('offers 4:5 among the aspect choices', () => {
    expect(ASPECT_OPTIONS.map((a) => a.id)).toContain('4:5');
  });
});

describe('post image style options', () => {
  it('adds the preset without dropping any existing style', () => {
    const keys = STYLE_OPTIONS.map((s) => s.key);
    for (const legacy of [
      'free', 'case_file', 'autopsy_diagram', 'blueprint',
      'editorial_cartoon', 'data_macro', 'noir_object', 'isometric',
    ]) {
      expect(keys).toContain(legacy);
    }
    expect(keys).toContain(AETHERIS_VINTAGE_DETECTIVE);
  });
});

describe('detectiveBriefFromPost', () => {
  const title = 'You bought the software. You still are the system.';
  const body = [
    'You connect the tools, explain the business and turn every report into instructions.',
    'That is work, too.',
    'Aetheris carries shared company knowledge into analysis, sales messages and content, so each task starts with context.',
    'Let the system learn the business.',
  ].join('\n');

  it('keeps whole sentences and never clips characters', () => {
    const { copy } = detectiveBriefFromPost(title, body);
    expect(copy.headline).toBe(title.toUpperCase());
    expect(copy.brand).toBe('AETHERIS TECHNOLOGY');
    expect(copy.footer).toBe('AETHERIS.TECHNOLOGY');
    expect(body).toContain(copy.body);
    expect(copy.body.endsWith('.')).toBe(true);
    expect(copy.body).not.toMatch(/\w$/);
  });

  it('prefers the Aetheris explanation for the supporting line', () => {
    const { copy } = detectiveBriefFromPost(title, body);
    expect(copy.body).toContain('Aetheris carries shared company knowledge');
  });

  it('falls back to a whole first sentence when there is no title', () => {
    const { copy, subject } = detectiveBriefFromPost('', body);
    expect(copy.headline).toBe(
      'You connect the tools, explain the business and turn every report into instructions.'.toUpperCase(),
    );
    expect(copy.headline).not.toBe(copy.body.toUpperCase());
    expect(subject).toContain('vintage humanoid detective');
  });

  it('never repeats the headline as body or kicker', () => {
    const { copy } = detectiveBriefFromPost('One line only.', 'One line only.');
    expect(copy.kicker).toBe('');
    expect(copy.body).toBe('');
  });

  it('handles a long-form post without a repeated opener', () => {
    const long = Array.from({ length: 12 }, (_, i) => `Sentence number ${i} about operations.`).join(' ');
    const { copy } = detectiveBriefFromPost('THE REPORT FOUND THE PROBLEM. WHO MOVES IT FORWARD?', long);
    expect(copy.body).not.toBe('');
    expect(copy.body.toUpperCase()).not.toBe(copy.headline);
    expect(copy.kicker).not.toBe(copy.headline);
    expect(long).toContain(copy.body);
  });

  it('handles a terse 40-word post', () => {
    const short = 'Your website promises it. Does your business deliver it? Aetheris checks the promise against the workflow. Book the audit.';
    const { copy } = detectiveBriefFromPost('', short);
    expect(copy.headline).toBe('YOUR WEBSITE PROMISES IT.');
    expect(short).toContain(copy.body);
    expect(copy.kicker).toBe('BOOK THE AUDIT.');
  });
});

describe('splitSentences', () => {
  it('splits on sentence ends and lines without losing words', () => {
    const parts = splitSentences('One thing. Another thing!\nThird line');
    expect(parts).toEqual(['One thing.', 'Another thing!', 'Third line']);
  });
});
