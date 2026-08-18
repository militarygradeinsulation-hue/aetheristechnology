/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, type ComponentType } from "react";

/**
 * React.lazy wrapper that survives stale chunk URLs after a new deploy.
 * On a dynamic-import failure it retries once, then force-reloads the page
 * a single time (guarded by sessionStorage) to pick up the new manifest.
 */
const RELOAD_KEY = "chunk-reload-at";

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // one silent retry (transient network / cache miss)
      try {
        return await factory();
      } catch {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 15000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // keep Suspense hanging while the reload happens
          return await new Promise<{ default: T }>(() => {});
        }
        throw err;
      }
    }
  });
}
