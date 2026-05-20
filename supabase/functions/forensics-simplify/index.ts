import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const SYSTEM_PROMPT = `You are the AETHERIS Plain-Language Translator. You take a forensic report or research breakdown and rewrite it so ANYONE — a non-technical owner, a spouse, a new hire, a 9th grader — can understand it on first read.

RULES:
- Plain English. Reading level: 8th–9th grade.
- Short sentences. Short paragraphs (2–3 sentences max).
- Replace jargon with everyday words. Keep the meaning, lose the vocabulary tax.
  (e.g. "Conversion Drop-Off" → "people are leaving before they buy", "Follow-Up Failure" → "leads aren't being called back in time", "System Disconnect" → "your tools aren't talking to each other".)
- Use concrete examples and small analogies when it helps (a leaky bucket, a clogged pipe, a missed phone call).
- Keep every real number, dollar figure, and finding from the original. Do NOT invent new ones.
- Do NOT use marketing fluff, em dashes, emojis, or hype.
- Do NOT use the words: synergy, leverage, unlock, ecosystem, paradigm, optimize.

OUTPUT FORMAT (markdown):
# What this report actually says
A 2–3 sentence summary in plain English. What's broken, in normal words.

## What we found
- Bullet 1 (plain language, with the real number if there is one)
- Bullet 2
- Bullet 3
(3–6 bullets total.)

## Why it matters
1–2 short paragraphs. What this is costing the business in normal terms (money lost, customers lost, time wasted).

## What to do about it
A numbered list of 3–5 simple next steps anyone can understand.

## The bottom line
One sentence. Quotable. No jargon.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SERVICE);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const source: string = (body?.source || "").toString().trim();
    const toolLabel: string = (body?.toolLabel || "Forensic Report").toString();
    if (source.length < 40) {
      return new Response(JSON.stringify({ error: "source content is too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Source: ${toolLabel}\n\n==== ORIGINAL REPORT ====\n${source.slice(0, 12000)}\n=========================\n\nRewrite this in plain English so anyone can read and understand it. Output only the markdown.` },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${res.status}`);
    }

    const data = await res.json();
    const simplified = data?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ simplified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forensics-simplify error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
