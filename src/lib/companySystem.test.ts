import { describe, it, expect } from "vitest";
import { TIER_ORDER, TOOL_TIER, tierRank } from "@/lib/aetherisTiers";
import { SHOP_TOOLS } from "@/lib/tool-shop-catalog";
import {
  UNIVERSE_MODULE_REGISTRY,
  SYSTEM_TIER_ORDER,
  composeCompanySystem,
  validateAction,
  validateMemoryItem,
  activeMemory,
  memoryRetrievalFilter,
  shouldRecompose,
  systemFingerprint,
  buildBrandContext,
  brandContextIsActive,
  moduleAllowedForTier,
  findModule,
  type RootCauseInput,
} from "@/lib/universeSystem";

const RC = (id: string, title: string, detail = ""): RootCauseInput => ({ id, title, detail });

describe("registry drift guards", () => {
  it("mirrors the aetherisTiers ladder", () => {
    expect(SYSTEM_TIER_ORDER).toEqual(TIER_ORDER);
  });

  it("only points at tools/routes that already exist in the Universe", () => {
    const routes = new Set(SHOP_TOOLS.map(t => t.route));
    for (const m of UNIVERSE_MODULE_REGISTRY) {
      if (TOOL_TIER[m.id]) {
        // Tier must match the single source of truth, never a looser copy.
        expect(tierRank(m.requiredTier)).toBe(tierRank(TOOL_TIER[m.id]));
        expect(routes.has(m.route)).toBe(true);
      }
    }
  });

  it("has unique module ids and unique action ids per module", () => {
    const ids = UNIVERSE_MODULE_REGISTRY.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of UNIVERSE_MODULE_REGISTRY) {
      const a = m.actions.map(x => x.id);
      expect(new Set(a).size).toBe(a.length);
      // Anything that writes, sends or publishes must require confirmation.
      for (const act of m.actions) {
        if (act.risk === "write" || act.risk === "external") expect(act.confirm).toBe(true);
        expect(act.rollback.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("composition", () => {
  const rcs = [
    RC("rc_brand", "Brand message is inconsistent", "positioning and voice differ across pages"),
    RC("rc_friction", "Checkout friction", "form and CTA drop-off on mobile"),
    RC("rc_followup", "Slow lead response", "no follow up sequence for inbound leads"),
    RC("rc_content", "No publishing cadence", "blog inactive, social dormant"),
  ];

  it("maps every root cause and reports full coverage", () => {
    const r = composeCompanySystem(rcs, "active");
    expect(r.coverage.total).toBe(4);
    expect(r.coverage.covered).toBe(4);
    expect(r.gaps).toHaveLength(0);
    const mapped = new Set(r.modules.flatMap(m => m.root_cause_ids));
    for (const rc of rcs) expect(mapped.has(rc.id)).toBe(true);
  });

  it("never selects the same module twice", () => {
    const r = composeCompanySystem([...rcs, RC("rc_brand2", "Brand voice drift", "brand messaging")], "active");
    const ids = r.modules.map(m => m.module_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("de-duplicates identical root cause ids", () => {
    const r = composeCompanySystem([rcs[0], { ...rcs[0] }], "active");
    expect(r.coverage.total).toBe(1);
  });

  it("builds a valid directed graph over selected nodes only", () => {
    const r = composeCompanySystem(rcs, "active");
    const ids = new Set(r.modules.map(m => m.module_id));
    for (const c of r.connections) {
      expect(ids.has(c.from_module)).toBe(true);
      expect(ids.has(c.to_module)).toBe(true);
      expect(c.from_module).not.toBe(c.to_module);
      expect(findModule(c.from_module)!.outputs).toContain(c.payload);
      expect(findModule(c.to_module)!.inputs).toContain(c.payload);
    }
    // The messaging spine must exist: diagnostics feed sales/content.
    expect(r.connections.some(c => c.payload === "approved_messaging_context")).toBe(true);
  });

  it("marks unmatched root causes as GAP_REQUIRED instead of inventing a tool", () => {
    const r = composeCompanySystem([RC("rc_x", "Warehouse forklift certification expired")], "active");
    expect(r.gaps).toHaveLength(1);
    expect(r.gaps[0].status).toBe("GAP_REQUIRED");
    expect(r.coverage.uncovered).toEqual(["rc_x"]);
  });

  it("recommends but locks modules above the client tier", () => {
    const r = composeCompanySystem(rcs, "signal");
    const social = r.modules.find(m => m.module_id === "social-content");
    expect(social?.locked).toBe(true);
    expect(social?.lock_reason).toMatch(/suite/);
    const brand = r.modules.find(m => m.module_id === "brand-contradictions");
    expect(brand?.locked).toBe(false);
  });
});

describe("tier enforcement", () => {
  it("never allows a module above the entitlement", () => {
    expect(moduleAllowedForTier("social-content", "revenue")).toBe(false);
    expect(moduleAllowedForTier("social-content", "suite")).toBe(true);
    expect(moduleAllowedForTier("nope", "active")).toBe(false);
  });
});

describe("action bus: plan -> confirm -> execute", () => {
  const ctx = { clientTier: "active" as const, enabledModuleIds: ["follow-up-plan", "website-scanner"], role: "admin" as const };

  it("rejects unknown modules and actions", () => {
    expect(validateAction({ module_id: "ghost", action_id: "x" }, ctx).ok).toBe(false);
    expect(validateAction({ module_id: "follow-up-plan", action_id: "rm_rf" }, ctx).ok).toBe(false);
  });

  it("rejects modules not enabled in the system", () => {
    const d = validateAction({ module_id: "sales-scripts", action_id: "draft_scripts" }, ctx);
    expect(d.ok).toBe(false);
    expect(d.error).toMatch(/not enabled/);
  });

  it("rejects out-of-tier execution even when enabled", () => {
    const d = validateAction(
      { module_id: "follow-up-plan", action_id: "draft_sequence", input: { company_context: "x" } },
      { ...ctx, clientTier: "signal" },
    );
    expect(d.ok).toBe(false);
    expect(d.error).toMatch(/Locked/);
  });

  it("rejects unexpected or missing input keys", () => {
    expect(validateAction({ module_id: "website-scanner", action_id: "run_rescan", input: { website_url: "a", sql: "drop" } }, ctx).error)
      .toMatch(/Unexpected input/);
    expect(validateAction({ module_id: "website-scanner", action_id: "run_rescan", input: {} }, ctx).error)
      .toMatch(/Missing required input/);
  });

  it("requires confirmation for writes and external sends, with a preview and rollback", () => {
    const d = validateAction({ module_id: "website-scanner", action_id: "run_rescan", input: { website_url: "https://x.com" } }, ctx);
    expect(d.ok).toBe(false);
    expect(d.requires_confirmation).toBe(true);
    expect(d.preview?.rollback).toBeTruthy();
    const ok = validateAction(
      { module_id: "website-scanner", action_id: "run_rescan", input: { website_url: "https://x.com" }, confirmed: true },
      ctx,
    );
    expect(ok.ok).toBe(true);
  });

  it("lets drafting run immediately but blocks viewers from acting", () => {
    const draft = validateAction(
      { module_id: "follow-up-plan", action_id: "draft_sequence", input: { company_context: "ctx" } }, ctx,
    );
    expect(draft.ok).toBe(true);
    const viewer = validateAction(
      { module_id: "follow-up-plan", action_id: "draft_sequence", input: { company_context: "ctx" } },
      { ...ctx, role: "viewer" },
    );
    expect(viewer.ok).toBe(false);
  });

  it("only ever targets registered functions", () => {
    for (const m of UNIVERSE_MODULE_REGISTRY) {
      for (const a of m.actions) expect(a.fn).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("memory", () => {
  it("validates scope, provenance and confidence", () => {
    expect(validateMemoryItem({ scope: "business", key: "k", value: "v", provenance: "report" }).ok).toBe(true);
    expect(validateMemoryItem({ scope: "bogus" as never, key: "k", value: "v", provenance: "r" }).ok).toBe(false);
    expect(validateMemoryItem({ scope: "system", key: "k", value: "v", provenance: "" }).ok).toBe(false);
    expect(validateMemoryItem({ scope: "system", key: "k", value: "v", provenance: "r", confidence: 2 }).ok).toBe(false);
  });

  it("never treats rejected or low-confidence inferred memory as active", () => {
    const items = [
      { scope: "business", key: "a", value: "1", provenance: "p", confidence: 0.9, status: "approved" },
      { scope: "business", key: "b", value: "2", provenance: "p", confidence: 0.9, status: "rejected" },
      { scope: "business", key: "c", value: "3", provenance: "p", confidence: 0.2, status: "inferred" },
      { scope: "business", key: "d", value: "4", provenance: "p", confidence: 0.8, status: "inferred" },
    ] as never;
    expect(activeMemory(items).map(i => i.key)).toEqual(["a", "d"]);
  });

  it("refuses unscoped retrieval so memory cannot leak across companies", () => {
    expect(() => memoryRetrievalFilter({ companyId: "" })).toThrow();
    expect(memoryRetrievalFilter({ companyId: "c1", systemId: "s1" })).toEqual({ company_id: "c1", scan_id: null, system_id: "s1" });
  });
});

describe("idempotency", () => {
  it("reuses a system for the same report hash and template", () => {
    const existing = { source_report_hash: "h1", template_version: "aetheris-company-system-1" };
    expect(shouldRecompose(existing, "h1")).toBe(false);
    expect(shouldRecompose(existing, "h2")).toBe(true);
    expect(shouldRecompose(null, "h1")).toBe(true);
    expect(systemFingerprint("h1")).toBe("h1:aetheris-company-system-1");
  });
});

describe("brand context", () => {
  it("flags inferred fields and stays inactive until approved", () => {
    const ctx = buildBrandContext({ colors: ["#111"], tone: "blunt" });
    expect(ctx.colors).toEqual(["#111"]);
    expect(ctx.inferred_fields).toContain("typography");
    expect(ctx.inferred_fields).not.toContain("tone");
    expect(ctx.status).toBe("draft");
    expect(brandContextIsActive(ctx)).toBe(false);
    expect(brandContextIsActive({ status: "approved" })).toBe(true);
  });

  it("handles missing brand evidence without inventing values", () => {
    const ctx = buildBrandContext(null);
    expect(ctx.colors).toEqual([]);
    expect(ctx.tone).toBeNull();
    expect(ctx.inferred_fields.length).toBeGreaterThan(3);
  });
});
