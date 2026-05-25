import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const SYSTEM = `You are a forensic AI-writing detector. Given a LinkedIn post (text or screenshot), decide how likely it was written by an AI (ChatGPT/Claude/Gemini) vs a real human.

Look for AI tells:
- Triadic/parallel structures ("Not X. Not Y. But Z.")
- Em-dash overuse and perfectly balanced clauses
- Hollow contrast openers ("It's not about X — it's about Y.")
- Generic abstract nouns (clarity, alignment, journey, mindset, ecosystem)
- LinkedIn-guru cadence: one-line paragraphs, hook-promise-list-CTA
- Zero specific names, numbers, dates, or first-person friction
- Tidy bullet lists with parallel grammar
- "Here's the thing" / "Let that sink in" / "The truth is" filler
- Em-dash + colon combos, perfect punctuation, no typos
- Repetitive sentence openers ("And...", "But...")
- Smart quotes, perfectly formatted hashtags
- Conclusions that summarize without adding anything

Human tells (lower the score):
- Typos, weird capitalization, half-finished thoughts
- Specific names, dollar amounts, dates, internal jargon
- Rant energy, run-on sentences, asides in parens
- Idiosyncratic voice ticks

For EVERY clue you find, you MUST:
1. Quote the EXACT phrase/word(s) from the post (verbatim, so we can highlight it)
2. Explain WHY that pattern is an AI tell (the fact/reason)
3. Cite a SOURCE backing up that pattern (a study, article, linguistic principle, tool report, or named research — e.g. "Stanford CRFM 2023 GPT detection study", "OpenAI watermark paper 2022", "Inside Higher Ed analysis of ChatGPT cadence", "GPTZero perplexity/burstiness metric", "Originality.ai em-dash frequency report"). If no exact citation exists, name the principle (e.g. "Low burstiness — Gehrmann et al. GLTR 2019").

Output a probability (0-100), a verdict label, a one-sentence summary, and 3-6 highlighted clues. Be blunt and forensic.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { postText, imageDataUrl } = await req.json();
    if (!postText && !imageDataUrl) {
      return new Response(JSON.stringify({ error: "Provide postText or imageDataUrl" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userContent: any[] = [];
    if (postText) userContent.push({ type: "text", text: `Post to analyze:\n\n${postText}` });
    if (imageDataUrl) {
      userContent.push({ type: "text", text: "Post screenshot to analyze. First transcribe the visible text, then analyze." });
      userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_detection",
            description: "Report AI-writing likelihood with highlighted clues, facts, and sources.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", description: "0-100 probability that AI wrote this." },
                verdict: { type: "string", enum: ["HUMAN", "LIKELY_HUMAN", "MIXED", "LIKELY_AI", "AI"] },
                summary: { type: "string", description: "One blunt sentence forensic verdict." },
                transcript: { type: "string", description: "If image input, the verbatim transcribed text. If text input, echo it back exactly. Used for highlighting." },
                clues: {
                  type: "array",
                  minItems: 3,
                  maxItems: 6,
                  items: {
                    type: "object",
                    properties: {
                      pattern: { type: "string", description: "Short label of the AI tell (e.g. 'Triadic parallelism', 'Em-dash overuse')." },
                      highlight: { type: "string", description: "EXACT verbatim phrase or word from the post that demonstrates this tell. Must appear character-for-character in the transcript so the UI can highlight it." },
                      fact: { type: "string", description: "Why this is an AI tell — the underlying linguistic/statistical fact." },
                      source: { type: "string", description: "Named study, paper, tool, or principle that documents this pattern (e.g. 'GPTZero burstiness metric', 'Gehrmann et al., GLTR 2019', 'Originality.ai em-dash frequency study 2024')." },
                      confidence: { type: "number", description: "0-100 how confident this specific clue indicates AI." },
                    },
                    required: ["pattern", "highlight", "fact", "source", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["score", "verdict", "summary", "transcript", "clues"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_detection" } },
      }),
    });

    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) {
      const t = await res.text();
      console.error("gateway error", res.status, t);
      throw new Error(`AI gateway error ${res.status}`);
    }

    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No tool call returned");
    const args = JSON.parse(call.function.arguments || "{}");

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("linkedin-ai-detect error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
