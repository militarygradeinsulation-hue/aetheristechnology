import type { Assessment } from "./types";
import { DIMENSION_LABEL, money, rangeText } from "./format";

export interface EnquiryInput {
  tier: "verified" | "roadmap" | "unsure";
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  business: string;
  message: string;
  summary: Assessment | null;
  demo: boolean;
  consent: boolean;
}

const TIER_TEXT: Record<EnquiryInput["tier"], string> = {
  verified: "Verified Business X-Ray Review (indicative $199)",
  roadmap: "Business X-Ray Correction Roadmap (indicative $599)",
  unsure: "Business X-Ray enquiry — please advise",
};

export function normalizeContactUrl(raw: string, kind: "linkedin" | "website"): string | null {
  if (!raw.trim()) return "";
  if (raw.trim().length > 300 || /\s/.test(raw.trim())) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return null;
    if (kind === "linkedin" &&
        (!["linkedin.com", "www.linkedin.com"].includes(url.hostname.toLowerCase()) || !/^\/(in|company)\/[^/]+/i.test(url.pathname))) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function validateEnquiry(input: EnquiryInput): string | null {
  if (input.name.trim().length < 2 || input.name.length > 100) return "Please enter your name.";
  if (input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "Please enter a valid email address.";
  if (input.phone.length > 35 || input.business.length > 120 || input.message.length > 1000) return "One or more fields are too long.";
  if (normalizeContactUrl(input.linkedin, "linkedin") === null) return "Enter a valid LinkedIn profile URL.";
  if (normalizeContactUrl(input.website, "website") === null) return "Enter a valid business website URL.";
  if (!input.consent) return "Please agree that Aetheris may reply to your enquiry.";
  return null;
}

/** Send only opt-in summary metadata. Raw scan inputs remain on the customer's device. */
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
  const pieces = [
    "Business X-Ray service request",
    `Service: ${TIER_TEXT[input.tier]}`,
    `Name: ${input.name.trim()}`,
    `Email: ${input.email.trim().toLowerCase()}`,
    `Phone: ${input.phone.trim() || "(not provided)"}`,
    `Business: ${input.business.trim() || "(not provided)"}`,
    `LinkedIn: ${normalizeContactUrl(input.linkedin, "linkedin") || "(not provided)"}`,
    `Website URL: ${normalizeContactUrl(input.website, "website") || "(not provided)"}`,
    "",
    "Message:",
    input.message.trim() || "(No additional details)",
  ];
  if (input.summary) pieces.push("", summarizeForEmail(input.summary, input.demo));
  pieces.push("", "The sender consented to be contacted about this enquiry. No payment has been taken, and scope and timing must be confirmed separately.");
  return pieces.join("\n").slice(0, 3900);
}

export function buildBackendEnquiry(input: EnquiryInput, idempotencyKey: string) {
  const issue = validateEnquiry(input);
  if (issue) throw new Error(issue);
  return {
    idempotencyKey,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim() || null,
    company: input.business.trim() || null,
    service_interest: TIER_TEXT[input.tier],
    message: buildEnquiryBody(input),
  };
}

/** Existing website inbox is defined server-side; browser cannot choose the recipient. */
export async function submitBackendEnquiry(
  payload: ReturnType<typeof buildBackendEnquiry>,
  config: { url: string; publishableKey: string },
): Promise<void> {
  if (!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(config.url) || !config.publishableKey) {
    throw new Error("Aetheris email service is not configured on this deployment.");
  }
  const response = await fetch(`${config.url.replace(/\/$/, "")}/functions/v1/notify-contact-submission`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.publishableKey,
      Authorization: `Bearer ${config.publishableKey}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) throw new Error("The email service did not confirm your message.");
}
