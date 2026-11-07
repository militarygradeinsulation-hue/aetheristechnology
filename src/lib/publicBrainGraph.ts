export const BRAIN_TOPICS = [
  { id: 'people', label: 'People', detail: 'Clear ownership keeps work from falling between people.', position: [-1.65, 0.85, 0.65] },
  { id: 'decisions', label: 'Decisions', detail: 'Delayed approvals hold up the work that follows.', position: [-0.65, 1.55, 0.45] },
  { id: 'processes', label: 'Processes', detail: 'Repeatable handoffs reduce rework and wasted time.', position: [1.2, 1.05, 0.75] },
  { id: 'systems', label: 'Systems', detail: 'Connected tools keep people from entering the same data twice.', position: [1.8, -0.15, 0.5] },
  { id: 'communication', label: 'Communication', detail: 'Shared information helps teams act on the same facts.', position: [-1.35, -0.75, 0.9] },
  { id: 'friction', label: 'Revenue Friction', detail: 'Delays, missed handoffs and rework can eat into margin.', position: [0.55, -1.1, 1.05] },
] as const;

// Authored explanatory relationships, never a projection of private report findings.
export const BRAIN_RELATIONSHIPS = [[0, 1], [0, 2], [0, 4], [1, 2], [1, 5], [2, 3], [2, 5], [3, 4], [3, 5], [4, 1], [4, 5]] as const;
export const BRAIN_ZOOM = { min: 5.7, max: 10.5, initial: 8 };
export function brainNeighborhood(index: number): Set<number> {
  const neighbors = new Set([index]);
  for (const [a, b] of BRAIN_RELATIONSHIPS) {
    if (a === index) neighbors.add(b);
    if (b === index) neighbors.add(a);
  }
  return neighbors;
}

export function createBrainPoints(): number[][] {
  const points: number[][] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 190; i++) {
      const y = 1 - 2 * (i + 0.5) / 190;
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      const ring = Math.sqrt(1 - y * y);
      const fold = 1 + 0.065 * Math.sin(angle * 5 + y * 9);
      points.push([
        side * (0.94 + Math.cos(angle) * ring * 0.85 * fold),
        y * 1.65 * fold,
        Math.sin(angle) * ring * 1.12 * fold - 0.18,
      ]);
    }
  }
  return points;
}