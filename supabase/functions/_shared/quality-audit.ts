// ============================================================================
// COMPACT CONTENT QUALITY AUDIT
// ----------------------------------------------------------------------------
// The historical sweep must never load full Golden Report payloads in pages.
// The database returns a COMPACT projection (posts + narrative prose + manifest
// + counts) through public.golden_report_quality_page, and this module scores
// those rows in bounded pages. Only a scan that actually needs repair is then
// fetched in full, one at a time.
// ============================================================================

import { validatePostSet, hasBannedPhrase, UNIQUENESS_VERSION, type PostLike } from "./content-uniqueness.ts";
import { narrativeQuality } from "./narrative-repair.ts";
import { TARGET_IMAGERY, POST_COUNT, SCHEDULE_DAYS } from "./report-deliverables.ts";

/** Hard ceiling on a single audit page. The RPC clamps to the same number. */
export const MAX_AUDIT_PAGE = 25;
export const DEFAULT_AUDIT_PAGE = 15;

export function clampPage(n: unknown): number {
  const v = Number(n) || DEFAULT_AUDIT_PAGE;
  return Math.max(1, Math.min(MAX_AUDIT_PAGE, Math.floor(v)));
}

export type CompactNarrative = {
  executive_summary?: string;
  chapters?: Record<string, unknown>[];
};

export type CompactQualityRow = {
  id: string;
  company_name: string | null;
  target_url: string | null;
  posts: PostLike[] | null;
  narrative: CompactNarrative | null;
  content_quality: Record<string, unknown> | null;
  compiler_state: string | null;
  imagery_count: number;
  posts_count: number;
  schedule_count: number;
  flag_banned: boolean;
  flag_dup_posts: boolean;
  flag_stale_manifest: boolean;
  flag_dup_narrative: boolean;
};

export type RowAssessment = {
  id: string;
  needs_repair: boolean;
  reasons: string[];
  banned: boolean;
  exact_duplicate_posts: boolean;
  near_duplicate_posts: boolean;
  duplicated_narrative: boolean;
  url_in_copy: boolean;
  short_counts: boolean;
  compiled: boolean;
  posts: number;
  imagery: number;
  schedule: number;
  stale_manifest: boolean;
};

const NEAR_CODES = ["near_duplicate", "repeated_sentence", "duplicate_hook", "duplicate_cta", "shared_opening"];

/** Score one compact row. No full report is ever touched here. */
export function assessCompactRow(row: CompactQualityRow): RowAssessment {
  const posts = Array.isArray(row.posts) ? row.posts : [];
  const gate = validatePostSet(posts, Math.min(POST_COUNT, posts.length || POST_COUNT));
  const codes = gate.issues.map((i) => String(i.code));

  const narrativeText = row.narrative
    ? `${row.narrative.executive_summary ?? ""} ${(row.narrative.chapters ?? [])
        .map((c) =>
          ["verdict", "what_we_found", "why_its_leaking", "what_its_costing", "recommendation"]
            .map((f) => String((c as Record<string, unknown>)[f] ?? ""))
            .join(" "),
        )
        .join(" ")}`
    : "";

  const bannedPosts = posts.some((p) => hasBannedPhrase(`${p.hook ?? ""} ${p.body ?? ""} ${p.cta ?? ""}`));
  const banned = bannedPosts || hasBannedPhrase(narrativeText);

  const nq = narrativeQuality((row.narrative || {}) as Record<string, unknown>);
  const exact = codes.includes("exact_duplicate") || row.flag_dup_posts;
  const near = codes.some((c) => NEAR_CODES.includes(c));
  const dupNarrative = !nq.ok;
  const urlInCopy = codes.includes("url_in_copy");

  const shortCounts =
    row.imagery_count < TARGET_IMAGERY || row.posts_count < POST_COUNT || row.schedule_count < SCHEDULE_DAYS;

  const staleManifest =
    row.flag_stale_manifest ||
    Number((row.content_quality as Record<string, unknown> | null)?.validation_version ?? 0) < UNIQUENESS_VERSION;

  const reasons: string[] = [];
  if (banned) reasons.push("banned_phrase");
  if (exact) reasons.push("exact_duplicate_posts");
  if (near) reasons.push("near_duplicate_posts");
  if (dupNarrative) reasons.push("duplicated_narrative");
  if (urlInCopy) reasons.push("url_in_copy");
  if (shortCounts) reasons.push("deliverable_counts_below_guarantee");
  if (posts.length < POST_COUNT) reasons.push("post_count");

  return {
    id: row.id,
    needs_repair: reasons.length > 0,
    reasons,
    banned,
    exact_duplicate_posts: exact,
    near_duplicate_posts: near,
    duplicated_narrative: dupNarrative,
    url_in_copy: urlInCopy,
    short_counts: shortCounts,
    compiled: String(row.compiler_state || "").toLowerCase() === "compiled",
    posts: row.posts_count,
    imagery: row.imagery_count,
    schedule: row.schedule_count,
    stale_manifest: staleManifest,
  };
}

export type AuditTotals = {
  processed: number;
  banned_filler: number;
  exact_duplicate_posts: number;
  near_duplicate_posts: number;
  duplicated_narrative: number;
  url_in_copy: number;
  compiled_with_duplicated_narrative: number;
  below_guarantee: number;
  clean: number;
  needs_repair: number;
  offenders: string[];
};

export function emptyTotals(): AuditTotals {
  return {
    processed: 0,
    banned_filler: 0,
    exact_duplicate_posts: 0,
    near_duplicate_posts: 0,
    duplicated_narrative: 0,
    url_in_copy: 0,
    compiled_with_duplicated_narrative: 0,
    below_guarantee: 0,
    clean: 0,
    needs_repair: 0,
    offenders: [],
  };
}

export function foldAssessment(t: AuditTotals, a: RowAssessment, offenderCap = 25): AuditTotals {
  t.processed++;
  if (a.banned) t.banned_filler++;
  if (a.exact_duplicate_posts) t.exact_duplicate_posts++;
  if (a.near_duplicate_posts) t.near_duplicate_posts++;
  if (a.duplicated_narrative) t.duplicated_narrative++;
  if (a.url_in_copy) t.url_in_copy++;
  if (a.duplicated_narrative && a.compiled) t.compiled_with_duplicated_narrative++;
  if (a.short_counts) t.below_guarantee++;
  if (a.needs_repair) {
    t.needs_repair++;
    if (t.offenders.length < offenderCap) t.offenders.push(a.id);
  } else t.clean++;
  return t;
}

/**
 * Stream every completed report through bounded compact pages.
 * Memory stays O(page) regardless of how many reports exist: each page is
 * folded into counters and dropped before the next page is requested.
 */
export async function auditAllCompact(
  fetchPage: (cursor: string | null, limit: number) => Promise<CompactQualityRow[]>,
  opts: { pageSize?: number; maxPages?: number; onRow?: (a: RowAssessment) => void } = {},
): Promise<AuditTotals & { pages: number }> {
  const limit = clampPage(opts.pageSize ?? DEFAULT_AUDIT_PAGE);
  const maxPages = opts.maxPages ?? 100_000;
  const totals = emptyTotals();
  let cursor: string | null = null;
  let pages = 0;

  while (pages < maxPages) {
    const rows = await fetchPage(cursor, limit);
    pages++;
    if (!rows.length) break;
    for (const row of rows) {
      const a = assessCompactRow(row);
      foldAssessment(totals, a);
      opts.onRow?.(a);
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < limit) break;
  }

  return { ...totals, pages };
}
