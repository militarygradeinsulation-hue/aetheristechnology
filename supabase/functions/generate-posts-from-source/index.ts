import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_GUIDE = `You write LinkedIn posts in the dominant 2026 short-line / one-sentence-per-line style. Mobile-first. Massive whitespace. Diagnostic operator voice (never influencer/copy-bro).

VOICE: Lead with a correction, contradiction, or hidden truth. Name the real mechanism. Translate it into business language. Show the consequence. End with a sharp memorable line or one direct question.

VISUAL FORMATTING (non-negotiable):
- One sentence per line. Sometimes two short lines.
- Blank line between every 1–2 sentences. Whitespace is the design.
- Bold hook: 3–8 words, often with a specific number. First 1–2 lines must force "see more".
- Emoji bullets sparingly: 👉 ✅ 1️⃣ 💡 ↳ 🔴 🟡 🟢 (pick ONE marker per post).
- 2–3 emojis max, never decorative. Numbers in digits. Currency explicit.

2-1-3 STRUCTURE:
1. Bold hook (3–8 words)
2. Short context (1–2 lines)
3. [whitespace]
4. Story / evidence (3–5 single-sentence lines)
5. [whitespace]
6. Hard truth (1–2 lines)
7. [whitespace]
8. Single-line CTA or question

HARD BANS:
- Em dashes ( — ). Use periods or line breaks.
- Walls of text. Dense paragraphs.
- "Great post", "I agree", "In today's…", "In the age of AI", "game-changer", "leverage", "unlock", "synergy".
- AI tells. Vague numbers like "millions".
- "Most people…", "If you…", "Stop…" used more than once across the batch.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sourceType, sourceId, ideaPrompt, count = 3 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let sourceMaterial = "";
    let sourceLabel = "";

    if (sourceType === "blog" && sourceId) {
      const { data } = await supabase
        .from("blog_posts")
        .select("title, excerpt, content, tags")
        .eq("id", sourceId)
        .maybeSingle();
      if (!data) throw new Error("Blog not found");
      sourceLabel = `BLOG: ${data.title}`;
      sourceMaterial = `TITLE: ${data.title}\nEXCERPT: ${data.excerpt || ""}\nTAGS: ${(data.tags || []).join(", ")}\n\nCONTENT:\n${(data.content || "").slice(0, 8000)}`;
    } else if (sourceType === "playbook" && sourceId) {
      const { data } = await supabase
        .from("playbooks")
        .select("title, subtitle, description, tags")
        .eq("id", sourceId)
        .maybeSingle();
      if (!data) throw new Error("Playbook not found");
      sourceLabel = `PLAYBOOK: ${data.title}`;
      sourceMaterial = `TITLE: ${data.title}\nSUBTITLE: ${data.subtitle || ""}\nDESCRIPTION: ${data.description || ""}\nTAGS: ${(data.tags || []).join(", ")}`;
    } else if (sourceType === "idea" && ideaPrompt) {
      sourceLabel = `IDEA: ${String(ideaPrompt).slice(0, 80)}`;
      sourceMaterial = `IDEA / NOTES FROM OPERATOR:\n${ideaPrompt}`;
    } else {
      throw new Error("Provide sourceType + sourceId, or sourceType='idea' with ideaPrompt");
    }

    const n = Math.max(1, Math.min(10, Number(count) || 3));

    const prompt = `${STYLE_GUIDE}

═══════════════════════════════════════════════════════════
SOURCE MATERIAL
═══════════════════════════════════════════════════════════
${sourceMaterial}

═══════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════
Generate ${n} distinct LinkedIn posts derived from the source above.
Each post must take a DIFFERENT angle (don't restate the same point ${n} times).
Pull specific facts, numbers, or quotes from the source where possible.
Each post is standalone — do not reference "the blog" or "the playbook".

OUTPUT JSON:
{
  "posts": [
    {
      "angle": "1-line description of the angle this post takes",
      "hook": "the bold opening line (3–8 words)",
      "caption": "FULL post body in short-line format. Use \\n for line breaks, \\n\\n for whitespace gaps. 80–180 words. Follow 2-1-3 structure.",
      "hashtags": ["3-5 specific lowercase tags"]
    }
  ]
}

Return ONLY the JSON. No markdown fences. No commentary.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You write LinkedIn posts in 2026 short-line style. Diagnostic operator voice. No em dashes. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI request failed");
    }

    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in AI response");
    raw = raw.substring(start, end + 1);
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      result = JSON.parse(raw.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
    }

    if (Array.isArray(result?.posts)) {
      result.posts = result.posts.map((p: any) => ({
        ...p,
        hook: typeof p.hook === "string" ? p.hook.replace(/[—–]/g, ".") : p.hook,
        caption: typeof p.caption === "string" ? p.caption.replace(/[—–]/g, ".") : p.caption,
      }));
    }
    result.sourceLabel = sourceLabel;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-posts-from-source error:", error);
    const message = error instanceof Error ? error.message : "Failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
