// Save tool output to the right "library" depending on session:
// - Portal session (rep/partner) → rep_library (per-code)
// - Otherwise (admin session)    → admin_library
import { saveToAdminLibrary } from '@/lib/adminLibrary';
import { saveToRepLibrary, isPortalSession } from '@/lib/portalWorkspace';

export async function saveToolRun(args: {
  tool_type: string;
  title: string;
  input_data: unknown;
  output_data: unknown;
  file_url?: string | null;
}) {
  try {
    if (isPortalSession()) {
      await saveToRepLibrary(args);
    } else {
      await saveToAdminLibrary(args);
    }
  } catch (e) {
    console.error('saveToolRun failed:', e);
  }
}
