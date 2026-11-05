// Strip PostgREST filter metacharacters from values being interpolated
// into `.or(...)` / `.ilike(...)` strings. PostgREST treats commas as
// clause separators and parens for grouping, so an unescaped value can
// inject additional filter conditions.
export function sanitizePostgrestLike(input: string): string {
  return String(input).replace(/[,()*\\%:\r\n]/g, " ").trim();
}
