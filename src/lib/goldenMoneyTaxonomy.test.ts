import { describe, it, expect } from "vitest";
import {
  MONEY_CATEGORY_LABEL,
  MONEY_CATEGORY_NOTE,
  PLANNING_FIGURES_NOTE,
  CHAPTER_ALLOCATION_NOTE,
  crossReferenceNote,
  topTenSumNote,
  tagMoney,
  classifyMoneyAmounts,
  annotateMoneyProse,
} from "@/lib/goldenMoneyTaxonomy";

describe("money category classification", () => {
  it("classifies an annual leak range as ANNUAL REVENUE LOSS", () => {
    const [a] = classifyMoneyAmounts("This leak costs $42,000 to $61,000 in annual revenue loss.");
    expect(a.category).toBe("annual_revenue_loss");
  });

  it("classifies an observed company job value as SOURCE EVIDENCE", () => {
    const [a] = classifyMoneyAmounts("Their published average job value is $18,400 per project.");
    expect(a.category).toBe("source_evidence");
  });

  it("classifies proposed spend as IMPLEMENTATION INVESTMENT", () => {
    const [a] = classifyMoneyAmounts("Estimated implementation spend of $13,500 to $36,500.");
    expect(a.category).toBe("implementation_investment");
  });

  it("classifies a modeled recovery as RECOVERY SCENARIO", () => {
    const [a] = classifyMoneyAmounts("Projected recovery of $57,000 to $160,000 over 12 months.");
    expect(a.category).toBe("recovery_scenario");
  });

  it("returns no category for a bare, contextless amount", () => {
    const [a] = classifyMoneyAmounts("Then there is $91,000.");
    expect(a.category).toBeNull();
  });
});

describe("annotateMoneyProse", () => {
  it("labels source evidence and states it is not a separate leak total", () => {
    const r = annotateMoneyProse("Their average job value is $18,400 per project.");
    expect(r.text).toContain(`$18,400 (${MONEY_CATEGORY_LABEL.source_evidence})`);
    expect(r.text).toContain(MONEY_CATEGORY_NOTE.source_evidence);
  });

  it("labels roadmap spend and recovery and appends the planning disclaimer", () => {
    const r = annotateMoneyProse(
      "Projected recovery of $57,000 to $160,000 against implementation spend of $13,500 to $36,500.",
    );
    expect(r.text).toContain(MONEY_CATEGORY_LABEL.recovery_scenario);
    expect(r.text).toContain(MONEY_CATEGORY_LABEL.implementation_investment);
    expect(r.text).toContain(PLANNING_FIGURES_NOTE);
  });

  it("omits an ambiguous amount rather than showing unlabelled money", () => {
    const r = annotateMoneyProse("There is also $91,000 somewhere in the business.");
    expect(r.text).not.toContain("$91,000");
    expect(r.omitted.length).toBe(1);
  });

  it("inherits the default category when one is supplied", () => {
    const r = annotateMoneyProse("This chapter accounts for $42,000 to $61,000.", {
      defaultCategory: "annual_revenue_loss",
    });
    expect(r.text).toContain(MONEY_CATEGORY_LABEL.annual_revenue_loss);
    expect(r.omitted.length).toBe(0);
  });

  it("is idempotent — re-annotating does not double-label", () => {
    const once = annotateMoneyProse("Average job value $18,400.").text;
    const twice = annotateMoneyProse(once).text;
    expect(twice.match(/SOURCE EVIDENCE/g)?.length).toBe(
      once.match(/SOURCE EVIDENCE/g)?.length,
    );
  });
});

describe("relationship labels", () => {
  it("labels chapter allocations as included in the total", () => {
    expect(CHAPTER_ALLOCATION_NOTE).toBe("Included in total annual revenue loss.");
  });

  it("names an exact chapter for a cross-referenced leak", () => {
    expect(crossReferenceNote(4)).toBe("Already included in Chapter 4. Not counted again.");
    expect(crossReferenceNote("intake")).toContain("Not counted again.");
  });

  it("states the exact Top 10 sum relationship", () => {
    const note = topTenSumNote("$900,000 - $1,200,000", 3, "$99,314 - $165,789", "$999,314 - $1,365,789");
    expect(note).toContain("plus the remaining 3 priced leaks");
    expect(note).toContain("$999,314 - $1,365,789");
  });

  it("collapses the sum sentence when nothing remains", () => {
    expect(topTenSumNote("$10 - $20", 0, "$0", "$10 - $20")).toContain("no further priced leaks");
  });

  it("tags money idempotently", () => {
    const once = tagMoney("$1,000 - $2,000", "recovery_scenario");
    expect(tagMoney(once, "recovery_scenario")).toBe(once);
  });
});
