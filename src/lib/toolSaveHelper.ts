// Save tool output to the right "library" depending on session:
// - Portal session (rep/partner) → rep_library (per-code)
// - Otherwise (admin session)    → admin_library
//
// Hardened: retries transient failures and surfaces errors via toast so a
// silent backend hiccup doesn't lose the user's work.
import { saveToAdminLibrary } from '@/lib/adminLibrary';
import { saveToRepLibrary, isPortalSession } from '@/lib/portalWorkspace';
import { toast } from '@/hooks/use-toast';

export interface SaveToolRunArgs {
  tool_type: string;
  title: string;
  input_data: unknown;
  output_data: unknown;
  file_url?: string | null;
}

async function attemptSave(args: SaveToolRunArgs) {
  if (isPortalSession()) {
    return await saveToRepLibrary(args);
  }
  return await saveToAdminLibrary(args);
}

export async function saveToolRun(args: SaveToolRunArgs): Promise<boolean> {
  const target = isPortalSession() ? 'rep' : 'admin';
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await attemptSave(args);
      return true;
    } catch (e) {
      lastErr = e;
      // Backoff: 400ms, 1200ms
      await new Promise(r => setTimeout(r, 400 * (attempt + 1) * (attempt + 1)));
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  console.error(`saveToolRun failed (${target} library) after retries:`, lastErr);
  try {
    toast({
      title: 'Could not save to library',
      description: `"${args.title}" — ${msg}. Tap retry or try again.`,
      variant: 'destructive',
    });
  } catch {
    // toast not available in some contexts
  }
  return false;
}
