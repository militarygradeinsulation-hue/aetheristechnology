// Shared public-business contact enrichment for the manual lead scrapers.
// No background lead harvesting and no invented person-email combinations.
// The shared collector keeps source URLs and caps provider requests.
import { discoverPublicBusinessContacts, type ContactEvidence } from "./contact-discovery.ts";

export interface EnrichedContact {
  email?: string;
  phone?: string;
  contact_name?: string;
  all_emails?: string[];
  all_phones?: string[];
  contact_evidence?: ContactEvidence[];
}

/**
 * Manual lead collection uses at most two company-site page reads.
 * We keep looking for a published phone even after finding an email, and
 * stop only when both contact channels are found or the budget is exhausted.
 * More extensive discovery remains on-demand in the portal/extension.
 */
export async function enrichLeadFromWebsite(website: string, apiKey: string): Promise<EnrichedContact> {
  const result = await discoverPublicBusinessContacts(website, apiKey, { maxPages: 2, mapIfNeeded: false });
  return {
    ...(result.email ? { email: result.email } : {}),
    ...(result.phone ? { phone: result.phone } : {}),
    ...(result.contact_name ? { contact_name: result.contact_name } : {}),
    all_emails: result.all_emails.slice(0, 5),
    all_phones: result.all_phones.slice(0, 5),
    contact_evidence: result.evidence,
  };
}
