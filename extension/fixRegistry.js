// In-page fix registry shim — kept for backward compatibility.
// The actual fix logic now lives inside extension/content.js (INPAGE_FIXES map)
// and runs against the live DOM via AETHERIS_APPLY_FIX.
// This file declares which leak IDs have an in-page repair available, so the
// side panel can render a "Fix this in-page" button without round-tripping.

export const INPAGE_FIX_IDS = new Set([
  "no_meta_desc",
  "no_h1",
  "multi_h1",
  "no_atf_cta",
  "cta_crowding",
  "no_schema",
  "no_viewport",
  "no_canonical",
  "no_og",
  "no_favicon",
  "tap_targets",
  "missing_alt",
  "dead_links",
  "form_too_long", // parametric (form_too_long_<selector>)
  "mixed_content",
]);

export function hasInPageFix(leak) {
  if (!leak?.id) return false;
  if (INPAGE_FIX_IDS.has(leak.id)) return true;
  if (leak.id.startsWith("form_too_long")) return true;
  return false;
}
