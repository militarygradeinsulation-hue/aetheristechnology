import type { Assessment } from "./types";
import { DIMENSION_LABEL, money, rangeText } from "./format";

export interface EnquiryInput {
  to: string;
  tier: "verified" | "roadmap" | "unsure";
  name: string;
  business: string;
  message: string;
  summary: Assessment | null;
  demo: boolean;
}

const TIER_TEXT: Record<EnquiryInput["tier"], string> = {
  verified: "Verified Review (indicative $199)",
  roadmap: "Correction Roadmap (indicative $599)",
  unsure: "Not sure yet — please advise",
};

/** Plain-text summary safe to share: scores, ranges and finding titles only. No raw personal data. */
export function summarizeForEmail(a: Assessment, demo: boolean): string {
  const lines: string[] = [];
  lines.push(`Business X-Ray summary${demo ? " (DEMO — fictional sample data)" : ""} — self-reported, not verified`);
  lines.push(
    a.totals.status === "estimated" && a.totals.range
      ? `Possible annual opportunity (estimated): ${rangeText(a.totals.range)} (base ${money(a.totals.range.base)})`
      : "Possible annual opportunity: insufficient information",
  );
  for (const s of a.scores) lines.push(`${DIMENSION_LABEL[s.dimension]} friction: ${s.score === null ? "insufficient information" : `${s.score}/100`}`);
  a.findings.forEach((f) => lines.push(`Priority ${f.rank}: ${f.title}`));
  return lines.join("\n");
}

export function buildEnquiryBody(input: EnquiryInput): string {
  const parts = [
    "Hello Aetheris Technology,",
    "",
    `I'd like to enquire about: ${TIER_TEXT[input.tier]}.`,
    "",
    input.business.trim() ? `Business: ${input.business.trim()}` : "",
    input.name.trim() ? `Name: ${input.name.trim()}` : "",
    "",
    input.message.trim() || "(Add any context you'd like to share.)",
    "",
  ];
  if (input.summary) parts.push(summarizeForEmail(input.summary, input.demo), "");
  parts.push(
    "I understand this email is an enquiry only. It is not an automated purchase, no payment has been taken, and scope and price will be confirmed with me before any work begins.",
  );
  return parts.filter((p, i, arr) => !(p === "" && arr[i - 1] === "")).join("\n");
}

export function buildEnquirySubject(input: EnquiryInput): string {
  return `Business X-Ray enquiry — ${TIER_TEXT[input.tier]}${input.business.trim() ? ` — ${input.business.trim()}` : ""}`;
}

export function buildMailto(input: EnquiryInput): string {
  return `mailto:${input.to}?subject=${encodeURIComponent(buildEnquirySubject(input))}&body=${encodeURIComponent(buildEnquiryBody(input))}`;
}