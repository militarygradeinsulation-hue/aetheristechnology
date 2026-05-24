import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// --- Stale chunk recovery -------------------------------------------------
// After a redeploy, the browser may still have the old index.html cached,
// which references hashed JS chunks (e.g. /assets/index-XXXX.js) that no
// longer exist on the server. When React.lazy() tries to import one of those
// chunks it throws "Importing a module script failed" and the screen goes
// blank. We listen for those errors and force a single hard reload so the
// user picks up the new index.html + new chunk hashes automatically.
const RELOAD_FLAG = "__aetheris_chunk_reload__";
function recoverFromStaleChunk(reason: unknown) {
  const msg = String((reason as { message?: string } | undefined)?.message ?? reason ?? "");
  const looksStale =
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /ChunkLoadError/i.test(msg);
  if (!looksStale) return;
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return; // already retried once
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {}
  // Bypass HTTP cache so we actually get the new index.html.
  window.location.reload();
}
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  recoverFromStaleChunk((e as Event & { payload?: unknown }).payload);
});
window.addEventListener("unhandledrejection", (e) => recoverFromStaleChunk(e.reason));
window.addEventListener("error", (e) => recoverFromStaleChunk(e.error ?? e.message));
// Clear the guard once the app has clearly booted successfully.
window.addEventListener("load", () => {
  setTimeout(() => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch {} }, 4000);
});
// -------------------------------------------------------------------------

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
