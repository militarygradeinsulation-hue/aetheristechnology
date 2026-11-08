/**
 * Safari on iOS requires a browser tab/window to be opened synchronously
 * from the button click. Opening it after awaiting a Supabase request is
 * considered a popup and may be blocked, making PDF downloads appear broken.
 */
export function requiresEarlyPdfTab(userAgent: string, platform = "", maxTouchPoints = 0): boolean {
  // Modern iPads may advertise a desktop Mac Safari user agent.
  return /iPhone|iPad|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1 && /Safari/i.test(userAgent));
}

export function reserveSavedPdfTab(): Window | null {
  if (typeof window === "undefined" || !requiresEarlyPdfTab(window.navigator.userAgent, window.navigator.platform, window.navigator.maxTouchPoints)) return null;
  const viewer = window.open("", "_blank");
  if (viewer) {
    viewer.document.title = "Preparing Golden Report PDF";
    viewer.document.body.textContent = "Preparing your saved Golden Report PDF…";
  }
  return viewer;
}

export function showSavedGoldenPdf(doc: { output: (type: "blob") => Blob; save: (name: string) => void }, fileName: string, viewer: Window | null): void {
  if (!viewer || viewer.closed) {
    doc.save(fileName);
    return;
  }
  const blobUrl = URL.createObjectURL(doc.output("blob"));
  try {
    viewer.location.replace(blobUrl);
    // Keep object URL alive long enough for Safari's PDF viewer to load it.
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 300_000);
  } catch (e) {
    URL.revokeObjectURL(blobUrl);
    try { viewer.close(); } catch { /* ignore */ }
    doc.save(fileName);
  }
}
