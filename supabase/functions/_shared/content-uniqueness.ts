// ============================================================================
// CONTENT UNIQUENESS + QUALITY LAYER
// ----------------------------------------------------------------------------
// ONE implementation, shared by:
//   - deterministic deliverable generation (_shared/report-deliverables.ts)
//   - AI normalisation / enrichment (report-deliverables edge function)
//   - the Golden Report compiler narrative pass
//   - archive / historical backfill
//   - the Vite app (via src/lib/contentUniqueness.ts) for website + PDF source
//
// It answers three questions, deterministically and with no AI:
//   1. Does this text use banned generic filler?
//   2. Are two pieces of copy the same, or near enough to read as the same?
//   3. Does a set of 12 posts, or a set of report narrative sections, pass the
//      uniqueness gate, and what exactly failed?
//
// Nothing here rewrites money, evidence, citations or findings.
// ============================================================================

/** Bump when thresholds or banned families change. Stored in quality manifests. */
export const UNIQUENESS_VERSION = 2;

/* ───────────────────────────── banned filler ─────────────────────────── */

/**
 * The generic-filler family. These shipped in 322 production reports from a
 * single hardcoded fallback template and must never appear again, in
 * deterministic output or AI output.
 */
export const BANNED_PHRASE_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "we_looked_at_how", re: /\bwe\s+(?:looked|took a look)\s+at\s+how\b/i },
  { id: "shows_up_online", re: /\bshows?\s+up\s+online\b/i },
  { id: "found_a_gap_around", re: /\bfound\s+a\s+gap\s+(?:around|in|with)\b/i },
  { id: "nothing_dramatic", re: /\bnothing\s+(?:dramatic|crazy|major|earth\s*shattering)\b/i },
  { id: "work_harder_than_they_should", re: /\bwork\s+harder\s+than\s+(?:they|you|a buyer)\s+should\b/i },
  { id: "here_is_the_practical_correction", re: /\bhere\s+is\s+the\s+practical\s+correction\b/i },
  { id: "easier_decisions", re: /\beasier\s+decisions\s+turn\s+into\b/i },
  { id: "walk_your_own_site", re: /\bwalk\s+your\s+own\s+site\s+as\s+a\s+first\s+time\s+buyer\b/i },
  { id: "at_the_end_of_the_day", re: /\bat\s+the\s+end\s+of\s+the\s+day\b/i },
  { id: "in_todays_world", re: /\bin\s+today'?s\s+(?:world|market|landscape|digital age)\b/i },
  { id: "game_changer", re: /\bgame\s*changer\b/i },
  { id: "take_it_to_the_next_level", re: /\b(?:to|take .* to) the next level\b/i },
];

/** Every banned phrase id present in the text. */
export function bannedHits(text: string): string[] {
  const s = String(text || "");
  return BANNED_PHRASE_PATTERNS.filter((p) => p.re.test(s)).map((p) => p.id);
}

export function hasBannedPhrase(text: string): boolean {
  return bannedHits(text).length > 0;
}

/* ─────────────────────────── similarity engine ───────────────────────── */

/** Documented thresholds. All similarity is deterministic Jaccard on token shingles. */
export const THRESHOLDS = {
  /** Post bodies: >= this shingle similarity reads as the same post. */
  postBody: 0.42,
  /** Hooks and CTAs are short, so they need a higher bar before flagging. */
  shortField: 0.62,
  /** Report narrative paragraphs across sections. */
  narrative: 0.5,
  /** A shared sentence of this many words or more counts as copied prose. */
  longSentenceWords: 9,
  /** No two posts may share an opening run of this many words. */
  openingPrefixWords: 4,
  /** Shingle size used for all similarity. */
  shingle: 4,
} as const;

export function normalizeText(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(s: unknown): string[] {
  const n = normalizeText(s);
  return n ? n.split(" ") : [];
}

export function shingles(s: unknown, n = THRESHOLDS.shingle): Set<string> {
  const w = tokens(s);
  const out = new Set<string>();
  if (w.length < n) {
    if (w.length) out.add(w.join(" "));
    return out;
  }
  for (let i = 0; i <= w.length - n; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

/** Jaccard similarity of token shingles. 0 = unrelated, 1 = identical. */
export function similarity(a: unknown, b: unknown, n = THRESHOLDS.shingle): number {
  const A = shingles(a, n);
  const B = shingles(b, n);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

export function sentences(text: unknown): string[] {
  return String(text ?? "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Long sentences (>= longSentenceWords) shared verbatim between two texts. */
export function sharedLongSentences(a: unknown, b: unknown): string[] {
  const norm = (s: string) => normalizeText(s);
  const A = new Map<string, string>();
  for (const s of sentences(a)) {
    const k = norm(s);
    if (k.split(" ").length >= THRESHOLDS.longSentenceWords) A.set(k, s);
  }
  const out: string[] = [];
  for (const s of sentences(b)) {
    const k = norm(s);
    if (A.has(k)) out.push(s);
  }
  return out;
}

export function openingPrefix(text: unknown, words = THRESHOLDS.openingPrefixWords): string {
  return tokens(text).slice(0, words).join(" ");
}

/**
 * Exact duplication key for short fields (hook, cta). There is NO minimum
 * length: any non-empty normalized value participates. Filler words and short
 * acronyms are dropped so "Request a technical audit" and "Request a technical
 * SEO audit" resolve to the same key and are rejected as an exact duplicate.
 */
const SHORT_FIELD_FILLER = new Set([
  "a", "an", "the", "to", "for", "your", "you", "our", "we", "us", "and", "or", "of", "on", "in", "it",
  "is", "are", "this", "that", "with", "now", "today", "right", "get", "one", "so", "can", "will",
]);

export function shortFieldKey(s: unknown): string {
  const all = tokens(s);
  if (!all.length) return "";
  const core = all.filter((w) => w.length > 3 && !SHORT_FIELD_FILLER.has(w));
  return (core.length ? core : all).join(" ");
}

/* ───────────────────────────── post gate ─────────────────────────────── */

export type PostLike = {
  id?: string;
  hook?: string;
  body?: string;
  cta?: string;
  visual?: string;
  related_leak?: string;
  [k: string]: unknown;
};

export type QualityIssue = {
  code:
    | "banned_phrase"
    | "exact_duplicate"
    | "near_duplicate"
    | "duplicate_hook"
    | "duplicate_cta"
    | "repeated_sentence"
    | "shared_opening"
    | "too_short"
    | "missing_field"
    | "count";
  a: number | string;
  b?: number | string;
  detail: string;
  score?: number;
};

export type QualityManifest = {
  validation_version: number;
  checked: number;
  exact_duplicates: number;
  near_duplicates: number;
  banned_phrases: number;
  repeated_sentences: number;
  passed: boolean;
  checked_at: string;
};

export type PostGateResult = {
  ok: boolean;
  issues: QualityIssue[];
  /** Indexes of posts that pass on their own and against everything before them. */
  qualifiedIndexes: number[];
  manifest: QualityManifest;
};

function fieldText(p: PostLike): string {
  return `${p.hook ?? ""} ${p.body ?? ""} ${p.cta ?? ""}`;
}

/**
 * Validate a set of posts. Rejects banned filler, exact duplicates, repeated
 * hooks/CTAs, repeated long sentences, shared 4 word openings and
 * near-duplicate bodies above THRESHOLDS.postBody.
 */
export function validatePostSet(posts: PostLike[], required = 12): PostGateResult {
  const issues: QualityIssue[] = [];
  const qualified: number[] = [];
  let exact = 0, near = 0, banned = 0, repeatedSentences = 0;

  const bodies = posts.map((p) => normalizeText(p.body));
  const hooks = posts.map((p) => normalizeText(p.hook));
  const ctas = posts.map((p) => normalizeText(p.cta));
  const hookKeys = posts.map((p) => shortFieldKey(p.hook));
  const ctaKeys = posts.map((p) => shortFieldKey(p.cta));
  const opens = posts.map((p) => openingPrefix(p.body));

  posts.forEach((p, i) => {
    let good = true;

    if (!p.body || !p.hook || !p.cta) {
      issues.push({ code: "missing_field", a: i, detail: "hook, body and cta are all required" });
      good = false;
    }
    if (bodies[i].split(" ").length < 45) {
      issues.push({ code: "too_short", a: i, detail: `body has ${bodies[i].split(" ").length} words` });
      good = false;
    }
    const hits = bannedHits(fieldText(p));
    if (hits.length) {
      banned += hits.length;
      issues.push({ code: "banned_phrase", a: i, detail: hits.join(", ") });
      good = false;
    }

    // Exact duplication is checked against EVERY earlier post, qualified or
    // not, and at any non-empty normalized length. No length floor applies.
    for (let j = 0; j < i; j++) {
      if (bodies[i] && bodies[i] === bodies[j]) {
        exact++;
        issues.push({ code: "exact_duplicate", a: i, b: j, detail: "identical body" });
        good = false;
      } else if (hooks[i] && (hooks[i] === hooks[j] || (hookKeys[i] && hookKeys[i] === hookKeys[j]))) {
        exact++;
        issues.push({ code: "duplicate_hook", a: i, b: j, detail: "identical hook" });
        good = false;
      } else if (ctas[i] && (ctas[i] === ctas[j] || (ctaKeys[i] && ctaKeys[i] === ctaKeys[j]))) {
        exact++;
        issues.push({ code: "duplicate_cta", a: i, b: j, detail: "identical cta" });
        good = false;
      }
      if (!good) break;
    }

    for (const j of good ? qualified : []) {
      const s = similarity(p.body, posts[j].body);
      if (s >= THRESHOLDS.postBody) {
        near++;
        issues.push({ code: "near_duplicate", a: i, b: j, detail: "body similarity", score: Number(s.toFixed(3)) });
        good = false;
        break;
      }
      if (hooks[i] && similarity(p.hook, posts[j].hook) >= THRESHOLDS.shortField) {
        issues.push({ code: "duplicate_hook", a: i, b: j, detail: "hook repeats" });
        good = false;
        break;
      }
      if (ctas[i] && similarity(p.cta, posts[j].cta) >= THRESHOLDS.shortField) {
        issues.push({ code: "duplicate_cta", a: i, b: j, detail: "cta repeats" });
        good = false;
        break;
      }

      if (opens[i] && opens[i] === opens[j]) {
        issues.push({ code: "shared_opening", a: i, b: j, detail: `opening "${opens[i]}"` });
        good = false;
        break;
      }
      const shared = sharedLongSentences(p.body, posts[j].body);
      if (shared.length) {
        repeatedSentences += shared.length;
        issues.push({ code: "repeated_sentence", a: i, b: j, detail: shared[0].slice(0, 120) });
        good = false;
        break;
      }
    }

    if (good) qualified.push(i);
  });

  if (qualified.length < required) {
    issues.push({ code: "count", a: qualified.length, detail: `only ${qualified.length} of ${required} posts qualified` });
  }

  const ok = qualified.length >= required && posts.length >= required;
  return {
    ok,
    issues,
    qualifiedIndexes: qualified,
    manifest: {
      validation_version: UNIQUENESS_VERSION,
      checked: posts.length,
      exact_duplicates: exact,
      near_duplicates: near,
      banned_phrases: banned,
      repeated_sentences: repeatedSentences,
      passed: ok,
      checked_at: new Date().toISOString(),
    },
  };
}

/** Human readable reason list for a targeted AI correction pass. */
export function issuesToPrompt(issues: QualityIssue[], posts: PostLike[]): string {
  const lines = issues.slice(0, 12).map((i) => {
    const a = typeof i.a === "number" ? `post ${i.a + 1}` : String(i.a);
    const b = typeof i.b === "number" ? ` and post ${i.b + 1}` : "";
    const ex = typeof i.a === "number" && posts[i.a]
      ? ` | offending text: "${String(posts[i.a].body || "").slice(0, 160)}"`
      : "";
    return `- ${i.code}: ${a}${b}. ${i.detail}${i.score !== undefined ? ` (similarity ${i.score})` : ""}${ex}`;
  });
  return lines.join("\n");
}

/* ────────────────────────── narrative gate ───────────────────────────── */

export type NarrativeSection = { path: string; text: string };

export type NarrativeGateResult = {
  ok: boolean;
  issues: QualityIssue[];
  /** Section paths that must be rewritten. Evidence and money never change. */
  offendingPaths: string[];
  manifest: QualityManifest;
};

/**
 * Long-form narrative fields of a Golden Report, in render order. Evidence,
 * ledgers, citations, confidence and dollar fields are deliberately excluded.
 */
export const NARRATIVE_CHAPTER_FIELDS = [
  "verdict",
  "what_we_found",
  "why_its_leaking",
  "what_its_costing",
  "recommendation",
  "recommendations",
] as const;

export function collectNarrativeSections(report: Record<string, unknown> | null | undefined): NarrativeSection[] {
  const out: NarrativeSection[] = [];
  const push = (path: string, v: unknown) => {
    const t = String(v ?? "").trim();
    if (t.split(/\s+/).length >= 12) out.push({ path, text: t });
  };
  push("executive_summary", report?.executive_summary);
  const chapters = Array.isArray(report?.chapters) ? (report!.chapters as Record<string, unknown>[]) : [];
  chapters.forEach((c, i) => {
    for (const f of NARRATIVE_CHAPTER_FIELDS) {
      const v = c[f];
      if (typeof v === "string") push(`chapters[${i}].${f}`, v);
      else if (Array.isArray(v)) v.forEach((x, j) => push(`chapters[${i}].${f}[${j}]`, x));
    }
  });
  return out;
}

/**
 * Cross-section duplication gate. A section may cite another finding by id or
 * title, but may not copy its paragraph.
 */
export function validateNarrative(sections: NarrativeSection[]): NarrativeGateResult {
  const issues: QualityIssue[] = [];
  const offending = new Set<string>();
  let exact = 0, near = 0, banned = 0, repeated = 0;

  const norm = sections.map((s) => normalizeText(s.text));

  sections.forEach((s, i) => {
    const hits = bannedHits(s.text);
    if (hits.length) {
      banned += hits.length;
      issues.push({ code: "banned_phrase", a: s.path, detail: hits.join(", ") });
      offending.add(s.path);
    }
    for (let j = 0; j < i; j++) {
      if (norm[i] && norm[i] === norm[j]) {
        exact++;
        issues.push({ code: "exact_duplicate", a: s.path, b: sections[j].path, detail: "identical narrative" });
        offending.add(s.path);
        break;
      }
      const sim = similarity(s.text, sections[j].text);
      if (sim >= THRESHOLDS.narrative) {
        near++;
        issues.push({ code: "near_duplicate", a: s.path, b: sections[j].path, detail: "narrative similarity", score: Number(sim.toFixed(3)) });
        offending.add(s.path);
        break;
      }
      const shared = sharedLongSentences(s.text, sections[j].text);
      if (shared.length) {
        repeated += shared.length;
        issues.push({ code: "repeated_sentence", a: s.path, b: sections[j].path, detail: shared[0].slice(0, 140) });
        offending.add(s.path);
        break;
      }
    }
  });

  const ok = offending.size === 0;
  return {
    ok,
    issues,
    offendingPaths: [...offending],
    manifest: {
      validation_version: UNIQUENESS_VERSION,
      checked: sections.length,
      exact_duplicates: exact,
      near_duplicates: near,
      banned_phrases: banned,
      repeated_sentences: repeated,
      passed: ok,
      checked_at: new Date().toISOString(),
    },
  };
}

/** Convenience: run the narrative gate straight off a report object. */
export function validateReportNarrative(report: Record<string, unknown> | null | undefined): NarrativeGateResult {
  return validateNarrative(collectNarrativeSections(report));
}

/** Merge two manifests (posts + narrative) into one stored quality record. */
export function mergeManifests(a: QualityManifest, b: QualityManifest): QualityManifest {
  return {
    validation_version: UNIQUENESS_VERSION,
    checked: a.checked + b.checked,
    exact_duplicates: a.exact_duplicates + b.exact_duplicates,
    near_duplicates: a.near_duplicates + b.near_duplicates,
    banned_phrases: a.banned_phrases + b.banned_phrases,
    repeated_sentences: a.repeated_sentences + b.repeated_sentences,
    passed: a.passed && b.passed,
    checked_at: new Date().toISOString(),
  };
}
