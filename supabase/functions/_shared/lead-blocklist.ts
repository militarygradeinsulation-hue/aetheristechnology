// Shared helper: load admin-configured blocked keywords from lead_drip_settings
// and provide a matcher that flags a lead if any blocked term appears in its
// business_name, industry, website, location, contact_name, email, or why_fit.

export async function loadBlockedKeywords(supabase: any): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("lead_drip_settings")
      .select("blocked_keywords")
      .maybeSingle();
    const list = Array.isArray(data?.blocked_keywords) ? data.blocked_keywords : [];
    return list
      .map((k: unknown) => String(k || "").trim().toLowerCase())
      .filter((k: string) => k.length > 0);
  } catch {
    return [];
  }
}

export function isLeadBlocked(lead: Record<string, any>, keywords: string[]): boolean {
  if (!keywords.length) return false;
  const haystack = [
    lead?.business_name,
    lead?.industry,
    lead?.website,
    lead?.location,
    lead?.contact_name,
    lead?.email,
    lead?.why_fit,
    lead?.notes,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase())
    .join(" | ");
  if (!haystack) return false;
  return keywords.some((kw) => haystack.includes(kw));
}
