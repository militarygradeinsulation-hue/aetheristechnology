// Company-wide calendar managed by admin (Bradon). Reps read; admin CRUDs.
// Includes AI tactic planner (Lovable AI Gateway).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const KINDS = new Set(["goal", "vertical", "topic", "event", "push", "note"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isAdmin = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
    const portalClaims = isAdmin ? null : await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE);
    if (!isAdmin && !portalClaims) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    // ============== READ (admin + reps) ==============
    if (action === "list") {
      const from = body.from ? String(body.from) : null;
      const to = body.to ? String(body.to) : null;
      let q = supabase.from("company_calendar").select("*").order("date", { ascending: true }).limit(500);
      if (from) q = q.gte("date", from);
      if (to) q = q.lte("date", to);
      const { data, error } = await q;
      if (error) throw error;
      return json({ ok: true, entries: data || [] });
    }

    // ============== AI PLANNER (admin + reps can ask, only admin can save output as entry) ==============
    if (action === "ai_plan") {
      const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE) return json({ error: "AI not configured" }, 500);
      const prompt = String(body.prompt || "").slice(0, 4000);
      const context = String(body.context || "").slice(0, 2000);
      if (!prompt) return json({ error: "Missing prompt" }, 400);

      const sys = `You are a Business Forensics operations strategist for Aetheris Technology (Indianapolis). You help Bradon plan the company calendar for his rep team. Output blunt, tactical, no fluff. Always return JSON with keys: title (short), kind (one of: goal, vertical, topic, event, push, note), summary (2-3 sentences), tactics (array of 4-7 short, action-led bullets reps can run TODAY), kpis (array of 2-4 measurable outcomes), suggested_date (YYYY-MM-DD or null).`;

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Existing context / day theme: ${context || "(none)"}\n\nRequest: ${prompt}` },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) return json({ error: `AI ${r.status}: ${await r.text()}` }, 500);
      const j = await r.json();
      const txt = j?.choices?.[0]?.message?.content || "{}";
      let plan: any = {};
      try { plan = JSON.parse(txt); } catch { plan = { raw: txt }; }
      return json({ ok: true, plan });
    }

    // ============== MUTATIONS (admin + partner) ==============
    const canMutate = isAdmin || portalClaims?.role === "partner";
    if (!canMutate) return json({ error: "Admin or partner only" }, 403);

    if (action === "create" || action === "update") {
      const id = body.id ? String(body.id) : null;
      const date = String(body.date || "").slice(0, 10);
      const kind = KINDS.has(String(body.kind)) ? String(body.kind) : "goal";
      const title = String(body.title || "").trim().slice(0, 200);
      if (!title || !date) return json({ error: "Missing date or title" }, 400);
      const payload = {
        date,
        kind,
        title,
        body: String(body.body || "").slice(0, 10000),
        attachments: Array.isArray(body.attachments) ? body.attachments.slice(0, 25) : [],
        ai_plan: body.ai_plan && typeof body.ai_plan === "object" ? body.ai_plan : {},
        pinned: !!body.pinned,
        color: body.color ? String(body.color).slice(0, 30) : null,
        created_by: isAdmin ? "admin" : `partner:${portalClaims?.code || ""}`,
      };
      if (action === "update" && id) {
        const { data, error } = await supabase.from("company_calendar").update(payload).eq("id", id).select().maybeSingle();
        if (error) throw error;
        return json({ ok: true, entry: data });
      }
      const { data, error } = await supabase.from("company_calendar").insert(payload).select().maybeSingle();
      if (error) throw error;
      return json({ ok: true, entry: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json({ error: "Missing id" }, 400);
      const { error } = await supabase.from("company_calendar").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("company-calendar error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
