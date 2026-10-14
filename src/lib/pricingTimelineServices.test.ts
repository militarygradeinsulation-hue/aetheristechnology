import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AETHERIS_TIERS, TIER_ORDER } from "./aetherisTiers";
import {
  TIMELINE_SERVICE_STEPS, individualServiceIdsAtTier,
  individualServicesAtTier, compareTierPrices, tierIndividualQuote,
} from "./pricingTimelineServices";
import { AUDIT_OPTIONS, quoteAuditSelection } from "../../supabase/functions/_shared/company-audit-offers";

describe("progressive website pricing timeline", () => {
  it("starts free and progressively reveals all real catalog options exactly once", () => {
    const allIds = AUDIT_OPTIONS.map(o => o.id);
    const accumulated = new Set<string>();

    for (const id of TIER_ORDER) {
      const newlyAvailable = TIMELINE_SERVICE_STEPS[id];
      for (const option of newlyAvailable) {
        expect(allIds, `unknown service ${option}`).toContain(option);
        expect(accumulated.has(option), `duplicate service ${option}`).toBe(false);
        accumulated.add(option);
      }
      const visible = individualServiceIdsAtTier(id);
      expect(visible).toHaveLength(accumulated.size);
      expect(new Set(visible)).toEqual(accumulated);
      expect(individualServicesAtTier(id).map(x => x.id).sort()).toEqual([...accumulated].sort());
    }

    expect(individualServiceIdsAtTier("free")).toEqual([]);
    expect([...accumulated].sort()).toEqual(allIds.sort());
  });

  it("removes later services when the visitor slides backwards", () => {
    const higher = new Set(individualServiceIdsAtTier("active"));
    const lower = new Set(individualServiceIdsAtTier("signal"));
    expect(lower.size).toBeLessThan(higher.size);
    for (const id of lower) expect(higher.has(id)).toBe(true);
    for (const id of TIMELINE_SERVICE_STEPS.active) expect(lower.has(id)).toBe(false);
  });

  it("calculates individual service totals in cents, with separate monthly and one-time fees", () => {
    for (const id of TIER_ORDER) {
      const ids = individualServiceIdsAtTier(id);
      const projection = tierIndividualQuote(id);
      const fromCatalog = quoteAuditSelection(ids);
      expect(projection).toEqual(fromCatalog);
      expect(projection.items).toHaveLength(ids.length);
      expect(projection.oneTimeCents).toBe(
        projection.items.filter(item => item.cadence === "one_time").reduce((n, item) => n + item.priceCents, 0));
      expect(projection.monthlyCents).toBe(
        projection.items.filter(item => item.cadence === "monthly").reduce((n, item) => n + item.priceCents, 0));
    }
    const all = tierIndividualQuote("active");
    const without = quoteAuditSelection(individualServiceIdsAtTier("active").filter(id => id !== "lead-nurture"));
    expect(all.monthlyCents - without.monthlyCents).toBe(29900);
    expect(all.oneTimeCents - without.oneTimeCents).toBe(0);
  });

  it("adds and subtracts tier-price differences only within the same billing period", () => {
    expect(compareTierPrices("signal", "revenue")).toEqual({
      comparable: true, differenceCents: 250000, cadence: "one-time",
    });
    expect(compareTierPrices("revenue", "signal")).toEqual({
      comparable: true, differenceCents: -250000, cadence: "one-time",
    });
    expect(compareTierPrices("revenue", "suite")).toEqual({
      comparable: true, differenceCents: 500000, cadence: "one-time",
    });
    expect(compareTierPrices("intelligence", "signal")).toEqual({ comparable: false });
    expect(compareTierPrices("diagnostic", "active")).toEqual({ comparable: false });
    expect(compareTierPrices("active", "intelligence")).toEqual({
      comparable: true, differenceCents: -1750000, cadence: "monthly",
    });
    expect(AETHERIS_TIERS).toHaveLength(TIER_ORDER.length);
  });

  it("keeps the homepage slider and each checkbox tied to the same state and price math", () => {
    const timeline = readFileSync("src/components/PricingTimeline.tsx", "utf8");
    const custom = readFileSync("src/components/AuditCustomQuote.tsx", "utf8");
    expect(timeline).toContain("setServiceSelection(individualServiceIdsAtTier(AETHERIS_TIERS[target].id))");
    expect(timeline).toContain("quoteAuditSelection(serviceSelection)");
    expect(timeline).toContain("onSelectedIdsChange={setServiceSelection}");
    expect(timeline).toContain("Services linked to current price level");
    expect(custom).toContain("if (onSelectedIdsChange && selectedIds !== undefined) onSelectedIdsChange(next)");
    expect(custom).toContain("const selected = selectedIds ?? localSelected");
    expect(custom).toContain("The free level has no paid services");
  });
});
