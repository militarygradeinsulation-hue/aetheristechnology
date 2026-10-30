/**
 * Aetheris direct-email intake uses the site's EXISTING fixed-recipient
 * notify-contact-submission endpoint. No visitor can select the recipient.
 * The endpoint accepts name/email/phone/company/service_interest/message.
 * LinkedIn and website are carried as labelled lines inside message so no
 * backend migration or new mail provider is required.
 */

export const CONTACT_INTERESTS = {
  general: "General business enquiry",
  business_xray_verified: "Business X-Ray · Verified Review ($199 indicative)",
  business_xray_roadmap: "Business X-Ray · Correction Roadmap ($599 indicative)",
  business_xray_unsure: "Business X-Ray · Help me choose a service",
} as const;

export type ContactInterest = keyof typeof CONTACT_INTERESTS;

export interface DirectEmailInput {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  company: string;
  message: string;
  interest: ContactInterest;
  contactConsent: boolean;
}

export interface DirectEmailPayload {
  idempotencyKey: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  service_interest: string;
  message: string;
}

export function parseContactInterest(raw: string | null): ContactInterest {
  return raw && Object.prototype.hasOwnProperty.call(CONTACT_INTERESTS, raw)
    ? (raw as ContactInterest)
    : "general";
}

export function normalizeOptionalUrl(raw: string, kind: "linkedin" | "website"): string | null {
  const val = raw.trim();
  if (!val) return "";
  if (val.length > 300 || /\s/.test(val)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(val) ? val : `https://${val}`);
    const hostname = url.hostname.toLowerCase();
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    if (!hostname.includes(".") || hostname === "localhost") return null;
    if (kind === "linkedin") {
      if (hostname !== "linkedin.com" && hostname !== "www.linkedin.com") return null;
      if (!/^\/(in|company)\/[^/]+/i.test(url.pathname)) return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function validateDirectEmail(input: DirectEmailInput): string | null {
  if (input.name.trim().length < 2 || input.name.trim().length > 100) return "Enter your name (2–100 characters).";
  if (input.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return "Enter a valid email address.";
  if (input.phone.trim().length > 35) return "Phone number is too long.";
  if (input.company.trim().length > 120) return "Company name is too long.";
  if (input.message.trim().length > 1400) return "Keep your message under 1,400 characters.";
  if (normalizeOptionalUrl(input.linkedin, "linkedin") === null) return "Enter a valid LinkedIn profile or company URL.";
  if (normalizeOptionalUrl(input.website, "website") === null) return "Enter a valid website URL.";
  if (!input.contactConsent) return "Please confirm Aetheris may contact you about your enquiry.";
  return null;
}

export function buildDirectEmailPayload(input: DirectEmailInput, key: string): DirectEmailPayload {
  const error = validateDirectEmail(input);
  if (error) throw new Error(error);
  const interest = CONTACT_INTERESTS[input.interest];
  const linkedIn = normalizeOptionalUrl(input.linkedin, "linkedin") || "(not provided)";
  const website = normalizeOptionalUrl(input.website, "website") || "(not provided)";
  const parts = [
    "Aetheris.Technology / Website enquiry",
    `Service: ${interest}`,
    "",
    `Name: ${input.name.trim()}`,
    `Email: ${input.email.trim().toLowerCase()}`,
    `Phone: ${input.phone.trim() || "(not provided)"}`,
    `Company: ${input.company.trim() || "(not provided)"}`,
    `LinkedIn: ${linkedIn}`,
    `Website URL: ${website}`,
    "",
    "Message:",
    input.message.trim() || "(No additional message)",
    "",
    "The sender agreed to be contacted about this enquiry.",
    "This is an enquiry only. No payment, booking or verified assessment is implied.",
  ];
  return {
    idempotencyKey: key,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim() || null,
    company: input.company.trim() || null,
    service_interest: interest,
    message: parts.join("\n").slice(0, 3900),
  };
}
