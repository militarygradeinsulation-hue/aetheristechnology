/**
 * Conservative, first-party-only matching of a Golden Report to an authorized
 * HubSpot CRM *company* record. No leads, deals, engagements, or person records
 * are combined without verified company associations.
 *
 * A shared/public report NEVER receives this data. Server access additionally
 * requires a signed-in Supabase user who owns the connected CRM account.
 */
export interface ScopedCompanyRecord {
  id: string;
  domain: string | null;
  name: string | null;
  industry: string | null;
  owner_id: string | null;
  last_activity_date: string | null;
  synced_at: string | null;
}
export interface ScopedCrmPreview {
  report_domain: string;
  company_record_id: string;
  company_name: string;
  industry_recorded: boolean;
  company_owner_recorded: boolean;
  company_activity_recorded: boolean;
  last_company_activity: string | null;
  last_company_sync: string | null;
  statement: string;
  limitations: string[];
}
const stripWww = (host: string) => host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
export function normalizeReportDomain(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw.length > 2048 || /[\s<>"']/.test(raw)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = stripWww(url.hostname);
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) ||
        host.length > 253 || host.endsWith(".local") || host.endsWith(".localhost") ||
        host === "localhost" || /^\d+(?:\.\d+){3}$/.test(host)) return null;
    return host;
  } catch { return null; }
}
export function companyMatchesReport(reportUrl: string, crmDomain: string): boolean {
  const reportDomain = normalizeReportDomain(reportUrl);
  const crmHost = normalizeReportDomain(crmDomain);
  return Boolean(reportDomain && crmHost && reportDomain === crmHost);
}
const safeDate = (value: string | null): string | null => {
  if (!value) return null;
  const date = Date.parse(value);
  if (!Number.isFinite(date) || date < Date.UTC(2000,0,1) || date > Date.now() + 86_400_000) return null;
  return new Date(date).toISOString().slice(0, 10);
};
export function buildScopedCompanyPreview(reportUrl: string, company: ScopedCompanyRecord): ScopedCrmPreview | null {
  if (!companyMatchesReport(reportUrl, company.domain || "")) return null;
  const domain = normalizeReportDomain(reportUrl)!;
  const owner = Boolean(company.owner_id?.trim());
  const activity = safeDate(company.last_activity_date);
  const synced = safeDate(company.synced_at);
  const companyName = (company.name || "").trim().slice(0, 100);
  const statement = [
    "A signed-in user's connected CRM contains a company record matching the report domain " + domain + ".",
    "The company-level owner field is " + (owner ? "populated" : "blank") + ".",
    "The company-level last-activity field is " + (activity ? "dated " + activity : "missing or unusable") + ".",
    "The CRM snapshot was last recorded " + (synced || "on an unknown date") + ".",
    "This does not establish contact response time, quote follow-up, owner of any deal, or revenue loss.",
  ].join(" ");
  return {
    report_domain: domain, company_record_id: company.id, company_name: companyName,
    industry_recorded: Boolean(company.industry?.trim()),
    company_owner_recorded: owner, company_activity_recorded: Boolean(activity),
    last_company_activity: activity, last_company_sync: synced, statement,
    limitations: [
      "Only the exact-domain company record was checked within the signed-in user's CRM account.",
      "A populated CRM company owner is not proof that a specific lead or quote has an owner.",
      "No contact, deal, engagement, email, or payment records were inspected or transmitted.",
      "The operator must review and decide whether this company-level context is relevant before recording evidence.",
    ],
  };
}
