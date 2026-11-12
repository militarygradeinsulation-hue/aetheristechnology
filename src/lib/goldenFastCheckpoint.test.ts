import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const worker = readFileSync(resolve(process.cwd(), "supabase/functions/forensic-scan-all/index.ts"), "utf8");

describe("Golden Report durable synthesis checkpoint", () => {
  it("persists synthesized output before isolated growth assets and finalization", () => {
    const scanWorker = worker.slice(worker.indexOf("async function runScan("), worker.indexOf("async function finalizeSavedScan("));
    expect(scanWorker).toContain('status: "finalizing"');
    expect(scanWorker).toContain("raw_findings: findings,");
    expect(scanWorker).toContain("stage_status,");
    expect(scanWorker).toContain("report,");
    expect(scanWorker.indexOf('status: "finalizing"')).toBeLessThan(scanWorker.indexOf('action:"finalize"'));
    expect(scanWorker).not.toContain('await stage("assets", "running"');
  });

  it("runs deterministic growth assets in the isolated finalizer", () => {
    const finalizer = worker.slice(worker.indexOf("async function finalizeSavedScan("), worker.indexOf("// ─────────────────────────────── handler"));
    expect(finalizer).toContain('await stage("assets", "running"');
    expect(finalizer).toContain("buildFallbackDeliverables(");
    expect(finalizer).toContain("compileGoldenReport(");
    expect(finalizer.indexOf("buildFallbackDeliverables(")).toBeLessThan(finalizer.indexOf("compileGoldenReport("));
  });

  it("uses bounded brand analysis and clears watchdog on settled synthesis", () => {
    expect(worker).toContain('aiJson(prompt, 2200, 9_000, undefined, "bulk", false)');
    expect(worker).toContain("cancelWatchdog?.()");
    expect(worker).toContain("90_000");
  });

  it("preserves a persisted synthesis checkpoint if the isolated finalizer handoff fails", () => {
    const workerCode = worker.slice(worker.indexOf("async function runScan("), worker.indexOf("async function finalizeSavedScan("));
    expect(workerCode).toContain('console.error("Golden Report finalizer handoff needs recovery"');
    expect(workerCode).toContain('.in("status", ["queued", "running"])');
    expect(workerCode).not.toContain('if (handoff?.error) throw new Error');
  });

  it("allows two bounded manual attempts after the old three-attempt cap", () => {
    const handler = worker.slice(worker.indexOf('if (body.action === "finalize")'));
    expect(handler).toContain("body.confirm_saved_retry === true");
    expect(handler).toContain("priorAttempt >= 5");
    expect(handler).toContain("priorAttempt >= 3 && !manualSavedRetry");
    expect(worker).toContain('event: "golden_compile_first_pass"');
  });

  it("allows checkpoint recovery without requiring post-processing to be done", () => {
    const handler = worker.slice(worker.indexOf('if (body.action === "finalize")'));
    expect(handler).toContain("Synthesized report checkpoint is not ready for finalization");
    expect(handler).not.toContain('stages.assets?.state||""');
  });
});
