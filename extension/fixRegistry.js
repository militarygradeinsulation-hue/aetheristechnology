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
  "form_unlabeled", // parametric (form_unlabeled_<selector>)
  "heading_skip",
  "no_form",
  "no_followup_hook",
  "no_proof",
  "no_pricing",
  "no_visible_contact",
  "page_weight",
  "third_party_bloat",
  "hero_image_weight",
  "autoplay_loud",
]);

export function hasInPageFix(leak) {
  if (!leak?.id) return false;
  // Any leak with a structured AI fixAction is auto-applicable via the generic handler.
  if (leak.fixAction && typeof leak.fixAction === "object" && leak.fixAction.op) return true;
  if (INPAGE_FIX_IDS.has(leak.id)) return true;
  if (leak.id.startsWith("form_too_long")) return true;
  if (leak.id.startsWith("form_unlabeled")) return true;
  return false;
}
