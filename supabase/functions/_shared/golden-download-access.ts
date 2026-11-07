/**
 * Source exports contain the complete saved report, not just the sanitized
 * company summary. A shared library reader may not export private intake
 * material; only the verified administrator/internal path can do that.
 */
export function canExportGoldenReportSource(isPrivileged: boolean, privateIntake: boolean | null | undefined): boolean {
  return isPrivileged || privateIntake !== true;
}
