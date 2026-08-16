import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { METHODOLOGY_DOC } from "../_shared/methodology-doc.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Msg = { role: "user" | "assistant"; content: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "No messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instructions = `You are the Aetheris Methodology guide, a forensic operator assistant embedded next to the Aetheris Methodology document ("How the Golden Report Becomes a System for Fixing the Company").

Answer ONLY from the document below. If something is not covered, say so plainly and point the reader to booking a call with the operator at https://businessforensics.tech/book (same site as https://aetheris.technology/book).

STYLE: blunt, operator tone, no fluff, no corporate filler, no em dashes. Short paragraphs or tight bullets. Quote exact tier names and dollar figures when relevant.

CURRENCY RULE: every money value renders in US Dollars with a leading $ (for example $23,500). Never use other currency symbols or codes.

=== AETHERIS METHODOLOGY DOCUMENT ===
${METHODOLOGY_DOC}
=== END DOCUMENT ===`;

    const input = messages.map((m) => ({
      role: m.role,
      content: [
        {
          type: m.role === "assistant" ? "output_text" : "input_text",
          text: String(m.content || "").slice(0, 4000),
        },
      ],
    }));

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        instructions,
        input,
        stream: true,
        store: false,
      }),
    });

    if (!res.ok) {
      const status = res.status;
      const text = await res.text();
      console.error("methodology-chat gateway error", status, text);
      const msg =
        status === 429
          ? "Rate limited. Try again shortly."
          : status === 402
            ? "AI credits exhausted."
            : "AI gateway error";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(res.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("methodology-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
