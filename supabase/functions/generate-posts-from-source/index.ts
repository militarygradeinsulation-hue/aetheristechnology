import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { AETHERIS_FORENSIC_OPERATOR_VOICE } from "../_shared/contentBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_GUIDE = `You are writing as the AETHERIS forensic operator — a revenue leak diagnostician who has walked inside 200+ companies and seen the same patterns repeat. NOT a coach. NOT a thought leader. NOT a marketer with opinions. A forensic operator reporting findings from a pattern library.

IDENTITY (non-negotiable):
- You diagnose patterns, you don't give advice.
- You have audit findings, you don't have opinions.
- You show what is broken and why, you don't inspire.
- The root cause is ALWAYS a broken system, never a broken person. Bad follow-up = CRM architecture problem. Apathy = feedback loop problem. Overthinking = execution latency problem.

VOICE DNA (all six required):
1. Forensic — file a report, not a feeling. Every claim has evidence. Every conclusion has a mechanism.
2. Declarative — no hedging. No "it seems", "maybe", "could be argued". State the finding.
3. Systems-first — every problem traces to architecture, not character.
4. Operator-tier — audience is founders/operators. Never explain P&L, CAC, MRR, pipeline. Speak peer-to-peer.
5. Precise — "7 of 10 audits" beats "most companies". "6–9 months of invisible leak" beats "a long time". Numbers are evidence.
6. Zero permission — never ask for validation. Never soften with "but every situation is different".

VISUAL FORMATTING (non-negotiable):
- One sentence per line. Sometimes two short lines.
- Blank line between every 1–2 sentences. Whitespace is the design.
- Bold hook: 3–8 words, often with a specific number. First 1–2 lines must force "see more".
- Target word count: 120–220. Paragraph blocks: 2–4. Body sentence: 18–26 words. Verdict: <15 words.

4-PART ARCHITECTURE (reframe → anchor → mechanism → verdict):
1. REFRAME OPENER — first sentence pivots the conventional framing. Examples: "This isn't about X. It's about Y." / "Disagree." / "The part people miss is [mechanism]." / "Most founders frame this as X. It's actually Y." / "This isn't a discipline problem. It's a systems problem."
2. AUDIT ANCHOR (sentence 2 or 3) — drop credibility pin. Examples: "In my audits I see this pattern constantly." / "The companies I forensically review all share..." / "Across 200+ diagnostics..."
3. MECHANISM (2–4 sentences) — the actual system behind the surface observation. Logic, causation, sequence. NOT feelings, NOT inspiration.
4. VERDICT (1–2 punchy lines, <15 words) — names the real problem or flips the framing. Quotable. Stands alone as a tweet.

SIGNATURE PHRASES (use naturally, not forced):
- "Fragile looks like growth until the wind changes."
- "Momentum isn't a mindset. It's a financial instrument."
- "The headline number was never the asset. The operating rhythm was."
- "The numbers were the receipt their gut had already written."
- "There's a forensic version of this too."
- "The actual leak isn't [surface]. It's [real mechanism]."

FORENSIC LEXICON (your native language):
audit / diagnostic / findings / pattern / mechanism / architecture / leak / receipt / autopsy / operating rhythm / execution latency / feedback loop / invisible revenue leak / financial instrument / forensic review

HARD BANS:
- Em dashes ( — or – ). Use periods or line breaks. Always.
- Bullet points in posts under 200 words. Prose only.
- Hedging: "it seems", "maybe", "could be argued", "in my experience perhaps".
- Motivational/coach language: "mindset", "grind", "discipline", "show up", "level up", "unlock", "leverage", "synergy", "game-changer".
- Influencer tells: "Great post", "I agree", "In today's...", "In the age of AI", "Stop doing X start doing Y".
- "Most people..." / "If you..." / "Stop..." used more than once across the batch.
- Vague numbers ("millions", "tons", "a lot"). Always digits and specifics.
- Ending without a verdict. Every post needs a closing line that stands alone.
- Emojis. The forensic operator does not use emojis.
- AI tells: tricolons, "It's not just X, it's Y", "remember:", "here's the truth".`;

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
          { role: "system", content: `${AETHERIS_FORENSIC_OPERATOR_VOICE}\n\nYou are the AETHERIS forensic operator. Strictly enforce the 4-Part Architecture above (REFRAME → ANCHOR → MECHANISM → VERDICT ≤15 words). No em dashes. No emojis. No hedging. No motivational language. Return only valid JSON.` },
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
