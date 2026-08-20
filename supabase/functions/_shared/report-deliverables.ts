// Golden Report growth deliverables — imagery, posts, schedule.
//
// ONE implementation, shared by the Deno edge functions and the Vite app
// (via src/lib/reportDeliverables.ts). Two guarantees:
//
//   1. buildFallbackDeliverables() is deterministic, needs no AI, and always
//      returns >= 4 imagery concepts, exactly 12 posts and exactly 30 schedule
//      entries built from the company name, report.top_leaks and chapter
//      actions. It is attached BEFORE the scan is marked completed, so a report
//      can never ship with empty deliverable tabs.
//   2. normalizeDeliverables() validates AI enrichment against the same
//      minimums and merges it over the deterministic base. Anything invalid is
//      discarded, never blanked.
//
// Nothing here prices anything, recalculates leakage or invents proof.

import { stripDashes } from "./no-dashes.ts";
import { writeAllPosts, type PostEvidence } from "./report-post-writers.ts";
import {
  validatePostSet,
  normalizeText,
  hasBannedPhrase,
  type QualityManifest,
} from "./content-uniqueness.ts";


export const MIN_IMAGERY = 4;
/** Every stored report must carry at least this many imagery concepts. */
export const TARGET_IMAGERY = 6;
export const POST_COUNT = 12;
export const SCHEDULE_DAYS = 30;

export type GenerationState = "fallback" | "ready" | "ready_with_fallback" | "degraded";

export type ImageryConcept = {
  id: string;
  title: string;
  purpose: string;
  channel: string;
  prompt: string;
  aspect_ratio: string;
  dimensions: string;
  related_leak: string;
  status: "concept" | "generated";
  hero?: boolean;
  image_url?: string | null;
  generated_at?: string | null;
};

export type DeliverablePost = {
  id: string;
  platform: string;
  hook: string;
  body: string;
  cta: string;
  visual: string;
  related_leak: string;
  status: "ready" | "draft";
  /** Editorial archetype. Internal only, never rendered as a public label. */
  role?: string;
  /** One actionable line, reused as the schedule goal. */
  takeaway?: string;
};


export type ScheduleEntry = {
  day: number;
  date: string;
  post_id: string | null;
  content_type: string;
  platform: string;
  time: string;
  purpose: string;
  topic: string;
  visual: string;
  goal: string;
  owner: string;
  status: "planned" | "scheduled" | "published";
  related_leak: string;
};

export type ReportDeliverables = {
  brand?: Record<string, unknown> | null;
  imagery: {
    visual_style?: string;
    subjects?: string[];
    composition?: string;
    lighting?: string;
    color_treatment?: string;
    show?: string[];
    avoid?: string[];
    prompts?: { title?: string; prompt?: string }[];
    concepts: ImageryConcept[];
  };
  posts: DeliverablePost[];
  schedule: { overview: string; days: ScheduleEntry[] };
  generation_state: GenerationState;
  generated_at: string;
  enriched_at?: string | null;
  enrichment_error?: string | null;
};

/* ─────────────────────────────── helpers ─────────────────────────────── */

const PLATFORM_CYCLE = ["LinkedIn", "LinkedIn", "Email", "Instagram", "Facebook", "X"];
const TIME_CYCLE = ["8:30 AM ET", "11:45 AM ET", "1:15 PM ET", "4:00 PM ET"];
const PURPOSE_CYCLE = ["authority", "education", "proof of process", "offer", "reactivation", "education"];
const CONTENT_CYCLE = ["social post", "social post", "email", "social post", "short video", "social post"];

function clean(s: unknown): string {
  return stripDashes(String(s ?? "").replace(/\s+/g, " ").trim());
}

function titleOf(leak: unknown, i: number): string {
  const l = (leak || {}) as Record<string, unknown>;
  const name = clean(l.name || l.title || l.leak || "");
  return name || `Priority finding ${i + 1}`;
}

function leakList(report: Record<string, unknown> | null | undefined): string[] {
  const raw = Array.isArray(report?.top_leaks) ? (report!.top_leaks as unknown[]) : [];
  const names = raw.map((l, i) => titleOf(l, i)).filter(Boolean);
  if (names.length >= 4) return names.slice(0, 10);
  // Chapter verdict slugs are the honest second source when leaks are thin.
  const chapters = Array.isArray(report?.chapters) ? (report!.chapters as Record<string, unknown>[]) : [];
  for (const ch of chapters) {
    const t = clean(ch.title || ch.slug);
    if (t && !names.includes(t)) names.push(t);
    if (names.length >= 8) break;
  }
  while (names.length < 4) {
    names.push(["Website conversion clarity", "Follow up speed", "Search visibility", "Message consistency"][names.length % 4]);
  }
  return names.slice(0, 10);
}

function chapterActions(report: Record<string, unknown> | null | undefined): string[] {
  const chapters = Array.isArray(report?.chapters) ? (report!.chapters as Record<string, unknown>[]) : [];
  const out: string[] = [];
  for (const ch of chapters) {
    const wtd = (ch.what_to_do || {}) as Record<string, unknown>;
    for (const key of ["this_week", "this_month", "this_quarter"]) {
      const arr = Array.isArray(wtd[key]) ? (wtd[key] as unknown[]) : [];
      for (const a of arr) {
        const v = clean(a);
        if (v && v.length > 12 && !/re run the scan/i.test(v)) out.push(v);
      }
    }
  }
  return out;
}

function paletteOf(brand: Record<string, unknown> | null | undefined): string {
  const colors = Array.isArray(brand?.colors) ? (brand!.colors as Record<string, unknown>[]) : [];
  const hexes = colors.map((c) => String(c.hex || "")).filter((h) => /^#[0-9a-f]{3,8}$/i.test(h)).slice(0, 4);
  return hexes.length ? hexes.join(", ") : "deep charcoal, warm gold accent, clean off white";
}

function isoDay(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/**
 * One private evidence bundle per post. Observations are pulled from the report
 * (chapter findings, verdicts, leak descriptions) and each concrete sentence is
 * handed to exactly one post, so no two posts argue from the same fact.
 */
export function buildEvidencePool(
  report: Record<string, unknown> | null | undefined,
  leaks: string[],
  actions: string[],
  count: number,
): PostEvidence[] {
  const seen = new Set<string>();
  const details: Array<{ leak: string; detail: string }> = [];

  const add = (leak: string, raw: unknown) => {
    for (const s of String(raw ?? "").split(/(?<=[.!?])\s+/)) {
      const v = clean(s);
      if (v.length < 40 || v.length > 320) continue;
      const key = normalizeText(v);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      details.push({ leak, detail: v });
      return; // one sentence per source field keeps the pool broad, not deep
    }
  };

  const rawLeaks = Array.isArray(report?.top_leaks) ? (report!.top_leaks as Record<string, unknown>[]) : [];
  rawLeaks.forEach((l, i) => {
    const name = titleOf(l, i);
    add(name, l.description || l.detail || l.evidence || l.why || l.summary);
  });

  const chapters = Array.isArray(report?.chapters) ? (report!.chapters as Record<string, unknown>[]) : [];
  for (const field of ["what_we_found", "verdict", "why_its_leaking"]) {
    chapters.forEach((ch, i) => {
      add(clean(ch.title || ch.slug) || leaks[i % leaks.length], ch[field]);
    });
  }
  add(leaks[0], report?.executive_summary);

  const out: PostEvidence[] = [];
  for (let i = 0; i < count; i++) {
    const d = details[i % Math.max(1, details.length)];
    const leak = d?.leak || leaks[i % leaks.length];
    // Sparse evidence: derive a different buyer implication per post rather
    // than repeating the same sentence. The action still differentiates them.
    const detail = d?.detail ||
      `the review flagged ${leak.toLowerCase()} as an unresolved gap on the public surface`;
    const action = actions[i % Math.max(1, actions.length)] ||
      `assign an owner to ${leak.toLowerCase()} and correct it this week`;
    out.push({ leak, detail, action });
  }
  return out;
}

/** Short calendar line. Never the post body. */
export
function scheduleTopic(post: DeliverablePost): string {
  const t = clean(post.hook).replace(/^["“]|["”]$/g, "");
  const short = t.length > 95 ? `${t.slice(0, 92).replace(/\s+\S*$/, "")}…` : t;
  return clean(`${post.related_leak}: ${short}`);
}


/* ───────────────────────── deterministic fallback ───────────────────── */

export function buildFallbackDeliverables(input: {
  company: string;
  url: string;
  report?: Record<string, unknown> | null;
  brand?: Record<string, unknown> | null;
}): ReportDeliverables {
  const name = clean(input.company) || clean(input.url) || "this company";
  const leaks = leakList(input.report);
  const actions = chapterActions(input.report);
  const palette = paletteOf(input.brand);
  const site = clean(input.url);

  const conceptSpecs: Array<{ title: string; purpose: string; channel: string; ratio: string; dims: string; hero?: boolean }> = [
    { title: `${name} hero statement`, purpose: "Homepage hero that states what the company does and who it serves in one look.", channel: "Website hero", ratio: "16:9", dims: "1920x1080", hero: true },
    { title: "Proof of process", purpose: "Show the actual work being done so the site stops relying on stock imagery.", channel: "Website and LinkedIn", ratio: "4:5", dims: "1080x1350" },
    { title: "Offer card", purpose: "A single clear offer graphic that can carry the primary call to action.", channel: "Social and email", ratio: "1:1", dims: "1080x1080" },
    { title: "Team and credibility", purpose: "Put real people and real credentials in front of buyers who are still deciding.", channel: "About page and LinkedIn", ratio: "3:2", dims: "1620x1080" },
    { title: "Service breakdown", purpose: "Visual breakdown of the core services so buyers stop guessing what is included.", channel: "Services page", ratio: "16:9", dims: "1920x1080" },
    { title: "Before and after clarity", purpose: "Contrast the current confusing state with the corrected state.", channel: "Social carousel", ratio: "1:1", dims: "1080x1080" },
  ];

  const concepts: ImageryConcept[] = conceptSpecs.map((s, i) => ({
    id: `img-${String(i + 1).padStart(2, "0")}`,
    title: clean(s.title),
    purpose: clean(s.purpose),
    channel: s.channel,
    aspect_ratio: s.ratio,
    dimensions: s.dims,
    related_leak: leaks[i % leaks.length],
    status: "concept",
    hero: !!s.hero,
    image_url: null,
    prompt: clean(
      `Professional brand image for ${name}${site ? ` (${site})` : ""}. Concept: ${s.title}. ${s.purpose} ` +
      `Composition: clean, editorial, generous negative space, one clear focal subject, room for a headline. ` +
      `Lighting: natural directional light, soft shadows, no harsh flash. Palette: ${palette}. ` +
      `Mood: credible, grounded, operator grade. This image supports the finding: ${leaks[i % leaks.length]}. ` +
      `No stock photo cliches, no fake logos, no invented awards, no text artifacts, no watermarks. ${s.ratio} aspect ratio.`,
    ),
  }));

  const evidence = buildEvidencePool(input.report, leaks, actions, POST_COUNT);
  const written = writeAllPosts(name, site, evidence);

  const posts: DeliverablePost[] = written.map((w, i) => ({
    id: `post-${String(i + 1).padStart(2, "0")}`,
    platform: PLATFORM_CYCLE[i % PLATFORM_CYCLE.length],
    hook: w.hook,
    body: w.body,
    cta: w.cta,
    visual: clean(`${w.visual} Pairs with: ${concepts[i % concepts.length].title}.`),
    related_leak: evidence[i % evidence.length].leak,
    status: "ready",
    role: w.role,
    takeaway: w.takeaway,
  }));

  const days: ScheduleEntry[] = Array.from({ length: SCHEDULE_DAYS }, (_, i) => {
    const post = posts[i % posts.length];
    const contentType = CONTENT_CYCLE[i % CONTENT_CYCLE.length];
    const usesPost = contentType === "social post";
    return {
      day: i + 1,
      date: isoDay(i),
      post_id: usesPost ? post.id : null,
      content_type: contentType,
      platform: usesPost ? post.platform : (contentType === "email" ? "Email" : "Short video"),
      time: TIME_CYCLE[i % TIME_CYCLE.length],
      purpose: PURPOSE_CYCLE[i % PURPOSE_CYCLE.length],
      topic: scheduleTopic(post),
      visual: post.visual,
      goal: clean(post.takeaway || `Move buyers past ${post.related_leak.toLowerCase()}.`),
      owner: usesPost ? "Marketing" : "Owner",
      status: "planned",
      related_leak: post.related_leak,
    };
  });


  return {
    imagery: {
      visual_style: clean(`Editorial and grounded. Real work, real people, generous space. Palette: ${palette}.`),
      subjects: concepts.slice(0, 5).map((c) => c.title),
      show: ["The actual service being delivered", "Real people from the team", "Clear single offer statements", "Clean product or site screens"],
      avoid: ["Stock handshakes", "Generic city skylines", "Invented awards or badges", "Cluttered collages"],
      color_treatment: clean(`Hold the palette: ${palette}.`),
      prompts: concepts.map((c) => ({ title: c.title, prompt: c.prompt })),
      concepts,
    },
    posts,
    schedule: {
      overview: clean(
        `A 30 day cadence for ${name} built from what the scan actually found. ` +
        `Each entry maps to a finding so publishing work also closes a gap instead of adding noise.`,
      ),
      days,
    },
    generation_state: "fallback",
    generated_at: new Date().toISOString(),
  };
}

/* ─────────────────────── AI enrichment normalisation ────────────────── */

function validConcepts(raw: unknown, base: ImageryConcept[]): ImageryConcept[] | null {
  const arr = Array.isArray(raw) ? raw : [];
  const out: ImageryConcept[] = [];
  arr.forEach((r, i) => {
    const o = (r || {}) as Record<string, unknown>;
    const prompt = clean(o.prompt);
    const title = clean(o.title);
    if (!prompt || prompt.length < 60 || !title) return;
    const b = base[i % base.length];
    out.push({
      id: `img-${String(out.length + 1).padStart(2, "0")}`,
      title,
      purpose: clean(o.purpose) || b.purpose,
      channel: clean(o.channel || o.use) || b.channel,
      prompt,
      aspect_ratio: clean(o.aspect_ratio) || b.aspect_ratio,
      dimensions: clean(o.dimensions) || b.dimensions,
      related_leak: clean(o.related_leak || o.related_finding) || b.related_leak,
      status: "concept",
      hero: out.length === 0,
      image_url: null,
    });
  });
  return out.length >= MIN_IMAGERY ? out : null;
}

/** Shape raw AI posts into DeliverablePost form. No quality judgement here. */
export function shapeAiPosts(raw: unknown, base: DeliverablePost[]): DeliverablePost[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: DeliverablePost[] = [];
  arr.forEach((r, i) => {
    const o = (r || {}) as Record<string, unknown>;
    const body = clean(o.body);
    const hook = clean(o.hook);
    if (!body || !hook) return;
    const b = base[i % base.length];
    out.push({
      id: `post-${String(out.length + 1).padStart(2, "0")}`,
      platform: clean(o.platform) || b.platform,
      hook,
      body,
      cta: clean(o.cta) || b.cta,
      visual: clean(o.visual) || b.visual,
      related_leak: clean(o.related_leak || o.related_finding) || b.related_leak,
      status: "ready",
      role: b.role,
      takeaway: clean(o.takeaway) || b.takeaway,
    });
  });
  return out;
}

export type PostQualityResult = {
  posts: DeliverablePost[];
  manifest: QualityManifest;
  ok: boolean;
  issues: ReturnType<typeof validatePostSet>["issues"];
  /** How many of the final 12 came from the AI candidate list. */
  ai_kept: number;
};

/**
 * Build the final 12 from AI candidates first, then top up with deterministic
 * archetype posts that are themselves distinct from everything already kept.
 * Repetitive filler is never shipped: a candidate that fails the gate is
 * dropped, not patched.
 */
export function qualifyPosts(
  candidates: DeliverablePost[],
  deterministic: DeliverablePost[],
): PostQualityResult {
  const kept: DeliverablePost[] = [];
  const tryAdd = (p: DeliverablePost) => {
    if (kept.length >= POST_COUNT) return false;
    const res = validatePostSet([...kept, p], kept.length + 1);
    if (res.qualifiedIndexes.length === kept.length + 1) {
      kept.push(p);
      return true;
    }
    return false;
  };

  let aiKept = 0;
  for (const p of candidates) if (tryAdd(p)) aiKept++;
  for (const p of deterministic) tryAdd(p);

  const final = kept.slice(0, POST_COUNT).map((p, i) => ({
    ...p,
    id: `post-${String(i + 1).padStart(2, "0")}`,
  }));
  const res = validatePostSet(final, POST_COUNT);
  return { posts: final, manifest: res.manifest, ok: res.ok, issues: res.issues, ai_kept: aiKept };
}

/** Legacy entry point used by normalizeDeliverables. */
function validPosts(raw: unknown, base: DeliverablePost[]): DeliverablePost[] | null {
  const shaped = shapeAiPosts(raw, base).filter((p) => !hasBannedPhrase(`${p.hook} ${p.body} ${p.cta}`));
  if (!shaped.length) return null;
  const { posts, ok, ai_kept } = qualifyPosts(shaped, base);
  if (!ok || ai_kept === 0) return ai_kept > 0 && posts.length === POST_COUNT ? posts : null;
  return posts;
}

/** True when a stored post set already passes the uniqueness gate. */
export function postsPassGate(posts: unknown): boolean {
  const arr = Array.isArray(posts) ? (posts as DeliverablePost[]) : [];
  if (arr.length < POST_COUNT) return false;
  return validatePostSet(arr.slice(0, POST_COUNT), POST_COUNT).ok;
}


function validSchedule(raw: unknown, posts: DeliverablePost[], base: ScheduleEntry[]): ScheduleEntry[] | null {
  const arr = Array.isArray(raw) ? raw : [];
  const bodies = new Set(posts.map((p) => normalizeText(p.body)));
  const out: ScheduleEntry[] = [];
  arr.forEach((r, i) => {
    const o = (r || {}) as Record<string, unknown>;
    let topic = clean(o.topic);
    if (!topic) return;
    const b = base[i % base.length];
    const pid = clean(o.post_id);
    const mapped = posts.find((p) => p.id === pid) || posts[out.length % posts.length];
    // A schedule line is a calendar label, never a pasted post body.
    if (topic.length > 160 || bodies.has(normalizeText(topic))) topic = scheduleTopic(mapped);
    let goal = clean(o.goal) || b.goal;
    if (goal.length > 160 || bodies.has(normalizeText(goal))) {
      goal = clean(mapped.takeaway || b.goal);
    }
    out.push({
      day: out.length + 1,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(o.date || "")) ? String(o.date) : isoDay(out.length),
      post_id: posts.some((p) => p.id === pid) ? pid : b.post_id,
      content_type: clean(o.content_type) || b.content_type,
      platform: clean(o.platform) || b.platform,
      time: clean(o.time) || b.time,
      purpose: clean(o.purpose) || b.purpose,
      topic,
      visual: clean(o.visual) || b.visual,
      goal,
      owner: clean(o.owner) || b.owner,
      status: "planned",
      related_leak: clean(o.related_leak || o.related_finding) || b.related_leak,
    });
  });
  return out.length >= SCHEDULE_DAYS ? out.slice(0, SCHEDULE_DAYS) : null;
}


/**
 * AI enrichment often returns 4 or 5 strong concepts. Accepting that verbatim
 * used to shrink a 6 concept report down to 5, so top the list back up with the
 * deterministic concepts the AI did not cover. Richer AI content always wins
 * and is never replaced; the deterministic ones only fill the tail.
 */
export function topUpConcepts(
  concepts: ImageryConcept[],
  base: ImageryConcept[],
  target = TARGET_IMAGERY,
): ImageryConcept[] {
  const out = [...concepts];
  const seen = new Set(out.map((c) => clean(c.title).toLowerCase()));
  for (const b of base) {
    if (out.length >= target) break;
    const key = clean(b.title).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...b });
  }
  // Deterministic filler if the base itself was short: vary the channel so the
  // extra concepts stay useful rather than being literal duplicates.
  let n = 0;
  while (out.length < target && base.length) {
    const b = base[n % base.length];
    n++;
    const variant = EXTRA_CHANNELS[(out.length - base.length + EXTRA_CHANNELS.length) % EXTRA_CHANNELS.length];
    const title = clean(`${b.title} (${variant.label})`);
    if (seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    out.push({
      ...b,
      title,
      channel: variant.channel,
      aspect_ratio: variant.ratio,
      dimensions: variant.dims,
      purpose: clean(`${b.purpose} Reformatted for ${variant.channel.toLowerCase()}.`),
      prompt: clean(`${b.prompt} Reframe for ${variant.channel.toLowerCase()} at ${variant.ratio}.`),
      hero: false,
      image_url: null,
      status: "concept",
    });
  }
  return out.map((c, i) => ({ ...c, id: `img-${String(i + 1).padStart(2, "0")}`, hero: i === 0 }));
}

const EXTRA_CHANNELS: Array<{ label: string; channel: string; ratio: string; dims: string }> = [
  { label: "story cut", channel: "Story and reel", ratio: "9:16", dims: "1080x1920" },
  { label: "email header", channel: "Email header", ratio: "2:1", dims: "1200x600" },
  { label: "square cut", channel: "Social feed", ratio: "1:1", dims: "1080x1080" },
  { label: "wide banner", channel: "Landing page banner", ratio: "16:9", dims: "1920x1080" },
];

/**
 * Merge validated AI output over the deterministic base. Any section that
 * fails validation keeps its fallback content, and the state records that.
 */
export function normalizeDeliverables(
  base: ReportDeliverables,
  ai: Record<string, unknown> | null | undefined,
): ReportDeliverables {
  const src = ai || {};
  const imageryRaw = (src.imagery || {}) as Record<string, unknown>;
  const concepts = validConcepts(imageryRaw.concepts ?? imageryRaw.prompts, base.imagery.concepts);
  const posts = validPosts(src.posts, base.posts);
  const schedule = validSchedule(
    (src.schedule as Record<string, unknown>)?.days ?? src.schedule,
    posts || base.posts,
    base.schedule.days,
  );

  const upgraded = [concepts, posts, schedule].filter(Boolean).length;
  const nextConcepts = topUpConcepts(concepts || base.imagery.concepts, base.imagery.concepts);

  return {
    ...base,
    brand: (src.brand as Record<string, unknown>) || base.brand || null,
    imagery: {
      ...base.imagery,
      visual_style: clean(imageryRaw.visual_style) || base.imagery.visual_style,
      composition: clean(imageryRaw.composition) || base.imagery.composition,
      lighting: clean(imageryRaw.lighting) || base.imagery.lighting,
      color_treatment: clean(imageryRaw.color_treatment) || base.imagery.color_treatment,
      subjects: Array.isArray(imageryRaw.subjects) && imageryRaw.subjects.length
        ? (imageryRaw.subjects as unknown[]).map(clean).filter(Boolean)
        : base.imagery.subjects,
      show: Array.isArray(imageryRaw.show) && imageryRaw.show.length
        ? (imageryRaw.show as unknown[]).map(clean).filter(Boolean)
        : base.imagery.show,
      avoid: Array.isArray(imageryRaw.avoid) && imageryRaw.avoid.length
        ? (imageryRaw.avoid as unknown[]).map(clean).filter(Boolean)
        : base.imagery.avoid,
      concepts: nextConcepts,
      prompts: nextConcepts.map((c) => ({ title: c.title, prompt: c.prompt })),
    },
    posts: posts || base.posts,
    schedule: {
      overview: clean((src.schedule as Record<string, unknown>)?.overview) || base.schedule.overview,
      days: schedule || base.schedule.days,
    },
    generation_state: upgraded === 3 ? "ready" : upgraded === 0 ? "degraded" : "ready_with_fallback",
    enriched_at: new Date().toISOString(),
  };
}

/** True when the stored deliverables already satisfy every minimum count. */
export function deliverablesComplete(d: unknown): boolean {
  const o = (d || {}) as Partial<ReportDeliverables>;
  const concepts = (o.imagery as { concepts?: unknown[] } | undefined)?.concepts;
  const days = (o.schedule as { days?: unknown[] } | undefined)?.days;
  return (
    Array.isArray(concepts) && concepts.length >= TARGET_IMAGERY &&
    Array.isArray(o.posts) && o.posts.length >= POST_COUNT &&
    Array.isArray(days) && days.length >= SCHEDULE_DAYS
  );
}
