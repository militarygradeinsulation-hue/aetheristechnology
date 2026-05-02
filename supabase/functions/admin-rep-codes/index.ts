// Manage rep codes (CRUD). Accessible by admin token OR partner portal token.
// Reps cannot see other reps' codes — this function rejects rep-role tokens.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_DOMAIN = "aetheris.technology";

function slugifyName(name: string): string {
  const base = (name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.-]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return base || "rep";
}

function buildEmail(name: string, takenLower: Set<string>): string {
  const slug = slugifyName(name);
  let candidate = `${slug}@${EMAIL_DOMAIN}`;
  let n = 2;
  while (takenLower.has(candidate.toLowerCase())) {
    candidate = `${slug}${n}@${EMAIL_DOMAIN}`;
    n++;
  }
  takenLower.add(candidate.toLowerCase());
  return candidate;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminTok = getAdminTokenFromRequest(req);
    const isAdmin = await verifyAdminToken(adminTok, SVC);

    let isPartner = false;
    if (!isAdmin) {
      const portalTok = getPortalTokenFromRequest(req);
      const portal = await verifyPortalToken(portalTok, SVC);
      if (!portal) return json(401, { error: "Unauthorized" });
      if (portal.role !== "partner") return json(403, { error: "Forbidden — admin or partner only" });
      isPartner = true;
    }

    const sb = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "list") {
      const { data, error } = await sb
        .from("rep_codes")
        .select("id, code, rep_name, rep_email, commission_rate, is_active, role, total_sales_cents, total_commission_cents, created_at")
        .order("rep_name", { ascending: true });
      if (error) throw error;
      return json(200, { reps: data || [] });
    }

    if (action === "create") {
      const code = String(body.code || "").trim();
      const rep_name = String(body.rep_name || "").trim();
      const rep_email = body.rep_email ? String(body.rep_email).trim() : null;
      const commission_rate = Number.isFinite(Number(body.commission_rate)) ? Number(body.commission_rate) : 0.10;
      const role = body.role === "partner" ? "partner" : "rep";
      if (!/^\d{4,12}$/.test(code)) return json(400, { error: "Code must be 4-12 digits" });
      if (!rep_name) return json(400, { error: "Name required" });
      const { data, error } = await sb
        .from("rep_codes")
        .insert({ code, rep_name, rep_email, commission_rate, role, is_active: true })
        .select()
        .single();
      if (error) return json(400, { error: error.message });
      return json(200, { rep: data });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const patch: Record<string, unknown> = {};
      if (typeof body.rep_name === "string") patch.rep_name = body.rep_name.trim();
      if (typeof body.rep_email === "string" || body.rep_email === null) patch.rep_email = body.rep_email || null;
      if (Number.isFinite(Number(body.commission_rate))) patch.commission_rate = Number(body.commission_rate);
      if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
      if (body.role === "rep" || body.role === "partner") patch.role = body.role;
      if (Object.keys(patch).length === 0) return json(400, { error: "Nothing to update" });
      const { data, error } = await sb.from("rep_codes").update(patch).eq("id", id).select().single();
      if (error) return json(400, { error: error.message });

      // Mirror name change to existing team_messages so chat history reflects the rename.
      if (typeof patch.rep_name === "string" && data?.code) {
        await sb.from("team_messages").update({ author_name: patch.rep_name }).eq("author_code", data.code);
      }
      return json(200, { rep: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const { error } = await sb.from("rep_codes").delete().eq("id", id);
      if (error) return json(400, { error: error.message });
      return json(200, { success: true });
    }

    if (action === "backfill_emails") {
      const overwrite = body.overwrite === true;
      const { data: reps, error } = await sb
        .from("rep_codes")
        .select("id, rep_name, rep_email");
      if (error) return json(400, { error: error.message });

      const taken = new Set<string>(
        (reps || [])
          .map(r => (r.rep_email || "").toLowerCase())
          .filter(Boolean)
      );

      const updates: { id: string; rep_name: string; rep_email: string }[] = [];
      for (const r of reps || []) {
        const has = !!(r.rep_email && r.rep_email.trim());
        if (has && !overwrite) continue;
        if (has && overwrite) taken.delete((r.rep_email || "").toLowerCase());
        const email = buildEmail(r.rep_name || "rep", taken);
        updates.push({ id: r.id, rep_name: r.rep_name || "", rep_email: email });
      }

      const results: { id: string; rep_name: string; rep_email: string; ok: boolean; error?: string }[] = [];
      for (const u of updates) {
        const { error: uErr } = await sb.from("rep_codes").update({ rep_email: u.rep_email }).eq("id", u.id);
        results.push({ ...u, ok: !uErr, error: uErr?.message });
      }
      return json(200, { updated: results.filter(r => r.ok).length, total_candidates: updates.length, results });
    }

    if (action === "send_test_email") {
      const id = body.id ? String(body.id) : null;
      const inboxOverride = body.inbox ? String(body.inbox).trim() : null;
      if (!id) return json(400, { error: "Rep id required" });
      const { data: rep, error } = await sb
        .from("rep_codes")
        .select("id, rep_name, rep_email")
        .eq("id", id)
        .maybeSingle();
      if (error || !rep) return json(404, { error: "Rep not found" });

      const recipient = inboxOverride || rep.rep_email;
      if (!recipient || !/^\S+@\S+\.\S+$/.test(recipient)) {
        return json(400, { error: "No valid recipient email on file. Generate one first or provide an inbox override." });
      }

      // Invoke send-transactional-email
      const url = `${SUPABASE_URL}/functions/v1/send-transactional-email`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SVC}`,
          "apikey": SVC,
        },
        body: JSON.stringify({
          templateName: "rep-welcome",
          to: recipient,
          data: { name: rep.rep_name || "Rep" },
          idempotencyKey: `rep-test-${rep.id}-${Date.now()}`,
          purpose: "transactional",
        }),
      });
      const bodyText = await resp.text();
      let parsed: unknown = bodyText;
      try { parsed = JSON.parse(bodyText); } catch { /* keep text */ }
      if (!resp.ok) {
        return json(502, { error: "Email send failed", status: resp.status, response: parsed });
      }
      return json(200, { ok: true, recipient, response: parsed });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("admin-rep-codes error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
