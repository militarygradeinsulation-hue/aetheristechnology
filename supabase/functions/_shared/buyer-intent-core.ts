// Deterministic evidence checks for owner-only Aetheris Buyer Intent Radar.
// Search and AI can suggest candidates; only source-backed signals are saved.
export type BuyerService = "marketing" | "consulting" | "ai";
export type IntentType = "rfp" | "vendor_request" | "implementation" | "advisory";
export type IntentStage = "new" | "researching" | "approved" | "contacted" | "qualified" | "won" | "dismissed";

export type IntentSettings = {
  geography: string;
  industries: string;
  services: BuyerService[];
  minScore: number;
  scheduleEnabled: boolean;
};
export type SourceEvidence = { url: string; title: string; text: string };
export type BuyerOpportunity = {
  id: string; company: string; contactName: string; contactTitle: string;
  location: string; service: BuyerService; signalType: IntentType;
  summary: string; quote: string; sourceUrl: string; sourceTitle: string;
  publishedAt: string; observedAt: string; score: number; tier: "high" | "medium" | "watch";
  reasons: string[]; suggestedOffer: string; status: IntentStage; note: string; updatedAt: string;
};
export const DEFAULT_INTENT_SETTINGS: IntentSettings = {
  geography: "United States",
  industries: "",
  services: ["marketing", "consulting", "ai"],
  minScore: 55,
  scheduleEnabled: false,
};
export const INTENT_STAGES: IntentStage[] = [
  "new", "researching", "approved", "contacted", "qualified", "won", "dismissed",
];
export function safeEvidenceUrl(input: unknown): string {
  try {
    const raw = String(input ?? "").trim().slice(0, 800);
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    const host = url.hostname.toLowerCase();
    if (!host.includes(".") || host === "localhost" || host.endsWith(".local") ||
        host.endsWith(".internal") || /^(127|10|0|169\.254|192\.168)\./.test(host)) return "";
    if (/^(linkedin|facebook|instagram|x|twitter)\.com$/.test(host.replace(/^www\./, ""))) return "";
    url.hash = "";
    url.searchParams.forEach((_value, key) => {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    });
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}
export function sanitizeIntentSettings(value: unknown): IntentSettings {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const services = Array.isArray(input.services)
    ? input.services.filter((x): x is BuyerService => x === "marketing" || x === "consulting" || x === "ai")
    : DEFAULT_INTENT_SETTINGS.services;
  return {
    geography: String(input.geography ?? DEFAULT_INTENT_SETTINGS.geography).trim().slice(0, 100),
    industries: String(input.industries ?? "").trim().slice(0, 150),
    services: [...new Set(services)].slice(0, 3),
    minScore: Math.max(45, Math.min(95, Math.round(Number(input.minScore) || 55))),
    scheduleEnabled: input.scheduleEnabled === true,
  };
}
const fold = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
const explicitRequest = /\b(rfp|request for proposals?|solicit(?:ing|ation)?|seeking|looking for|searching for|inviting bids|accepting proposals|hire an? |hiring an? |need an? |need help with|vendor|procurement|contracting for|partner wanted)\b/i;
const recruitingOnly = /\b(full[- ]time|apply for (?:the|this) job|salary|job opening|resume|recruitment|benefits package)\b/i;
// Words such as "seeking" alone do not establish a need for an outside supplier.
const vendorLanguage = /\b(rfp|request for proposals?|solicitation|bids?|proposals?|agenc(?:y|ies)|vendors?|consultants?|consulting firms?|service providers?|implementation partners?|external partners?|suppliers?|contracting for)\b/i;
const serviceWords: Record<BuyerService, RegExp> = {
  marketing: /\b(marketing|advertising|branding|seo|social media|lead generation|paid media|search engine)\b/i,
  consulting: /\b(consult(?:ant|ancy|ing)|advisory|business strategy|operations strategy|change management|process improvement|fractional cmo|fractional cto)\b/i,
  ai: /\b(artificial intelligence|ai |ai-|automation|machine learning|llm|chatbot|ai agents?|agentic)\b/i,
};
const validTypes: IntentType[] = ["rfp", "vendor_request", "implementation", "advisory"];
const clip = (input: unknown, limit: number) => String(input ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
export function qualifyBuyerOpportunity(
  candidate: Record<string, unknown>,
  sources: Map<string, SourceEvidence>,
  settings: IntentSettings,
  now = new Date(),
): BuyerOpportunity | null {
  const sourceUrl = safeEvidenceUrl(candidate.sourceUrl);
  const source = sources.get(sourceUrl);
  if (!source) return null;
  const company = clip(candidate.company, 160);
  const quote = clip(candidate.quote, 220);
  const sourceContent = fold(source.title + " " + source.text);
  // The literal excerpt AND named buyer must be present in the fetched evidence.
  if (!company || company.length < 3 || quote.length < 18 ||
      !sourceContent.includes(fold(company)) || !sourceContent.includes(fold(quote))) return null;
  if (!explicitRequest.test(quote) || !vendorLanguage.test(quote) || recruitingOnly.test(quote)) return null;

  const service = candidate.service;
  const signalType = candidate.signalType;
  if ((service !== "marketing" && service !== "consulting" && service !== "ai") ||
      !settings.services.includes(service) ||
      !validTypes.includes(signalType as IntentType)) return null;
  if (!serviceWords[service].test(quote + " " + source.title + " " + source.text.slice(0, 350))) return null;

  const name = clip(candidate.contactName, 110);
  const title = clip(candidate.contactTitle, 110);
  const contactName = name && sourceContent.includes(fold(name)) && name.split(" ").length > 1 ? name : "";
  const contactTitle = contactName && title && sourceContent.includes(fold(title)) ? title : "";
  const location = clip(candidate.location, 120);
  const publishedRaw = clip(candidate.publishedAt, 50);
  let publishedAt = "";
  let ageDays: number | null = null;
  // Do not infer a publication date from the current scan time.
  if (/^\d{4}-\d{2}-\d{2}$/.test(publishedRaw) && sourceContent.includes(publishedRaw)) {
    const date = Date.parse(publishedRaw + "T00:00:00Z");
    const days = (now.getTime() - date) / 86_400_000;
    // A known stale or future date is grounds for rejection, not "date unverified".
    if (!Number.isFinite(days) || days < -1 || days > 180) return null;
    publishedAt = publishedRaw;
    ageDays = Math.max(0, days);
  }
  if (ageDays !== null && ageDays > 180) return null;

  const reasons = ["Verbatim public request verified against its source"];
  let score = signalType === "rfp" ? 67 : signalType === "vendor_request" ? 60
    : signalType === "implementation" ? 56 : 52;
  reasons.push(signalType === "rfp" ? "Formal proposal request" : "Explicit outside-service buying signal");
  if (/\b(budget|\$[\d,]+|funded|contract value)\b/i.test(quote)) {
    score += 8; reasons.push("Budget or contract language visible");
  }
  if (ageDays !== null && ageDays <= 14) {
    score += 15; reasons.push("Source dated within 14 days");
  } else if (ageDays !== null && ageDays <= 45) {
    score += 9; reasons.push("Source dated within 45 days");
  } else if (ageDays !== null && ageDays <= 90) {
    score += 4; reasons.push("Source dated within 90 days");
  } else if (ageDays === null) {
    reasons.push("Source date unverified — confirm the request is still open");
  }
  if (contactName) { score += 5; reasons.push("Named contact verified in source"); }
  if (settings.geography && location.toLowerCase().includes(settings.geography.toLowerCase())) {
    score += 5; reasons.push("Target geography explicitly matched");
  }
  // Unknown publication date is never a high-confidence hot lead.
  score = ageDays === null ? Math.min(74, score) : Math.min(100, score);
  if (score < settings.minScore) return null;
  const offer: Record<BuyerService, string> = {
    marketing: "Marketing strategy, lead generation and conversion audit",
    consulting: "Business operations and revenue-leak diagnostic",
    ai: "AI workflow assessment and implementation roadmap",
  };
  const stamp = now.toISOString();
  return {
    id: crypto.randomUUID(), company, contactName, contactTitle,
    location, service, signalType, summary: clip(candidate.summary, 360),
    quote, sourceUrl, sourceTitle: clip(source.title, 200),
    publishedAt, observedAt: stamp, score,
    tier: score >= 80 ? "high" : score >= 65 ? "medium" : "watch",
    reasons, suggestedOffer: offer[service], status: "new", note: "", updatedAt: stamp,
  };
}
export function intentDedupeKey(item: Pick<BuyerOpportunity, "company" | "service" | "sourceUrl">): string {
  return fold(item.company).replace(/[^a-z0-9]/g, "") + "|" + item.service + "|" + safeEvidenceUrl(item.sourceUrl);
}
