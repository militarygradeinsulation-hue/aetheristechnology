import { it } from "vitest";
import fs from "node:fs";
import { resolveFinancialLedger, buildFinancialLedger, formatUsdRangeAscii, chapterAllocation } from "@/lib/goldenLedger";
import { buildGoldenReportModel, modelText } from "@/lib/goldenReportModel";

it("verify", () => {
  const rows = fs.readFileSync("/tmp/rep/rows.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));
  for (const r of rows) {
    const l = buildFinancialLedger(r.report);
    const o = l.overall;
    const chSum = l.chapters.reduce((a, c) => ({ low: a.low + c.annual_low, high: a.high + c.annual_high }), { low: 0, high: 0 });
    const text = modelText(buildGoldenReportModel({ report: r.report, company: r.company || "", url: r.url, scanId: r.id }));
    console.log([
      (r.company || r.url).slice(0, 28).padEnd(28),
      "total=" + (o ? formatUsdRangeAscii(o.annual_low, o.annual_high) : "none"),
      "chapters=" + formatUsdRangeAscii(chSum.low, chSum.high),
      "top10=" + formatUsdRangeAscii(l.top10.subtotal_low, l.top10.subtotal_high),
      "rem=" + l.top10.remaining_count + "/" + formatUsdRangeAscii(l.top10.remainder_low, l.top10.remainder_high),
      "n=" + l.active.length,
      "dupes=" + l.reconciliation.duplicate_count,
      "inv=" + l.reconciliation.invariant_status,
      "pdfHasTotal=" + (o ? text.includes(formatUsdRangeAscii(o.annual_low, o.annual_high)) : "n/a"),
    ].join(" | "));
    if (r.id.startsWith("05820df7")) {
      console.log("ASPEN chapters:", l.chapters.map((c) => `${c.chapter}=${formatUsdRangeAscii(c.annual_low, c.annual_high)}`).join(", "));
      console.log("ASPEN top10:", l.top10.entries.map((e) => `#${e.rank} ${e.title} ${e.range_label}`).join(" | "));
      console.log("ASPEN ch12 alloc:", JSON.stringify(chapterAllocation(l, "top-10-leaks")));
    }
  }
});
