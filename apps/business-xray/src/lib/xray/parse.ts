import { UNKNOWN } from "./types";

/** Parse a raw answer string into a finite number, or null when blank / "unknown" / invalid. */
export function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim().replace(/[,$\s]/g, "");
  if (trimmed === "" || trimmed === UNKNOWN) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}