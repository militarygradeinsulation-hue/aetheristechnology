import { describe, expect, it } from "vitest";
import { generateForensicGoldenPdf } from "@/lib/generateForensicGoldenPdf";
import { QA_FULL_REPORT, QA_META } from "./goldenReportParity.fixture";
import { canExportGoldenReportSource } from "../../supabase/functions/_shared/golden-download-access";
import { canDownloadSavedGoldenReport } from "@/lib/goldenReportDownloadAvailability";

const flagged = {
  ...QA_FULL_REPORT,
  report_state: "regeneration_required",
  compiler: { state: "regeneration_required", violations: [], repairs: [] },
};

describe("Golden Report historical exports", () => {
  it("does not relax the client-facing validation gate", () => {
    expect(() => generateForensicGoldenPdf({ report: flagged as never, ...QA_META }))
      .toThrow(/cannot be exported/);
  });

  it("exports a historical report despite the validation gate, with a warning on every page", () => {
    const doc = generateForensicGoldenPdf({
      report: flagged as never,
      ...QA_META,
      profile: "complete",
      archivalCopy: { valid: false, state: "regeneration_required" },
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const pdfTextCommands = JSON.stringify(doc.internal.pages);
    const banners = pdfTextCommands.match(/HISTORICAL ARCHIVE - NOT VERIFIED/g) || [];
    expect(banners.length).toBe(doc.getNumberOfPages());
    expect(pdfTextCommands).toContain("NOT VERIFIED");
  });

  it.each(["executive", "complete", "data_appendix"] as const)(
    "preserves a downloadable %s PDF when the compiler says needs_review",
    (profile) => {
      const needsReview = {
        ...QA_FULL_REPORT,
        report_state: "needs_review",
        compiler: {
          state: "needs_review",
          violations: [{ code: "duplicated_narrative", location: "chapters[4].what_its_costing", detail: "Repeated narrative" }],
        },
      };
      // Normal customer PDF retains its verification gate.
      expect(() => generateForensicGoldenPdf({
        report: needsReview as never,
        ...QA_META,
        profile,
      })).toThrow(/cannot be exported/);
      // The exact same saved payload is always exportable as a historical copy.
      const doc = generateForensicGoldenPdf({
        report: needsReview as never,
        ...QA_META,
        profile,
        archivalCopy: { valid: false, state: "needs_review" },
      });
      expect(doc.getNumberOfPages()).toBeGreaterThan(0);
      const commands = JSON.stringify(doc.internal.pages);
      expect(commands).toContain("HISTORICAL ARCHIVE - NOT VERIFIED");
      expect((commands.match(/HISTORICAL ARCHIVE - NOT VERIFIED/g) || []).length)
        .toBe(doc.getNumberOfPages());
    },
  );

  it("distinguishes a validated archive copy from an unverified historical copy", () => {
    const doc = generateForensicGoldenPdf({
      report: QA_FULL_REPORT as never,
      ...QA_META,
      profile: "complete",
      archivalCopy: { valid: true, state: "compiled" },
    });
    const commands = JSON.stringify(doc.internal.pages);
    expect(commands).toContain("ARCHIVED GOLDEN REPORT");
    expect(commands).not.toContain("HISTORICAL ARCHIVE - NOT VERIFIED");
  });
});


describe("Golden Report source download authorization", () => {
  it("blocks shared portal access to a private intake report", () => {
    expect(canExportGoldenReportSource(false, true)).toBe(false);
  });
  it("permits administrators to export a private report", () => {
    expect(canExportGoldenReportSource(true, true)).toBe(true);
  });
  it("permits authorized non-private library reports", () => {
    expect(canExportGoldenReportSource(false, false)).toBe(true);
    expect(canExportGoldenReportSource(false, null)).toBe(true);
  });
});


describe("Saved Golden Report button availability", () => {
  it("enables all PDF downloads for the exact needs_review condition in the screenshot", () => {
    const saved = {
      executive_summary: "The saved report has findings.",
      chapters: Array.from({ length: 14 }, (_, i) => ({ no: i + 1, title: "Chapter " + (i + 1) })),
      compiler: { state: "needs_review", violations: [{ code: "duplicated_narrative" }] },
    };
    expect(canDownloadSavedGoldenReport(saved)).toBe(true);
  });

  it("allows downloading unverified historical reports without another scan", () => {
    expect(canDownloadSavedGoldenReport({
      report_state: "regeneration_required",
      compiler: { state: "regeneration_required" },
      executive_summary: "Historical source retained.",
    })).toBe(true);
  });

  it("does not display an active download for an unsaved or missing report", () => {
    expect(canDownloadSavedGoldenReport(null)).toBe(false);
    expect(canDownloadSavedGoldenReport(undefined)).toBe(false);
    expect(canDownloadSavedGoldenReport({})).toBe(false);
    expect(canDownloadSavedGoldenReport([])).toBe(false);
  });
});
