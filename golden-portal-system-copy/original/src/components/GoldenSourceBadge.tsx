// Shared Golden Report origin badge.
// Renders the persisted report_source as LIVE WEBSITE LEAD / REP GENERATED /
// PARTNER GENERATED / INTERNAL / SOURCE UNKNOWN.
//
// Creator + rep identity is ONLY rendered when `admin` is true (authenticated
// admin surfaces). Public/portal client views never receive it.

import { reportSourceMeta, type ScanSourceRecord } from "@/lib/goldenReportSource";

const STYLES: Record<string, string> = {
  public_website: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  rep_portal: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  partner_portal: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  admin_internal: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  unknown_legacy: "bg-muted text-muted-foreground border-border",
};

export function GoldenSourceBadge({
  source,
  className = "",
}: { source: unknown; className?: string }) {
  const meta = reportSourceMeta(source);
  return (
    <span
      title={meta.label}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${STYLES[meta.source]} ${className}`}
    >
      {meta.subjectTag}
    </span>
  );
}

/** Identity line — admin-only. Returns null for any non-admin surface. */
export function GoldenSourceIdentity({
  scan,
  admin,
  className = "",
}: { scan: ScanSourceRecord; admin: boolean; className?: string }) {
  if (!admin) return null;
  const meta = reportSourceMeta(scan.report_source);
  const who = scan.creator_name || scan.creator_email;
  const parts: string[] = [];
  if (who) parts.push(String(who));
  if (scan.creator_email && scan.creator_name) parts.push(String(scan.creator_email));
  if (scan.rep_code) parts.push(`Code ${scan.rep_code}`);
  if (!parts.length) parts.push(meta.isLiveLead ? "Anonymous website visitor" : "—");
  return (
    <span className={`text-[11px] text-muted-foreground ${className}`}>{parts.join(" · ")}</span>
  );
}
