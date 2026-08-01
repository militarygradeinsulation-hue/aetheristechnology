// Golden Report origin classification — SINGLE source of truth.
//
// Imported by:
//   • supabase/functions/forensic-scan-all      (persists origin at creation)
//   • supabase/functions/golden-report-track    (notification subject + source block)
//   • src/lib/goldenReportSource.ts             (admin UI badges, tests)
//
// Pure TypeScript: no Deno globals, no network, no imports. Keep it that way so
// every surface (edge, browser, vitest) can consume the exact same logic.

export const REPORT_SOURCES = [
  "public_website",
  "rep_portal",
  "partner_portal",
  "admin_internal",
  "unknown_legacy",
] as const;

export type ReportSource = (typeof REPORT_SOURCES)[number];

export interface ReportSourceMeta {
  source: ReportSource;
  /** Bracket tag used in the notification subject line. */
  subjectTag: string;
  /** Short human label used in email body + admin UI. */
  label: string;
  /** Only a public-website submission counts as a live potential lead. */
  isLiveLead: boolean;
}

const META: Record<ReportSource, ReportSourceMeta> = {
  public_website: {
    source: "public_website",
    subjectTag: "LIVE WEBSITE LEAD",
    label: "Public website (live potential lead)",
    isLiveLead: true,
  },
  rep_portal: {
    source: "rep_portal",
    subjectTag: "REP GENERATED",
    label: "Rep portal (rep generated)",
    isLiveLead: false,
  },
  partner_portal: {
    source: "partner_portal",
    subjectTag: "PARTNER GENERATED",
    label: "Partner portal (partner generated)",
    isLiveLead: false,
  },
  admin_internal: {
    source: "admin_internal",
    subjectTag: "INTERNAL",
    label: "Admin / internal",
    isLiveLead: false,
  },
  unknown_legacy: {
    source: "unknown_legacy",
    subjectTag: "SOURCE UNKNOWN",
    label: "Source unknown (legacy)",
    isLiveLead: false,
  },
};

export function normalizeReportSource(value: unknown): ReportSource {
  const v = String(value ?? "").trim().toLowerCase();
  return (REPORT_SOURCES as readonly string[]).includes(v)
    ? (v as ReportSource)
    : "unknown_legacy";
}

export function reportSourceMeta(value: unknown): ReportSourceMeta {
  return META[normalizeReportSource(value)];
}

export function isLiveLead(value: unknown): boolean {
  return reportSourceMeta(value).isLiveLead;
}

/**
 * Server-side classification. ONLY authenticated server context is trusted —
 * any client-supplied `source` / identity field is ignored on purpose.
 */
export interface ServerAuthContext {
  /** true only after the admin HMAC token verified. */
  adminAuthenticated?: boolean;
  /** role from a *verified* portal token; null when no valid portal session. */
  portalRole?: "rep" | "partner" | null;
}

export function classifyReportSource(ctx: ServerAuthContext): ReportSource {
  if (ctx.adminAuthenticated) return "admin_internal";
  if (ctx.portalRole === "partner") return "partner_portal";
  if (ctx.portalRole === "rep") return "rep_portal";
  return "public_website";
}

// ───────────────────────────── email formatting ─────────────────────────────

export interface ScanSourceRecord {
  id?: string | null;
  report_source?: unknown;
  company_name?: string | null;
  target_url?: string | null;
  creator_user_id?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  creator_profile_id?: string | null;
  portal_source?: string | null;
  rep_code?: string | null;
  lead_name?: string | null;
  lead_email?: string | null;
  lead_phone?: string | null;
  created_at?: string | null;
}

export function formatDetroit(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "unknown";
  try {
    return `${d.toLocaleString("en-US", {
      timeZone: "America/Detroit",
      dateStyle: "medium",
      timeStyle: "short",
    })} ET`;
  } catch {
    return d.toISOString();
  }
}

export function scanDisplayName(scan: ScanSourceRecord): string {
  const company = String(scan.company_name || "").trim();
  if (company) return company;
  const url = String(scan.target_url || "").trim();
  if (!url) return "Unknown company";
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

/** `[LIVE WEBSITE LEAD] Golden Report: Acme Corp` */
export function buildNotificationSubject(scan: ScanSourceRecord): string {
  return `[${reportSourceMeta(scan.report_source).subjectTag}] Golden Report: ${scanDisplayName(scan)}`;
}

export interface SourceBlockRow { label: string; value: string }

const dash = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s || "—";
};

export function buildSourceBlock(
  scan: ScanSourceRecord,
  opts: { reportUrl?: string | null; adminUrl?: string | null } = {},
): SourceBlockRow[] {
  const meta = reportSourceMeta(scan.report_source);
  const rows: SourceBlockRow[] = [
    { label: "Report Source", value: meta.label },
    { label: "Live Lead", value: meta.isLiveLead ? "Yes" : "No" },
    { label: "Created By", value: dash(scan.creator_name || scan.creator_email || (meta.isLiveLead ? "Anonymous website visitor" : "")) },
  ];

  if (scan.report_source === "rep_portal" || scan.report_source === "partner_portal") {
    const who = scan.report_source === "partner_portal" ? "Partner" : "Rep";
    rows.push({ label: `${who} Name`, value: dash(scan.creator_name) });
    rows.push({ label: `${who} Email`, value: dash(scan.creator_email) });
    rows.push({ label: `${who} Code`, value: dash(scan.rep_code || scan.creator_profile_id) });
  }

  rows.push({ label: "Company", value: scanDisplayName(scan) });
  rows.push({ label: "Website URL", value: dash(scan.target_url) });

  if (scan.lead_name || scan.lead_email || scan.lead_phone) {
    rows.push({ label: "Lead Name", value: dash(scan.lead_name) });
    rows.push({ label: "Lead Email", value: dash(scan.lead_email) });
    rows.push({ label: "Lead Phone", value: dash(scan.lead_phone) });
  }

  rows.push({ label: "Scan ID", value: dash(scan.id) });
  rows.push({ label: "Created", value: formatDetroit(scan.created_at) });
  const link = opts.reportUrl || opts.adminUrl;
  if (link) rows.push({ label: "Report Link", value: link });
  return rows;
}

// ───────────────────── scan-creation origin resolution ─────────────────────
// Pure resolution of every persisted origin column. Client-supplied identity
// or `source` fields are NEVER read here — spoofing is impossible by design.

export interface PortalClaims { code: string; role: "rep" | "partner" }

export interface RepProfile {
  id?: string | null;
  rep_name?: string | null;
  rep_email?: string | null;
}

export interface ScanOriginContext {
  adminAuthenticated?: boolean;
  serviceRoleCaller?: boolean;
  portalClaims?: PortalClaims | null;
  /** Row from rep_codes for the verified portal code (server lookup). */
  repProfile?: RepProfile | null;
  /** Verified Supabase auth user, when a real user JWT was presented. */
  authUser?: { id?: string | null; email?: string | null; name?: string | null } | null;
  /** Untrusted request body — only lead_* contact fields are ever read. */
  body?: Record<string, unknown> | null;
}

export interface ResolvedScanOrigin {
  report_source: ReportSource;
  portal_source: string | null;
  rep_code: string | null;
  requester_kind: "admin" | "rep" | "partner" | "anon";
  creator_user_id: string | null;
  creator_name: string | null;
  creator_email: string | null;
  creator_profile_id: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
}

const str = (v: unknown, max: number): string | null => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

export function resolveScanOrigin(ctx: ScanOriginContext): ResolvedScanOrigin {
  const portalClaims = ctx.portalClaims ?? null;
  const adminAuthenticated = !!ctx.adminAuthenticated;
  const serviceRoleCaller = !!ctx.serviceRoleCaller;

  const report_source = classifyReportSource({
    adminAuthenticated: adminAuthenticated || (serviceRoleCaller && !portalClaims),
    portalRole: portalClaims?.role ?? null,
  });

  let portal_source: string | null = null;
  let rep_code: string | null = null;
  let creator_name: string | null = null;
  let creator_email: string | null = null;
  let creator_profile_id: string | null = null;

  if (portalClaims) {
    rep_code = portalClaims.code;
    portal_source = portalClaims.role === "partner" ? "partner_portal" : "rep_portal";
    creator_name = ctx.repProfile?.rep_name ?? null;
    creator_email = ctx.repProfile?.rep_email ?? null;
    creator_profile_id = ctx.repProfile?.id ?? portalClaims.code;
  } else if (adminAuthenticated) {
    portal_source = "admin";
    creator_name = "Aetheris Admin";
  } else if (serviceRoleCaller) {
    portal_source = "internal_automation";
    creator_name = "Aetheris internal automation";
  }

  let creator_user_id: string | null = null;
  if (ctx.authUser?.id) {
    creator_user_id = ctx.authUser.id;
    creator_email = creator_email || ctx.authUser.email || null;
    creator_name = creator_name || ctx.authUser.name || null;
  }

  const body = ctx.body ?? {};
  const email = str(body.lead_email, 255);

  return {
    report_source,
    portal_source,
    rep_code,
    requester_kind: adminAuthenticated || serviceRoleCaller ? "admin" : (portalClaims ? portalClaims.role : "anon"),
    creator_user_id,
    creator_name,
    creator_email,
    creator_profile_id,
    lead_name: str(body.lead_name, 200),
    lead_email: email ? email.toLowerCase() : null,
    lead_phone: str(body.lead_phone, 40),
  };
}

// ───────────────────── notification claim + payload ─────────────────────

export const NOTIFY_SELECT =
  "id, report_source, company_name, target_url, rep_code, creator_user_id, creator_name, creator_email, creator_profile_id, portal_source, lead_name, lead_email, lead_phone, created_at";

/** Minimal shape of the supabase-js client used by the claim (test-injectable). */
export interface ClaimClient {
  from(table: string): {
    update(values: Record<string, unknown>): {
      eq(col: string, val: unknown): {
        is(col: string, val: null): {
          select(cols: string): {
            maybeSingle(): Promise<{ data: ScanSourceRecord | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
}

/**
 * Claims the one-and-only "new report" notification for a scan.
 * The conditional UPDATE on `source_notified_at` guarantees retries,
 * reopens, downloads, regeneration and backfills never send a 2nd email.
 */
export async function claimNewReportNotification(
  client: ClaimClient,
  scanId: string,
  nowIso: string = new Date().toISOString(),
): Promise<ScanSourceRecord | null> {
  const { data, error } = await client
    .from("forensic_scans")
    .update({ source_notified_at: nowIso })
    .eq("id", scanId)
    .is("source_notified_at", null)
    .select(NOTIFY_SELECT)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

export interface NewReportEmail {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData: Record<string, unknown>;
}

export function buildNewReportEmail(
  scan: ScanSourceRecord,
  opts: { to: string; reportUrl?: string | null; adminUrl?: string | null; location?: string | null },
): NewReportEmail {
  const meta = reportSourceMeta(scan.report_source);
  return {
    templateName: "golden-report-opened",
    recipientEmail: opts.to,
    idempotencyKey: `golden-new-report-${scan.id}`,
    templateData: {
      subjectOverride: buildNotificationSubject(scan),
      company: scanDisplayName(scan),
      eventLabel: meta.isLiveLead
        ? "submitted a new report from the public website"
        : "generated a new report",
      sourceTag: meta.subjectTag,
      sourceLabel: meta.label,
      isLiveLead: meta.isLiveLead,
      sourceRows: buildSourceBlock(scan, { reportUrl: opts.reportUrl, adminUrl: opts.adminUrl }),
      location: opts.location || "unknown",
      recipient: scan.creator_email || scan.lead_email || "anonymous",
      openCount: 1,
      when: formatDetroit(scan.created_at),
      adminUrl: opts.adminUrl,
      reportUrl: opts.reportUrl,
    },
  };
}
