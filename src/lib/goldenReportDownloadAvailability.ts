/**
 * Availability is about whether the saved report exists, not whether the
 * report's findings passed validation. Invalid/legacy reports are exported
 * as clearly marked historical archives.
 */
export function canDownloadSavedGoldenReport(report: unknown): boolean {
  return report !== null &&
    typeof report === "object" &&
    !Array.isArray(report) &&
    Object.keys(report).length > 0;
}
