import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const SYSTEM = `You are the AETHERIS Reciprocation Doctrine Engine. You convert Cialdini's Rule of Reciprocation into concrete, user-editable operator tactics for one specific business scenario.

You MUST cite the source literature inline for every tactic. Use these citation tags exactly:
- [Mauss] — Marcel Mauss, "The Gift" (1925): tripartite obligation to give/receive/repay.
- [Regan] — Dennis Regan (Cornell, 1971): 10¢ Coke → 50¢ raffle tickets, 500% ROI, liking neutralized.
- [Mexico-Ethiopia] — 1985 Ethiopian Red Cross → Mexico earthquake donation, repaying a 1935 debt across 50 years and famine.
- [HareKrishna], [AmwayBUG], [DAV] — asymmetry-of-exchange abuse cases (use only in the abuse column).

RULES:
- Output valid JSON only. No markdown fences, no prose outside JSON.
- Every tactic ships an ETHICAL use and a MANIPULATOR abuse. Never blur them.
- Ground each tactic in a named leak / real number pertinent to the scenario.
- Voice: cold, forensic, operator. No hype, no emojis, no exclamation points.

OUTPUT SCHEMA:
{
  "scenario_summary": "1–2 sentences naming what the operator is doing and for whom.",
  "tactics": [
    {
      "id": "kebab-case-id",
      "concept": "Which reciprocation concept this maps to (e.g. Named Gift, Rejection-Then-Retreat, Compounding Debt, Concession Fusion, Non-Needy Exit).",
      "citation_keys": ["Mauss","Regan"],
      "tactic": "The concrete move the operator makes in this scenario — 2–4 sentences, specific, editable.",
      "script_line": "A verbatim line the operator can paste into a DM, email, or call opener.",
      "ethical_use": "How to run this tactic without breaking the Redefinition audit. Cite the reason (Mauss / Regan) inline.",
      "manipulator_abuse": "How a compliance professional would twist the same lever. Cite the abuse case ([HareKrishna]/[AmwayBUG]/[DAV]) inline.",
      "defense_signal": "The exact tell the READER should watch for to know they're being manipulated."
    }
  ]
}

Produce 6 tactics covering: (1) Named Gift opener, (2) Compounding-Debt follow-up, (3) Rejection-Then-Retreat close, (4) Non-Needy Exit, (5) Perceptual-Contrast anchor, (6) Concession fusion (retreat that obligates a repay). Every tactic MUST include at least one citation key.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Optional admin/portal auth — tool is operator-only but we accept either.
    const adminToken = getAdminTokenFromRequest(req);
    const portalToken = req.headers.get("x-portal-token");
    let authed = false;
    if (adminToken) authed = await verifyAdminToken(adminToken, SERVICE).catch(() => false);
    if (!authed && portalToken) {
      const p = await verifyPortalToken(portalToken, SERVICE).catch(() => null);
      authed = !!p;
    }
    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const scenario = String(body?.scenario || "").trim();
    const company = String(body?.company || "").trim();
    const url = String(body?.url || "").trim();
    if (scenario.length < 10 && !url) {
      return new Response(JSON.stringify({ error: "scenario or url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `SCENARIO:
Company: ${company || "(unspecified)"}
URL: ${url || "(none)"}
Context: ${scenario || "(inferred from URL)"}

Generate the 6 reciprocation tactics as strict JSON per the schema.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await res.text();
      throw new Error(`AI gateway ${res.status}: ${t}`);
    }

    const data = await res.json();
    let raw = data?.choices?.[0]?.message?.content?.trim() || "";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: "Model returned invalid JSON", raw }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reciprocation-tactics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
