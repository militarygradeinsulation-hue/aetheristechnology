// Re-expand existing blog posts whose content is shorter than a threshold.
// Preserves slug, title, tags, meta. Replaces only `content` (markdown).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a senior content strategist for Aetheris — a Business Forensics firm led by Joseph Toney.
Voice: blunt, forensic, operator-not-consultant. Aggressive language: "revenue hemorrhage", "operational autopsy", "pipeline leakage", "margin drain". Short paragraphs. Specific dollar amounts.

You are EXPANDING an existing short blog post into a full-length forensic article (2,800–3,200 words). Preserve the existing title, slug, hook, and core argument — but rebuild it with full depth, examples, and structure.

Required structure:
1. Brutal opening hook (don't start with "In today's...").
2. ## TL;DR (Quick Answer) — markdown blockquote (>) with the one-paragraph answer.
3. ## The Inventory — what's broken, with at least one markdown table of failed vs. successful approaches and concrete numbers.
4. ## The Autopsy — deep operational analysis (500+ words), at least one more data table.
5. ## The Math — explicit dollar/percent breakdown of the leak.
6. ## The Fix — numbered implementation roadmap with timeframes and expected outcomes.
7. ## FAQ — exactly 5 Q&A pairs in the format:
   ### Q: [question]?
   A: [2–4 sentences]
8. ## The Aetheris Approach — Forensic Diagnostic ($2,500, applied toward engagement) and The Leak Audit™ as the next step. One single CTA, no alternatives.
9. One-line punch closing.

Rules:
- 2,800 words minimum.
- Short paragraphs (2–4 sentences).
- Numbers in digits, currency explicit, time frames specific.
- No emojis in body copy. Tables may use 📊 ✅ ⚠️ sparingly.
- Internal links to https://aetheris.technology/leak-audit and https://aetheris.technology/contact where natural.
- Return ONLY raw markdown. No JSON, no code fences, no preface.`;

async function expandPost(post: { title: string; slug: string; content: string; meta_description: string | null; excerpt: string | null }, apiKey: string): Promise<string> {
  const userPrompt = `Expand this short blog post into a full forensic article.

TITLE: ${post.title}
SLUG: ${post.slug}
META DESCRIPTION: ${post.meta_description || "(none)"}
EXCERPT / HOOK: ${post.excerpt || "(none)"}

EXISTING SHORT CONTENT (preserve thesis, expand everything):
---
${post.content}
---

Return ONLY the full markdown article (2,800+ words) with the structure specified.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 16000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI gateway ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") throw new Error("AI returned empty content");

  let content = raw.trim();
  const fence = content.match(/^```(?:markdown|md)?\s*([\s\S]*?)```\s*$/i);
  if (fence) content = fence[1].trim();
  if (content.length < 6000) throw new Error(`Expanded content too short (${content.length} chars)`);
  return content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY missing");

    let body: { threshold?: number; limit?: number; ids?: string[] } = {};
    try { body = await req.json(); } catch {}
    const threshold = Number.isFinite(body.threshold) ? Math.max(2000, body.threshold!) : 6000;
    const limit = Number.isFinite(body.limit) ? Math.min(20, Math.max(1, body.limit!)) : 10;

    let query = supabase
      .from("blog_posts")
      .select("id, title, slug, content, meta_description, excerpt")
      .eq("is_published", true);

    if (body.ids && body.ids.length) {
      query = query.in("id", body.ids);
    } else {
      query = query.lte("content", "x".repeat(threshold)); // placeholder — filter below client-side
    }

    const { data: posts, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const candidates = (posts || []).filter(p =>
      body.ids && body.ids.length
        ? true
        : (p.content?.length ?? 0) < threshold
    ).slice(0, limit);

    console.log(`[expand-short-blogs] ${candidates.length} candidates (threshold=${threshold}, limit=${limit})`);

    const results: Array<{ id: string; slug: string; before: number; after?: number; error?: string }> = [];
    for (const post of candidates) {
      try {
        const expanded = await expandPost(post as any, lovableApiKey);
        const { error: updErr } = await supabase
          .from("blog_posts")
          .update({ content: expanded, updated_at: new Date().toISOString() })
          .eq("id", post.id);
        if (updErr) throw updErr;
        results.push({ id: post.id, slug: post.slug, before: post.content?.length ?? 0, after: expanded.length });
        console.log(`✓ Expanded ${post.slug}: ${post.content?.length} → ${expanded.length}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ id: post.id, slug: post.slug, before: post.content?.length ?? 0, error: msg });
        console.error(`✗ Failed ${post.slug}: ${msg}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      threshold,
      processed: results.length,
      expanded: results.filter(r => r.after).length,
      failed: results.filter(r => r.error).length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[expand-short-blogs] fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
