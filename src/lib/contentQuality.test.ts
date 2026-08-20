import { describe, it, expect } from "vitest";
import {
  validatePostSet,
  validateNarrative,
  hasBannedPhrase,
  similarity,
  UNIQUENESS_VERSION,
} from "../../supabase/functions/_shared/content-uniqueness.ts";
import {
  buildFallbackDeliverables,
  buildEvidencePool,
  qualifyPosts,
  postsPassGate,
  shapeAiPosts,
} from "../../supabase/functions/_shared/report-deliverables.ts";

const report = {
  executive_summary:
    "Buyers arriving from search cannot tell within thirty seconds what the company sells or who it serves.",
  top_leaks: [
    { title: "Unclear positioning", description: "The homepage headline names an industry but never names an outcome or a buyer." },
    { title: "Slow follow up", description: "Enquiries submitted through the contact form receive no acknowledgement of any kind." },
    { title: "No proof", description: "There is no case evidence anywhere on the public site for a buyer to check." },
  ],
  chapters: [
    {
      title: "Positioning",
      what_we_found: "Four separate pages open with the same headline and none of them state the service.",
      verdict: "The public surface does not identify the business to a first time visitor.",
      what_to_do: ["Rewrite the homepage headline to name the buyer and the outcome"],
    },
    {
      title: "Response",
      what_we_found: "The contact form posts to an inbox that nobody has been assigned to monitor.",
      verdict: "Enquiries decay before anyone sees them.",
      what_to_do: ["Assign an owner to the enquiry inbox with a one hour response target"],
    },
  ],
};

const built = buildFallbackDeliverables({
  company: "Northline Mechanical",
  url: "https://northline.example",
  report: report as never,
});

describe("banned filler", () => {
  it("flags the retired template family", () => {
    expect(hasBannedPhrase("We looked at how Acme shows up online and found a gap around clarity.")).toBe(true);
    expect(hasBannedPhrase("Nothing dramatic, just a place where a buyer has to work harder.")).toBe(true);
  });

  it("never appears in deterministic posts", () => {
    for (const p of built.posts) {
      expect(hasBannedPhrase(`${p.hook} ${p.body} ${p.cta}`)).toBe(false);
    }
  });
});

describe("deterministic post set", () => {
  it("produces exactly 12 posts that pass the gate", () => {
    expect(built.posts).toHaveLength(12);
    const res = validatePostSet(built.posts, 12);
    expect(res.issues).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it("uses 12 distinct editorial roles", () => {
    expect(new Set(built.posts.map((p) => p.role)).size).toBe(12);
  });

  it("has no shared four word opening prefix", () => {
    const prefixes = built.posts.map((p) => p.body.toLowerCase().split(/\s+/).slice(0, 4).join(" "));
    expect(new Set(prefixes).size).toBe(12);
  });

  it("keeps every pair under the near duplicate threshold", () => {
    for (let i = 0; i < built.posts.length; i++) {
      for (let j = i + 1; j < built.posts.length; j++) {
        expect(similarity(built.posts[i].body, built.posts[j].body)).toBeLessThan(0.42);
      }
    }
  });
});

describe("evidence pool", () => {
  it("gives each post its own evidence sentence when evidence is plentiful", () => {
    const pool = buildEvidencePool(report as never, ["Unclear positioning"], ["Rewrite the headline"], 12);
    const details = pool.slice(0, 5).map((p) => p.detail);
    expect(new Set(details).size).toBe(5);
  });

  it("still yields 12 usable anchors when evidence is sparse", () => {
    const pool = buildEvidencePool({ top_leaks: [{ title: "One leak" }] } as never, ["One leak"], ["Fix it"], 12);
    expect(pool).toHaveLength(12);
    expect(pool.every((p) => p.detail.length > 20)).toBe(true);
  });

  it("sparse evidence still produces a passing post set", () => {
    const sparse = buildFallbackDeliverables({
      company: "Solo Trades",
      url: "https://solo.example",
      report: { top_leaks: [{ title: "One leak" }] } as never,
    });
    expect(validatePostSet(sparse.posts, 12).ok).toBe(true);
  });
});

describe("qualifyPosts merge", () => {
  const good = built.posts.slice(0, 4).map((p, i) => ({ ...p, id: `ai-${i}` }));

  it("rejects exact duplicate AI posts and backfills deterministic ones", () => {
    const dupes = [good[0], { ...good[0], id: "ai-dupe" }];
    const merged = qualifyPosts(dupes, built.posts);
    expect(merged.posts).toHaveLength(12);
    expect(merged.ok).toBe(true);
    expect(merged.ai_kept).toBe(1);
  });

  it("rejects paraphrased near duplicates", () => {
    const near = { ...good[1], id: "ai-near", body: good[1].body.replace(/\bthe\b/g, "that") };
    const merged = qualifyPosts([good[1], near], built.posts);
    expect(merged.ai_kept).toBe(1);
  });

  it("rejects repeated hooks and CTAs", () => {
    const sameHook = { ...good[2], id: "ai-hook", body: good[3].body, hook: good[2].hook };
    const merged = qualifyPosts([good[2], sameHook], built.posts);
    expect(merged.ai_kept).toBe(1);
  });

  it("drops banned filler outright", () => {
    const filler = shapeAiPosts(
      [{ hook: "A look", body: "We looked at how Northline shows up online and found a gap around clarity. Nothing dramatic, just a place where a buyer has to work harder than they should." }],
      built.posts,
    );
    const merged = qualifyPosts(filler, built.posts);
    expect(merged.ai_kept).toBe(0);
    expect(postsPassGate(merged.posts)).toBe(true);
  });
});

describe("schedule mapping", () => {
  it("maps to real posts and never pastes a post body", () => {
    expect(built.schedule.days).toHaveLength(30);
    const ids = new Set(built.posts.map((p) => p.id));
    const bodies = new Set(built.posts.map((p) => p.body));
    for (const d of built.schedule.days) {
      if (d.post_id) expect(ids.has(d.post_id)).toBe(true);
      expect(bodies.has(d.topic)).toBe(false);
      expect(d.topic.length).toBeLessThanOrEqual(160);
      expect(d.goal.length).toBeLessThanOrEqual(160);
    }
  });
});

describe("narrative gate", () => {
  it("flags copied paragraphs across sections", () => {
    const para = "The enquiry inbox has no assigned owner and messages sit unread for several working days.";
    const res = validateNarrative([
      { path: "chapters.0.what_we_found", text: para },
      { path: "chapters.1.what_we_found", text: para },
    ]);
    expect(res.ok).toBe(false);
    expect(res.manifest.exact_duplicates).toBeGreaterThan(0);
  });

  it("flags repeated long sentences inside otherwise different prose", () => {
    const shared = "Buyers cannot tell within thirty seconds what this company actually sells to them.";
    const res = validateNarrative([
      { path: "executive_summary", text: `Opening context differs here. ${shared}` },
      { path: "chapters.0.why_its_leaking", text: `${shared} A completely separate closing thought follows.` },
    ]);
    expect(res.ok).toBe(false);
  });

  it("passes genuinely distinct narrative", () => {
    const res = validateNarrative([
      { path: "executive_summary", text: "Search visitors leave before the offer is ever stated in plain language." },
      { path: "chapters.0.what_we_found", text: "Response time on inbound forms exceeded three working days in every sampled case." },
    ]);
    expect(res.ok).toBe(true);
    expect(res.manifest.validation_version).toBe(UNIQUENESS_VERSION);
  });
});
