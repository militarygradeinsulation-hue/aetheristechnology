import { it, expect } from "vitest";
import fs from "node:fs";
import { generateForensicGoldenPdf } from "./generateForensicGoldenPdf";
import { QA_FULL_REPORT, QA_META } from "./goldenReportParity.fixture";

it("qa render", () => {
  const doc = generateForensicGoldenPdf({ report: QA_FULL_REPORT as never, ...QA_META });
  fs.writeFileSync("/tmp/qa/golden.pdf", Buffer.from(doc.output("arraybuffer")));
  expect(doc.getNumberOfPages()).toBeGreaterThan(3);
});
