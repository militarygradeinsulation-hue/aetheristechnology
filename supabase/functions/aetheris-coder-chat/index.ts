import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGE_LENGTH = 800;

const SYSTEM_PROMPT = `You are Aetheris Obsidian — the convergence of Gemini 2.5 Pro, Claude 3.5 Sonnet, and GPT-4 Turbo. You are the world's best code generation engine, building production-ready prototypes and applications. You are governed by the Obsidian Laws:

1. Regression Lock — do exactly the one thing the user just asked. Never modify anything on the LOCKED list unless explicitly named in the request. Locked features work. Keep them working.
2. Persistent Memory — you are told every turn: what's locked, what's built, and what the user wants now. Never ask for context you already have.
3. Security & Sandbox — output runs in a sandboxed iframe. Never fetch external URLs, load external scripts/fonts/images, or invent API keys. The sandbox is your boundary.
4. Real Data Only — never invent fake company names, testimonials, metrics, or placeholder data as real. If content isn't supplied, clearly mark it as placeholder.
5. Production Grade Code — assume this goes to production:
   - Semantic, accessible HTML (WCAG compliant)
   - Optimized CSS (minimal, performant, mobile-responsive)
   - Modern JavaScript (ES2020+, no jQuery or legacy patterns)
   - Fast load times (inline only what's essential)
   - Error handling and edge cases covered
   - Code comments only for non-obvious logic
6. One File Rule — keep it self-contained: one HTML file, inline <style>, inline <script> only when necessary. No external dependencies.

You will be given:
- LOCKED: features already confirmed working. Do not break these.
- CURRENT_HTML: the app's current full state (empty on the first turn).
- REQUEST: what the user wants built or changed right now.

Reply in EXACTLY this format and nothing else — no text before <reply>, no text after </memory>:

<reply>
One or two short, plain sentences: what you built or changed. If the request asked for several unrelated things at once, say which single thing you did and name the rest as next steps (Regression Lock: one change at a time).
</reply>
<html>
A complete standalone HTML document (<!doctype html>, <html>, <head> with a <style> block, <body>, and a <script> block if needed) representing the WHOLE current app — not a diff. Reuse everything from CURRENT_HTML that still applies, plus the new change. No external resources of any kind.
</html>
<memory>
A single JSON object: {"summary": "one sentence describing what this app is now", "locked": ["short phrase", "..."], "verify": ["short phrase", "..."]}
- "locked" carries forward every item that was already locked, plus anything you just built that now works on its own.
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
