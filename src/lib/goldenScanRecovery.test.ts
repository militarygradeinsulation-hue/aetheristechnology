import { describe, expect, it } from "vitest";
import {
  canRecoverGoldenCheckpoint,
  isGoldenScanStalled,
  GOLDEN_STALLED_SCAN_MS,
} from "./goldenScanRecovery";

const now = Date.parse("2026-11-12T16:00:00Z");
const snapshot = (overrides: Record<string, unknown> = {}) => ({
  status: "finalizing",
  updated_at: new Date(now - 100_000).toISOString(),
  report: { chapters: [{ title: "Evidence-backed chapter" }] },
  stage_status: { synth: { state: "done" } },
  ...overrides,
});

describe("Golden Report scan recovery", () => {
  it("allows a stale synthesized checkpoint to be finalized without a second crawl", () => {
    expect(canRecoverGoldenCheckpoint(snapshot(), now)).toBe(true);
  });

  it("allows recovery of a failed finalization when the synthesis is saved", () => {
    expect(canRecoverGoldenCheckpoint(snapshot({ status: "failed", updated_at: new Date(now).toISOString() }), now)).toBe(true);
  });

  it("never resumes queued, missing, or preliminary synthesis", () => {
    expect(canRecoverGoldenCheckpoint(snapshot({ status: "queued" }), now)).toBe(false);
    expect(canRecoverGoldenCheckpoint(snapshot({ report: null }), now)).toBe(false);
    expect(canRecoverGoldenCheckpoint(snapshot({ report: { synthesis_incomplete: true } }), now)).toBe(false);
    expect(canRecoverGoldenCheckpoint(snapshot({ stage_status: { synth: { state: "running" } } }), now)).toBe(false);
  });

  it("does not interrupt a recent finalizer or recover completed work", () => {
    expect(canRecoverGoldenCheckpoint(snapshot({ updated_at: new Date(now - 20_000).toISOString() }), now)).toBe(false);
    expect(canRecoverGoldenCheckpoint(snapshot({ status: "completed" }), now)).toBe(false);
  });

  it("recognizes a stalled scan instead of leaving an endless progress spinner", () => {
    expect(isGoldenScanStalled(snapshot({ status: "running", updated_at: new Date(now - GOLDEN_STALLED_SCAN_MS).toISOString() }), now)).toBe(true);
    expect(isGoldenScanStalled(snapshot({ status: "queued", updated_at: new Date(now - 20_000).toISOString() }), now)).toBe(false);
    expect(isGoldenScanStalled(snapshot({ status: "completed" }), now)).toBe(false);
    expect(isGoldenScanStalled(snapshot({ updated_at: "invalid" }), now)).toBe(false);
  });
});
