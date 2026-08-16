// NO-DASH RULE (project-wide writing rule)
// Nothing Aetheris publishes may contain dashes: no em dashes, no en dashes,
// no hyphens between words, no "- " bullets. URLs, slugs and file paths are preserved.

export const NO_DASH_PROMPT_RULE = `=== NO-DASH RULE (ABSOLUTE) ===
Never use dashes of any kind in the writing. No em dashes, no en dashes, no hyphens between words, no "-" bullet markers.
Use periods, commas, or separate sentences instead. Write compound words as separate words or one word (for example "follow up", "high value", "onboarding").
This rule is non negotiable and applies to titles, hooks, bodies, captions, hashtags and CTAs.`;

const URL_LIKE = /^(https?:\/\/|www\.|mailto:|\/|[\w.-]+\.[a-z]{2,}(\/|$))/i;

/** Keys whose values are technical (URLs, ids, slugs) and must keep their dashes. */
const PROTECTED_KEY = /(url|link|href|src|slug|path|id$|_id|image|video|file|domain|email|handle|time|date|color|hex)/i;

export function stripDashes(input: string): string {
  if (!input) return input;
  return input
    .split("\n")
    .map((line) => {
      // bullet markers
      let out = line.replace(/^(\s*)[-–—]\s+/, "$1• ");
      // token-wise so URLs survive
      out = out
        .split(/(\s+)/)
        .map((tok) => {
          if (!tok.trim()) return tok;
          if (URL_LIKE.test(tok)) return tok;
          let t = tok;
          // spaced em/en dash -> comma
          t = t.replace(/\s*[—–]\s*/g, ", ");
          // hyphen between word chars -> space
          t = t.replace(/(?<=\w)[-‐‑‒−](?=\w)/g, " ");
          // any leftover dash char
          t = t.replace(/[-–—‐‑‒−]/g, "");
          return t;
        })
        .join("");
      // clean artifacts
      return out.replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").replace(/\s+([.,!?;:])/g, "$1").trimEnd();
    })
    .join("\n");
}

export function stripDashesDeep<T>(value: T, key = ""): T {
  if (typeof value === "string") {
    if (key && PROTECTED_KEY.test(key)) return value;
    return stripDashes(value) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => stripDashesDeep(v, key)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripDashesDeep(v, k);
    }
    return out as unknown as T;
  }
  return value;
}
