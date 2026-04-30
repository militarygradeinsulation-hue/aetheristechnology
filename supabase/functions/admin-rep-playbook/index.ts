// Admin CRUD for Rep Playbook: weekly schedule, plays library, quotas, AI Idea of the Day.
// Auth: admin HMAC token (PIN-9822 system).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function generateIdeaWithAI(): Promise<{ title: string; body: string; category: string } | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a sales-floor coach for a B2B 'Business Forensics' consulting firm (Aetheris). You write blunt, operator-grade daily coaching tips for commissioned reps. Avoid corporate fluff. 1 punchy idea per day, ~120 words, ends with a 'Try this today:' action line." },
          { role: "user", content: `Write today's (${today}) Idea of the Day for the sales team. Pick ONE high-leverage tactic — could be cold-outreach angle, qualification question, objection-handler, follow-up cadence trick, or proposal-pacing move. Return JSON: {"title": "...", "body": "...", "category": "outreach|qualification|objection|followup|proposal|mindset"}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!parsed?.title || !parsed?.body) return null;
    return { title: String(parsed.title), body: String(parsed.body), category: String(parsed.category || "mindset") };
  } catch (e) {
    console.error("ai idea error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "get_all");

    // ---------- READ ALL ----------
    if (action === "get_all") {
      const today = new Date().toISOString().slice(0, 10);
      const [schedule, plays, quotas, idea, reps] = await Promise.all([
        admin.from("rep_playbook_schedule").select("*").order("day_of_week").order("block_order"),
        admin.from("rep_plays").select("*").order("created_at", { ascending: false }),
        admin.from("rep_quotas").select("*").order("rep_code"),
        admin.from("rep_idea_of_day").select("*").eq("for_date", today).maybeSingle(),
        admin.from("rep_codes").select("code, rep_name, role, is_active").order("rep_name"),
      ]);
      return json({
        schedule: schedule.data || [],
        plays: plays.data || [],
        quotas: quotas.data || [],
        idea_today: idea.data || null,
        reps: reps.data || [],
      });
    }

    // ---------- SCHEDULE ----------
    if (action === "schedule_upsert") {
      const row = body?.row || {};
      if (row.id) {
        const { data, error } = await admin.from("rep_playbook_schedule").update({
          day_of_week: row.day_of_week, block_order: row.block_order ?? 0, title: row.title,
          description: row.description, category: row.category || "general",
          duration_minutes: row.duration_minutes, is_active: row.is_active ?? true,
        }).eq("id", row.id).select("*").single();
        if (error) throw error;
        return json({ row: data });
      }
      const { data, error } = await admin.from("rep_playbook_schedule").insert({
        day_of_week: row.day_of_week, block_order: row.block_order ?? 0, title: row.title,
        description: row.description, category: row.category || "general",
        duration_minutes: row.duration_minutes, is_active: row.is_active ?? true,
      }).select("*").single();
      if (error) throw error;
      return json({ row: data });
    }
    if (action === "schedule_delete") {
      const { error } = await admin.from("rep_playbook_schedule").delete().eq("id", body?.id);
      if (error) throw error;
      return json({ ok: true });
    }

    // ---------- PLAYS ----------
    if (action === "play_upsert") {
      const row = body?.row || {};
      const payload = {
        title: row.title, category: row.category || "cold_call",
        stage: row.stage || null, industry: row.industry || null,
        body: row.body, tags: row.tags || [], is_published: row.is_published ?? true,
        source: row.source || "manual",
      };
      if (row.id) {
        const { data, error } = await admin.from("rep_plays").update(payload).eq("id", row.id).select("*").single();
        if (error) throw error;
        return json({ row: data });
      }
      const { data, error } = await admin.from("rep_plays").insert(payload).select("*").single();
      if (error) throw error;
      return json({ row: data });
    }
    if (action === "play_delete") {
      const { error } = await admin.from("rep_plays").delete().eq("id", body?.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (action === "play_generate_ai") {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) return json({ error: "AI not configured" }, 500);
      const { category = "cold_call", stage, industry, prompt } = body || {};
      const sysMap: Record<string, string> = {
        cold_call: "Write a 60-second cold-call opener for a B2B reseller selling Business Forensics audits.",
        objection: "Write 3 objection handlers (price, timing, 'we already have someone').",
        followup: "Write a 7-touch follow-up sequence (email + LinkedIn + call), 1 line each.",
        qualification: "Write 5 sharp qualification questions that surface revenue leak.",
        email: "Write a 90-word cold email with subject line.",
      };
      const sys = sysMap[category] || "Write a sales play.";
      const ctx = `${stage ? `Stage: ${stage}. ` : ""}${industry ? `Industry: ${industry}. ` : ""}${prompt ? `Notes: ${prompt}` : ""}`;
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are a senior sales operator. Tone: blunt, no fluff. ${sys} Return JSON: {"title": "...", "body": "..."}` },
            { role: "user", content: ctx || "Default scenario." },
          ],
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      const parsed = content ? JSON.parse(content) : null;
      if (!parsed?.title || !parsed?.body) return json({ error: "AI returned no usable play" }, 500);
      const { data: row, error } = await admin.from("rep_plays").insert({
        title: parsed.title, body: parsed.body, category, stage: stage || null, industry: industry || null,
        is_published: true, source: "ai",
      }).select("*").single();
      if (error) throw error;
      return json({ row });
    }

    // ---------- QUOTAS ----------
    if (action === "quota_upsert") {
      const row = body?.row || {};
      const payload = {
        rep_code: row.rep_code, period: row.period || "weekly",
        calls_target: row.calls_target ?? 0, meetings_target: row.meetings_target ?? 0,
        proposals_target: row.proposals_target ?? 0, revenue_target_cents: row.revenue_target_cents ?? 0,
        notes: row.notes || null,
      };
      const { data, error } = await admin.from("rep_quotas")
        .upsert(payload, { onConflict: "rep_code,period" }).select("*").single();
      if (error) throw error;
      return json({ row: data });
    }
    if (action === "quota_delete") {
      const { error } = await admin.from("rep_quotas").delete().eq("id", body?.id);
      if (error) throw error;
      return json({ ok: true });
    }

    // ---------- IDEA OF THE DAY ----------
    if (action === "idea_generate") {
      const idea = await generateIdeaWithAI();
      if (!idea) return json({ error: "AI generation failed" }, 500);
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await admin.from("rep_idea_of_day")
        .upsert({ for_date: today, ...idea, source: "ai", is_active: true }, { onConflict: "for_date" })
        .select("*").single();
      if (error) throw error;
      return json({ row: data });
    }
    if (action === "idea_set_manual") {
      const today = new Date().toISOString().slice(0, 10);
      const { title, body: text, category } = body || {};
      if (!title || !text) return json({ error: "title and body required" }, 400);
      const { data, error } = await admin.from("rep_idea_of_day")
        .upsert({ for_date: today, title, body: text, category: category || "mindset", source: "manual", is_active: true }, { onConflict: "for_date" })
        .select("*").single();
      if (error) throw error;
      return json({ row: data });
    }

    // ---------- CRM REP DASHBOARDS ----------
    if (action === "crm_rep_summary") {
      // Returns per-rep KPI rollups from CRM tables
      const { data: contacts } = await admin.from("crm_contacts")
        .select("owner_code, qualified_at, qualified_by_code");
      const { data: deals } = await admin.from("crm_deals")
        .select("owner_code, stage, value_cents, proposal_sent_at, won_at, lost_at");
      const { data: ints } = await admin.from("crm_interactions")
        .select("owner_code, type, occurred_at");

      const reps = new Map<string, any>();
      const ensure = (code: string) => {
        if (!reps.has(code)) reps.set(code, {
          rep_code: code, talked_to: 0, qualified: 0, proposals_sent: 0,
          deals_open: 0, deals_won: 0, deals_lost: 0, revenue_won_cents: 0,
          calls: 0, emails: 0, meetings: 0,
        });
        return reps.get(code);
      };
      for (const c of contacts || []) {
        if (!c.owner_code) continue;
        const r = ensure(c.owner_code); r.talked_to += 1;
        if (c.qualified_at) r.qualified += 1;
      }
      for (const d of deals || []) {
        if (!d.owner_code) continue;
        const r = ensure(d.owner_code);
        if (d.proposal_sent_at) r.proposals_sent += 1;
        if (d.won_at || d.stage === "closed_won") { r.deals_won += 1; r.revenue_won_cents += (d.value_cents || 0); }
        else if (d.lost_at || d.stage === "closed_lost") r.deals_lost += 1;
        else r.deals_open += 1;
      }
      for (const i of ints || []) {
        if (!i.owner_code) continue;
        const r = ensure(i.owner_code);
        if (i.type === "call") r.calls += 1;
        else if (i.type === "email") r.emails += 1;
        else if (i.type === "meeting") r.meetings += 1;
      }
      return json({ summary: Array.from(reps.values()) });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("admin-rep-playbook error", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
