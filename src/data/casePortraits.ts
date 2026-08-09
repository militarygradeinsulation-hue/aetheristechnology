// One unique hyperrealistic portrait per case file (50 total, no duplicates).
// Files live on the CDN as .asset.json pointers, loaded eagerly at build time.

const pointers = import.meta.glob<{ default: { url: string } }>(
  '@/assets/case-portraits/case*.jpg.asset.json',
  { eager: true },
);

const BY_ID: Record<number, string> = {};
for (const [path, mod] of Object.entries(pointers)) {
  const m = path.match(/case(\d+)\.jpg\.asset\.json$/);
  if (m) BY_ID[Number(m[1])] = mod.default.url;
}

/** Portrait for a given case id. Unique per case, never reused. */
export function portraitForCase(id: number): string | null {
  return BY_ID[id] ?? null;
}
