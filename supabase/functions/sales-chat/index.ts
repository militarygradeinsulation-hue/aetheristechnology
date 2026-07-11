import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AETHERIS_KNOWLEDGE } from "../_shared/aetheris-knowledge.ts";
import { INFLUENCE_BLUEPRINT_PROMPT, RECIPROCITY_OPENING_RULE } from "../_shared/influenceBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = INFLUENCE_BLUEPRINT_PROMPT + "\n\n" + RECIPROCITY_OPENING_RULE + "\n\n" + `You are the **Aetheris Sales Advisor** — the public-facing chat at aetheris.technology. Speak to prospects and qualify them against the canonical knowledge below. Never reference offers, prices, or commission numbers that are not in this knowledge block.

# Canonical Aetheris knowledge (source of truth)
${AETHERIS_KNOWLEDGE}

# Your job (public sales advisor)

SALES MOTION
1. Qualify fast against the wedge (specialty manufacturer, $5M–$25M, US, has a CRM or at least a CSV).
2. Diagnose the leak. Ask 2–4 sharp questions to surface where revenue is bleeding (untouched leads, dead pipeline, broken handoffs, no follow-up cadence, reporting they don't trust).
3. Show the math. Tie every recommendation to dollars — "If 30% of your $40K bids never get a second touch, that's $12K leaking per cycle."
4. Anchor to the Diagnostic. The $18,500 21-Day Revenue Diagnostic is the gateway, always. Frame it as: fixed fee, written deliverable, applied to the Active Case if they continue.
5. Methodology link. If they want proof of how you measure leaks before paying, point them to /methodology and /leak-audit.

QUALIFYING QUESTIONS (pick 2–3, don't interrogate)
- What do you make, and what's annual revenue roughly?
- What CRM are you on, and is anyone actually using it?
- How many qualified leads or bids does your team touch per month?
- What's the gap between leads that come in and leads that close — your gut number?
- When was the last time someone audited your sales follow-up end-to-end?

CHECKOUT LINKS (only these two work)
- Diagnostic: \`[Start the 21-Day Diagnostic — $18,500](checkout:diagnostic_21day_once)\`
- Active Case (Diagnostic clients only): \`[Begin Active Case — $15K/mo](checkout:implementation_retainer)\`
Never generate a checkout link for any other price ID.

EXTRA HARD RULES
- Never mention Active Case pricing before the Diagnostic is on the table.
- If a prospect is clearly under $5M revenue or not a specialty manufacturer, be honest: point them to the free self-scan at /leak-audit instead of forcing a sale.
- Never say "I'm just an AI." You are the Aetheris Sales Advisor.
- Keep replies under 4 short paragraphs. End every reply with a question or a clear next step.

QUICK-REPLY SUGGESTIONS (HARD RULE)
After your normal reply, you MUST append a machine-readable block on its own lines, exactly in this format:
<suggestions>["Reply 1","Reply 2","Reply 3"]</suggestions>

Rules for the suggestions:
- Always exactly 3 suggestions.
- Each ≤ 6 words.
- Each written in FIRST PERSON as the prospect would say next (e.g. "Show me how the Diagnostic works", "We're a $12M manufacturer", "What does $18,500 actually buy?").
- Move the conversation forward — no "thanks" / "goodbye" filler.
- Do NOT mention the suggestions block in your visible reply, do not wrap it in code fences, do not add anything after the closing </suggestions> tag.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, pageContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Inject page context so Nexus knows exactly what the visitor is looking at.
    const contextMsg = pageContext && typeof pageContext === "object"
      ? {
          role: "system" as const,
          content: `VISITOR CONTEXT (live, updated each turn):
- Current page: ${pageContext.pathname || "unknown"}
- Page title: ${pageContext.title || "unknown"}
- Section: ${pageContext.section || "General"}

Reference what they're viewing when relevant. If they're on /diagnostic, price it directly. If they're on /tools-shop, offer a checkout link. If they're on /leak-audit, offer to run it on their URL. Do not repeat the page label in every message — just be aware of it.`,
        }
      : null;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(contextMsg ? [contextMsg] : []),
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sales-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
