export const INDUSTRY_TAXONOMY = [
  "Construction & Home Services",
  "Manufacturing & Industrial",
  "Healthcare & Medical",
  "Financial Services",
  "Accounting & Finance Services",
  "Insurance",
  "Legal Services",
  "Professional Services & Consulting",
  "Technology & SaaS",
  "Telecommunications",
  "Education",
  "Nonprofit & Association",
  "Retail & E-commerce",
  "Hospitality & Food Service",
  "Real Estate & Property",
  "Transportation & Logistics",
  "Media & Marketing",
  "Government & Public Sector",
  "Sports & Entertainment",
  "HR & Recruiting",
  "Automotive",
  "Agriculture & Food Production",
  "Energy & Utilities",
] as const;

export type IndustryName = typeof INDUSTRY_TAXONOMY[number];

export type IndustryGuess = {
  industry: IndustryName | null;
  confidence: number;
  source: "tld" | "name_domain" | "report_evidence" | "insufficient";
  signals: string[];
};

const RULES: Array<{ industry: IndustryName; re: RegExp; weight: number; label: string }> = [
  { industry: "Construction & Home Services", re: /\b(construction|contractor|contracting|roof|roofing|hvac|plumb|electric|electrical|remodel|renovation|landscap|paving|concrete|flooring|fence|windows?|doors?|handyman|insulation)\b/i, weight: 4, label: "construction/trade keyword" },
  { industry: "Manufacturing & Industrial", re: /\b(manufactur|fabricat|machin|cnc|industrial|tooling|aerospace|precision|metalwork|assembly|factory|plant)\b/i, weight: 4, label: "manufacturing keyword" },
  { industry: "Healthcare & Medical", re: /\b(health|medical|clinic|hospital|dental|dentist|ortho|surgery|therapy|therapeutic|pharma|pharmacy|patient|care center|wellness)\b/i, weight: 4, label: "healthcare keyword" },
  { industry: "Financial Services", re: /\b(bank|banking|wealth|investment|investor|capital|mortgage|lending|credit union|financial planning|asset management)\b/i, weight: 4, label: "financial services keyword" },
  { industry: "Accounting & Finance Services", re: /\b(accounting|accountant|bookkeep|cpa|tax advisory|tax service|fractional cfo|cfo services?)\b/i, weight: 4, label: "accounting/CFO keyword" },
  { industry: "Insurance", re: /\b(insurance|insur|underwriting|brokerage|benefits agency)\b/i, weight: 4, label: "insurance keyword" },
  { industry: "Legal Services", re: /\b(law firm|lawyer|attorney|legal services?|litigation|counsel)\b/i, weight: 4, label: "legal keyword" },
  { industry: "Professional Services & Consulting", re: /\b(consulting|consultant|advisory|professional services|strategy firm|fractional executive)\b/i, weight: 3, label: "consulting keyword" },
  { industry: "Technology & SaaS", re: /\b(sa(a|as)|software|platform|cloud|cyber|developer|api|analytics|artificial intelligence|\bai\b|technology|technologies|tech solutions|data platform)\b/i, weight: 3, label: "technology keyword" },
  { industry: "Telecommunications", re: /\b(telecom|telecommunications|wireless|broadband|fiber|mobility|cellular)\b/i, weight: 4, label: "telecommunications keyword" },
  { industry: "Education", re: /\b(university|college|school|academy|education|learning|student|campus)\b/i, weight: 4, label: "education keyword" },
  { industry: "Nonprofit & Association", re: /\b(nonprofit|non profit|foundation|association|society|charity|church|ministry|coalition)\b/i, weight: 4, label: "nonprofit/association keyword" },
  { industry: "Retail & E-commerce", re: /\b(retail|ecommerce|e commerce|shop|store|boutique|consumer goods|marketplace)\b/i, weight: 3, label: "retail keyword" },
  { industry: "Hospitality & Food Service", re: /\b(restaurant|cafe|coffee|bakery|hotel|hospitality|catering|brewery|bar |food service|dining)\b/i, weight: 4, label: "hospitality/food keyword" },
  { industry: "Real Estate & Property", re: /\b(real estate|realt|property|properties|apartment|multifamily|commercial realty|property management)\b/i, weight: 4, label: "real estate keyword" },
  { industry: "Transportation & Logistics", re: /\b(logistics|transport|trucking|freight|shipping|courier|fleet|supply chain|warehous)\b/i, weight: 4, label: "transport/logistics keyword" },
  { industry: "Media & Marketing", re: /\b(marketing|advertising|media|creative agency|branding|public relations|communications agency|content studio)\b/i, weight: 3, label: "marketing/media keyword" },
  { industry: "Government & Public Sector", re: /\b(government|municipal|county|city of|department of|public works|state agency)\b/i, weight: 4, label: "government keyword" },
  { industry: "Sports & Entertainment", re: /\b(sports|athletic|league|ncaa|entertainment|theater|theatre|music|gaming|esports)\b/i, weight: 4, label: "sports/entertainment keyword" },
  { industry: "HR & Recruiting", re: /\b(recruit|staffing|talent|human resources|\bhr\b|workforce|payroll|people operations)\b/i, weight: 4, label: "HR/recruiting keyword" },
  { industry: "Automotive", re: /\b(auto|automotive|motors|dealership|collision|tire|vehicle|car dealer|truck dealer)\b/i, weight: 4, label: "automotive keyword" },
  { industry: "Agriculture & Food Production", re: /\b(agriculture|farm|farming|agri|crop|livestock|dairy|food production|food processing)\b/i, weight: 4, label: "agriculture/food production keyword" },
  { industry: "Energy & Utilities", re: /\b(energy|utility|utilities|solar|renewable|oil|gas|power generation|electric utility)\b/i, weight: 4, label: "energy/utilities keyword" },
];

const host = (raw: string) => {
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return raw.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
};

export function classifyIndustryHeuristic(input: {
  companyName?: string | null;
  domain?: string | null;
  websiteUrl?: string | null;
  reportEvidence?: string | null;
}): IndustryGuess {
  const domain = host(String(input.domain || input.websiteUrl || ""));
  if (domain.endsWith(".edu")) return { industry: "Education", confidence: 0.99, source: "tld", signals: [".edu domain"] };
  if (domain.endsWith(".gov") || domain.endsWith(".mil")) return { industry: "Government & Public Sector", confidence: 0.99, source: "tld", signals: [domain.endsWith(".mil") ? ".mil domain" : ".gov domain"] };

  const compactDomain = domain.split(".")[0]?.replace(/[-_]+/g, " ") || "";
  const evidence = String(input.reportEvidence || "").slice(0, 12000);
  const baseText = [input.companyName, compactDomain, input.websiteUrl].filter(Boolean).join(" ");
  const evidenceText = [baseText, evidence].join(" ");

  const scores = new Map<IndustryName, { score: number; signals: string[]; evidenceHit: boolean }>();
  for (const rule of RULES) {
    const baseHit = rule.re.test(baseText);
    rule.re.lastIndex = 0;
    const evidenceHit = rule.re.test(evidence);
    rule.re.lastIndex = 0;
    if (!baseHit && !evidenceHit) continue;
    const prev = scores.get(rule.industry) || { score: 0, signals: [], evidenceHit: false };
    prev.score += baseHit ? rule.weight : Math.max(2, rule.weight - 1);
    prev.evidenceHit ||= evidenceHit;
    prev.signals.push(`${rule.label}${evidenceHit && !baseHit ? " in report evidence" : ""}`);
    scores.set(rule.industry, prev);
  }

  if (!scores.size) return { industry: null, confidence: 0, source: "insufficient", signals: [] };
  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const [industry, best] = ranked[0];
  const second = ranked[1]?.[1].score || 0;
  const margin = best.score - second;
  const confidence = Math.min(0.96, 0.54 + best.score * 0.055 + Math.max(0, margin) * 0.025 + (best.evidenceHit ? 0.08 : 0));
  return {
    industry,
    confidence: Math.round(confidence * 100) / 100,
    source: best.evidenceHit ? "report_evidence" : "name_domain",
    signals: best.signals.slice(0, 6),
  };
}

export function isAllowedIndustry(value: unknown): value is IndustryName {
  return INDUSTRY_TAXONOMY.includes(String(value) as IndustryName);
}
