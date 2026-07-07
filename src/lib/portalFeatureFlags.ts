// Live-read helper for portal feature flags. Anon SELECT is allowed by RLS,
// so any surface (rep portal, partner portal, extension web fallback, test
// portal) can consult it in one query. Writes must go through the
// `portal-feature-flags` edge function with an admin token.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PortalFeatureFlag {
  id: string;
  flag_key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

let cache: PortalFeatureFlag[] | null = null;
let inflight: Promise<PortalFeatureFlag[]> | null = null;
const listeners = new Set<(f: PortalFeatureFlag[]) => void>();

export async function fetchFlags(force = false): Promise<PortalFeatureFlag[]> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("portal_feature_flags")
      .select("*")
      .order("label", { ascending: true });
    if (error) throw error;
    cache = (data || []) as PortalFeatureFlag[];
    listeners.forEach((l) => l(cache!));
    return cache;
  })().finally(() => { inflight = null; });
  return inflight;
}

export function usePortalFlags() {
  const [flags, setFlags] = useState<PortalFeatureFlag[]>(cache || []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    const onChange = (f: PortalFeatureFlag[]) => setFlags([...f]);
    listeners.add(onChange);
    fetchFlags().then(() => setLoading(false)).catch(() => setLoading(false));
    return () => { listeners.delete(onChange); };
  }, []);
  return { flags, loading, reload: () => fetchFlags(true) };
}

export function useFeatureFlag(key: string, fallback = true) {
  const { flags, loading } = usePortalFlags();
  const f = flags.find((x) => x.flag_key === key);
  return { enabled: f ? f.enabled : fallback, loading, flag: f };
}
