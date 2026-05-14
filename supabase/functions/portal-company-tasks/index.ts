// Per-rep daily tasks pulled from the company calendar (each tactic = a checkbox).
// Reps mark complete; admin/partner sees a per-rep matrix for any date.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function todayIndy(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Indiana/Indianapolis",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

interface EntryRow {
  id: string;
  date: string;
  kind: string;
  title: string;
  body: string;
  ai_plan: { tactics?: unknown[]; summary?: string; kpis?: unknown[] } | null;
}

function tacticsOf(entry: EntryRow): string[] {
  const t = Array.isArray(entry.ai_plan?.tactics) ? entry.ai_plan!.tactics! : [];
  const out = t.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (out.length > 0) return out;
  // fall back to body bullet lines
  const lines = (entry.body || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*\d.\s]+/, "").trim())
    .filter((l) => l.length > 4);
  return lines.slice(0, 8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const portalClaims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE).catch(() => null);
    const isAdmin = portalClaims ? false : await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
    if (!portalClaims && !isAdmin) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String(body.action || "list_today");
    const date = String(body.date || todayIndy()).slice(0, 10);

    // ============== REP: list today's company tasks + my completion state ==============
    if (action === "list_today") {
      const repCode = portalClaims?.code || (isAdmin ? "ADMIN_PREVIEW" : null);
      if (!repCode) return json({ error: "Unauthorized" }, 401);

      const { data: entries, error: e1 } = await admin
        .from("company_calendar")
        .select("id, date, kind, title, body, ai_plan")
        .eq("date", date)
        .order("pinned", { ascending: false });
      if (e1) throw e1;

      const ids = (entries || []).map((e) => e.id);
      const { data: comps } = ids.length
        ? await admin
            .from("rep_company_task_completions")
            .select("entry_id, task_index, completed_at")
            .eq("rep_code", repCode)
            .in("entry_id", ids)
        : { data: [] };

      const compMap = new Map<string, Set<number>>();
      for (const c of (comps || []) as { entry_id: string; task_index: number }[]) {
        if (!compMap.has(c.entry_id)) compMap.set(c.entry_id, new Set());
        compMap.get(c.entry_id)!.add(c.task_index);
      }

      const items = (entries || []).map((e) => {
        const tasks = tacticsOf(e as EntryRow);
        const done = compMap.get(e.id) || new Set<number>();
        return {
          entry_id: e.id,
          date: e.date,
          kind: e.kind,
          title: e.title,
          summary: (e.ai_plan as any)?.summary || "",
          tasks: tasks.map((text, i) => ({ index: i, text, done: done.has(i) })),
        };
      }).filter((x) => x.tasks.length > 0);

      return json({ ok: true, date, rep_code: repCode, items });
    }

    // ============== REP: toggle a single task ==============
    if (action === "toggle") {
      if (!portalClaims) return json({ error: "Reps only" }, 403);
      const entry_id = String(body.entry_id || "");
      const task_index = Number(body.task_index);
      const completed = !!body.completed;
      if (!entry_id || !Number.isInteger(task_index) || task_index < 0) {
        return json({ error: "Bad input" }, 400);
      }
      const { data: entry } = await admin
        .from("company_calendar").select("date").eq("id", entry_id).maybeSingle();
      const for_date = entry?.date || todayIndy();

      if (completed) {
        await admin.from("rep_company_task_completions").upsert({
          rep_code: portalClaims.code,
          entry_id,
          task_index,
          for_date,
          completed_at: new Date().toISOString(),
        }, { onConflict: "rep_code,entry_id,task_index" });
      } else {
        await admin.from("rep_company_task_completions")
          .delete()
          .eq("rep_code", portalClaims.code)
          .eq("entry_id", entry_id)
          .eq("task_index", task_index);
      }
      return json({ ok: true });
    }

    // ============== ADMIN/PARTNER: per-rep completion matrix for a date ==============
    if (action === "admin_overview") {
      const isPartner = portalClaims?.role === "partner";
      if (!isAdmin && !isPartner) return json({ error: "Admin only" }, 403);

      const [{ data: entries }, { data: reps }] = await Promise.all([
        admin.from("company_calendar")
          .select("id, date, kind, title, ai_plan, body")
          .eq("date", date)
          .order("pinned", { ascending: false }),
        admin.from("rep_codes")
          .select("code, rep_name, role, is_active")
          .eq("is_active", true)
          .order("rep_name", { ascending: true }),
      ]);

      const ids = (entries || []).map((e) => e.id);
      const { data: comps } = ids.length
        ? await admin.from("rep_company_task_completions")
            .select("rep_code, entry_id, task_index, completed_at")
            .in("entry_id", ids)
        : { data: [] };

      const compIndex = new Map<string, Map<string, Set<number>>>(); // rep_code -> entry_id -> set
      for (const c of (comps || []) as { rep_code: string; entry_id: string; task_index: number }[]) {
        if (!compIndex.has(c.rep_code)) compIndex.set(c.rep_code, new Map());
        const m = compIndex.get(c.rep_code)!;
        if (!m.has(c.entry_id)) m.set(c.entry_id, new Set());
        m.get(c.entry_id)!.add(c.task_index);
      }

      const items = (entries || []).map((e) => {
        const tasks = tacticsOf(e as EntryRow);
        return {
          entry_id: e.id,
          title: e.title,
          kind: e.kind,
          tasks,
          per_rep: (reps || []).map((r) => {
            const done = compIndex.get(r.code)?.get(e.id) || new Set<number>();
            return {
              code: r.code,
              rep_name: r.rep_name || r.code,
              role: r.role || "rep",
              completed: tasks.map((_, i) => done.has(i)),
              done_count: tasks.filter((_, i) => done.has(i)).length,
              total: tasks.length,
            };
          }),
        };
      }).filter((x) => x.tasks.length > 0);

      return json({
        ok: true,
        date,
        reps: (reps || []).map((r) => ({ code: r.code, rep_name: r.rep_name || r.code, role: r.role || "rep" })),
        items,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("portal-company-tasks error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
