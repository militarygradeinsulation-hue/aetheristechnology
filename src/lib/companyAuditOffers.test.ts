import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { REP_PRODUCTS } from "./repProducts";
import {
  AUDIT_OPTIONS, evaluateCompanyAudit, normalizePublicCompanyUrl,
  quoteAuditSelection, validateAuditAnswers,
} from "../../supabase/functions/_shared/company-audit-offers";

const answers = Object.fromEntries(Array.from({ length: 14 }, (_, i) => ["q" + (i + 1), 4]));
describe("private company audit", () => {
  it("normalizes www, paths, case and query to a single company", () => {
    expect(normalizePublicCompanyUrl("HTTPS://WWW.Example.com/path?src=fb").domain).toBe("example.com");
    expect(normalizePublicCompanyUrl("example.com").url).toBe("https://example.com/");
  });
  it("rejects internal addresses and malformed URLs", () => {
    for (const url of ["http://127.0.0.1", "http://localhost", "http://my.local",
                       "ftp://public.com", "https://user:pass@example.com", "https://[::1]"]) {
      expect(() => normalizePublicCompanyUrl(url)).toThrow();
    }
  });
  it("validates exactly 14 bounded answers", () => {
    expect(validateAuditAnswers(answers)).toBe(true);
    expect(validateAuditAnswers({ ...answers, q14: 5 })).toBe(false);
    expect(validateAuditAnswers({ ...answers, q14: null })).toBe(false);
    expect(validateAuditAnswers({ ...answers, bonus: 2 })).toBe(false);
  });
  it("returns deterministic solutions independent of object key order", () => {
    const baseline = { ...answers, q1: 0, q5: 0, q6: 1, q9: 1, q12: 0, q13: 1 };
    const reverse = Object.fromEntries(Object.entries(baseline).reverse());
    expect(evaluateCompanyAudit(baseline)).toEqual(evaluateCompanyAudit(reverse));
    expect(evaluateCompanyAudit(baseline)).toEqual(evaluateCompanyAudit(baseline));
    expect(evaluateCompanyAudit(answers)).toEqual([]);
  });
  it("matches the existing admin commissions catalog exactly, with no invented prices", () => {
    for (const option of AUDIT_OPTIONS) {
      const rep = REP_PRODUCTS.find(p => p.name === option.name);
      expect(rep, option.name).toBeDefined();
      expect(option.priceCents).toBe(rep!.priceCents);
      expect(option.cadence).toBe(rep!.recurring ? "monthly" : "one_time");
    }
  });
  it("keeps recurring and one-time fees separate without duplicates", () => {
    const q = quoteAuditSelection(["follow-up","lead-nurture","follow-up"]);
    expect(q.items).toHaveLength(2);
    expect(q.oneTimeCents).toBe(5900);
    expect(q.monthlyCents).toBe(29900);
  });
  it("freezes the baseline server-side and never sends a report/scan id to visitors", () => {
    const server = readFileSync("supabase/functions/company-leak-audit/index.ts", "utf8");
    const sql = readFileSync("supabase/migrations/20261014231000_aetheris_private_company_audit.sql", "utf8");
    const scanner = readFileSync("supabase/functions/forensic-scan-all/index.ts", "utf8");
    expect(sql).toContain("domain text NOT NULL UNIQUE");
    expect(sql).toContain("offer_snapshot jsonb NOT NULL");
    expect(sql).toContain("REVOKE ALL ON public.aetheris_company_audit_cases FROM PUBLIC, anon, authenticated");
    expect(server).toContain("companyCase.recommendations");
    expect(server).toContain("companyCase.offer_snapshot");
    expect(server).toContain('private_intake: true');
    expect(server).not.toContain("report: companyCase");
    expect(scanner).toContain('if (data.private_intake === true && !adminOk)');
    expect(scanner).toContain('private_intake: serviceRoleCaller && body.private_intake === true');
  });
});
