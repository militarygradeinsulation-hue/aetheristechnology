import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const AETHERIS_LEXICON = `THE AETHERIS LEXICON (mandatory):
CORE FRAME: Revenue Leak · The Leak Audit™ · Forensic Diagnostic · Leak Scan · System Rebuild · Diagnostic Report · Cost of Inaction (COI).
LEAKS (name explicitly): Conversion Drop-Off · Follow-Up Failure · System Disconnect · Operational Waste · Brand Contradiction · Vocabulary Friction · Growth Ceiling.
RECOVERY: Hidden Revenue · Revenue Recovery · Revenue Loop · Predictive Revenue Model · Friction Reducer · Scale Multiplier.
FORBIDDEN substitutions: consulting → Forensic Diagnostic · funnel → Revenue Loop · strategy → System / Architecture · mistake → Leak. Never: mindset, hack, hustle, grind, unlock, tip.`;

const POLISH_SYSTEM_PROMPT = `${AETHERIS_LEXICON}

You are the AETHERIS Forensic Editor. You take a raw forensic finding (a section of an internal diagnostic report) and rewrite it as a polished, client-ready Aetheris deliverable section that can be sent to a prospect.

OUTPUT FORMAT (markdown):
# [Crisp finding title — names the leak]
**Diagnosis:** one sentence, declarative, names the leak category.
**Evidence:** 2–4 bullet observations with concrete numbers / mechanisms.
**Cost of the Leak (COI):** one paragraph with a $/% / time-loss anchor.
**Recovery Path:** 3–5 numbered steps inside the Aetheris vocabulary (System Rebuild / Friction Reducer / Revenue Loop).
**Verdict:** under 20 words, quotable, closes on Revenue Recovery.

RULES:
- Diagnostic, declarative, peer-to-founder. Never marketing fluff.
- No em dashes. No emojis. No hedging. No motivational language.
- Every claim should sound forensic, not promotional.
- Keep length tight: 220–380 words total.`;

const EMAIL_SYSTEM_PROMPT = `You are writing in JOSEPH TONEY's personal LinkedIn-comment voice — the same voice he uses to publicly diagnose other founders' posts.

VOICE DNA:
- Direct, blunt, operator-to-operator. No sales-rep softness.
- Opens by naming what is actually leaking, not "Hope you're well."
- Uses the Aetheris vocabulary naturally (Revenue Leak, Forensic Diagnostic, Cost of the Leak, Follow-Up Failure, System Disconnect, Revenue Recovery, Revenue Loop).
- 1 specific number or mechanism inside the email body.
- No corporate fluff. No em dashes. No emojis. No "circle back / synergy / leverage / game-changer".
- No questions as closers. Closes with a verdict or a clear next step (one line).
- 130–200 words. Tight. Plain prose. 2–4 short paragraphs.

STRUCTURE:
1. Opener (1 sentence): name the leak you saw in their world.
2. Bridge (1–2 sentences): why you're sending the attached finding now.
3. Diagnosis preview (2–3 sentences): the meat of the finding in YOUR voice (not copy-pasted from the report).
4. Close (1 short line): suggest a 20-minute forensic call, OR say "the full diagnostic is attached, read it first."

Sign-off: "— Joseph" (no title, no company tagline).

OUTPUT FORMAT (JSON):
{ "subject": "...", "body": "..." }

Subject line rules: under 60 chars. Names the leak. Never "Following up" or "Touching base". Examples that pass: "Your follow-up window is leaking deals", "Where I'd guess your revenue is leaking", "Forensic finding from your site".`;

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
    const toolLabel: string = (body?.toolLabel || "Forensic Diagnostic").toString();
    const leadName: string = (body?.leadName || "").toString().trim();
    const leadCompany: string = (body?.leadCompany || "").toString().trim();
    const leadContext: string = (body?.leadContext || "").toString().trim();
    const extra: string = (body?.extraPrompt || "").toString().trim();

    if (source.length < 40) {
      return new Response(JSON.stringify({ error: "source content is too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userBaseContext = `Source label: ${toolLabel}
Lead name: ${leadName || "(unspecified)"}
Lead company: ${leadCompany || "(unspecified)"}
Lead context / what we know about them: ${leadContext || "(none provided)"}
Extra direction: ${extra || "(none)"}

==== RAW INTERNAL FINDING ====
${source.slice(0, 8000)}
==============================`;

    // Run both calls in parallel
    const [polishRes, emailRes] = await Promise.all([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: POLISH_SYSTEM_PROMPT },
            { role: "user", content: `${userBaseContext}\n\nRewrite this finding as a polished Aetheris deliverable section, ready to send to the lead. Output only the markdown — no commentary.` },
          ],
        }),
      }),
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: EMAIL_SYSTEM_PROMPT },
            { role: "user", content: `${userBaseContext}\n\nWrite the email Joseph would send this lead with this finding. Return ONLY raw JSON: {"subject":"...","body":"..."} — no markdown fence, no commentary.` },
          ],
        }),
      }),
    ]);

    if (!polishRes.ok || !emailRes.ok) {
      const status = !polishRes.ok ? polishRes.status : emailRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const polishData = await polishRes.json();
    const emailData = await emailRes.json();
    const polished = polishData?.choices?.[0]?.message?.content?.trim() || "";
    const emailRaw = emailData?.choices?.[0]?.message?.content?.trim() || "";

    let email = { subject: "", body: "" };
    try {
      const cleaned = emailRaw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      email = JSON.parse(cleaned);
    } catch {
      // fallback: shove the whole thing in body
      email = { subject: `Forensic finding for ${leadCompany || "your team"}`, body: emailRaw };
    }

    return new Response(JSON.stringify({ polished, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forensics-lead-package error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
