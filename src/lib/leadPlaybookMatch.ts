import { supabase } from "@/integrations/supabase/client";

export interface MatchedPlaybook {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  summary: string | null;
  file_url: string;
  best_for_industries: string[];
  best_for_who: string | null;
  tags: string[];
  score: number;
  matched_on: string[];
}

interface LeadHints {
  industry?: string | null;
  notes?: string | null;
  why_fit?: string | null;
  business_name?: string | null;
  website?: string | null;
}

let _cache: MatchedPlaybook[] | null = null;
async function loadAll(): Promise<MatchedPlaybook[]> {
  if (_cache) return _cache;
  const { data, error } = await supabase
    .from("playbooks")
    .select("id, title, subtitle, description, summary, file_url, best_for_industries, best_for_who, tags")
    .order("title");
  if (error) throw new Error(error.message);
  _cache = (data || []).map((p) => ({ ...p, score: 0, matched_on: [] })) as MatchedPlaybook[];
  return _cache;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Tokenize an industry-ish string into meaningful words (drop generic noise). */
function tokens(s: string): string[] {
  const stop = new Set(["and", "the", "of", "for", "with", "&", "services", "service", "co", "inc", "llc"]);
  return norm(s).split(" ").filter((w) => w.length > 2 && !stop.has(w));
}

export async function matchPlaybooksForLead(lead: LeadHints, limit = 3): Promise<MatchedPlaybook[]> {
  const all = await loadAll();
  const industry = lead.industry?.trim() || "";
  const haystack = norm([lead.industry, lead.notes, lead.why_fit, lead.business_name, lead.website].filter(Boolean).join(" "));
  const industryToks = tokens(industry);

  const scored = all.map((p) => {
    let score = 0;
    const matched: string[] = [];

    // Industry overlap
    for (const ind of p.best_for_industries || []) {
      const indToks = tokens(ind);
      const hit = indToks.some((t) => industryToks.includes(t)) ||
                  (industry && norm(ind).includes(norm(industry)));
      if (hit) {
        score += 6;
        matched.push(ind);
        break;
      }
    }

    // Tag keyword in lead haystack
    for (const tag of p.tags || []) {
      if (haystack && haystack.includes(norm(tag))) {
        score += 3;
        matched.push(tag);
      }
    }

    // Title keyword in haystack
    const titleToks = tokens(p.title);
    const titleHits = titleToks.filter((t) => haystack.includes(t)).length;
    if (titleHits > 0) score += Math.min(titleHits, 3);

    return { ...p, score, matched_on: Array.from(new Set(matched)) };
  });

  scored.sort((a, b) => b.score - a.score);
  // Always return at least `limit` items so reps see options even on weak matches
  const top = scored.filter((p) => p.score > 0).slice(0, limit);
  if (top.length < limit) {
    const fill = scored.filter((p) => p.score === 0).slice(0, limit - top.length);
    return [...top, ...fill];
  }
  return top;
}
