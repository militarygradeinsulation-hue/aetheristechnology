import { readFileSync } from "node:fs";
import { it } from "vitest";
import { buildGoldenReportModel } from "../../supabase/functions/_shared/golden-report-model.ts";

it("aspen render audit", () => {
  const raw = JSON.parse(readFileSync("/tmp/aspen/report.json", "utf8"));
  const model = buildGoldenReportModel({
    report: raw, company_name: "Aspen Carbon Cat", target_url: "https://aspencarboncat.com",
    scan_id: "05820df7", created_at: new Date().toISOString(),
  } as never);
  const text = JSON.stringify(model);
  console.log("STALE 17,200 hits:", (text.match(/17,200/g) || []).length);
  console.log("STALE 36,500 hits:", (text.match(/36,500/g) || []).length);
  const money = [...new Set(text.match(/\$\s?[\d,]+(?:\s*(?:-|–|—|to)\s*\$?\s?[\d,]+)?/g) || [])];
  console.log("DISTINCT MONEY:\n" + money.join("\n"));
});
