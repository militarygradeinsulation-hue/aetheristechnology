// Bump CURRENT_EXTENSION_VERSION every time the packaged Chrome extension
// (public/aetheris-extension.zip) is rebuilt. Anyone whose
// "last downloaded" version is older will see the portal's Extension button
// turn red with an "Update" badge until they re-download from /extension.

export const CURRENT_EXTENSION_VERSION = "2026.07.07b";

const KEY = "aetheris.extensionDownloadedVersion";

export function getDownloadedExtensionVersion(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function markExtensionDownloaded(version: string = CURRENT_EXTENSION_VERSION) {
  try {
    window.localStorage.setItem(KEY, version);
    window.dispatchEvent(new Event("aetheris:extension-downloaded"));
  } catch {
    /* ignore */
  }
}

export function isExtensionOutdated(): boolean {
  const v = getDownloadedExtensionVersion();
  return v !== CURRENT_EXTENSION_VERSION;
}
