import { useCallback, useState } from "react";
import { toast } from "sonner";

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Captures a region of the live page using html2canvas-pro (primary) with a
 * getDisplayMedia fallback for cases where the DOM can't be rasterized
 * (cross-origin iframes, tainted canvas). Returns a downscaled PNG data URL.
 */
async function captureRegion(rect: Rect): Promise<string> {
  // ---- Primary: html2canvas-pro (handles oklch / lab) ----
  try {
    const mod = await import("html2canvas-pro");
    const html2canvas = mod.default;
    const dpr = window.devicePixelRatio || 1;
    const canvas = await html2canvas(document.body, {
      x: window.scrollX + rect.x,
      y: window.scrollY + rect.y,
      width: rect.w,
      height: rect.h,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      scale: dpr,
      backgroundColor: null,
      logging: false,
      useCORS: true,
    });
    return downscale(canvas);
  } catch (err) {
    console.warn("[capture] html2canvas failed, falling back to getDisplayMedia", err);
  }

  // ---- Fallback: getDisplayMedia ----
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen capture not supported in this browser.");
  }

  toast("Using screen-share fallback for this capture.");
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "browser" } as MediaTrackConstraints,
    audio: false,
  });

  const video = document.createElement("video");
  video.srcObject = stream;
  await video.play();

  // Wait one frame to ensure first paint is available
  await new Promise((r) => requestAnimationFrame(r));

  const trackSettings = stream.getVideoTracks()[0].getSettings();
  const fullW = video.videoWidth || trackSettings.width || window.innerWidth;
  const fullH = video.videoHeight || trackSettings.height || window.innerHeight;

  // The shared surface may be the whole tab; map our viewport-relative rect to
  // video coords using innerWidth/innerHeight as the reference.
  const sx = Math.round((rect.x / window.innerWidth) * fullW);
  const sy = Math.round((rect.y / window.innerHeight) * fullH);
  const sw = Math.round((rect.w / window.innerWidth) * fullW);
  const sh = Math.round((rect.h / window.innerHeight) * fullH);

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

  stream.getTracks().forEach((t) => t.stop());
  video.srcObject = null;

  return downscale(canvas);
}

function downscale(canvas: HTMLCanvasElement, maxEdge = 1280): string {
  const { width, height } = canvas;
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return canvas.toDataURL("image/png");
  const scale = maxEdge / longest;
  const out = document.createElement("canvas");
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

export function useScreenCapture() {
  const [capturing, setCapturing] = useState(false);
  const [rectPending, setRectPending] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(() => {
    setCapturing(true);
  }, []);

  const cancel = useCallback(() => {
    setCapturing(false);
    setRectPending(null);
  }, []);

  /**
   * Called by the overlay when the user finishes the drag. Returns the data
   * URL (or null if cancelled). The overlay is unmounted before capture runs
   * so it doesn't appear in the screenshot.
   */
  const handleOverlayComplete = useCallback(
    async (rect: Rect | null): Promise<string | null> => {
      setCapturing(false);
      if (!rect) return null;
      setBusy(true);
      try {
        // Yield so the overlay actually unmounts before html2canvas snapshots
        await new Promise((r) => setTimeout(r, 50));
        const dataUrl = await captureRegion(rect);
        return dataUrl;
      } catch (e: any) {
        toast.error(e?.message || "Capture failed");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { capturing, busy, start, cancel, handleOverlayComplete, rectPending, setRectPending };
}
