/** The assistant may only execute advertised tools for the verified portal role. */
export function isPermittedPortalTool(tool: string, permitted: ReadonlySet<string>): boolean {
  return !!tool && permitted.has(tool);
}

/** Navigation is same-origin and constrained to actual portal sections. */
export function isPermittedPortalNavigation(path: unknown): path is string {
  if (typeof path !== "string" || path.length > 240) return false;
  const newPortal = /^\/portal\?tab=(leads|coach|training|calendar|meetings|workspace|playbook)$/;
  const classicPortal = /^\/portal\/legacy\?tab=(goldenlibrary|forecast|commissions|documents|team|inbox|command)$/;
  const savedReport = /^\/portal\/legacy\?tab=goldenlibrary&report=[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:&download=pdf)?$/i;
  return newPortal.test(path) || classicPortal.test(path) || savedReport.test(path);
}
