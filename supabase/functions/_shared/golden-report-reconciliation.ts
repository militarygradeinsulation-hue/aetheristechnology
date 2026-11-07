/**
 * Determine which saved completed Golden Report scan IDs are absent from the
 * searchable library index. The report content itself remains in forensic_scans.
 *
 * Does not mutate rows or call any generation services.
 */
export function missingGoldenReportArchiveIds(
  completedScanIds: Iterable<string>,
  archivedScanIds: Iterable<string>,
): string[] {
  const archived = new Set(archivedScanIds);
  return [...new Set(completedScanIds)].filter((scanId) => scanId.length > 0 && !archived.has(scanId));
}
