import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SEOOverride {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  tldr?: string | null;
  faqs?: Array<{ question: string; answer: string }> | null;
  applied_at?: string;
}

const cache = new Map<string, SEOOverride | null>();

export function useSEOOverride(path: string): SEOOverride | null {
  const [override, setOverride] = useState<SEOOverride | null>(() => cache.get(path) ?? null);

  useEffect(() => {
    let cancelled = false;
    if (cache.has(path)) {
      setOverride(cache.get(path) ?? null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("seo_overrides")
        .select("title, description, keywords, tldr, faqs, applied_at")
        .eq("path", path)
        .maybeSingle();
      const value = (data as SEOOverride | null) ?? null;
      cache.set(path, value);
      if (!cancelled) setOverride(value);
    })();
    return () => { cancelled = true; };
  }, [path]);

  return override;
}
