// Admin Briefing Generator — PIN-gated. Generates a long-form internal
// briefing document on any topic Joseph requests. Returns markdown.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { AETHERIS_KNOWLEDGE } from "../_shared/aetheris-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const SYSTEM_PROMPT = `You are the Aetheris Operator Briefing Writer — an internal documentation engine for Joseph Toney (CEO of Aetheris AI / CTOguy.ai).

# What you produce
Long-form **internal briefing documents** in clean Markdown. These are NOT marketing copy. They are operator-grade documentation used to onboard reps, brief partners (Braden, COO), align contractors, or reference when iterating on the business.

# Voice & rules (HARD)
- Forensic operator tone. Blunt. Direct. No corporate fluff. No emojis.
- USD ONLY for any money value ($, never €/£/¥/EUR/GBP).
- Concrete, specific, opinionated. Real numbers from the business knowledge below — never invent stats you don't know.
- If asked about something outside Aetheris, treat it as a generic operator briefing on that topic (frame from Joseph's worldview).
- NEVER use the word "leaking" in crimson contexts; just write naturally.
- Forbidden phrases: "Magic Robot", "AI Systems Architect", testimonials carousels, social-proof popups.

# Format (always)
Return ONLY the markdown briefing — no preamble like "Here's your briefing". Use this skeleton, adapting headings to the topic:

# {Topic} — Operator Briefing
*One-line subtitle: what this doc answers.*

## TL;DR
3–5 tight bullets. The whole point in 30 seconds.

## Why this matters
2–3 short paragraphs of context.

## The breakdown
Subheadings as needed (### Section). Use bullets, numbered steps, and small tables (markdown pipe tables) where they help.

## What to do with this
A checklist or numbered action list. Concrete next moves.

## Open questions / risks
Bulleted list of unknowns or things to watch.

---
*Aetheris Operator Briefing · Internal use only*

# Business knowledge (use accurately, do not contradict)
- **Brand**: Aetheris AI. Domain aetheris.technology. Positioning: **Business Forensics Operator**. Hook: "Your business is leaking. You just can't see it from the inside."
- **Methodology**: The Leak Audit™ (7 steps). Free self-scan at /leak-audit.
- **Wedge market**: Specialty manufacturers, $5M–$25M revenue, US-based (Indianapolis SEO target).
- **Owner**: Joseph Toney (CEO). Braden Roberts (COO / partner, code 963169).
- **Public offers (only two)**:
  - 21-Day Revenue Diagnostic — $18,500 flat. Forensic dig into CRM, sales follow-up, lead flow. Written report + ROI projections + 60-min readout. Applied toward Retainer.
  - Implementation Retainer — $15,000/mo, 3-month minimum. Diagnostic clients only. Operator-led.
- **Catalog bundles** (legacy / on-ramp): Signal Pack $2,500, Revenue Pack $5,000, Operator Suite $10,000. All 10% rep payout.
- **Commission split (flagship FIXED-DOLLAR, locked)**:
  - $18,500 Diagnostic → Company $10,500 / Rep $5,000 / Partner $3,000.
  - $15,000 Retainer → Company $8,000 / Rep $4,000 / Partner $3,000 EVERY MONTH (12-month retention = $48K rep payout from one client).
  - Catalog tier split: T1 ≤ $59 = 50/30/20, T2 ≤ $349 = 60/25/15, T3 > $349 = 70/20/10.
  - Bonuses: volume (+$1k/$2.5k/$5k at 2/3/5 monthly sales), retention (+$1k/$2.5k/$5k at 3/6/12mo extension), referral ($500 onboard + $7k first-close + $500/sale override 12mo).
- **Channels**: Public site, /rep-portal (code-only), /admin (PIN 9822). Smart Subscriptions deliver monthly via Stripe invoice.paid.
- **Tone constraints**: Crimson reserved for "leak" signals only. Dark charcoal + amber palette. Fraunces serif for autopsy headlines, JetBrains Mono for case-file labels.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SERVICE_KEY);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const history: Array<{ role: "user" | "assistant"; content: string }> =
      Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const persist = body.persist !== false;

    if (!history.length && !topic) {
      return new Response(JSON.stringify({ error: "Provide a topic or messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 8000),
      })),
    ];
    if (topic) {
      chatMessages.push({
        role: "user",
        content: `Write a full internal briefing document on: ${topic}`,
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: chatMessages,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const text = await aiResp.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace billing." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const markdown: string = data?.choices?.[0]?.message?.content || "";

    // Best-effort title from first H1, fallback to topic.
    const h1 = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const title = (h1 || topic || "Operator Briefing").slice(0, 200);

    let savedId: string | null = null;
    if (persist && markdown) {
      try {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);
        const { data: row } = await sb
          .from("admin_library")
          .insert({
            tool_type: "briefing",
            title,
            input_data: { topic: topic || history[history.length - 1]?.content || "" },
            output_data: { markdown },
          })
          .select("id")
          .single();
        savedId = row?.id ?? null;
      } catch (e) {
        console.error("briefing save failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ markdown, title, saved_id: savedId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-generate-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
