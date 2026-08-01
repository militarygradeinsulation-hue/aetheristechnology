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
