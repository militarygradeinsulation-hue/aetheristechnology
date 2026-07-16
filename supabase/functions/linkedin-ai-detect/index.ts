import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const SYSTEM = `You are a forensic AI-writing detector. You receive 1-5 SAMPLES (text and/or screenshots). For each sample, decide how likely it was written by AI (ChatGPT/Claude/Gemini) vs a human.

AI tells: triadic/parallel structure ("Not X. Not Y. But Z."), em-dash overuse, hollow contrast openers ("It's not about X — it's about Y"), generic abstract nouns (clarity, alignment, journey, mindset, ecosystem), LinkedIn-guru cadence (one-line paragraphs, hook-promise-list-CTA), zero specific names/numbers/dates, perfectly balanced clauses, "Here's the thing", "Let that sink in", "The truth is", em-dash + colon combos, no typos, smart quotes, repetitive openers, low burstiness.

Human tells (LOWER score): typos, weird capitalization, half-finished thoughts, specific names/dollars/dates/internal jargon, rant energy, run-on sentences, asides in parens, idiosyncratic voice ticks.

For EVERY clue you MUST: (1) quote the EXACT verbatim phrase from that sample so the UI can highlight it, (2) explain WHY it's an AI tell, (3) cite a NAMED source/study/tool/principle (e.g. "GPTZero burstiness metric", "Gehrmann et al. GLTR 2019", "Originality.ai em-dash frequency report 2024", "Stanford CRFM 2023").

ALSO produce a COMPARISON across all samples: (a) overall verdict, (b) same author across all samples? (yes/no/mixed) with reasoning based on voice consistency, vocabulary, cadence, idiom overlap, (c) cross-sample patterns (which AI tells repeat across multiple samples = stronger AI signal), (d) outlier sample if any.

Be blunt and forensic.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    // Normalize input: accept new `samples` array OR legacy single postText/imageDataUrl
    let samples: { text?: string; imageDataUrl?: string }[] = Array.isArray(body.samples) ? body.samples : [];
    if (!samples.length && (body.postText || body.imageDataUrl)) {
      samples = [{ text: body.postText, imageDataUrl: body.imageDataUrl }];
    }
    samples = samples
      .filter((s) => (s.text && s.text.trim()) || s.imageDataUrl)
      .slice(0, 5);

    if (!samples.length) {
      return new Response(JSON.stringify({ error: "Provide at least one sample (text or image)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userContent: any[] = [];
    userContent.push({ type: "text", text: `You are receiving ${samples.length} sample(s). Analyze each one and the relationship between them.` });
    samples.forEach((s, i) => {
      const label = `\n\n===== SAMPLE ${i + 1} =====`;
      if (s.text) userContent.push({ type: "text", text: `${label}\n${s.text}` });
      if (s.imageDataUrl) {
        userContent.push({ type: "text", text: `${label}\n[screenshot — transcribe the visible text first, then analyze]` });
        userContent.push({ type: "image_url", image_url: { url: s.imageDataUrl } });
      }
    });

    const clueProps = {
      pattern: { type: "string" },
      highlight: { type: "string" },
      fact: { type: "string" },
      source: { type: "string" },
      confidence: { type: "number" },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM + `\n\nVerdict values MUST be one of: HUMAN, LIKELY_HUMAN, MIXED, LIKELY_AI, AI.\nsame_author MUST be one of: yes, no, mixed, unknown.\nEach sample needs 2-6 clues. Highlight must be a verbatim phrase from that sample.` },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_multi_detection",
            description: "Per-sample AI-writing detection plus cross-sample comparison.",
            parameters: {
              type: "object",
              properties: {
                samples: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number" },
                      score: { type: "number" },
                      verdict: { type: "string" },
                      summary: { type: "string" },
                      transcript: { type: "string" },
                      clues: {
                        type: "array",
                        items: { type: "object", properties: clueProps, required: ["pattern", "highlight", "fact", "source", "confidence"] },
                      },
                    },
                    required: ["index", "score", "verdict", "summary", "transcript", "clues"],
                  },
                },
                comparison: {
                  type: "object",
                  properties: {
                    overall_score: { type: "number" },
                    overall_verdict: { type: "string" },
                    same_author: { type: "string" },
                    same_author_reasoning: { type: "string" },
                    repeated_patterns: { type: "array", items: { type: "string" } },
                    outlier_index: { type: "number" },
                    bottom_line: { type: "string" },
                  },
                  required: ["overall_score", "overall_verdict", "same_author", "same_author_reasoning", "repeated_patterns", "outlier_index", "bottom_line"],
                },
              },
              required: ["samples", "comparison"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_multi_detection" } },
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

    // Back-compat: also expose top-level score/verdict/summary/clues/transcript from sample 1
    const first = args.samples?.[0];
    const payload = {
      ...args,
      score: args.comparison?.overall_score ?? first?.score,
      verdict: args.comparison?.overall_verdict ?? first?.verdict,
      summary: args.comparison?.bottom_line ?? first?.summary,
      transcript: first?.transcript,
      clues: first?.clues || [],
    };

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("linkedin-ai-detect error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
