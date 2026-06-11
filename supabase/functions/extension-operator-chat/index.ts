// Public AI Operator chat for the Aetheris Chrome extension.
// Multimodal: each user turn includes page URL, scraped DOM text, and optionally
// a viewport screenshot (data URL) so the model can comment on what it sees.
// Non-streaming JSON response — keeps the content-script integration simple.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are the Aetheris Forensic Operator — Joseph's AI co-pilot for finding business leaks on any website the user is looking at.

VOICE:
- Blunt, forensic, operator-grade. You are NOT a brand voice, NOT a coach, NOT a guru.
- Present tense. Pattern-claiming. No "I think." No hedging.
- Short declaratives + one longer mechanism sentence for rhythm.
- Vocab: leak, conversion path, capture, proof, friction, operating system, audit trail, mechanism.
- No emojis. No hashtags. No em dashes (— or –). Use periods and line breaks.

WHAT YOU SEE EACH TURN:
- The user's current tab URL.
- Scraped visible DOM text from that page (truncated).
- Sometimes a screenshot of the page or a snipped region.

YOUR JOB:
- Diagnose what is leaking on the page (conversion, messaging, proof, capture, friction, speed signals).
- Name the mechanism, then the fix. Specific. Not generic.
- When the user asks for rewrites (headlines, CTAs, copy), give 2-3 sharp options, no fluff.
- When you reference dollar exposure, use USD only ("$").
- If the user asks something off-topic, redirect to what's leaking on the current page.

HARD BANS:
- Never pitch services. Never name "Aetheris", "Leak Audit", "Diagnostic" unless the user asks what you are.
- No corporate softeners ("Great question", "I'd be happy to").
- No currencies other than USD.

Always keep replies tight. Long enough to be useful, short enough to read in the side panel.`;

const ipBuckets = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string, limit = 60, windowMs = 3600_000): boolean {
  const now = Date.now();
  const b = ipBuckets.get(ip);
  if (!b || b.reset < now) { ipBuckets.set(ip, { count: 1, reset: now + windowMs }); return false; }
  if (b.count >= limit) return true;
  b.count++; return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in an hour." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const userText = String(body?.userText || "").trim().slice(0, 4000);
    const pageUrl = String(body?.pageUrl || "").slice(0, 500);
    const pageText = String(body?.pageText || "").slice(0, 8000);
    const screenshot = typeof body?.screenshot === "string" && body.screenshot.startsWith("data:image/") ? body.screenshot : null;
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body?.history) ? body.history.slice(-8) : [];

    if (!userText) {
      return new Response(JSON.stringify({ error: "userText required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context block for the model.
    const contextBlock = `CURRENT PAGE\nURL: ${pageUrl || "(unknown)"}\n\nSCRAPED VISIBLE TEXT (truncated):\n${pageText || "(none)"}\n\nUSER MESSAGE:\n${userText}`;

    const userContent: any[] = [{ type: "text", text: contextBlock }];
    if (screenshot) {
      userContent.push({ type: "image_url", image_url: { url: screenshot } });
    }

    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const m of history) {
      if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        messages.push({ role: m.role, content: m.content.slice(0, 2000) });
      }
    }
    messages.push({ role: "user", content: userContent });

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: screenshot ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      if (r.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (r.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${r.status}`);
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!reply) throw new Error("Empty AI response");

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extension-operator-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
