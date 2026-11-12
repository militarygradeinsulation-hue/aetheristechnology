/**
 * Golden Report scan health checks shared by the runner and its regression tests.
 * Never assume that a missing response means the scan finished.
 */
export type GoldenScanSnapshot = {
  status: string;
  updated_at?: string | null;
  stage_status?: Record<string, { state?: string } | undefined> | null;
  report?: { synthesis_incomplete?: boolean } | null;
};

export const GOLDEN_FINALIZATION_RECOVERY_MS = 90_000;
export const GOLDEN_STALLED_SCAN_MS = 180_000;

function ageSinceUpdate(scan: GoldenScanSnapshot, nowMs: number): number | null {
  const last = Date.parse(scan.updated_at || "");
  return Number.isFinite(last) ? Math.max(0, nowMs - last) : null;
}

/** A queued/running/finalizing scan with no progress for three minutes is stale. */
export function isGoldenScanStalled(scan: GoldenScanSnapshot | null, nowMs = Date.now()): boolean {
  if (!scan || !["queued", "running", "finalizing"].includes(scan.status)) return false;
  const age = ageSinceUpdate(scan, nowMs);
  return age !== null && age >= GOLDEN_STALLED_SCAN_MS;
}

/**
 * A saved AI synthesis can be compiled again without another website crawl
 * or another model synthesis. The backend authorizes and rate-limits retries.
 */
export function canRecoverGoldenCheckpoint(scan: GoldenScanSnapshot | null, nowMs = Date.now()): boolean {
  if (!scan || !["running", "finalizing", "failed"].includes(scan.status)) return false;
  if (!scan.report || scan.report.synthesis_incomplete === true) return false;
  const synthesis = scan.stage_status?.synth?.state;
  if (synthesis !== "done" && synthesis !== "degraded") return false;
  if (scan.status === "failed") return true;
  const age = ageSinceUpdate(scan, nowMs);
  return age !== null && age >= GOLDEN_FINALIZATION_RECOVERY_MS;
}
