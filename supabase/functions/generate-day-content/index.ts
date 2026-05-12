// Generate Aetheris-voice content for a specific day.
// Admin-gated. Returns { title, hook, body, cta, hashtags }.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FORMATS: Record<string, string> = {
  case_file:
    "Tuesday Case File — Autopsy of one specific leak. Open with the dollar amount and vertical. Walk through the failure point, the operator move, the result. No names. End with one blunt question.",
  leak_of_week:
    "Leak of the Week — One blunt operator post about a single leak pattern. Hard hook in line 1. 3 short story locks. Close with the Forensic Diagnostic ($2,500 flat).",
  diagnostic:
    "Diagnostic Sequence — 3-5 numbered diagnostic questions an operator should ask of their own business this week. Sharp, specific, no fluff.",
  field_note:
    "Field Note — Short founder-to-founder observation from the field. Real number. Real moment. One lesson. Close with a question.",
  contrarian:
    "Contrarian Take — Disagree with a piece of conventional wisdom. Defend it with 3 sharp points. Close with a blunt challenge.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE_KEY);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const date = (body.date as string) || new Date().toISOString().slice(0, 10);
    const userPrompt = ((body.prompt as string) || "").trim();
    const formatKey = (body.format as string) || "leak_of_week";
    const formatBrief = FORMATS[formatKey] || FORMATS.leak_of_week;

    const dateObj = new Date(date + "T12:00:00");
    const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const system = `You are a Business Forensics Operator writing for Aetheris (aetheris.technology).
Voice: aggressive, blunt, non-corporate. Forensic > influencer. Operator > consultant. Real numbers > round numbers.
Hook: "Your business is leaking. You just can't see it from the inside."
Methodology: The Leak Audit (7 steps). Free self-scan at /leak-audit. Operator-led = Forensic Diagnostic $2,500 flat, applied toward engagement.
Never use: "Hey guys", "In today's post", emojis-as-bullets, "AI Systems Architect", "Magic Robot" analogies, generic AI-guru gradients.
Always: open with the punch, cite a specific dollar figure when possible, end with a blunt question or CTA.`;

    const user = `Write content for ${dayLabel}.

FORMAT: ${formatBrief}

USER DIRECTION:
${userPrompt || "(none — use your judgment based on the format above)"}

Return ONLY valid JSON, no markdown fences, in this exact shape:
{
  "title": "short title for the post (under 80 chars)",
  "hook": "the opening line — 1 sentence, blunt",
  "body": "the full post body in markdown. 120-220 words. Short paragraphs. Real numbers.",
  "cta": "1-sentence call to action — usually the Forensic Diagnostic, the free Leak Audit at /leak-audit, or a blunt question",
  "hashtags": ["BusinessForensics", "RevOps", "..."]
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: `AI gateway: ${t.slice(0, 240)}` }, 502);
    }

    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* */ } }
    }
    if (!parsed.body) return json({ error: "AI did not return usable content. Try again." }, 502);

    return json({
      content: {
        title: parsed.title || "Untitled dispatch",
        hook: parsed.hook || "",
        body: parsed.body || "",
        cta: parsed.cta || "",
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        format: formatKey,
        date,
      },
    });
  } catch (e) {
    console.error("generate-day-content", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
