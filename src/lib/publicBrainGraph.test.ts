import { describe, expect, it } from 'vitest';
import { BRAIN_TOPICS, BRAIN_RELATIONSHIPS, BRAIN_ZOOM, brainNeighborhood, createBrainPoints } from './publicBrainGraph';

describe('public illustrative brain rules', () => {
  it('includes the six requested business topics', () => {
    expect(BRAIN_TOPICS.map(topic => topic.label)).toEqual(['People', 'Decisions', 'Processes', 'Systems', 'Communication', 'Revenue Friction']);
  });
  it('focuses only the selected topic and its connected neighborhood', () => {
    expect([...brainNeighborhood(0)].sort()).toEqual([0, 1, 2, 4]);
    expect(brainNeighborhood(0).has(5)).toBe(false);
    for (const [a, b] of BRAIN_RELATIONSHIPS) expect(brainNeighborhood(a).has(b)).toBe(true);
  });
  it('keeps zoom bounded and the full initial shape in view', () => {
    expect(BRAIN_ZOOM).toEqual({ min: 5.7, max: 10.5, initial: 8 });
    expect(BRAIN_ZOOM.initial).toBeGreaterThan(BRAIN_ZOOM.min);
    expect(BRAIN_ZOOM.initial).toBeLessThan(BRAIN_ZOOM.max);
  });
  it('uses a deterministic bounded bilateral shape', () => {
    const points = createBrainPoints();
    expect(points).toHaveLength(380);
    expect(points).toEqual(createBrainPoints());
    expect(points.every(point => point.every(value => Number.isFinite(value) && Math.abs(value) < 2))).toBe(true);
    expect(points.filter(point => point[0] < 0)).toHaveLength(190);
  });
});