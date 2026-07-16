// Per-lead Action Items — touch checklist + auto-generated follow-up sequence. (redeploy)
// Verified via portal token (rep) OR admin token. Service role for DB ops.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

// ---- Canonical step templates ---------------------------------------------

const TOUCH_STEPS: Array<{ step_key: string; title: string; description: string }> = [
  { step_key: "scan",            title: "Scan the lead",                   description: "Run Website Scanner / All-in-One on their site. Get the dollar leaks." },
  { step_key: "find_leak",       title: "Find the #1 leak",                description: "Pick the single biggest revenue leak. Quantify it. That's your opener." },
  { step_key: "attach_playbook", title: "Attach the right playbook",       description: "Pick the playbook that matches their leak. Attach it to the lead." },
  { step_key: "create_email",    title: "Create the outreach email",       description: "Use the Sales Script Generator. Quote the leak in the subject." },
  { step_key: "send",            title: "Send it",                         description: "Hit send. The clock starts the moment this is checked off." },
];

// Follow-up cadence (days from when 'send' was completed)
const FOLLOWUP_STEPS: Array<{ step_key: string; offsetDays: number; title: string; description: string }> = [
  { step_key: "followup_day1",  offsetDays: 1,  title: "Check delivery & open",       description: "Confirm the email landed and whether they opened. If no open by EOD, log a clue." },
  { step_key: "followup_day3",  offsetDays: 3,  title: "Touch #2 — new angle",         description: "Different hook than the first email. Pull a Brand Contradiction or a LinkedIn quote." },
  { step_key: "followup_day7",  offsetDays: 7,  title: "LinkedIn connect + comment",   description: "Connect with a personalized note. Comment on their most recent post (real value, no pitch)." },
  { step_key: "followup_day14", offsetDays: 14, title: "Touch #3 — case study or proof", description: "Send a 60-sec Loom or a one-pager that mirrors their leak. Ask for 15 min." },
  { step_key: "followup_day21", offsetDays: 21, title: "Voicemail + final email",       description: "Leave a 30-sec voicemail. Follow up with a 'closing the loop' email." },
  { step_key: "followup_day30", offsetDays: 30, title: "Decide: nurture or kill",       description: "Move to long-term nurture or mark dead. No middle ground past day 30." },
];

// ---- Helpers ---------------------------------------------------------------

async function ensureTouchSteps(supabase: any, leadId: string, repCode: string | null) {
  const { data: existing } = await supabase
    .from("lead_action_items").select("step_key").eq("lead_id", leadId);
  const have = new Set((existing || []).map((r: any) => r.step_key));
  const rows = TOUCH_STEPS
    .filter(s => !have.has(s.step_key))
    .map((s, i) => ({
      lead_id: leadId,
      rep_code: repCode,
      kind: "touch",
      step_key: s.step_key,
      title: s.title,
      description: s.description,
      order_idx: i,
    }));
  if (rows.length) await supabase.from("lead_action_items").insert(rows);
}

async function seedFollowupSequence(supabase: any, leadId: string, repCode: string | null, startAt: Date) {
  const { data: existing } = await supabase
    .from("lead_action_items").select("step_key").eq("lead_id", leadId).eq("kind", "followup");
  const have = new Set((existing || []).map((r: any) => r.step_key));
  const rows = FOLLOWUP_STEPS
    .filter(s => !have.has(s.step_key))
    .map((s, i) => ({
      lead_id: leadId,
      rep_code: repCode,
      kind: "followup",
      step_key: s.step_key,
      title: s.title,
      description: s.description,
      order_idx: 100 + i,
      due_at: new Date(startAt.getTime() + s.offsetDays * 86400000).toISOString(),
    }));
  if (rows.length) await supabase.from("lead_action_items").insert(rows);
}

// ---- Handler ---------------------------------------------------------------

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
    const actorCode = portalClaims?.code || (isAdmin ? "admin" : null);

    // -- list items for one lead (auto-seeds touch steps on first call) ----
    if (action === "list") {
      const leadId = String(body.lead_id || "");
      if (!leadId) return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      // Get lead to pick rep_code for new items
      const { data: lead } = await supabase
        .from("rep_leads").select("assigned_to_code, claimed_by_code, created_by_code")
        .eq("id", leadId).maybeSingle();
      const repCode = lead?.assigned_to_code || lead?.claimed_by_code || lead?.created_by_code || actorCode;
      await ensureTouchSteps(supabase, leadId, repCode);
      const { data, error } = await supabase
        .from("lead_action_items").select("*")
        .eq("lead_id", leadId)
        .order("order_idx", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ items: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -- mark an item complete (and trigger follow-up sequence on 'send') --
    if (action === "complete") {
      const itemId = String(body.item_id || "");
      if (!itemId) return new Response(JSON.stringify({ error: "item_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const completedBy = portalClaims?.code || "admin";
      const { data: updated, error } = await supabase
        .from("lead_action_items")
        .update({ completed_at: new Date().toISOString(), completed_by: completedBy, skipped_at: null, notes: body.notes ?? undefined })
        .eq("id", itemId)
        .select("*").maybeSingle();
      if (error) throw error;

      // Trigger follow-up sequence if user just completed the 'send' step
      if (updated && updated.step_key === "send" && updated.kind === "touch") {
        await seedFollowupSequence(supabase, updated.lead_id, updated.rep_code || actorCode, new Date());
      }
      return new Response(JSON.stringify({ ok: true, item: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -- uncheck / undo
    if (action === "uncheck") {
      const itemId = String(body.item_id || "");
      const { error } = await supabase
        .from("lead_action_items")
        .update({ completed_at: null, completed_by: null })
        .eq("id", itemId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -- skip
    if (action === "skip") {
      const itemId = String(body.item_id || "");
      const { error } = await supabase
        .from("lead_action_items")
        .update({ skipped_at: new Date().toISOString(), notes: body.notes ?? undefined })
        .eq("id", itemId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -- snooze (push due_at)
    if (action === "snooze") {
      const itemId = String(body.item_id || "");
      const days = Math.max(1, Math.min(60, Number(body.days) || 1));
      const { data: cur } = await supabase
        .from("lead_action_items").select("due_at").eq("id", itemId).maybeSingle();
      const base = cur?.due_at ? new Date(cur.due_at) : new Date();
      const next = new Date(base.getTime() + days * 86400000).toISOString();
      const { error } = await supabase
        .from("lead_action_items").update({ due_at: next }).eq("id", itemId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, due_at: next }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -- update notes
    if (action === "note") {
      const itemId = String(body.item_id || "");
      const notes = String(body.notes || "");
      const { error } = await supabase
        .from("lead_action_items").update({ notes }).eq("id", itemId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -- admin/partner overview across all reps & active leads
    if (action === "overview") {
      if (!isAdmin && portalClaims?.role !== "partner") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Pull all items for non-dead/non-lost leads
      const { data: leads, error: lerr } = await supabase
        .from("rep_leads")
        .select("id, business_name, website, contact_name, status, assigned_to_code, claimed_by_code, created_by_code, last_touched_at")
        .not("status", "in", "(dead,lost,won)")
        .order("last_touched_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (lerr) throw lerr;
      const leadIds = (leads || []).map((l: any) => l.id);
      let items: any[] = [];
      if (leadIds.length) {
        const { data: it } = await supabase
          .from("lead_action_items").select("*").in("lead_id", leadIds);
        items = it || [];
      }
      const { data: reps } = await supabase
        .from("rep_codes").select("code, rep_name").eq("is_active", true);
      return new Response(JSON.stringify({ leads, items, reps }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("lead-actions error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
