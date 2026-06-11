// Maps Pass A leak categories/ids → an Aetheris tool that fixes the leak.
// Side-panel opens the matching tool with prefilled query params.
const SITE_ORIGIN = "https://aetheris.technology";

export const FIX_REGISTRY = [
  { match: (l) => l.id === "tracking_gap", label: "Full Website Report", url: (ctx) => `${SITE_ORIGIN}/tools/full-website-report?url=${encodeURIComponent(ctx.url)}` },
  { match: (l) => l.id === "no_atf_cta" || l.id === "cta_crowding", label: "Friction Vocabulary Audit", url: (ctx) => `${SITE_ORIGIN}/tools/friction-audit?url=${encodeURIComponent(ctx.url)}` },
  { match: (l) => l.id === "no_form" || l.id === "no_followup_hook" || l.id.startsWith("form_too_long"), label: "Follow-Up Plan Generator", url: (ctx) => `${SITE_ORIGIN}/tools/follow-up-plan?url=${encodeURIComponent(ctx.url)}` },
  { match: (l) => l.id === "no_schema" || l.id === "no_meta_desc", label: "Full Website Report", url: (ctx) => `${SITE_ORIGIN}/tools/full-website-report?url=${encodeURIComponent(ctx.url)}` },
  { match: (l) => l.category === "Messaging", label: "Brand Contradiction Finder", url: (ctx) => `${SITE_ORIGIN}/tools/brand-contradictions?url=${encodeURIComponent(ctx.url)}` },
  { match: (l) => l.category === "Mobile" || l.category === "Speed", label: "Full Website Report", url: (ctx) => `${SITE_ORIGIN}/tools/full-website-report?url=${encodeURIComponent(ctx.url)}` },
];

export function fixFor(leak, ctx) {
  const m = FIX_REGISTRY.find((f) => f.match(leak));
  return m ? { label: m.label, url: m.url(ctx) } : null;
}
