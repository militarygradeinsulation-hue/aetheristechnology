// Client access to the Golden Report Library + System Blueprint generator.
// Admin surfaces pass the admin PIN token; portal surfaces pass the portal token.

import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

export interface LibraryCompany {
  id: string;
  display_name: string;
  primary_domain: string | null;
  website_url: string | null;
  business_summary: string | null;
  summary_source: string | null;
  industry: string | null;
  location: string | null;
  contact_names: string[] | null;
  aliases: string[] | null;
}

export interface LibraryCard {
  company: LibraryCompany;
  report_count: number;
  newest_completed_at: string | null;
  annual_low: number | null;
  annual_high: number | null;
  finding_count: number;
  root_cause_count: number;
  grade: string | null;
  score: number | null;
  report_source: string | null;
  report_state: string | null;
  is_valid: boolean;
  newest_scan_id: string | null;
  newest_archive_id: string | null;
  blueprint: { status?: string; approval_state?: string; validation_passed?: boolean } | null;
}

export interface ArchiveRow {
  id: string;
  company_id: string;
  scan_id: string;
  report_version: number;
  report_state: string | null;
  is_valid: boolean;
  target_url: string | null;
  raw_company_name: string | null;
  report_source: string | null;
  portal_source: string | null;
  rep_code: string | null;
  creator_name: string | null;
  creator_email: string | null;
  annual_low: number | null;
  annual_high: number | null;
  leak_count: number;
  finding_count: number;
  root_cause_count: number;
  score: number | null;
  grade: string | null;
  executive_summary: string | null;
  top_priorities: unknown;
  top_leaks: unknown;
  report_hash: string | null;
  compiler_version: string | null;
  completed_at: string | null;
}

export interface FindingRow {
  id: string;
  finding_key: string;
  title: string;
  detail: string | null;
  category: string | null;
  chapter_slug: string | null;
  root_cause_id: string | null;
  root_cause_title: string | null;
  evidence_grade: string | null;
  priority: number | null;
  annual_low: number | null;
  annual_high: number | null;
  recommended_action: string | null;
  status: string | null;
}

export interface BlueprintRow {
  id: string;
  scan_id: string;
  blueprint_version: number;
  status: string;
  approval_state: string;
  validation_passed: boolean | null;
  validation: { ok?: boolean; errors?: string[]; warnings?: string[]; coverage?: { expected: number; covered: number } } | null;
  error_message: string | null;
  output_json: Record<string, unknown> | null;
  output_markdown: string | null;
  master_prompt: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  source_report_hash: string | null;
  template_version: string | null;
  created_at: string;
}

function headers(portalToken?: string | null): Record<string, string> {
  if (portalToken) return { "x-portal-token": portalToken };
  const t = getAdminToken();
  return t ? { "x-admin-token": t } : {};
}

async function call<T>(fn: string, body: Record<string, unknown>, portalToken?: string | null): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body, headers: headers(portalToken) });
  if (error) {
    const msg = (data as { error?: string })?.error || error.message;
    throw new Error(msg);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export interface ListParams {
  search?: string;
  source?: string;
  state?: string;
  industry?: string;
  blueprint?: "" | "has" | "none";
  since?: string;
  until?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export const listCompanies = (p: ListParams, portalToken?: string | null) =>
  call<{ items: LibraryCard[]; total: number }>("golden-report-library", { action: "list_companies", ...p }, portalToken);

export const getCompany = (companyId: string, portalToken?: string | null) =>
  call<{ company: LibraryCompany; reports: ArchiveRow[]; blueprints: BlueprintRow[] }>(
    "golden-report-library", { action: "get_company", company_id: companyId }, portalToken);

export const getReport = (scanId: string, portalToken?: string | null) =>
  call<{ archive: ArchiveRow; company: LibraryCompany; findings: FindingRow[]; blueprints: BlueprintRow[] }>(
    "golden-report-library", { action: "get_report", scan_id: scanId }, portalToken);

export const getLibraryStats = () =>
  call<{ total_scans: number; total_archived: number; total_companies: number }>(
    "golden-report-library", { action: "stats" });

export const runBackfillBatch = (cursor: string | null, batch = 40) =>
  call<{ processed: number; archived: number; skipped: number; errors: string[]; cursor: string | null; done: boolean; total_scans: number; total_archived: number }>(
    "golden-report-library", { action: "backfill", cursor, batch });

export const archiveScan = (scanId: string) =>
  call<{ ok: boolean; archive_id: string; skipped?: string }>("golden-report-library", { action: "archive_scan", scan_id: scanId });

export const generateBlueprint = (scanId: string, force = false, portalToken?: string | null) =>
  call<{ blueprint: BlueprintRow; validation?: unknown; reused?: boolean }>(
    "golden-system-blueprint", { action: "generate", scan_id: scanId, force }, portalToken);

export const getBlueprint = (blueprintId: string, portalToken?: string | null) =>
  call<{ blueprint: BlueprintRow }>("golden-system-blueprint", { action: "get", blueprint_id: blueprintId }, portalToken);

export const setBlueprintApproval = (blueprintId: string, approval_state: "draft" | "approved" | "rejected") =>
  call<{ blueprint: BlueprintRow }>("golden-system-blueprint", { action: "approve", blueprint_id: blueprintId, approval_state });

export function formatExposure(low: number | null, high: number | null): string {
  if (typeof low !== "number" || typeof high !== "number") return "Not priced";
  const f = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  return `${f(low)} – ${f(high)}/yr`;
}

export function downloadTextFile(name: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
