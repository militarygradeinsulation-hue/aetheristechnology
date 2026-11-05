// Fire-and-forget beacons to the golden-report-track edge function.
const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/golden-report-track`;

export type GoldenTrackEvent = "page_view" | "pdf_download";

export function trackGoldenReportEvent(scanId: string | null | undefined, evt: GoldenTrackEvent, recipientEmail?: string | null) {
  if (!scanId) return;
  try {
    const params = new URLSearchParams({ scan: scanId, evt: evt === "page_view" ? "view" : "download" });
    if (recipientEmail) params.set("e", recipientEmail);
    // Use sendBeacon when possible (survives navigation), fall back to fetch keepalive.
    const url = `${TRACK_URL}?${params.toString()}`;
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(url);
    } else {
      fetch(url, { method: "GET", keepalive: true, mode: "no-cors" }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
