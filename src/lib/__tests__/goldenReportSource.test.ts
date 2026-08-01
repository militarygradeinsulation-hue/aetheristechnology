import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveScanOrigin,
  classifyReportSource,
  reportSourceMeta,
  normalizeReportSource,
  buildNotificationSubject,
  buildSourceBlock,
  claimNewReportNotification,
  buildNewReportEmail,
  type ScanSourceRecord,
} from "@/lib/goldenReportSource";

// ─────────────────────────── mocked email transport ───────────────────────────
const sendEmail = vi.fn(async () => ({ ok: true }));

/**
 * Fake `forensic_scans` table reproducing PostgREST semantics for the
 * conditional claim: update ... where id = ? and source_notified_at is null.
 */
function makeFakeDb(rows: Record<string, ScanSourceRecord & { source_notified_at: string | null }>) {
  return {
    rows,
    from(_table: string) {
      const db = this;
      return {
        update(values: Record<string, unknown>) {
          return {
            eq(_c: string, id: string) {
              return {
                is(col: string, _v: null) {
                  return {
                    select(_cols: string) {
                      return {
                        async maybeSingle() {
                          const row = db.rows[id];
                          if (!row) return { data: null, error: null };
                          if ((row as any)[col] !== null) return { data: null, error: null };
                          Object.assign(row, values);
                          return { data: { ...row }, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

/** Mirrors golden-report-track's scan_completed branch. */
async function handleScanCompleted(db: any, scanId: string) {
  const scan = await claimNewReportNotification(db, scanId);
  if (!scan) return false;
  await sendEmail(
    buildNewReportEmail(scan, {
      to: "joseph@aetheris.technology",
      reportUrl: `https://aetheris.technology/golden-report?scan=${scanId}`,
      adminUrl: "https://aetheris.technology/admin",
    }) as any,
  );
  return true;
}

beforeEach(() => sendEmail.mockClear());

describe("origin classification at report creation", () => {
  it("anonymous public submission → public_website live lead", () => {
    const o = resolveScanOrigin({
      body: { lead_name: "Jane Doe", lead_email: "JANE@Acme.com", lead_phone: "555-1234" },
    });
    expect(o.report_source).toBe("public_website");
    expect(o.requester_kind).toBe("anon");
    expect(o.rep_code).toBeNull();
    expect(o.creator_name).toBeNull();
    expect(o.lead_email).toBe("jane@acme.com");
    expect(reportSourceMeta(o.report_source).isLiveLead).toBe(true);
  });

  it("authenticated rep portal → rep_portal with rep identity", () => {
    const o = resolveScanOrigin({
      portalClaims: { code: "310582", role: "rep" },
      repProfile: { id: "rep-uuid", rep_name: "Nick Burns", rep_email: "nick@aetheris.technology" },
    });
    expect(o.report_source).toBe("rep_portal");
    expect(o.portal_source).toBe("rep_portal");
    expect(o.rep_code).toBe("310582");
    expect(o.creator_name).toBe("Nick Burns");
    expect(o.creator_profile_id).toBe("rep-uuid");
    expect(reportSourceMeta(o.report_source).isLiveLead).toBe(false);
  });

  it("authenticated partner portal → partner_portal", () => {
    const o = resolveScanOrigin({
      portalClaims: { code: "482917", role: "partner" },
      repProfile: { id: "p1", rep_name: "Dean Young", rep_email: "dean@aetheris.technology" },
    });
    expect(o.report_source).toBe("partner_portal");
    expect(o.portal_source).toBe("partner_portal");
    expect(o.requester_kind).toBe("partner");
    expect(reportSourceMeta(o.report_source).subjectTag).toBe("PARTNER GENERATED");
  });

  it("admin / internal test run → admin_internal", () => {
    const o = resolveScanOrigin({ adminAuthenticated: true });
    expect(o.report_source).toBe("admin_internal");
    expect(o.portal_source).toBe("admin");
    expect(o.creator_name).toBe("Aetheris Admin");
  });

  it("service-role automation → admin_internal / internal_automation", () => {
    const o = resolveScanOrigin({ serviceRoleCaller: true });
    expect(o.report_source).toBe("admin_internal");
    expect(o.portal_source).toBe("internal_automation");
  });

  it("unknown legacy value normalizes to unknown_legacy and is never a live lead", () => {
    for (const v of [null, undefined, "", "website", "totally_made_up", 42]) {
      expect(normalizeReportSource(v)).toBe("unknown_legacy");
      expect(reportSourceMeta(v).isLiveLead).toBe(false);
      expect(reportSourceMeta(v).subjectTag).toBe("SOURCE UNKNOWN");
    }
  });

  it("spoofed client source/identity is ignored — verified server context wins", () => {
    const spoof = {
      report_source: "public_website",
      source: "public_website",
      creator_name: "Totally A Lead",
      creator_email: "spoof@evil.com",
      rep_code: "999999",
      lead_email: "lead@acme.com",
    };
    const o = resolveScanOrigin({
      portalClaims: { code: "310582", role: "rep" },
      repProfile: { id: "rep-uuid", rep_name: "Nick Burns", rep_email: "nick@aetheris.technology" },
      body: spoof,
    });
    expect(o.report_source).toBe("rep_portal");
    expect(o.creator_name).toBe("Nick Burns");
    expect(o.creator_email).toBe("nick@aetheris.technology");
    expect(o.rep_code).toBe("310582");
  });

  it("spoofed rep_code from an anonymous caller cannot fake a rep report", () => {
    const o = resolveScanOrigin({ body: { rep_code: "310582", report_source: "admin_internal" } });
    expect(o.report_source).toBe("public_website");
    expect(o.rep_code).toBeNull();
  });

  it("classifyReportSource precedence: admin > partner > rep > public", () => {
    expect(classifyReportSource({ adminAuthenticated: true, portalRole: "rep" })).toBe("admin_internal");
    expect(classifyReportSource({ portalRole: "partner" })).toBe("partner_portal");
    expect(classifyReportSource({ portalRole: "rep" })).toBe("rep_portal");
    expect(classifyReportSource({})).toBe("public_website");
  });
});

describe("notification subject + source block", () => {
  const base: ScanSourceRecord = {
    id: "scan-1",
    company_name: "Acme Corp",
    target_url: "https://acme.com",
    created_at: "2026-08-01T19:00:00.000Z",
  };

  it("tags a public lead subject", () => {
    expect(buildNotificationSubject({ ...base, report_source: "public_website" })).toBe(
      "[LIVE WEBSITE LEAD] Golden Report: Acme Corp",
    );
  });

  it("tags rep, partner, internal and unknown subjects", () => {
    expect(buildNotificationSubject({ ...base, report_source: "rep_portal" })).toContain("[REP GENERATED]");
    expect(buildNotificationSubject({ ...base, report_source: "partner_portal" })).toContain("[PARTNER GENERATED]");
    expect(buildNotificationSubject({ ...base, report_source: "admin_internal" })).toContain("[INTERNAL]");
    expect(buildNotificationSubject({ ...base, report_source: "bogus" })).toContain("[SOURCE UNKNOWN]");
  });

  it("source block exposes rep identity rows for rep reports", () => {
    const rows = buildSourceBlock({
      ...base,
      report_source: "rep_portal",
      creator_name: "Nick Burns",
      creator_email: "nick@aetheris.technology",
      rep_code: "310582",
    });
    const labels = rows.map((r) => r.label);
    expect(labels).toContain("Rep Name");
    expect(labels).toContain("Rep Code");
    expect(rows.find((r) => r.label === "Live Lead")?.value).toBe("No");
  });

  it("source block marks anonymous public submissions as live leads", () => {
    const rows = buildSourceBlock({ ...base, report_source: "public_website", lead_email: "lead@acme.com" });
    expect(rows.find((r) => r.label === "Live Lead")?.value).toBe("Yes");
    expect(rows.find((r) => r.label === "Created By")?.value).toBe("Anonymous website visitor");
    expect(rows.find((r) => r.label === "Lead Email")?.value).toBe("lead@acme.com");
  });
});

describe("notification idempotency (mocked email delivery)", () => {
  const scan = {
    id: "scan-9",
    report_source: "public_website",
    company_name: "Acme Corp",
    target_url: "https://acme.com",
    created_at: "2026-08-01T19:00:00.000Z",
    source_notified_at: null as string | null,
  };

  it("sends exactly one email for the first completion", async () => {
    const db = makeFakeDb({ "scan-9": { ...scan } });
    expect(await handleScanCompleted(db, "scan-9")).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((sendEmail.mock.calls[0][0] as any).idempotencyKey).toBe("golden-new-report-scan-9");
  });

  it("does not send again on retry, reopen, download, regeneration or backfill", async () => {
    const db = makeFakeDb({ "scan-9": { ...scan } });
    await handleScanCompleted(db, "scan-9"); // first completion
    for (const _pass of ["retry", "reopen", "download", "regeneration", "backfill"]) {
      expect(await handleScanCompleted(db, "scan-9")).toBe(false);
    }
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("concurrent completions still yield one email", async () => {
    const db = makeFakeDb({ "scan-9": { ...scan } });
    const results = await Promise.all([1, 2, 3, 4].map(() => handleScanCompleted(db, "scan-9")));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("an unknown scan id sends nothing", async () => {
    const db = makeFakeDb({});
    expect(await handleScanCompleted(db, "missing")).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("each distinct scan gets its own single email", async () => {
    const db = makeFakeDb({
      "scan-9": { ...scan },
      "scan-10": { ...scan, id: "scan-10", report_source: "rep_portal", creator_name: "Nick Burns" },
    });
    await handleScanCompleted(db, "scan-9");
    await handleScanCompleted(db, "scan-10");
    await handleScanCompleted(db, "scan-9");
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const subjects = sendEmail.mock.calls.map((c) => (c[0] as any).templateData.subjectOverride);
    expect(subjects[0]).toContain("[LIVE WEBSITE LEAD]");
    expect(subjects[1]).toContain("[REP GENERATED]");
  });

  it("legacy row with no trustworthy metadata notifies as SOURCE UNKNOWN, not a live lead", async () => {
    const db = makeFakeDb({
      legacy: { id: "legacy", company_name: "Old Co", report_source: "unknown_legacy", source_notified_at: null },
    });
    await handleScanCompleted(db, "legacy");
    const payload = sendEmail.mock.calls[0][0] as any;
    expect(payload.templateData.subjectOverride).toContain("[SOURCE UNKNOWN]");
    expect(payload.templateData.isLiveLead).toBe(false);
  });
});
