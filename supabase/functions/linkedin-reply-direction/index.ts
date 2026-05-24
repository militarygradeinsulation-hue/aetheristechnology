import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const PRESETS = [
  { key: "agree_deeper", label: "Agree, go deeper", value: "Agree with the post's core point, then go one layer deeper — add the forensic angle they missed (the actual mechanism, the dollar leak, the system failure behind it)." },
  { key: "put_in_place", label: "Put them in their place", value: "Respectfully dismantle the post. Call out where the logic breaks, what they're missing, and what an operator would actually do. No insults — just sharper truth." },
  { key: "more_human", label: "Sound more human", value: "Drop the polish. Write like a real operator texting a peer — contractions, short sentences, plain words, zero LinkedIn-guru voice." },
  { key: "hard_stat", label: "Add a hard stat", value: "Anchor the reply with one concrete number or dollar figure that makes the leak undeniable." },
  { key: "sharper_question", label: "Ask a sharper question", value: "End with one disarming question that forces the OP (or readers) to confront the leak they're ignoring." },
  { key: "reframe", label: "Reframe the problem", value: "Reframe the issue the post is describing — show it's actually a symptom of a deeper operational leak, not the root cause." },
  { key: "real_example", label: "Cite a real example", value: "Ground the reply in a concrete Aetheris-style operator example — what we saw, what we fixed, what it was costing them." },
  { key: "cut_fluff", label: "Cut the fluff", value: "Strip all hedging, qualifiers, and corporate speak. Make every sentence load-bearing." },
];

const SYSTEM = `You are a forensic LinkedIn reply strategist for Aetheris (Business Forensics Operator brand).
Read the post and decide:
1. Stance: should we AGREE_DEEPER, PARTIALLY_AGREE, or DISAGREE/dismantle it?
2. Pick 2-3 preset directions (by key) from this list that best shape the reply:
${PRESETS.map(p => `- ${p.key}: ${p.label}`).join("\n")}

Rules:
- If the post is weak, generic guru fluff, or factually wrong → lean "put_in_place" + "cut_fluff" or "sharper_question".
- If the post is directionally right but shallow → "agree_deeper" + "real_example" or "hard_stat".
- Always include either "hard_stat" OR "real_example" OR "sharper_question" to make the reply land.
- "more_human" is a good add when the post sounds corporate.
- Never pick more than 3 presets.
- Stance must match the picks (don't pick "put_in_place" with stance AGREE_DEEPER).`;

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
    if (postText) userContent.push({ type: "text", text: `LinkedIn post to analyze:\n\n${postText}` });
    if (imageDataUrl) {
      userContent.push({ type: "text", text: "LinkedIn post (screenshot):" });
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
            name: "choose_direction",
            description: "Pick the stance and 2-3 preset direction keys for the reply.",
            parameters: {
              type: "object",
              properties: {
                stance: { type: "string", enum: ["AGREE_DEEPER", "PARTIALLY_AGREE", "DISAGREE"] },
                rationale: { type: "string", description: "1-2 sentences on why this stance, in Aetheris forensic voice." },
                preset_keys: {
                  type: "array",
                  items: { type: "string", enum: PRESETS.map(p => p.key) },
                  minItems: 1,
                  maxItems: 3,
                },
              },
              required: ["stance", "rationale", "preset_keys"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "choose_direction" } },
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
    const picks = (args.preset_keys || [])
      .map((k: string) => PRESETS.find(p => p.key === k))
      .filter(Boolean);

    const stanceLabel =
      args.stance === "AGREE_DEEPER" ? "Stance: AGREE and go deeper."
      : args.stance === "DISAGREE" ? "Stance: DISAGREE — respectfully dismantle."
      : "Stance: PARTIALLY AGREE — concede the obvious, then redirect.";

    const combined = [
      stanceLabel,
      args.rationale ? `Why: ${args.rationale}` : "",
      ...picks.map((p: any) => p.value),
    ].filter(Boolean).join("\n\n");

    return new Response(JSON.stringify({
      stance: args.stance,
      rationale: args.rationale,
      preset_keys: args.preset_keys,
      preset_labels: picks.map((p: any) => p.label),
      extraContext: combined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("linkedin-reply-direction error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
