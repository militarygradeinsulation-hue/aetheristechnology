import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

// Joseph (2026-10-13): real prices are back on the public tier ladder shown on
// the home page. The tier amounts come from src/lib/aetherisTiers.ts and are
// always rendered in US dollars.
describe("priced tier ladder on the home page", () => {
  it("TierCard renders each tier's dollar amount with its cadence", () => {
    const src = read("src/components/TierLadder.tsx");
    expect(src).toMatch(/fmtUsd\(t\.amountCents\)/);
    expect(src).toMatch(/\/ month/);
    expect(src).toMatch(/one-time/);
  });

  it("the home page includes the priced tier ladder", () => {
    const src = read("src/pages/Home.tsx");
    expect(src).toMatch(/import \{ PackageTiers \} from '@\/components\/PackageTiers'/);
    expect(src).toMatch(/<PackageTiers \/>/);
  });
});
