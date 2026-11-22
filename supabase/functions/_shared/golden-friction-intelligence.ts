/**
 * Golden Report Behavioral Friction Intelligence v1.
 *
 * A deterministic interpretation of SAVED Golden Report claims, not a second
 * AI scan. The four models are operational, perceptual, human and economic.
 * Behavioral patterns are review hypotheses. No private motive, personality,
 * causal effect, conversion lift or monetary loss is inferred here.
 *
 * Shared by the browser and the canonical Golden PDF model.
 */
export type FrictionLensId = "operational" | "perceptual" | "human" | "economic";
export type FrictionPattern =
  | "doorman_risk"
  | "choice_architecture"
  | "framing_gap"
  | "dual_logic"
  | "handoff_gap"
  | "people_coordination"
  | "economic_exposure";

export interface FrictionEvidence {
  claimId: string;
  statement: string;
  status: string;
  sourceUrl: string | null;
  sourceLocator: string | null;
}

export interface FrictionOpportunity {
  id: string;
  lens: FrictionLensId;
  pattern: FrictionPattern;
  patternLabel: string;
  chapter: string;
  observation: string;
  basis: "linked_claim" | "report_statement";
  evidence: FrictionEvidence[];
  hypothesis: string;
  test: string;
  metric: string;
}

export interface FrictionLens {
  id: FrictionLensId;
  title: string;
  question: string;
  opportunities: FrictionOpportunity[];
  status: "source_linked" | "review_required" | "not_evaluated";
}

export interface FrictionIntelligence {
  version: "1.0";
  preliminary: true;
  lenses: FrictionLens[];
  opportunities: FrictionOpportunity[];
  notes: string[];
}

type Entry = Record<string, unknown>;

const LENSES: Array<{ id: FrictionLensId; title: string; question: string; match: RegExp }> = [
  {
    id: "operational", title: "Operational friction",
    question: "Where do handoffs, response times or process steps obstruct work?",
    match: /\b(handoff|workflow|process|routing|pipeline|crm|follow.?up|lead|quote|response|manual|rework|delay|automat\w*|operation\w*|capacity|ownership|task|system|integration|delivery|form)\b/i,
  },
  {
    id: "perceptual", title: "Perceptual friction",
    question: "What about the offer, presentation or buying path may create uncertainty?",
    match: /\b(pric\w*|proposal|offer|message|brand|position|trust|review|proof|language|cta|call to action|website|choice|default|framing|credib\w*|clarity|confus\w*|expectation|comparison|social|testimonial|copy|conversion)\b/i,
  },
  {
    id: "human", title: "Human friction",
    question: "What communication or decision process should the team verify?",
    match: /\b(communication|leadership|decision|approval|accountab|team|staff|employee|manager|coordination|role|internal|collaborat|meeting|responsibil|workload|owner)\b/i,
  },
  {
    id: "economic", title: "Economic friction",
    question: "What revenue, margin or cost exposure should be measured?",
    match: /\b(margin|revenue|cost|churn|retention|conversion|loss|lost|profit|spend|expense|financial|budget|wast\w*|leak\w*|roi|sales)\b/i,
  },
];

const PATTERN_LABEL: Record<FrictionPattern, string> = {
  doorman_risk: "Doorman risk: efficient process, possible lost human value",
  choice_architecture: "Choice architecture: unnecessary decision friction",
  framing_gap: "Context and framing: value may not be clear",
  dual_logic: "Dual logic: business case and buyer reassurance",
  handoff_gap: "Operational handoff: inspect the break between steps",
  people_coordination: "Human coordination: verify the working process",
  economic_exposure: "Economic exposure: establish a measurable baseline",
};

const PATTERN_GUIDE: Record<FrictionPattern, { hypothesis: string; test: string; metric: string }> = {
  doorman_risk: {
    hypothesis: "A faster or automated step might remove reassurance or useful human contact. This is not established by activity data alone.",
    test: "Compare the current automated step with a version offering clear human help; ask buyers whether confidence and clarity improved.",
    metric: "Qualified conversion rate and buyer-reported clarity, with response time as a guardrail",
  },
  choice_architecture: {
    hypothesis: "Too many options or unclear defaults may make the next decision harder than necessary.",
    test: "Compare the current proposal or form with a simpler, clearly explained next step. Do not preselect paid choices without consent.",
    metric: "Step completion rate, qualified conversion and complaint rate",
  },
  framing_gap: {
    hypothesis: "The company may not be communicating practical value or evidence clearly enough for this buyer.",
    test: "Compare current language with a concrete, evidence-backed explanation of outcomes, terms and delivery.",
    metric: "Qualified inquiries, proposal comprehension and conversion",
  },
  dual_logic: {
    hypothesis: "A financial justification may not answer buyers' practical questions about risk, support or accountability.",
    test: "Test the same offer with both a clear business case and verifiable delivery reassurance.",
    metric: "Proposal acceptance, buyer questions and gross margin per accepted proposal",
  },
  handoff_gap: {
    hypothesis: "A process transition or unclear owner might be delaying the next action.",
    test: "Assign one owner, one deadline and one confirmation step; compare the same workflow before and after.",
    metric: "Handoff time, missed follow-ups and rework",
  },
  people_coordination: {
    hypothesis: "The documented workflow may not match how people actually communicate or decide. Mindprint context requires consent and confirmation.",
    test: "Interview participating staff, map a decision or handoff, and test an explicit responsibility or communication rule.",
    metric: "Decision time, repeat work and unresolved handoffs",
  },
  economic_exposure: {
    hypothesis: "The reported problem might have a measurable financial impact. Its monetary amount is not established by this model.",
    test: "Document baseline volume, cost and margin, then test one bounded improvement against a comparison period.",
    metric: "Verified gross profit, avoidable cost or retention using the Golden Report financial ledger",
  },
};

const obj = (v: unknown): Entry => v && typeof v === "object" && !Array.isArray(v) ? v as Entry : {};
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const str = (v: unknown): string => typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
const text = (v: unknown): string => str(v).replace(/\s+/g, " ").trim();
const safeUrl = (v: unknown): string | null => {
  const s = str(v);
  return /^https?:\/\//i.test(s) ? s : null;
};
const meaningful = (s: string) =>
  s.length >= 18 && !/^(none|n\/a|unknown|no issue|no finding|not applicable|no evidence|healthy|good|pass(ed)?)\.?$/i.test(s);

function classify(value: string): FrictionLensId[] {
  return LENSES.filter(l => l.match.test(value)).map(l => l.id);
}

function detectPattern(value: string, lens: FrictionLensId): FrictionPattern {
  if (/\b(automat\w*|self.service|chatbot|bot|standardiz\w*|script)\b/i.test(value) &&
      /\b(trust|human|reassur\w*|relationship|service|buyer|customer|personal)\b/i.test(value)) return "doorman_risk";
  if (/\b(default|choice|options?|pricing|pric\w*|proposal|quote|package|checkout|form)\b/i.test(value) && lens === "perceptual") return "choice_architecture";
  if (/\b(brand|message|framing|jargon|position\w*|confus\w*|clarity|copy|language|differentiat)\b/i.test(value) && lens === "perceptual") return "framing_gap";
  if (/\b(proof|trust|reassur\w*|risk|guarantee|credib\w*|testimonial|case study)\b/i.test(value) && lens === "perceptual") return "dual_logic";
  if (lens === "human") return "people_coordination";
  if (lens === "economic") return "economic_exposure";
  return "handoff_gap";
}

function opportunity(
  id: string, lens: FrictionLensId, chapter: string, observation: string,
  evidence: FrictionEvidence[], basis: FrictionOpportunity["basis"], context: string,
): FrictionOpportunity {
  const pattern = detectPattern(context, lens);
  return {
    id: id + ":" + lens, lens, chapter, observation, basis, evidence,
    pattern, patternLabel: PATTERN_LABEL[pattern], ...PATTERN_GUIDE[pattern],
  };
}

export function buildFrictionIntelligence(rawReport: unknown): FrictionIntelligence {
  const report = obj(rawReport);
  const claims = new Map<string, FrictionEvidence>();
  for (const raw of arr(report.evidence_ledger)) {
    const claim = obj(raw);
    const id = str(claim.claim_id);
    if (!id) continue;
    claims.set(id, {
      claimId: id,
      statement: text(claim.statement) || text(claim.raw_value),
      status: str(claim.status) || "not specified",
      sourceUrl: safeUrl(claim.source_url),
      sourceLocator: text(claim.source_locator) || null,
    });
  }

  const candidates: FrictionOpportunity[] = [];
  const seen = new Set<string>();
  const add = (id: string, chapter: string, observation: string, evidence: FrictionEvidence[], basis: FrictionOpportunity["basis"], context: string) => {
    if (!meaningful(observation)) return;
    // A financial phrase alone is not proof of money lost. Never calculate new losses.
    for (const lens of classify(context)) {
      const key = lens + ":" + observation.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(opportunity(id, lens, chapter, observation, evidence, basis, context));
    }
  };

  for (const raw of arr(report.compiled_findings).slice(0, 150)) {
    const finding = obj(raw);
    const statement = text(finding.statement);
    const chapter = str(finding.chapter_slug) || str(finding.category) || "Cross-functional finding";
    const evidence = arr(finding.claim_ids)
      .map(v => claims.get(str(v)))
      .filter((v): v is FrictionEvidence => !!v);
    add(
      str(finding.finding_id) || "compiled-" + candidates.length,
      chapter, statement, evidence, evidence.length ? "linked_claim" : "report_statement",
      [chapter, str(finding.category), statement].join(" "),
    );
  }

  // Active scanner evidence is generated from the SAVED crawl and audit, not
  // new scraping or AI calls. Source copy is different from an audit suggestion.
  for (const [i, raw] of arr(report.behavioral_friction_signals).entries()) {
    const signal = obj(raw);
    const observation = text(signal.observation);
    const excerpt = text(signal.excerpt);
    const lens = str(signal.lens) as FrictionLensId;
    if (!LENSES.some(l => l.id === lens) || !meaningful(observation) || !meaningful(excerpt)) continue;
    const key = lens + ":" + observation.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const pattern = str(signal.pattern) as FrictionPattern;
    const safePattern = pattern in PATTERN_LABEL ? pattern : detectPattern(observation, lens);
    const observed = str(signal.evidence_status) === "observed_public_copy";
    candidates.push({
      id: str(signal.id) || "active-" + i,
      lens, pattern: safePattern,
      patternLabel: PATTERN_LABEL[safePattern],
      chapter: "Saved public-site evidence",
      observation,
      basis: "linked_claim",
      evidence: [{
        claimId: str(signal.id) || "active-" + i,
        statement: excerpt,
        status: observed ? "observed_public_copy" : "audit_suggestion_not_verified",
        sourceUrl: safeUrl(signal.source_url),
        sourceLocator: null,
      }],
      hypothesis: str(signal.hypothesis) || PATTERN_GUIDE[safePattern].hypothesis,
      test: str(signal.test) || PATTERN_GUIDE[safePattern].test,
      metric: str(signal.metric) || PATTERN_GUIDE[safePattern].metric,
    });
  }

  // Legacy reports may have chapters but no compiled findings. They remain
  // preliminary report statements, NEVER promoted to source-verified claims.
  if (!candidates.length) {
    for (const [i, raw] of arr(report.chapters).entries()) {
      const chapter = obj(raw);
      const observation = text(chapter.what_we_found);
      const title = text(chapter.title) || str(chapter.slug) || "Chapter " + (i + 1);
      const ev: FrictionEvidence[] = arr(chapter.evidence).map((rawEvidence, j) => {
        const e = obj(rawEvidence);
        return {
          claimId: "chapter-" + (i + 1) + "-evidence-" + (j + 1),
          statement: [str(e.label), str(e.value)].filter(Boolean).join(": "),
          status: "report evidence (not independently verified)",
          sourceUrl: safeUrl(e.source_url),
          sourceLocator: null,
        };
      }).filter(e => meaningful(e.statement));
      add("chapter-" + (i + 1), title, observation, ev, "report_statement", [title, str(chapter.slug), observation].join(" "));
    }
  }

  // Show the strongest traceable items first, never presenting review prompts
  // as confirmed causes. Caps keep the executive surface lean without hiding
  // existing report chapters or the underlying evidence ledger.
  const evidenceRank = (o: FrictionOpportunity): number =>
    o.evidence.some(e => e.status === "observed_public_copy" && !!e.sourceUrl) ? 4 :
    o.evidence.some(e => e.status === "verified" && !!(e.sourceUrl || e.sourceLocator)) ? 3 :
    o.evidence.some(e => (e.sourceUrl || e.sourceLocator) && e.status !== "audit_suggestion_not_verified") ? 2 :
    o.evidence.length ? 1 : 0;
  candidates.sort((a, b) => evidenceRank(b) - evidenceRank(a));
  const lenses = LENSES.map(({ id, title, question }) => {
    const opportunities = candidates.filter(c => c.lens === id).slice(0, 4);
    return {
      id, title, question, opportunities,
      status: opportunities.some(o => o.evidence.some(e => (e.sourceUrl || e.sourceLocator) && e.status !== "audit_suggestion_not_verified"))
        ? "source_linked" as const
        : opportunities.length ? "review_required" as const : "not_evaluated" as const,
    };
  });
  // Preserve coverage for ALL FOUR lenses, including the economic layer.
  const queue = lenses.flatMap(l => l.opportunities.slice(0, 3));
  return {
    version: "1.0", preliminary: true, lenses, opportunities: queue,
    notes: [
      "This model organizes existing Golden Report evidence. It does not create new scan findings or prove causation.",
      "Mindprint must be connected with permission and reviewed with participating people before human explanations can be validated.",
      "Economic opportunity requires a baseline and the canonical financial ledger. Values are not added to the report total.",
      "No finding means not evaluated, not that a business has no friction.",
    ],
  };
}
