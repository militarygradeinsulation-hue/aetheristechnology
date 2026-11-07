import { describe, expect, it } from "vitest";
import { missingGoldenReportArchiveIds } from "../../supabase/functions/_shared/golden-report-reconciliation";

describe("Golden Report completed-scan archive recovery", () => {
  it("finds a completed saved report missing from the permanent library index", () => {
    expect(missingGoldenReportArchiveIds(["scan-a", "scan-b", "scan-c"], ["scan-a", "scan-c"]))
      .toEqual(["scan-b"]);
  });

  it("does not archive the same report twice", () => {
    expect(missingGoldenReportArchiveIds(["scan-a", "scan-a", "scan-b"], ["scan-b"]))
      .toEqual(["scan-a"]);
  });

  it("does nothing when the completed scans are all indexed", () => {
    expect(missingGoldenReportArchiveIds(["scan-a", "scan-b"], ["scan-a", "scan-b"]))
      .toEqual([]);
  });

  it("ignores empty scan identifiers", () => {
    expect(missingGoldenReportArchiveIds(["", "scan-a"], []))
      .toEqual(["scan-a"]);
  });
});
