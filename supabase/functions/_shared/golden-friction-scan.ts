/**
 * Golden Report active friction scan, v1.
 *
 * Extracts attributable, reviewable findings from the existing crawler and
 * Friction Vocabulary Audit outputs. Never fetches a URL, calls AI, invents
 * dollars, infers a private psychological state or treats absent text as a
 * verified defect. All candidates still require customer-side validation.
 */
export type ActiveFrictionLens = "operational" | "perceptual" | "human" | "economic";
export type ActiveFrictionPattern =
  | "doorman_risk" | "choice_architecture" | "framing_gap" | "dual_logic"
  | "handoff_gap" | "people_coordination" | "economic_exposure";
export interface ActiveFrictionSignal {
  id: string;
  lens: ActiveFrictionLens;
  pattern: ActiveFrictionPattern;
  observation: string;
  source_url: string;
  excerpt: string;
  evidence_status: "observed_public_copy" | "audit_suggestion";
  hypothesis: string;
  test: string;
  metric: string;
}
type Bag = Record<string, unknown>;
const asBag = (v: unknown): Bag => v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {};
const asList = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const asText = (v: unknown): string => typeof v === "string" ? v.trim() : "";
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const safeUrl = (value: string): string => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
};
const auditRules: Record<ActiveFrictionPattern, Pick<ActiveFrictionSignal, "hypothesis" | "test" | "metric">> = {
  doorman_risk: {
    hypothesis: "A standardized or automated step may remove useful reassurance or human contact. This needs direct customer validation.",
    test: "Compare the current step with one that offers clear, optional human support. Ask buyers what they understood.",
    metric: "Qualified conversion, customer clarity and time per completed request",
  },
  choice_architecture: {
    hypothesis: "The way a selection is presented may make the next action harder or less clear.",
    test: "Compare current choices with a clear, shorter explanation of each option and a visible next step.",
    metric: "Task completion, qualified inquiries and buyer comprehension",
  },
  framing_gap: {
    hypothesis: "The current wording may obscure concrete business value or create avoidable uncertainty.",
    test: "Compare current copy with a concise, evidence-backed explanation of the offer, limits and result.",
    metric: "Qualified inquiry rate and customer comprehension",
  },
  dual_logic: {
    hypothesis: "A price or ROI case might not answer buyer concerns about delivery, support or risk.",
    test: "Keep the same terms and add verifiable delivery proof, responsibilities and decision support.",
    metric: "Quote acceptance, buyer questions and margin per sale",
  },
  handoff_gap: {
    hypothesis: "The next step may not be clear after a customer requests contact.",
    test: "Publish a clear confirmation, named contact route and response expectation; verify the internal workflow.",
    metric: "Verified inquiries, response time and lost follow-ups",
  },
  people_coordination: {
    hypothesis: "A documented communication or ownership issue may affect the customer experience.",
    test: "Check the actual handoff with participating staff before changing responsibilities.",
    metric: "Handoff time and reopened work",
  },
  economic_exposure: {
    hypothesis: "The suspected problem may have a measurable cost, but the scan cannot estimate it without operational data.",
    test: "Document a before/after baseline with volume, margin and cost instead of projecting unsupported revenue.",
    metric: "Actual gross profit or avoidable cost",
  },
};

function pickPattern(category: string, description: string): { lens: ActiveFrictionLens; pattern: ActiveFrictionPattern } {
  const v = (category + " " + description).toLowerCase();
  if (/automat|chatbot|script|self.service/.test(v) && /trust|human|reassur|relationship|customer|personal/.test(v))
    return { lens: "operational", pattern: "doorman_risk" };
  if (/default|option|package|pricing|checkout|choice|proposal|quote/.test(v))
    return { lens: "perceptual", pattern: "choice_architecture" };
  if (/risk|proof|trust|guarantee|credib|testimonial|reassur/.test(v))
    return { lens: "perceptual", pattern: "dual_logic" };
  if (/handoff|pipeline|follow.up|response|owner|delay|form/.test(v))
    return { lens: "operational", pattern: "handoff_gap" };
  return { lens: "perceptual", pattern: "framing_gap" };
}

function normalizePublicScrape(raw: Bag): string {
  const data = asBag(raw.data);
  const text = asText(data.markdown) || asText(raw.markdown) || asText(data.summary);
  return text.slice(0, 140_000);
}
const normal = (s: string) => clean(s).toLowerCase();

export function buildActiveFrictionSignals(rawFindings: unknown, targetUrl: string): ActiveFrictionSignal[] {
  const raw = asBag(rawFindings);
  const site = normalizePublicScrape(asBag(raw.firecrawl_scrape));
  const siteNorm = normal(site);
  const base = safeUrl(targetUrl);
  const audit = asBag(raw.friction_audit);
  const out: ActiveFrictionSignal[] = [];
  const seen = new Set<string>();
  const add = (
    category: string, observation: string, quote: string,
    source: string, status: ActiveFrictionSignal["evidence_status"],
  ) => {
    const excerpt = clean(quote).slice(0, 320);
    if (!excerpt || excerpt.length < 8 || !clean(observation)) return;
    const sourceUrl = safeUrl(source);
    if (!sourceUrl) return;
    const key = normal(excerpt);
    if (seen.has(key) || out.length >= 16) return;
    seen.add(key);
    const { lens, pattern } = pickPattern(category, observation);
    out.push({
      id: "active-" + (out.length + 1), lens, pattern,
      observation: clean(observation).slice(0, 650),
      source_url: sourceUrl, excerpt,
      evidence_status: status,
      ...auditRules[pattern],
    });
  };

  for (const rawPhrase of asList(audit.flaggedPhrases).slice(0, 24)) {
    const phrase = asBag(rawPhrase);
    const original = asText(phrase.originalPhrase);
    const issue = asText(phrase.issue);
    const category = asText(phrase.category);
    if (!original || !issue) continue;
    // A phrase is "observed" only when it literally appears in crawler text.
    const observed = siteNorm.includes(normal(original));
    add(category, issue, original, base, observed ? "observed_public_copy" : "audit_suggestion");
  }

  for (const rawCta of asList(audit.strongerCTAs).slice(0, 10)) {
    const cta = asBag(rawCta);
    const original = asText(cta.current);
    const explanation = asText(cta.whyBetter);
    if (!original || !explanation) continue;
    const observed = siteNorm.includes(normal(original));
    add("cta", explanation, original, base, observed ? "observed_public_copy" : "audit_suggestion");
  }

  // The crawler text supports explicit, bounded observations only; no inference
  // that a missing trust badge or phone number proves a business has no trust.
  if (site.length >= 200) {
    const candidate = /(automated|instant|self.service|chatbot|chat bot)[^.!?\n]{0,120}(buyer|customer|support|contact|quote|request|reassurance)[^.!?\n]{0,100}/ig;
    let match: RegExpExecArray | null;
    let n = 0;
    while ((match = candidate.exec(site)) && n++ < 3) {
      add("automated trust customer", "The public copy connects automation to customer-facing service. Check whether buyers still receive needed reassurance.",
        match[0], base, "observed_public_copy");
    }
  }
  return out;
}
