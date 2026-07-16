// Lead Clue Trail — log every meaningful step a rep takes on a lead,
// and surface a hybrid (rules + AI) next-move tip.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

type Status =
  | "new" | "outreach" | "touched" | "replied"
  | "meeting" | "won" | "lost" | "dead";

// Rules-based "what should happen next" map
const NEXT_BY_STATUS: Record<Status, {
  tool: string; toolLabel: string; targetStatus?: Status; cta: string; rule: string;
}> = {
  new: {
    tool: "website-scanner",
    toolLabel: "Run Website Leak Scan",
    targetStatus: "outreach",
    cta: "Scan their site",
    rule: "Fresh lead. Find the bleed before you say a word.",
  },
  outreach: {
    tool: "detective-mode",
    toolLabel: "Open Detective Mode",
    targetStatus: "touched",
    cta: "Build the angle",
    rule: "You've got signal. Convert it to a hook they can't unsee.",
  },
  touched: {
    tool: "outreach-composer",
    toolLabel: "Send 2nd Touch",
    targetStatus: "touched",
    cta: "Compose follow-up",
    rule: "No reply yet. Hit a different angle, different channel.",
  },
  replied: {
    tool: "rocketreach",
    toolLabel: "Enrich Decision-Maker",
    targetStatus: "meeting",
    cta: "Book the meeting",
    rule: "They engaged. Pin the real signer and lock a slot.",
  },
  meeting: {
    tool: "diagnostic-prep",
    toolLabel: "Prep Diagnostic Brief",
    targetStatus: "won",
    cta: "Pitch the Diagnostic",
    rule: "Meeting on the calendar. Walk in with their leak quantified.",
  },
  won: {
    tool: "handoff",
    toolLabel: "Handoff to Delivery",
    cta: "Mark handed off",
    rule: "Close the loop. Log the win, queue the kickoff.",
  },
  lost: {
    tool: "nurture",
    toolLabel: "Add to 90-day Nurture",
    targetStatus: "outreach",
    cta: "Nurture",
    rule: "Not now ≠ not ever. Recycle in 90 days with new angle.",
  },
  dead: {
    tool: "release",
    toolLabel: "Release to Pool",
    cta: "Release",
    rule: "Cut bait. Free the slot for a live one.",
  },
};

async function aiTip(lead: any, status: Status, recentTrail: any[]) {
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return null;
    const who = lead?.business_name || lead?.contact_name || "this lead";
    const industry = lead?.industry || "unknown industry";
    const recent = recentTrail.slice(0, 6).map(t => `- ${t.kind}: ${t.label}`).join("\n") || "(none yet)";
    const ruleMove = NEXT_BY_STATUS[status];
    const prompt = `You are a blunt sales operator coaching a rep on ONE lead.
Lead: ${who} | industry: ${industry} | current stage: ${status}
Recent moves:
${recent}

Rule-based next move: ${ruleMove.toolLabel} — ${ruleMove.rule}

Write ONE sentence (max 22 words), forensic-operator voice, telling the rep WHY this specific lead should get that next move RIGHT NOW. No fluff. No "Hey". No emojis.`;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
      }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const txt = json?.choices?.[0]?.message?.content?.trim();
    return typeof txt === "string" && txt.length > 0 ? txt.replace(/^["']|["']$/g, "") : null;
  } catch (e) {
    console.error("aiTip error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const portalToken = getPortalTokenFromRequest(req);
    const adminToken = getAdminTokenFromRequest(req);
    const portalClaims = portalToken ? await verifyPortalToken(portalToken, secret) : null;
    const isAdmin = adminToken ? await verifyAdminToken(adminToken, secret) : false;

    if (!portalClaims && !isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);

    if (action === "log") {
      const leadId = String(body.lead_id || "");
      if (!leadId) {
        return new Response(JSON.stringify({ error: "lead_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const kind = String(body.kind || "manual");
      const label = String(body.label || kind);
      const repCode = portalClaims?.code || (isAdmin ? "admin" : null);
      let repName: string | null = null;
      if (portalClaims?.code) {
        const { data: rep } = await supabase
          .from("rep_codes").select("rep_name").eq("code", portalClaims.code).maybeSingle();
        repName = rep?.rep_name || null;
      } else if (isAdmin) {
        repName = "Admin";
      }
      const { error } = await supabase.from("lead_clue_trail").insert({
        lead_id: leadId,
        rep_code: repCode,
        rep_name: repName,
        kind,
        label,
        tool_key: body.tool_key || null,
        stage_from: body.stage_from || null,
        stage_to: body.stage_to || null,
        tip: body.tip || null,
        meta: body.meta && typeof body.meta === "object" ? body.meta : {},
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const leadId = String(body.lead_id || "");
      if (!leadId) return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const limit = Math.min(Number(body.limit) || 50, 200);
      const { data, error } = await supabase
        .from("lead_clue_trail")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, trail: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "next") {
      const leadId = String(body.lead_id || "");
      const status = (String(body.status || "new") as Status);
      if (!leadId) return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const rule = NEXT_BY_STATUS[status] || NEXT_BY_STATUS.new;
      const { data: trail } = await supabase
        .from("lead_clue_trail")
        .select("kind,label,created_at,stage_from,stage_to")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(10);
      const tip = await aiTip(body.lead || { business_name: null, industry: null }, status, trail || []);
      return new Response(JSON.stringify({
        ok: true,
        next: { ...rule, tip: tip || rule.rule },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-clues error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
