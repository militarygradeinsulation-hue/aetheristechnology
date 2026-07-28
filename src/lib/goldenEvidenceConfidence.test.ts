import { describe, expect, it } from "vitest";
import {
  buildEvidenceConfidence,
  EVIDENCE_CONFIDENCE_EXPLANATION,
  EVIDENCE_CONFIDENCE_TITLE,
  METHODOLOGY_LABELS,
} from "./goldenEvidenceConfidence";
import { buildGoldenReportModel } from "./goldenReportModel";
import { QA_FULL_REPORT, QA_META } from "./goldenReportParity.fixture";

const report = (consistency: unknown) => ({ report_consistency: consistency });

const FULL = report({
  detected_findings: 20,
  unique_root_causes: 12,
  uniquely_priced_leaks: 5,
  evidence_quality: {
    total: 25,
    verified: 2,
    inferred: 21,
    unverified: 2,
    contradicted: 0,
    verified_pct: 8,
    inferred_pct: 84,
    unverified_pct: 8,
    contradicted_pct: 0,
  },
});

describe("Evidence Confidence client-facing copy", () => {
  it("uses the exact executive labels and lead sentence", () => {
    const m = buildEvidenceConfidence(FULL)!;
    expect(m.title).toBe("Evidence Confidence");
    expect(m.lead).toBe(
      "This report evaluated 25 evidence-based claims across 20 findings and 12 root causes. No contradictions were detected. 5 revenue leaks had sufficient evidence to receive financial estimates.",
    );
    expect(m.metrics.map((x) => `${x.value} ${x.label}`)).toEqual([
      "25 Claims Evaluated",
      "20 Findings Detected",
      "5 Financially Modeled Leaks",
      "0 Contradictions Found",
    ]);
    expect(m.explanation).toBe(EVIDENCE_CONFIDENCE_EXPLANATION);
  });

  it("never uses dashes as punctuation in public copy", () => {
    const m = buildEvidenceConfidence(FULL)!;
    for (const text of [m.title, m.lead, m.explanation, ...m.metrics.map((x) => x.label)]) {
      expect(text).not.toMatch(/[—–]|\s-\s/);
    }
  });

  it("drops technical wording from the prominent section", () => {
    const m = buildEvidenceConfidence(FULL)!;
    const blob = [m.title, m.lead, m.explanation, ...m.metrics.map((x) => x.label)].join(" ");
    expect(blob).not.toMatch(/compiler state|claim grade|verified|inferred|unverified|%/i);
  });

  it("explains claims versus findings and keeps friendly detail labels", () => {
    const m = buildEvidenceConfidence(FULL)!;
    expect(m.methodologyNote).toMatch(/one finding can be supported by more than one claim/i);
    expect(m.methodologyRows).toEqual([
      { label: METHODOLOGY_LABELS.verified, value: 2 },
      { label: METHODOLOGY_LABELS.inferred, value: 21 },
      { label: METHODOLOGY_LABELS.unverified, value: 2 },
      { label: METHODOLOGY_LABELS.contradicted, value: 0 },
    ]);
    expect(METHODOLOGY_LABELS.verified).toBe("Directly observed");
    expect(METHODOLOGY_LABELS.inferred).toBe("Evidence-supported pattern");
    expect(METHODOLOGY_LABELS.unverified).toBe("Requires internal validation");
    expect(METHODOLOGY_LABELS.contradicted).toBe("Contradiction found");
  });
});

describe("missing counts", () => {
  it("omits metrics that are unavailable and reads naturally", () => {
    const m = buildEvidenceConfidence(
      report({ detected_findings: 7, evidence_quality: { verified: 3 } }),
    )!;
    expect(m.metrics.map((x) => x.key)).toEqual(["findings"]);
    expect(m.lead).toBe("This report documents 7 findings.");
    expect(m.methodologyRows).toEqual([{ label: METHODOLOGY_LABELS.verified, value: 3 }]);
  });

  it("reports contradictions when present", () => {
    const m = buildEvidenceConfidence(
      report({ detected_findings: 4, evidence_quality: { total: 9, contradicted: 1 } }),
    )!;
    expect(m.lead).toBe(
      "This report evaluated 9 evidence-based claims across 4 findings. 1 contradiction was detected and flagged.",
    );
  });

  it("returns null when the report has no consistency data", () => {
    expect(buildEvidenceConfidence({})).toBeNull();
    expect(buildEvidenceConfidence(null)).toBeNull();
  });

  it("never invents counts", () => {
    const m = buildEvidenceConfidence(report({ evidence_quality: {} }))!;
    expect(m.metrics).toEqual([]);
    expect(m.lead).toBe("");
  });
});

describe("website and PDF parity", () => {
  it("PDF section renders the same title, lead and metric values", () => {
    const model = buildGoldenReportModel(QA_FULL_REPORT as never, QA_META);
    const section = model.sections.find((s) => s.id === "evidence-quality")!;
    const confidence = buildEvidenceConfidence(QA_FULL_REPORT)!;
    expect(section.title).toBe(EVIDENCE_CONFIDENCE_TITLE);
    const text = JSON.stringify(section.blocks);
    expect(text).toContain(confidence.lead);
    expect(text).toContain(EVIDENCE_CONFIDENCE_EXPLANATION);
    for (const m of confidence.metrics) expect(text).toContain(m.label);
    for (const r of confidence.methodologyRows) expect(text).toContain(r.label);
    expect(text).not.toContain("Claim grade");
    expect(text).not.toContain("Compiler state");
    expect(text).not.toContain("Share of claims");
  });
});
