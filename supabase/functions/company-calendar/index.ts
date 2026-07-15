// Company-wide calendar managed by admin (Braden). Reps read; admin CRUDs.
// Includes AI tactic planner + Leadership Playbook generator (Lovable AI Gateway).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const KINDS = new Set(["goal", "vertical", "topic", "event", "push", "note"]);
const OWNER_ROLES = new Set(["founder", "coo", "chief_sales", "team"]);
const STATUSES = new Set(["todo", "doing", "done"]);

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
      const ownerRole = body.owner_role && OWNER_ROLES.has(String(body.owner_role)) ? String(body.owner_role) : null;
      let q = supabase.from("company_calendar").select("*").order("date", { ascending: true }).limit(1000);
      if (from) q = q.gte("date", from);
      if (to) q = q.lte("date", to);
      if (ownerRole) q = q.eq("owner_role", ownerRole);
      const { data, error } = await q;
      if (error) throw error;
      return json({ ok: true, entries: data || [] });
    }

    if (action === "list_roles") {
      const { data, error } = await supabase
        .from("leadership_roles")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return json({ ok: true, roles: data || [] });
    }

    // ============== AI PLANNER (single entry) ==============
    if (action === "ai_plan") {
      const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE) return json({ error: "AI not configured" }, 500);
      const prompt = String(body.prompt || "").slice(0, 4000);
      const context = String(body.context || "").slice(0, 2000);
      if (!prompt) return json({ error: "Missing prompt" }, 400);

      const sys = `You are a Chaos Theory Forensics operations strategist for Aetheris Technology (Indianapolis). You help Braden plan the company calendar for his rep team. Output blunt, tactical, no fluff. Always return JSON with keys: title (short), kind (one of: goal, vertical, topic, event, push, note), summary (2-3 sentences), tactics (array of 4-7 short, action-led bullets reps can run TODAY), kpis (array of 2-4 measurable outcomes), suggested_date (YYYY-MM-DD or null).`;

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

    // ============== AI LEADERSHIP PLAYBOOK (multi-role week generator) ==============
    if (action === "ai_playbook") {
      const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE) return json({ error: "AI not configured" }, 500);
      const goal = String(body.goal || "").slice(0, 500);
      const weekStart = String(body.week_start || "").slice(0, 10); // YYYY-MM-DD
      const days = Math.max(1, Math.min(14, Number(body.days) || 7));
      if (!goal || !weekStart) return json({ error: "Missing goal or week_start" }, 400);

      const { data: roles } = await supabase
        .from("leadership_roles")
        .select("*")
        .order("sort_order", { ascending: true });

      const rolesBlock = (roles || []).map((r: any) => (
        `ROLE: ${r.role_slug}\nName: ${r.display_name} — ${r.title}\nOwns:\n- ${(r.owns || []).join("\n- ")}\nDoes NOT own:\n- ${(r.does_not_own || []).join("\n- ")}\nDecision authority:\n- ${(r.decision_authority || []).join("\n- ")}`
      )).join("\n\n");

      const sys = `You are the Chief of Staff for Aetheris Technology (Indianapolis). Three principals run the company in strict lanes.

LEADERSHIP DOCTRINE (non-negotiable):
- Each person owns their lane fully. Disagreement is fine, but inside someone's lane their call stands unless it crosses into another lane per the rules below.
- Three principals who relitigate each other's decisions become one slow committee. Don't.
- Never assign a task to a principal that lives inside another principal's lane. Cross-lane touchpoints (e.g. Sales sold something Delivery can't staff) become COORDINATION tasks assigned to the lane that owns the resolution.

THE THREE LANES:

${rolesBlock}

Given a week's north-star GOAL and a week-start date, produce a JSON object:
{
  "tasks": [
    {
      "date": "YYYY-MM-DD",
      "owner_role": "founder" | "coo" | "chief_sales",
      "owner_name": "Joseph" | "Dean" | "Braden",
      "title": "short imperative, <70 chars",
      "body": "2-4 bullet points as plain text separated by newlines, starting with '- '",
      "kind": "goal" | "event" | "push" | "topic" | "note",
      "due_time": "HH:MM" or null
    }
  ]
}

Rules:
- 3 to 6 tasks per principal across the ${days}-day window. No principal left out.
- Distribute across days; don't stack them all on day 1.
- Every task must be inside that principal's lane. If in doubt, drop it or restate it.
- Tactical, operator voice. No consultant fluff. Money in $ USD only.
- Do not invent people, tools, or numbers not implied by the goal.

Return ONLY the JSON object. No prose.`;

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Week goal: ${goal}\nWeek start: ${weekStart}\nDays: ${days}` },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) return json({ error: `AI ${r.status}: ${await r.text()}` }, 500);
      const j = await r.json();
      const txt = j?.choices?.[0]?.message?.content || "{}";
      let playbook: any = {};
      try { playbook = JSON.parse(txt); } catch { playbook = { tasks: [], raw: txt }; }
      const tasks = Array.isArray(playbook.tasks) ? playbook.tasks.filter((t: any) =>
        t && typeof t.date === "string" && OWNER_ROLES.has(String(t.owner_role))
      ) : [];
      return json({ ok: true, tasks });
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
      const ownerRole = OWNER_ROLES.has(String(body.owner_role)) ? String(body.owner_role) : "team";
      const status = STATUSES.has(String(body.status)) ? String(body.status) : "todo";
      const dueTime = body.due_time ? String(body.due_time).slice(0, 8) : null;
      const payload: Record<string, unknown> = {
        date,
        kind,
        title,
        body: String(body.body || "").slice(0, 10000),
        attachments: Array.isArray(body.attachments) ? body.attachments.slice(0, 25) : [],
        ai_plan: body.ai_plan && typeof body.ai_plan === "object" ? body.ai_plan : {},
        pinned: !!body.pinned,
        color: body.color ? String(body.color).slice(0, 30) : null,
        owner_role: ownerRole,
        owner_name: body.owner_name ? String(body.owner_name).slice(0, 60) : null,
        status,
        due_time: dueTime,
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

    if (action === "mark_status") {
      const id = String(body.id || "");
      const status = STATUSES.has(String(body.status)) ? String(body.status) : "todo";
      if (!id) return json({ error: "Missing id" }, 400);
      const { data, error } = await supabase
        .from("company_calendar")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return json({ ok: true, entry: data });
    }

    if (action === "bulk_create") {
      const entries = Array.isArray(body.entries) ? body.entries : [];
      if (!entries.length) return json({ error: "No entries" }, 400);
      const rows = entries.slice(0, 100).map((e: any) => ({
        date: String(e.date || "").slice(0, 10),
        kind: KINDS.has(String(e.kind)) ? String(e.kind) : "goal",
        title: String(e.title || "").trim().slice(0, 200),
        body: String(e.body || "").slice(0, 10000),
        attachments: [],
        ai_plan: {},
        pinned: false,
        color: e.color ? String(e.color).slice(0, 30) : null,
        owner_role: OWNER_ROLES.has(String(e.owner_role)) ? String(e.owner_role) : "team",
        owner_name: e.owner_name ? String(e.owner_name).slice(0, 60) : null,
        status: STATUSES.has(String(e.status)) ? String(e.status) : "todo",
        due_time: e.due_time ? String(e.due_time).slice(0, 8) : null,
        created_by: isAdmin ? "admin:playbook" : `partner:${portalClaims?.code || ""}:playbook`,
      })).filter((r: any) => r.date && r.title);
      if (!rows.length) return json({ error: "No valid rows" }, 400);
      const { data, error } = await supabase.from("company_calendar").insert(rows).select();
      if (error) throw error;
      return json({ ok: true, entries: data || [] });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json({ error: "Missing id" }, 400);
      const { error } = await supabase.from("company_calendar").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "delete_all") {
      const { error } = await supabase.from("company_calendar").delete().not("id", "is", null);
      if (error) throw error;
      return json({ ok: true });
    }

    // ============== CHAT HISTORY (admin_kv) ==============
    const CHAT_KEY = "leadership_calendar_chat";
    if (action === "get_chat") {
      const { data } = await supabase.from("admin_kv").select("value").eq("key", CHAT_KEY).maybeSingle();
      const messages = Array.isArray((data?.value as any)?.messages) ? (data!.value as any).messages : [];
      return json({ ok: true, messages });
    }
    if (action === "clear_chat") {
      await supabase.from("admin_kv").upsert({ key: CHAT_KEY, value: { messages: [] }, updated_at: new Date().toISOString() });
      return json({ ok: true, messages: [] });
    }

    // ============== AI CHAT: natural-language bulk add/remove ==============
    if (action === "ai_chat") {
      const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE) return json({ error: "AI not configured" }, 500);
      const message = String(body.message || "").trim().slice(0, 4000);
      if (!message) return json({ error: "Missing message" }, 400);

      // Load current entries so the model can decide what to delete
      const { data: currentRows } = await supabase
        .from("company_calendar")
        .select("id,date,title,owner_role,owner_name,kind,status,due_time")
        .order("date", { ascending: true })
        .limit(500);
      const current = currentRows || [];

      // Load prior chat
      const { data: kvRow } = await supabase.from("admin_kv").select("value").eq("key", CHAT_KEY).maybeSingle();
      const priorMessages: Array<{ role: string; content: string; ts?: string }> = Array.isArray((kvRow?.value as any)?.messages) ? (kvRow!.value as any).messages : [];

      const today = new Date().toISOString().slice(0, 10);
      const sys = `You are the operations chief-of-staff for the Aetheris leadership calendar. The calendar is ONLY for three principals: Joseph (founder), Braden (coo), Dean (chief_sales). Today is ${today}.

You receive a natural-language instruction from Joseph and MUST return ONLY a JSON object of this shape:
{
  "reply": "short 1-3 sentence confirmation, blunt operator tone",
  "operations": [
    { "op": "add",    "date": "YYYY-MM-DD", "title": "...", "body": "optional", "owner_role": "founder"|"coo"|"chief_sales"|"team", "owner_name": "Joseph"|"Dean"|"Braden"|"Team", "kind": "goal"|"vertical"|"topic"|"event"|"push"|"note", "due_time": "HH:MM" or null },
    { "op": "delete", "id": "uuid-from-current-entries" },
    { "op": "delete_all" }
  ]
}

Rules:
- Resolve relative dates ("tomorrow", "next Monday") using today = ${today}.
- If the user says "clear the calendar" / "wipe everything", emit one { "op": "delete_all" }.
- If the user says "delete Joseph's Friday tasks" or names items, pick matching ids from CURRENT_ENTRIES and emit delete ops for each.
- Never invent uuids. Only delete ids that appear in CURRENT_ENTRIES.
- Owner mapping: Joseph->founder, Braden->coo, Dean->chief_sales, otherwise team. Match owner_name to owner_role.
- Money in $ USD only. No fluff. Tactical titles.
- Return ONLY the JSON, no markdown.`;

      const historyForModel = priorMessages.slice(-10).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `CURRENT_ENTRIES:\n${JSON.stringify(current)}` },
            ...historyForModel,
            { role: "user", content: message },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) return json({ error: `AI ${r.status}: ${await r.text()}` }, 500);
      const j = await r.json();
      const txt = j?.choices?.[0]?.message?.content || "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(txt); } catch { parsed = {}; }
      const ops: any[] = Array.isArray(parsed.operations) ? parsed.operations : [];

      const added: any[] = [];
      const deletedIds: string[] = [];
      let deletedAll = false;

      for (const op of ops) {
        try {
          if (op.op === "delete_all") {
            const { error } = await supabase.from("company_calendar").delete().not("id", "is", null);
            if (!error) deletedAll = true;
          } else if (op.op === "delete" && op.id) {
            const { error } = await supabase.from("company_calendar").delete().eq("id", String(op.id));
            if (!error) deletedIds.push(String(op.id));
          } else if (op.op === "add" && op.date && op.title) {
            const row = {
              date: String(op.date).slice(0, 10),
              kind: KINDS.has(String(op.kind)) ? String(op.kind) : "goal",
              title: String(op.title).slice(0, 200),
              body: String(op.body || "").slice(0, 10000),
              attachments: [],
              ai_plan: {},
              pinned: false,
              color: null,
              owner_role: OWNER_ROLES.has(String(op.owner_role)) ? String(op.owner_role) : "team",
              owner_name: op.owner_name ? String(op.owner_name).slice(0, 60) : null,
              status: "todo",
              due_time: op.due_time ? String(op.due_time).slice(0, 8) : null,
              created_by: isAdmin ? "admin:chat" : `partner:${portalClaims?.code || ""}:chat`,
            };
            const { data: ins } = await supabase.from("company_calendar").insert(row).select().maybeSingle();
            if (ins) added.push(ins);
          }
        } catch (_e) { /* skip bad op */ }
      }

      const reply = String(parsed.reply || "Done.").slice(0, 800);
      const summaryBits: string[] = [];
      if (deletedAll) summaryBits.push("cleared all entries");
      if (added.length) summaryBits.push(`added ${added.length}`);
      if (deletedIds.length && !deletedAll) summaryBits.push(`deleted ${deletedIds.length}`);
      const finalReply = summaryBits.length ? `${reply}\n\n[${summaryBits.join(" · ")}]` : reply;

      const nowIso = new Date().toISOString();
      const nextMessages = [
        ...priorMessages,
        { role: "user", content: message, ts: nowIso },
        { role: "assistant", content: finalReply, ts: nowIso },
      ].slice(-100);
      await supabase.from("admin_kv").upsert({ key: CHAT_KEY, value: { messages: nextMessages }, updated_at: nowIso });

      return json({ ok: true, reply: finalReply, added, deletedIds, deletedAll, messages: nextMessages });
    }

    // Admin-only: edit leadership role
    if (action === "update_role") {
      if (!isAdmin) return json({ error: "Admin only" }, 403);
      const slug = String(body.role_slug || "");
      if (!OWNER_ROLES.has(slug) || slug === "team") return json({ error: "Invalid role_slug" }, 400);
      const patch: Record<string, unknown> = {};
      if (typeof body.display_name === "string") patch.display_name = body.display_name.slice(0, 60);
      if (typeof body.title === "string") patch.title = body.title.slice(0, 120);
      if (Array.isArray(body.owns)) patch.owns = body.owns.slice(0, 20).map((s: any) => String(s).slice(0, 300));
      if (Array.isArray(body.does_not_own)) patch.does_not_own = body.does_not_own.slice(0, 20).map((s: any) => String(s).slice(0, 300));
      if (Array.isArray(body.decision_authority)) patch.decision_authority = body.decision_authority.slice(0, 20).map((s: any) => String(s).slice(0, 300));
      const { data, error } = await supabase
        .from("leadership_roles")
        .update(patch)
        .eq("role_slug", slug)
        .select()
        .maybeSingle();
      if (error) throw error;
      return json({ ok: true, role: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("company-calendar error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
