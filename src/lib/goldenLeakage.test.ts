import { describe, it, expect } from "vitest";
import {
  computeGoldenLeakage,
  hasPricedEvidence,
  parseMoney,
  GOLDEN_LEAKAGE_LABEL,
  LEAKAGE_CALCULATION_VERSION,
  type GoldenReportLike,
} from "@/lib/goldenLeakage";

describe("golden leakage label + format contract", () => {
  it("keeps the exact label", () => {
    expect(GOLDEN_LEAKAGE_LABEL).toBe("TOTAL ESTIMATED ANNUAL REVENUE LOSS");
  });

  it("renders $LOW – $HIGH / year", () => {
    const r = computeGoldenLeakage({ top_leaks: [{ dollars_low: 1000, dollars_high: 2000 }] })!;
    expect(r.rangeLabel).toBe("$1,000 – $2,000");
    expect(r.displayValue).toBe("$1,000 – $2,000 / year");
    expect(r.rangeLabelAscii).toBe("$1,000 - $2,000");
  });
});

describe("parseMoney", () => {
  it("accepts numbers and money strings", () => {
    expect(parseMoney(25000)).toBe(25000);
    expect(parseMoney("25,000")).toBe(25000);
    expect(parseMoney("$25,000")).toBe(25000);
    expect(parseMoney("  $-500,000 ")).toBe(500000);
    expect(parseMoney("USD 12k")).toBe(12000);
    expect(parseMoney("1.2M")).toBe(1_200_000);
    expect(parseMoney("$4,500/yr")).toBe(4500);
  });

  it("rejects zero, NaN, Infinity, junk and absurd/placeholder magnitudes", () => {
    for (const v of [0, "0", "$0", NaN, Infinity, -Infinity, null, undefined, "", "n/a", "TBD", {}, 1e12, 999999999]) {
      expect(parseMoney(v as unknown)).toBeNull();
    }
  });
});

describe("resolution order", () => {
  it("1. prefers the canonical overall_leakage object", () => {
    const report: GoldenReportLike = {
      overall_leakage: {
        annual_low: 415000,
        annual_high: 830000,
        currency: "USD",
        source: "top_leaks",
        priced_leak_count: 5,
        calculation_version: LEAKAGE_CALCULATION_VERSION,
      },
      top_leaks: [{ dollars_low: 1, dollars_high: 2 }],
    };
    const r = computeGoldenLeakage(report)!;
    expect(r.low).toBe(415000);
    expect(r.high).toBe(830000);
    expect(r.count).toBe(5);
    expect(r.currency).toBe("USD");
    expect(r.rangeLabel).toBe("$415,000 – $830,000");
  });

  it("2a. numeric top_leaks", () => {
    const r = computeGoldenLeakage({
      top_leaks: [
        { name: "a", dollars_low: 1000, dollars_high: 2300 },
        { name: "b", dollars_low: 3100, dollars_high: 6600 },
      ],
    })!;
    expect([r.low, r.high, r.count, r.source]).toEqual([4100, 8900, 2, "top_leaks+chapters"]);
  });

  it("2b. formatted string top_leaks", () => {
    const r = computeGoldenLeakage({
      top_leaks: [
        { name: "a", dollars_low: "150,000", dollars_high: "300,000" },
        { name: "b", dollars_low: "$-100,000", dollars_high: "$200,000" },
      ],
    })!;
    expect([r.low, r.high, r.count]).toEqual([250000, 500000, 2]);
  });

  it("2c. legacy alternate field names", () => {
    const r = computeGoldenLeakage({
      top_leaks: [
        { name: "a", low: "5,000", high: "9,000" },
        { name: "b", annual_low: 1000, annual_high: 2000 },
        { name: "c", estimated_annual_loss: "3,000" },
      ],
    })!;
    expect([r.low, r.high, r.count]).toEqual([9000, 14000, 3]);
  });

  it("3. legacy chapter ranges when top_leaks are unpriced", () => {
    const r = computeGoldenLeakage({
      top_leaks: [{ name: "a", chapter_slug: "seo" }],
      chapters: [
        { slug: "cta", what_its_costing: "Roughly $4,500 - $8,200 a year in lost pipeline." },
        { slug: "proof", what_its_costing: "About $2,000 annually." },
        { slug: "tam", what_its_costing: "A speculative $33,460,000 annual TAM exposure." },
        { slug: "quarterly", what_its_costing: "$48,000 per quarter of delayed pipeline." },
      ],
    })!;
    expect([r.low, r.high, r.count, r.source]).toEqual([6500, 10200, 2, "top_leaks+chapters"]);
  });

  it("3b. never double counts a chapter already priced in top_leaks", () => {
    const r = computeGoldenLeakage({
      top_leaks: [{ name: "seo", chapter_slug: "seo", dollars_low: 1000, dollars_high: 2000 }],
      chapters: [{ slug: "seo", what_its_costing: "$1,000 - $2,000 annually" }],
    })!;
    expect([r.low, r.high, r.count]).toEqual([1000, 2000, 1]);
  });
});

describe("validation", () => {
  it("deduplicates repeated leaks", () => {
    const r = computeGoldenLeakage({
      top_leaks: [
        { name: "Missing Schema Markup", dollars_low: 1000, dollars_high: 2000 },
        { name: "missing schema markup", dollars_low: 1000, dollars_high: 2000 },
      ],
    })!;
    expect([r.low, r.high, r.count]).toEqual([1000, 2000, 1]);
  });

  it("normalizes reversed ranges", () => {
    const r = computeGoldenLeakage({ top_leaks: [{ dollars_low: 9000, dollars_high: 1000 }] })!;
    expect([r.low, r.high]).toEqual([1000, 9000]);
  });

  it("skips malformed and zero values", () => {
    const r = computeGoldenLeakage({
      top_leaks: [
        { name: "junk", dollars_low: "n/a", dollars_high: "TBD" },
        { name: "zero", dollars_low: 0, dollars_high: "$0" },
        { name: "real", dollars_low: "1,500", dollars_high: 2500 },
      ],
    })!;
    expect([r.low, r.high, r.count]).toEqual([1500, 2500, 1]);
  });

  it("fills a missing side from the present one", () => {
    const r = computeGoldenLeakage({ top_leaks: [{ dollars_high: 5000 }] })!;
    expect([r.low, r.high]).toEqual([5000, 5000]);
  });

  it("returns null when there is no monetary evidence", () => {
    expect(computeGoldenLeakage(null)).toBeNull();
    expect(computeGoldenLeakage([])).toBeNull();
    expect(computeGoldenLeakage({ top_leaks: [], chapters: [] })).toBeNull();
    expect(
      computeGoldenLeakage({
        top_leaks: [{ name: "a", dollars_low: 0, dollars_high: null }],
        chapters: [{ slug: "x", what_its_costing: "No dollar figure available." }],
      }),
    ).toBeNull();
    expect(
      computeGoldenLeakage({ overall_leakage: { annual_low: 0, annual_high: 0 } }),
    ).toBeNull();
  });

  it("never yields $0, NaN or undefined text", () => {
    const r = computeGoldenLeakage({ top_leaks: [{ dollars_low: "abc", dollars_high: 7500 }] })!;
    expect(r.rangeLabel).not.toMatch(/NaN|undefined|\$0\b/);
  });
});

describe("hasPricedEvidence (completion invariant input)", () => {
  it("is true when priced leaks exist and false otherwise", () => {
    expect(hasPricedEvidence({ top_leaks: [{ dollars_low: "1,000" }] })).toBe(true);
    expect(hasPricedEvidence({ chapters: [{ slug: "a", what_its_costing: "$900 a year" }] })).toBe(true);
    expect(hasPricedEvidence({ top_leaks: [{ name: "a" }] })).toBe(false);
    expect(hasPricedEvidence(null)).toBe(false);
  });

  it("invariant holds: evidence present => resolver must resolve", () => {
    const reports: GoldenReportLike[] = [
      { top_leaks: [{ dollars_low: 1000, dollars_high: 2300 }] },
      { top_leaks: [{ dollars_low: "150,000", dollars_high: "300,000" }] },
      { chapters: [{ slug: "cta", what_its_costing: "$4,500 - $8,200 annually" }] },
    ];
    for (const rep of reports) {
      expect(hasPricedEvidence(rep)).toBe(true);
      expect(computeGoldenLeakage(rep)).not.toBeNull();
    }
  });
});

describe("UI and PDF consumers get identical numbers", () => {
  // UI banner reads rangeLabel; PDF cover reads rangeLabelAscii. Both come from
  // one resolver call shape, so the underlying values must match exactly.
  const fixtures: GoldenReportLike[] = [
    { overall_leakage: { annual_low: 4100, annual_high: 8900, priced_leak_count: 5, source: "top_leaks", currency: "USD" } },
    { top_leaks: [{ name: "a", dollars_low: "150,000", dollars_high: "300,000" }] },
    { chapters: [{ slug: "cta", what_its_costing: "$4,500 - $8,200 annually" }] },
  ];

  it("produces the same low/high for every fixture", () => {
    for (const f of fixtures) {
      const ui = computeGoldenLeakage(f)!;
      const pdf = computeGoldenLeakage(f)!;
      expect(ui.low).toBe(pdf.low);
      expect(ui.high).toBe(pdf.high);
      expect(ui.rangeLabel.replace("–", "-")).toBe(pdf.rangeLabelAscii);
    }
  });

  it("no-evidence fixture hides the box on both surfaces", () => {
    const empty: GoldenReportLike = { top_leaks: [], chapters: [] };
    expect(computeGoldenLeakage(empty)).toBeNull();
  });
});

describe("chapter prose guards", () => {
  it("ignores quarterly and speculative TAM figures", () => {
    const r = computeGoldenLeakage({
      chapters: [
        { slug: "a", what_its_costing: "Exposure of $180,000-$420,000 per year." },
        { slug: "tam", what_its_costing: "An undetected drop equals $27,860,000 annual recurring revenue at risk." },
        { slug: "q", what_its_costing: "$48,000 per quarter in delayed pipeline." },
      ],
    })!;
    expect([r.low, r.high, r.count, r.source]).toEqual([180000, 420000, 1, "top_leaks+chapters"]);
  });

  it("rejects placeholder 999,999,999 leak values as no evidence", () => {
    expect(
      computeGoldenLeakage({
        top_leaks: [
          { name: "a", dollars_low: 0, dollars_high: 999999999 },
          { name: "b", dollars_low: 0, dollars_high: 999999999 },
        ],
      }),
    ).toBeNull();
  });
});

// These fixtures are shaped from real production rows, but nothing in the
// resolver is company-, account- or scan-specific: only the data shape matters.
describe("production data shapes (company-agnostic)", () => {
  it("canonical overall_leakage shape resolves to its stored range", () => {
    const r = computeGoldenLeakage({
      overall_leakage: { annual_low: 4100, annual_high: 8900, currency: "USD", source: "top_leaks", priced_leak_count: 5, calculation_version: LEAKAGE_CALCULATION_VERSION },
    })!;
    expect(r.displayValue).toBe("$4,100 – $8,900 / year");
  });

  it("comma-formatted string top_leaks shape sums to the correct range", () => {
    const r = computeGoldenLeakage({
      top_leaks: [
        { name: "Outdated Site Architecture & Performance", dollars_low: "150,000", dollars_high: "300,000" },
        { name: "Generic Content & Lack of Thought Leadership", dollars_low: "100,000", dollars_high: "200,000" },
        { name: "Fragmented Lead Capture & Nurturing", dollars_low: "75,000", dollars_high: "150,000" },
        { name: "Limited Lead Intelligence & Personalization", dollars_low: "50,000", dollars_high: "100,000" },
        { name: "Inconsistent Brand Messaging", dollars_low: "40,000", dollars_high: "80,000" },
      ],
    })!;
    expect([r.low, r.high, r.count]).toEqual([415000, 830000, 5]);
    expect(r.displayValue).toBe("$415,000 – $830,000 / year");
  });

  it("two unrelated companies get identical behavior with different values", () => {
    const companyA = {
      // identity fields live alongside the data and must never affect the math
      company: "Alpha Manufacturing",
      target_url: "https://alpha-manufacturing.example",
      top_leaks: [
        { name: "Checkout friction", dollars_low: 12000, dollars_high: 24000 },
        { name: "Dead SEO pages", dollars_low: 3000, dollars_high: 6000 },
      ],
    };
    const companyB = {
      company: "Beta Legal Group",
      target_url: "https://beta-legal.example",
      top_leaks: [
        { name: "Intake drop-off", dollars_low: "1,250,000", dollars_high: "$2.5M" },
        { name: "Unattributed spend", dollars_low: "250k", dollars_high: "400k" },
      ],
    };
    const a = computeGoldenLeakage(companyA as GoldenReportLike)!;
    const b = computeGoldenLeakage(companyB as GoldenReportLike)!;

    // Same contract, same label, same format — different, correct numbers.
    for (const r of [a, b]) {
      expect(r.currency).toBe("USD");
      expect(r.source).toBe("top_leaks+chapters");
      expect(r.count).toBe(2);
      expect(r.calculation_version).toBe(LEAKAGE_CALCULATION_VERSION);
      expect(r.displayValue).toMatch(/^\$[\d,]+ – \$[\d,]+ \/ year$/);
    }
    expect([a.low, a.high]).toEqual([15000, 30000]);
    expect([b.low, b.high]).toEqual([1500000, 2900000]);
    expect(a.displayValue).not.toBe(b.displayValue);

    // Swapping identity fields changes nothing.
    const aRenamed = computeGoldenLeakage({ ...companyA, company: "Zeta Co", target_url: "https://zeta.example" } as GoldenReportLike)!;
    expect(aRenamed.displayValue).toBe(a.displayValue);
  });
});
