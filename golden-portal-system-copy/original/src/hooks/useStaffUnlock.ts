// Returns true when the current visitor is internal staff:
// - holds a valid admin PIN session, OR
// - holds a valid Rep / Partner Portal session, OR
// - has entered the staff bypass code (9822) on the Tech Solutions access bar
//   (stored as tech_solutions_access_v1 with plan === "staff").
// Used by paid sales tools to bypass the public paywall so reps
// can use the tools free during prospect calls.
import { useEffect, useState } from "react";
import { hasValidAdminToken } from "@/lib/adminAuth";
import { hasValidPortalSession } from "@/lib/portalAuth";
import { ACCESS_KEY } from "@/components/TechSolutionsAccessBar";

function hasStaffTechAccess(): boolean {
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw);
    return p?.plan === "staff" && !!p?.unlockedAll;
  } catch {
    return false;
  }
}

function check(): boolean {
  try {
    return hasValidAdminToken() || hasValidPortalSession() || hasStaffTechAccess();
  } catch {
    return false;
  }
}

export function useStaffUnlock(): boolean {
  const [unlocked, setUnlocked] = useState<boolean>(() => check());

  useEffect(() => {
    // Re-check on mount + when storage / tech access changes
    setUnlocked(check());
    const recheck = () => setUnlocked(check());
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "aetheris_admin_token" ||
        e.key === "aetheris_portal_token" ||
        e.key === ACCESS_KEY
      ) {
        recheck();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("tech-access-changed", recheck);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tech-access-changed", recheck);
    };
  }, []);

  return unlocked;
}
