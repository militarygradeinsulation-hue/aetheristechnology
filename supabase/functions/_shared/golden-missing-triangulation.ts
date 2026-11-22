/**
 * Golden Report missing-information triangulation.
 * Inspired by Mindprint's evidence/decision triangulation architecture.
 * It is an abductive investigation queue, NOT a way to change the evidence
 * ledger, backfill missing statistics or invent verified findings.
 *
 * Evidence support is a qualitative strength of source material. It is never
 * presented as a probability of business outcomes, buyer intent or behavior.
 * Deterministic and offline: reads only the saved Golden Report.
 */
export type MissingSupport = "converging" | "single_source" | "tentative";
export type MissingLens = "operational" | "perceptual" | "human" | "economic";

export interface MissingClue {
  id: string;
  statement: string;
  category: string;
  sourceUrl: string | null;
  sourceLocator: string | null;
  sourceFamily: string;
  evidenceStatus: string;
  direct: boolean;
}

export interface MissingHypothesis {
  id: string;
  lens: MissingLens;
  question: string;
  possibleAnswer: string;
  alternateExplanation: string;
  missingInformation: string;
  verification: string;
  disconfirmingResult: string;
  support: MissingSupport;
  /** Only distinct families with defensible provenance, not URLs/page count. */
  independentSources: number;
  /** Distinct categories among independent observed signals. */
  signalFamilies: number;
  clues: MissingClue[];
  /** Explicit missing/zero areas, never treated as verified observations. */
  linkedGaps: string[];
}

export interface MissingTriangulation {
  version: "1.0";
  hypothesisOnly: true;
  hypotheses: MissingHypothesis[];
  zeroCaveats: string[];
  unresolvedAreas: string[];
  method: string[];
}

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const string = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
const tidy = (value: unknown): string => string(value).replace(/\s+/g, " ").trim();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const validUrl = (value: unknown): string | null => {
  const s = string(value);
  if (!s) return null;
  try { const url = new URL(s); return /^https?:$/.test(url.protocol) ? url.href : null; }
  catch { return null; }
};
const family = (url: string | null, locator: string | null, kind: string): string => {
  if (url) {
    try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
    catch { /* treat as unverified locator */ }
  }
  const kindText = (kind + " " + (locator || "")).toLowerCase();
  if (/\b(crm|hubspot|salesforce)\b/.test(kindText)) return "crm-records";
  if (/\b(analytics|ga4|google analytics)\b/.test(kindText)) return "analytics-records";
  if (/\b(interview|survey|customer feedback)\b/.test(kindText)) return "first-party-interview";
  if (/\b(call log|phone log)\b/.test(kindText)) return "call-records";
  if (/\b(email log|mailbox)\b/.test(kindText)) return "email-records";
  return "report-only";
};
const isDirect = (status: string): boolean =>
  ["verified", "observed", "observed_public_copy", "source_verified"].includes(status.toLowerCase());
const meaningful = (s: string): boolean =>
  s.length >= 16 && !/^(unknown|n\/a|not available|no finding|none|not assessed)$/i.test(s);
const possibleGap = (s: string): boolean =>
  /(?:\bunknown\b|\b(?:not|never) (?:measured|verified|available|provided|tracked|observed|established)\b|\b(?:no|insufficient|missing) (?:data|information|evidence|records|metrics)\b|\b0 (?:findings|verified findings|priced leaks|matches)\b)/i.test(s);

interface Definition {
  id: string;
  lens: MissingLens;
  question: string;
  possibleAnswer: string;
  alternateExplanation: string;
  missingInformation: string;
  verification: string;
  disconfirmingResult: string;
  pattern: RegExp;
  /** Optional context gate to avoid marketing mobile findings as CRM proof. */
  paired?: RegExp[];
}

const DEFINITIONS: Definition[] = [
  {
    id: "lead-response",
    lens: "operational",
    question: "What happens after a qualified buyer submits a request?",
    possibleAnswer: "A response-ownership or next-step gap may be reducing follow-through after an inquiry.",
    alternateExplanation: "The team may already reply promptly by phone, email or an offline process that the public scan cannot see.",
    missingInformation: "Real inquiry timestamps, assigned owner, first-response time and final disposition.",
    verification: "Match five recent qualified inquiries to CRM, email or call records; record owner, first reply and outcome.",
    disconfirmingResult: "Each sampled qualified inquiry has a named owner, a prompt response and a recorded next step.",
    pattern: /\b(lead|quote|request|contact|form|cta|follow[\s-]?up|pipeline|response|inquir)\w*\b/i,
  },
  {
    id: "buyer-reassurance",
    lens: "perceptual",
    question: "Are buyers getting the evidence and reassurance needed to act?",
    possibleAnswer: "Buyers may have unanswered questions about deliverables, proof, terms or the next step.",
    alternateExplanation: "Proof and reassurance may be supplied in sales meetings or proposals that were outside the scan.",
    missingInformation: "Buyer questions, objections, proposal attachments and actual decision feedback.",
    verification: "Ask five recent buyers what remained unclear and review the exact material they received before deciding.",
    disconfirmingResult: "Buyers consistently understand the offer, delivery conditions and evidence without additional explanation.",
    pattern: /\b(proof|trust|testimonial|case stud|reassur|pricing|proposal|offer|brand|credib|message|cta|review)\w*\b/i,
  },
  {
    id: "choice-friction",
    lens: "perceptual",
    question: "Does the buying path create unnecessary decisions or confusion?",
    possibleAnswer: "The way steps, pricing or choices are presented may increase the effort required to proceed.",
    alternateExplanation: "Complex choices may be necessary for custom projects, compliance or buyer-specific requirements.",
    missingInformation: "Actual form completion data, proposal alternatives, option selection and buyer feedback.",
    verification: "Observe three authorized buyers completing the current path, then test a clearer alternative with unchanged terms.",
    disconfirmingResult: "Buyers complete the existing path easily and understand every required choice.",
    pattern: /\b(option|choice|checkout|pricing|proposal|quote|form|cta|copy|conversion)\w*\b/i,
  },
  {
    id: "internal-handoff",
    lens: "human",
    question: "Where might a customer request become an unowned internal task?",
    possibleAnswer: "The public buying process may depend on a sales-to-operations handoff whose ownership has not been verified.",
    alternateExplanation: "A well-defined internal assignment process may already exist but is not publicly visible.",
    missingInformation: "Actual handoff owner, approval rules, status history, and team-confirmed workflow.",
    verification: "Trace three completed jobs from inquiry to delivery with the participating team and check every transfer.",
    disconfirmingResult: "Owners, service levels and escalations are documented and consistently met for the sampled jobs.",
    pattern: /\b(handoff|owner|process|workflow|operations|delivery|responsib|accountab|decision|team|sales|quote|lead)\w*\b/i,
    paired: [/\b(handoff|owner|process|operations|workflow|responsib|decision)\w*\b/i, /\b(sales|quote|lead|customer|request|delivery)\w*\b/i],
  },
  {
    id: "mobile-conversion",
    lens: "operational",
    question: "Does mobile experience interrupt the customer's next step?",
    possibleAnswer: "Mobile speed or layout issues may be interfering with the form, contact or quote path.",
    alternateExplanation: "The mobile experience may be adequate, or most qualified buyers may use a different channel.",
    missingInformation: "Mobile-device conversion, form abandonment, real-user performance and tested-device outcomes.",
    verification: "Test inquiry completion on real iOS and Android devices, then compare device-level funnel data.",
    disconfirmingResult: "Mobile completion and error rates are comparable to other devices for qualified sessions.",
    pattern: /\b(mobile|viewport|responsive|speed|performance|load time|layout|form|cta)\w*\b/i,
    paired: [/\b(mobile|viewport|responsive|speed|performance|load time|layout)\w*\b/i, /\b(form|cta|contact|lead|conversion|quote)\w*\b/i],
  },
  {
    id: "channel-attribution",
    lens: "economic",
    question: "Which channels produce qualified demand rather than activity alone?",
    possibleAnswer: "Marketing visibility may not be connected to lead quality and eventual closed revenue.",
    alternateExplanation: "Attribution and qualified lead reporting may already exist in private analytics or CRM systems.",
    missingInformation: "Channel-level visits, lead qualification, opportunity IDs and closed-won amounts.",
    verification: "Reconcile one period of campaign sources against CRM opportunities and closed-won records.",
    disconfirmingResult: "Every important channel is already reconciled to qualified revenue with reliable attribution.",
    pattern: /\b(seo|marketing|campaign|traffic|search|social|content|pipeline|lead|conversion)\w*\b/i,
    paired: [/\b(seo|marketing|campaign|traffic|search|social|content)\w*\b/i, /\b(pipeline|lead|conversion|crm|sales|revenue)\w*\b/i],
  },
  {
    id: "verified-financial-impact",
    lens: "economic",
    question: "What is the measurable economic cost of the suspected friction?",
    possibleAnswer: "There may be an economic opportunity, but its amount cannot be determined from public findings alone.",
    alternateExplanation: "The finding may be immaterial or already offset by other effective processes.",
    missingInformation: "Baseline demand volume, attributable conversion changes, gross margin and actual operating costs.",
    verification: "Record a baseline and a comparison period, test one change, and calculate impact only from verified data.",
    disconfirmingResult: "The measured change produces no credible improvement in margin, cost or qualified conversion.",
    pattern: /\b(revenue|margin|cost|profit|leak|loss|lost|waste|roi|lead|quote|pipeline|sales)\w*\b/i,
  },
];

export function buildMissingTriangulation(rawReport: unknown): MissingTriangulation {
  const report = obj(rawReport);
  const evidenceIndex = new Map<string, MissingClue>();
  const gaps: string[] = [];
  const zeroCaveats: string[] = [];
  const consistency = obj(report.report_consistency);
  if (consistency.detected_findings === 0)
    zeroCaveats.push("The compiler recorded zero detected findings. This does not demonstrate zero real-world business issues.");
  if (consistency.uniquely_priced_leaks === 0)
    zeroCaveats.push("Zero uniquely priced leaks means none was priced to the required evidence standard, not that lost revenue is $0.");

  for (const row of list(report.evidence_ledger).slice(0, 450)) {
    const e = obj(row);
    const id = string(e.claim_id);
    const statement = tidy(e.statement) || tidy(e.normalized_fact);
    if (!id || !meaningful(statement)) continue;
    const url = validUrl(e.source_url);
    const locator = tidy(e.source_locator) || null;
    const status = string(e.status) || "unverified";
    evidenceIndex.set(id, {
      id, statement, category: string(e.category), evidenceStatus: status,
      sourceUrl: url, sourceLocator: locator,
      sourceFamily: family(url, locator, string(e.source_kind)),
      direct: isDirect(status),
    });
  }

  const signals: Array<MissingClue & { context: string }> = [];
  const seen = new Set<string>();
  const push = (clue: MissingClue, context: string) => {
    if (!meaningful(clue.statement)) return;
    const key = norm(clue.statement);
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({ ...clue, context });
  };

  for (const row of list(report.compiled_findings).slice(0, 300)) {
    const f = obj(row);
    const statement = tidy(f.statement);
    if (!meaningful(statement)) continue;
    const chapter = string(f.chapter_slug);
    const category = string(f.category) || chapter || "report";
    const refs = list(f.claim_ids).map(x => typeof x === "string" ? x : "").filter(Boolean);
    // The compiled finding is a synthesis, not an additional independent source.
    const matched = refs.map(id => evidenceIndex.get(id)).filter((c): c is MissingClue => Boolean(c));
    if (!matched.length) {
      push({
        id: string(f.finding_id) || "compiled-" + signals.length,
        statement, category, evidenceStatus: string(f.status) || "report_statement",
        sourceUrl: null, sourceLocator: null, sourceFamily: "report-only", direct: false,
      }, chapter + " " + category + " " + statement);
    } else {
      for (const clue of matched.slice(0, 6)) {
        push({ ...clue, category }, chapter + " " + category + " " + statement + " " + clue.statement);
      }
    }
  }

  for (const row of list(report.behavioral_friction_signals).slice(0, 60)) {
    const a = obj(row);
    const statement = tidy(a.excerpt);
    const context = tidy(a.observation);
    if (!meaningful(statement)) continue;
    const url = validUrl(a.source_url);
    const status = string(a.evidence_status) || "audit_suggestion_not_verified";
    push({
      id: string(a.id) || "active-" + signals.length,
      statement, category: string(a.pattern) || string(a.lens) || "public_site",
      evidenceStatus: status, sourceUrl: url, sourceLocator: null,
      sourceFamily: family(url, null, "website"), direct: isDirect(status),
    }, context + " " + statement);
  }

  const hasStructuredSignals = signals.length > 0;
  for (const [i, row] of list(report.chapters).entries()) {
    const ch = obj(row);
    const title = string(ch.title) || string(ch.slug) || "Chapter " + (i + 1);
    const combined = [ch.verdict, ch.what_we_found, ch.why_its_leaking, ch.what_its_costing].map(tidy).join(" ");
    if (possibleGap(combined)) gaps.push(title + ": missing or unverified information indicated in the chapter");
    // A legacy chapter still permits working hypotheses when it has cited evidence,
    // but this does not elevate generated chapter prose to primary-source proof.
    if (!hasStructuredSignals) {
      for (const [j, evidence] of list(ch.evidence).entries()) {
        const ev = obj(evidence);
        const statement = [tidy(ev.label), tidy(ev.value)].filter(Boolean).join(": ");
        const url = validUrl(ev.source_url);
        if (meaningful(statement)) push({
          id: "chapter-" + i + "-" + j, statement, category: string(ch.slug),
          evidenceStatus: "chapter_report", sourceUrl: url, sourceLocator: null,
          sourceFamily: family(url, null, "report"), direct: false,
        }, title + " " + combined.slice(0, 350));
      }
    }
  }

  const hypotheses: MissingHypothesis[] = [];
  for (const def of DEFINITIONS) {
    const matched = signals.filter(signal => def.pattern.test(signal.context)).slice(0, 40);
    if (!matched.length) continue;
    if (def.paired && !def.paired.every(re => matched.some(c => re.test(c.context)))) continue;
    const supporting = [...matched].sort((a, b) =>
      Number(b.direct) - Number(a.direct) ||
      Number(b.sourceFamily !== "report-only") - Number(a.sourceFamily !== "report-only"),
    ).slice(0, 5);
    const direct = supporting.filter(s => s.direct && s.sourceFamily !== "report-only");
    const independent = new Set(direct.map(s => s.sourceFamily)).size;
    const signalCategories = new Set(direct.map(s => norm(s.category)).filter(Boolean)).size;
    const hasAttributed = supporting.some(s => s.sourceFamily !== "report-only" && !!(s.sourceUrl || s.sourceLocator));
    // One non-attributed report statement can prompt a review question, never
    // a convincing reconstruction. Don't propose a conclusion based on zero data.
    const support: MissingSupport = independent >= 2 && signalCategories >= 2
      ? "converging" : independent >= 1 && hasAttributed ? "single_source" : "tentative";
    const linkedGaps = gaps.filter(g => def.pattern.test(g)).slice(0, 3);
    hypotheses.push({
      id: def.id, lens: def.lens, question: def.question,
      possibleAnswer: def.possibleAnswer, alternateExplanation: def.alternateExplanation,
      missingInformation: def.missingInformation, verification: def.verification,
      disconfirmingResult: def.disconfirmingResult, support,
      independentSources: independent, signalFamilies: signalCategories,
      clues: supporting.map(({ context: _context, ...clue }) => clue), linkedGaps,
    });
  }

  const rank = (h: MissingHypothesis): number =>
    (h.support === "converging" ? 100 : h.support === "single_source" ? 50 : 10) +
    h.independentSources * 3 + h.signalFamilies + Math.min(3, h.linkedGaps.length);
  hypotheses.sort((a, b) => rank(b) - rank(a));
  return {
    version: "1.0", hypothesisOnly: true, hypotheses: hypotheses.slice(0, 8),
    zeroCaveats, unresolvedAreas: gaps.slice(0, 10),
    method: [
      "Saved claims and quoted public copy remain separate from inferred explanations.",
      "Distinct URLs on one website count as one source family; repeated compiler statements do not count as independent confirmation.",
      "Converging support requires two independent observed source families and two different signal categories.",
      "Evidence support is not a probability, score of a person, verified business result or calculated financial loss.",
      "Unknown remains unknown until the requested first-party evidence is verified.",
    ],
  };
}
