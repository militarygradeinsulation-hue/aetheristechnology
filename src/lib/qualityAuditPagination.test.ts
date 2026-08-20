import { describe, it, expect } from "vitest";
import {
  auditAllCompact,
  assessCompactRow,
  clampPage,
  MAX_AUDIT_PAGE,
  type CompactQualityRow,
} from "../../supabase/functions/_shared/quality-audit.ts";

/**
 * Regression guard: the historical sweep must stream COMPACT rows in bounded
 * pages. A 1,000+ report data set must never cause full-payload memory growth.
 */

const goodBody = (n: number) =>
  `Finding ${n} shows a specific break in the buying path that the team can see in the report evidence for chapter ${n}. ` +
  `The consequence for a buyer ${n} is a slower decision and a longer wait before anyone answers a real question about scope ${n}. ` +
  `The operator fix is a single owner, a named tool and a weekly check that proves the number moved for step ${n} of the pipeline.`;

function compactRow(i: number, overrides: Partial<CompactQualityRow> = {}): CompactQualityRow {
  const posts = Array.from({ length: 12 }, (_, k) => ({
    hook: `Hook ${i}-${k} on finding ${k}`,
    body: goodBody(i * 100 + k),
    cta: `Ask for the chapter ${k} teardown ${i}`,
  }));
  return {
    id: `id-${String(i).padStart(6, "0")}`,
    company_name: `Company ${i}`,
    target_url: `https://example-${i}.com`,
    posts,
    narrative: {
      executive_summary: `Company ${i} loses buyers between the first click and the first reply because nobody owns the handoff step.`,
      chapters: [
        { no: 1, title: "Positioning", verdict: `Chapter one verdict for company ${i} names the missing outcome on the homepage headline today.` },
        { no: 2, title: "Follow up", verdict: `Chapter two verdict for company ${i} records the unanswered enquiries collected during the scan window.` },
      ],
    },
    content_quality: { validation_version: 2 },
    compiler_state: "compiled",
    imagery_count: 6,
    posts_count: 12,
    schedule_count: 30,
    flag_banned: false,
    flag_dup_posts: false,
    flag_stale_manifest: false,
    flag_dup_narrative: false,
    ...overrides,
  };
}

describe("compact quality audit pagination", () => {
  it("clamps any requested page size to the RPC ceiling", () => {
    expect(clampPage(500)).toBe(MAX_AUDIT_PAGE);
    expect(clampPage(0)).toBe(15); // falsy falls back to the default page size
    expect(clampPage(undefined)).toBeLessThanOrEqual(MAX_AUDIT_PAGE);
  });

  it("streams 1,000+ reports without holding more than one page in memory", async () => {
    const TOTAL = 1200;
    let liveRows = 0;
    let maxLive = 0;
    let maxRequestedLimit = 0;

    const fetchPage = async (cursor: string | null, limit: number) => {
      maxRequestedLimit = Math.max(maxRequestedLimit, limit);
      const start = cursor ? Number(cursor.split("-")[1]) + 1 : 0;
      const rows: CompactQualityRow[] = [];
      for (let i = start; i < Math.min(start + limit, TOTAL); i++) rows.push(compactRow(i));
      liveRows = rows.length;
      maxLive = Math.max(maxLive, liveRows);
      return rows;
    };

    const totals = await auditAllCompact(fetchPage, { pageSize: 15 });

    expect(totals.processed).toBe(TOTAL);
    expect(maxRequestedLimit).toBeLessThanOrEqual(MAX_AUDIT_PAGE);
    expect(maxLive).toBeLessThanOrEqual(15);
    // exact multiple: one extra empty page terminates the sweep
    expect(totals.pages).toBe(Math.ceil(TOTAL / 15) + 1);
    expect(totals.clean).toBe(TOTAL);
    expect(totals.needs_repair).toBe(0);
    expect(totals.offenders.length).toBe(0);
  });

  it("caps the offender list no matter how many reports fail", async () => {
    const TOTAL = 300;
    const fetchPage = async (cursor: string | null, limit: number) => {
      const start = cursor ? Number(cursor.split("-")[1]) + 1 : 0;
      const rows: CompactQualityRow[] = [];
      for (let i = start; i < Math.min(start + limit, TOTAL); i++) {
        rows.push(compactRow(i, { flag_dup_posts: true }));
      }
      return rows;
    };
    const totals = await auditAllCompact(fetchPage, { pageSize: 25 });
    expect(totals.needs_repair).toBe(TOTAL);
    expect(totals.offenders.length).toBeLessThanOrEqual(25);
  });

  it("flags banned filler, short counts and duplicated narrative from the compact row only", () => {
    const banned = assessCompactRow(
      compactRow(1, {
        posts: Array.from({ length: 12 }, (_, k) => ({
          hook: `Hook ${k}`,
          body: `We looked at how Acme shows up online and found a gap around follow up ${k}. ${goodBody(k)}`,
          cta: `Book the teardown ${k}`,
        })),
      }),
    );
    expect(banned.banned).toBe(true);
    expect(banned.needs_repair).toBe(true);

    const short = assessCompactRow(compactRow(2, { imagery_count: 4, schedule_count: 12 }));
    expect(short.short_counts).toBe(true);

    const dupText =
      "Chapter prose repeated word for word across two different sections of the same report without adding anything new.";
    const dup = assessCompactRow(
      compactRow(3, {
        narrative: {
          executive_summary: dupText,
          chapters: [
            { no: 1, title: "A", verdict: dupText },
            { no: 2, title: "B", verdict: dupText },
          ],
        },
      }),
    );
    expect(dup.duplicated_narrative).toBe(true);
    expect(dup.compiled).toBe(true);
  });
});
