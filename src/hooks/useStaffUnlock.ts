// Returns true when the current visitor is internal staff:
// - holds a valid admin PIN session, OR
// - holds a valid Rep / Partner Portal session.
// Used by paid sales tools to bypass the public paywall so reps
// can use the tools free during prospect calls.
import { useEffect, useState } from "react";
import { hasValidAdminToken } from "@/lib/adminAuth";
import { hasValidPortalSession } from "@/lib/portalAuth";

function check(): boolean {
  try {
    return hasValidAdminToken() || hasValidPortalSession();
  } catch {
    return false;
  }
}

export function useStaffUnlock(): boolean {
  const [unlocked, setUnlocked] = useState<boolean>(() => check());

  useEffect(() => {
    // Re-check on mount + when storage changes in another tab
    setUnlocked(check());
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "aetheris_admin_token" ||
        e.key === "aetheris_portal_token"
      ) {
        setUnlocked(check());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return unlocked;
}
