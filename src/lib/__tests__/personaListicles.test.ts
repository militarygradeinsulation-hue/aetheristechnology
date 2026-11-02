import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PERSONA_LISTICLES } from "@/config/personaListicles";
import { REAL_CASES } from "@/data/realCaseStudies";
import { personaAdUrl, resolvePersonaProof, withPersonaTracking } from "@/lib/personaListicle";

const caseIds = new Set(REAL_CASES.map((c) => c.id));

describe("persona listicles", () => {
  it("uses unique, URL-safe slugs", () => {
    const slugs = PERSONA_LISTICLES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(PERSONA_LISTICLES.map((p) => [p.slug, p] as const))("%s covers all five conversion parts", (_slug, p) => {
    // Promise
    expect(p.headline.trim()).not.toBe("");
    expect(p.subheadline.trim()).not.toBe("");
    // Properties: the headline's number must match the list length
    expect(p.reasons.length).toBeGreaterThanOrEqual(5);
    const promised = p.headline.match(/^(\d+)\s/);
    if (promised) expect(Number(promised[1])).toBe(p.reasons.length);
    for (const r of p.reasons) {
      expect(r.title && r.body && r.fix).toBeTruthy();
    }
    // Positioning
    expect(p.notAnother.length).toBeGreaterThan(0);
    expect(p.instead).toMatch(/Aetheris/);
    // Proof
    expect(p.proofCaseIds.length).toBeGreaterThan(0);
    // Packaging
    expect(p.offerLine.trim()).not.toBe("");
    expect(p.ads.length).toBeGreaterThan(0);
  });

  it("only cites sourced case studies as proof", () => {
    for (const p of PERSONA_LISTICLES) {
      for (const id of p.proofCaseIds) expect(caseIds.has(id), `${p.slug} cites unknown case ${id}`).toBe(true);
      const proof = resolvePersonaProof(p);
      expect(proof).toHaveLength(p.proofCaseIds.length);
      for (const c of proof) expect(c.link).toMatch(/^https:\/\//);
    }
  });

  it("never wires persona pages to report generation", () => {
    const page = readFileSync(resolve(__dirname, "../../pages/PersonaListiclePage.tsx"), "utf8");
    const config = readFileSync(resolve(__dirname, "../../config/personaListicles.ts"), "utf8");
    for (const src of [page, config]) {
      expect(src).not.toMatch(/forensic-scan|golden-report|functions\.invoke|supabase/i);
    }
  });
});

describe("persona tracking links", () => {
  it("adds the persona and passes ad params through", () => {
    const href = withPersonaTracking("/leak-audit/self-scan", "messy-crm", "?utm_source=facebook&utm_campaign=x&other=1");
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/leak-audit/self-scan");
    expect(url.searchParams.get("persona")).toBe("messy-crm");
    expect(url.searchParams.get("utm_source")).toBe("facebook");
    expect(url.searchParams.get("utm_campaign")).toBe("x");
    expect(url.searchParams.has("other")).toBe(false);
  });

  it("builds ad URLs that land on the matching persona page", () => {
    const url = new URL(personaAdUrl("https://aetheris.technology", "home-services", "Estimate follow-up"));
    expect(url.pathname).toBe("/for/home-services");
    expect(url.searchParams.get("utm_campaign")).toBe("persona_home-services");
    expect(url.searchParams.get("utm_content")).toBe("estimate_follow_up");
  });
});
