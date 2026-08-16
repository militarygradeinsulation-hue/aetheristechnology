// NO-DASH RULE (project-wide writing rule) — client mirror of supabase/functions/_shared/no-dashes.ts
// Nothing Aetheris publishes may contain dashes. URLs, slugs and file paths are preserved.

const URL_LIKE = /^(https?:\/\/|www\.|mailto:|\/|[\w.-]+\.[a-z]{2,}(\/|$))/i;
const PROTECTED_KEY = /(url|link|href|src|slug|path|id$|_id|image|video|file|domain|email|handle|time|date|color|hex)/i;

export function stripDashes(input: string): string {
  if (!input) return input;
  return input
    .split("\n")
    .map((line) => {
      let out = line.replace(/^(\s*)[-–—]\s+/, "$1• ");
      out = out
        .split(/(\s+)/)
        .map((tok) => {
          if (!tok.trim()) return tok;
          if (URL_LIKE.test(tok)) return tok;
          // hashtags collapse instead of splitting: #Revenue-Leak -> #RevenueLeak
          if (tok.startsWith("#")) return tok.replace(/[-–—‐‑‒−]/g, "");
          let t = tok;
          t = t.replace(/\s*[—–]\s*/g, ", ");
          t = t.replace(/(?<=\w)[-‐‑‒−](?=\w)/g, " ");
          t = t.replace(/[-–—‐‑‒−]/g, "");
          return t;
        })
        .join("");
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
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = stripDashesDeep(v, k);
    return out as unknown as T;
  }
  return value;
}
