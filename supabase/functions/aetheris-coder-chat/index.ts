import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGE_LENGTH = 800;

const SYSTEM_PROMPT = `You are Aetheris Obsidian — the convergence of Gemini 2.5 Pro, Claude, and GPT-4 working in perfect sync. You build production-ready prototypes, not toys. You are governed by the Obsidian Laws:

1. Regression Lock — do exactly the one thing the user just asked. Never touch or modify anything on the LOCKED list unless the request names it directly. Locked features work. Keep them working.
2. Persistent Memory — you are told every turn: what's locked, what's built, and what the user wants now. Never ask for context you already have. Never repeat instructions.
3. Security & Sandbox — the output runs in a sandboxed iframe with no network access. Never fetch external URLs, load external resources, or invent API keys. The sandbox is your wall.
4. Real Only — never invent fake company names, testimonials, metrics, or placeholder data as if real. If the user hasn't supplied content, clearly mark it as placeholder and wait.
5. Maintainable Output — keep HTML small, readable, self-contained: one file, inline <style>, inline <script> only when necessary. Optimize for human review.
6. Production Grade — assume the user will take this to production. Build it right: proper structure, semantic HTML, accessible interactions, mobile-responsive, fast load times.

You will be given:
- LOCKED: confirmed working features. Do not break these.
- CURRENT_HTML: the app's full current state (empty on first turn).
- REQUEST: what the user wants built or changed right now.

Reply in EXACTLY this format and nothing else — no text before <reply>, no text after </memory>:

<reply>
One or two short, plain sentences: what you built or changed. If the request asked for multiple unrelated things, say which single thing you did and name the rest as next steps (Regression Lock: one change at a time).
</reply>
<html>
A complete standalone HTML document (<!doctype html>, <html>, <head> with <style>, <body>, and <script> if needed) representing the WHOLE current app — not a diff. Reuse everything from CURRENT_HTML that still applies, plus the new change. No external resources of any kind. Production grade.
</html>
<memory>
A single JSON object: {"summary": "one sentence describing the app's purpose and current state", "locked": ["short phrase", "..."], "verify": ["short phrase", "..."]}
- "locked" carries forward every item already locked, plus anything you just built that now works on its own.
- "verify" lists 2-3 short things worth checking still work after this change.
</memory>`;

function extractTag(raw: string, tag: string): string | null {
  const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, currentHtml, locked } = await req.json();

    if (typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Keep it under ${MAX_MESSAGE_LENGTH} characters.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lockedList: string[] = Array.isArray(locked) ? locked.filter((x) => typeof x === "string") : [];
    const html: string = typeof currentHtml === "string" ? currentHtml : "";

    const userContent =
      `LOCKED (already working — do not break unless named):\n${JSON.stringify(lockedList)}\n\n` +
      `CURRENT_HTML:\n${html.trim() ? html : "(empty — nothing built yet)"}\n\n` +
      `REQUEST:\n${message.trim()}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        stream: false,
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

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";

    const reply = extractTag(raw, "reply") ?? raw.trim();
    const nextHtml = extractTag(raw, "html") ?? html;

    let memory = { summary: "", locked: lockedList, verify: [] as string[] };
    const memoryRaw = extractTag(raw, "memory");
    if (memoryRaw) {
      try {
        const parsed = JSON.parse(memoryRaw);
        memory = {
          summary: typeof parsed.summary === "string" ? parsed.summary : memory.summary,
          locked: Array.isArray(parsed.locked) ? parsed.locked.filter((x: unknown) => typeof x === "string") : lockedList,
          verify: Array.isArray(parsed.verify) ? parsed.verify.filter((x: unknown) => typeof x === "string") : [],
        };
      } catch (e) {
        console.error("memory parse error:", e);
      }
    }

    return new Response(JSON.stringify({ reply, html: nextHtml, memory }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aetheris-coder-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
