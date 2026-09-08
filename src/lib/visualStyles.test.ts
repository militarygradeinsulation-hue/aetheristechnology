import { describe, expect, it } from 'vitest';
import {
  AETHERIS_VINTAGE_DETECTIVE,
  ASPECT_OPTIONS,
  VISUAL_STYLE_PRESETS,
  detectiveBriefFromPost,
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
    'Let the system learn the business.',
  ].join('\n');

  it('derives an uppercase headline from the supplied copy without paraphrasing', () => {
    const { copy } = detectiveBriefFromPost(title, body);
    expect(copy.headline).toBe(title.slice(0, 70).toUpperCase());
    expect(copy.brand).toBe('AETHERIS TECHNOLOGY');
    expect(copy.footer).toBe('AETHERIS.TECHNOLOGY');
    expect(body).toContain(copy.body);
  });

  it('falls back to the first body line when there is no title', () => {
    const { copy, subject } = detectiveBriefFromPost('', body);
    expect(copy.headline).toBe(
      'You connect the tools, explain the business and turn every report into instructions.'
        .slice(0, 70).toUpperCase(),
    );
    expect(subject).toContain('vintage humanoid detective');
  });

  it('never repeats the headline as the kicker', () => {
    const { copy } = detectiveBriefFromPost('One line only.', 'One line only.');
    expect(copy.kicker).toBe('');
  });
});
