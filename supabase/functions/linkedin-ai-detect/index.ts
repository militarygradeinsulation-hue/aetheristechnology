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

Output a probability (0-100), a verdict label, and 2-5 specific clues quoting or pointing at the exact patterns you saw. Be blunt and forensic.`;

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
      userContent.push({ type: "text", text: "Post screenshot to analyze:" });
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
            description: "Report AI-writing likelihood with specific clues.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", description: "0-100 probability that AI wrote this." },
                verdict: { type: "string", enum: ["HUMAN", "LIKELY_HUMAN", "MIXED", "LIKELY_AI", "AI"] },
                summary: { type: "string", description: "One blunt sentence forensic verdict." },
                clues: {
                  type: "array",
                  minItems: 1,
                  maxItems: 6,
                  items: {
                    type: "object",
                    properties: {
                      pattern: { type: "string", description: "Short label of the AI tell (e.g. 'Triadic parallelism', 'Em-dash overuse')." },
                      evidence: { type: "string", description: "Quote the exact phrase from the post that demonstrates the pattern, or describe what you saw." },
                    },
                    required: ["pattern", "evidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["score", "verdict", "summary", "clues"],
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
